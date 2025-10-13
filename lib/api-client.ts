/**
 * Client API robusto con retry automatico, timeout e gestione errori
 */

export interface ApiOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Esegue fetch con timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Richiesta scaduta. Verifica la connessione internet', 408);
    }
    throw error;
  }
}

/**
 * Client API con retry automatico
 */
export async function apiClient<T = any>(
  url: string,
  options: ApiOptions = {}
): Promise<T> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        timeout,
      });

      // Se la risposta è OK, parsala e ritorna
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        }
        return await response.text() as any;
      }

      // Gestione errori HTTP
      let errorMessage = `Errore ${response.status}`;
      let errorData: any;

      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = await response.text();
      }

      // Errori che non hanno senso ritentare
      const nonRetryableStatuses = [400, 401, 403, 404, 422];
      if (nonRetryableStatuses.includes(response.status)) {
        throw new ApiError(errorMessage, response.status, errorData);
      }

      // Altri errori possono essere ritentati
      throw new ApiError(errorMessage, response.status, errorData);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Se è l'ultimo tentativo, lancia l'errore
      if (attempt === retries - 1) {
        break;
      }

      // Se è un errore ApiError con status non ritentabile, lancia subito
      if (error instanceof ApiError && error.statusCode < 500) {
        throw error;
      }

      // Callback per notificare il retry
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Attendi prima del prossimo tentativo (backoff esponenziale)
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Se arriviamo qui, tutti i tentativi sono falliti
  throw lastError || new ApiError('Richiesta fallita', 500);
}

/**
 * Helper specifici per le operazioni comuni
 */

export const api = {
  /**
   * GET request
   */
  get: <T = any>(url: string, options?: ApiOptions) =>
    apiClient<T>(url, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: <T = any>(url: string, data?: any, options?: ApiOptions) =>
    apiClient<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  /**
   * PUT request
   */
  put: <T = any>(url: string, data?: any, options?: ApiOptions) =>
    apiClient<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  /**
   * DELETE request
   */
  delete: <T = any>(url: string, options?: ApiOptions) =>
    apiClient<T>(url, { ...options, method: 'DELETE' }),

  /**
   * PATCH request
   */
  patch: <T = any>(url: string, data?: any, options?: ApiOptions) =>
    apiClient<T>(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
};

/**
 * Hook React per chiamate API con loading e error state
 */
import { useState, useCallback } from 'react';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useApi<T = any>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (fetcher: () => Promise<T>): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const result = await fetcher();
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ data: null, loading: false, error: err });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Helper per gestire race conditions (cancella richieste vecchie)
 */
export class RequestCanceller {
  private abortControllers = new Map<string, AbortController>();

  cancel(key: string) {
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
  }

  cancelAll() {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  async fetch<T>(
    key: string,
    fetcher: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    // Cancella eventuali richieste precedenti con la stessa chiave
    this.cancel(key);

    // Crea nuovo AbortController
    const controller = new AbortController();
    this.abortControllers.set(key, controller);

    try {
      const result = await fetcher(controller.signal);
      this.abortControllers.delete(key);
      return result;
    } catch (error) {
      this.abortControllers.delete(key);
      throw error;
    }
  }
}

/**
 * Cache semplice per richieste API
 */
export class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl: number;

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  async fetchOrCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { forceRefresh?: boolean }
  ): Promise<T> {
    if (!options?.forceRefresh) {
      const cached = this.get<T>(key);
      if (cached !== null) return cached;
    }

    const data = await fetcher();
    this.set(key, data);
    return data;
  }
}
