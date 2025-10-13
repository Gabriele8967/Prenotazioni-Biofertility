'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log errore in console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Aggiorna stato con info errore
    this.setState({
      error,
      errorInfo,
    });

    // In produzione invia a servizio di monitoring
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      // TODO: Integrare con Sentry
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Se è fornito un fallback custom, usalo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Altrimenti mostra UI di errore di default
      return (
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Si è verificato un errore
                </h1>
                <p className="text-gray-600">
                  Ci scusiamo per l'inconveniente
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-800 font-medium mb-2">
                Dettagli errore:
              </p>
              <p className="text-sm text-red-700 font-mono">
                {this.state.error?.message || 'Errore sconosciuto'}
              </p>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  Stack trace (solo in sviluppo)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={this.handleReset}
                className="flex items-center gap-2"
                variant="default"
              >
                <RefreshCw className="w-4 h-4" />
                Riprova
              </Button>

              <Button
                onClick={this.handleReload}
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
                Ricarica Pagina
              </Button>

              <Button
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Home className="w-4 h-4" />
                Torna alla Home
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Se il problema persiste, contatta il supporto tecnico:
              </p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                📧 Email: supporto@biofertility.it
              </p>
              <p className="text-sm font-medium text-gray-900">
                📞 Tel: 06-8415269
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook per catturare errori in componenti funzionali
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}

// Componente mini error boundary per sezioni specifiche
export function SectionErrorBoundary({
  children,
  sectionName,
}: {
  children: ReactNode;
  sectionName: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-900">
                Errore nel caricamento di: {sectionName}
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Questa sezione non è disponibile al momento. Le altre funzionalità
                continuano a funzionare normalmente.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-yellow-800 underline mt-2 hover:text-yellow-900"
              >
                Ricarica la pagina
              </button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
