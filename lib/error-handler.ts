import { NextResponse } from 'next/server';

// Tipi di errori dell'applicazione
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  FILE_UPLOAD = 'FILE_UPLOAD',
  PAYMENT = 'PAYMENT',
  UNKNOWN = 'UNKNOWN'
}

// Classe per errori personalizzati
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number = 500,
    public details?: any,
    public isOperational: boolean = true // true = errore previsto, false = bug
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Logger centralizzato
class ErrorLogger {
  private static instance: ErrorLogger;

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: Error | AppError, context?: string): void {
    const timestamp = new Date().toISOString();
    const isAppError = error instanceof AppError;

    const logEntry = {
      timestamp,
      context: context || 'Unknown',
      type: isAppError ? error.type : ErrorType.UNKNOWN,
      message: error.message,
      stack: error.stack,
      details: isAppError ? error.details : undefined,
      isOperational: isAppError ? error.isOperational : false,
    };

    // Log in console (in produzione andrà su servizio di logging esterno)
    if (process.env.NODE_ENV === 'production') {
      console.error('[ERROR]', JSON.stringify(logEntry));
    } else {
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`🔴 [ERROR] ${logEntry.context}`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`⏰ Time: ${timestamp}`);
      console.error(`📋 Type: ${logEntry.type}`);
      console.error(`💬 Message: ${logEntry.message}`);
      if (logEntry.details) {
        console.error(`📦 Details:`, logEntry.details);
      }
      if (logEntry.stack) {
        console.error(`📚 Stack:\n${logEntry.stack}`);
      }
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // In produzione, invia a servizio di monitoring (es. Sentry, LogRocket)
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      // TODO: Integrare con Sentry
      // Sentry.captureException(error, { contexts: { custom: logEntry } });
    }
  }

  logWarning(message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    console.warn(`⚠️  [WARNING] [${timestamp}] ${context || 'Unknown'}: ${message}`);
  }

  logInfo(message: string, context?: string): void {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      console.log(`ℹ️  [INFO] [${timestamp}] ${context || 'Unknown'}: ${message}`);
    }
  }
}

export const logger = ErrorLogger.getInstance();

// Helper per gestire errori nelle API routes
export function handleApiError(
  error: unknown,
  context: string,
  fallbackMessage: string = 'Si è verificato un errore imprevisto'
): NextResponse {
  // Se è un errore AppError conosciuto
  if (error instanceof AppError) {
    logger.log(error, context);

    return NextResponse.json(
      {
        error: error.message,
        type: error.type,
        ...(process.env.NODE_ENV !== 'production' && { details: error.details })
      },
      { status: error.statusCode }
    );
  }

  // Se è un errore generico
  if (error instanceof Error) {
    logger.log(error, context);

    // In produzione nascondi dettagli interni
    const message = process.env.NODE_ENV === 'production'
      ? fallbackMessage
      : error.message;

    return NextResponse.json(
      {
        error: message,
        type: ErrorType.UNKNOWN,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      },
      { status: 500 }
    );
  }

  // Errore completamente sconosciuto
  logger.log(new Error(String(error)), context);

  return NextResponse.json(
    {
      error: fallbackMessage,
      type: ErrorType.UNKNOWN
    },
    { status: 500 }
  );
}

// Helper per validazione input
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => !data[field]);

  if (missingFields.length > 0) {
    throw new AppError(
      ErrorType.VALIDATION,
      `Campi obbligatori mancanti: ${missingFields.join(', ')}`,
      400,
      { missingFields }
    );
  }
}

// Helper per validazione email
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError(
      ErrorType.VALIDATION,
      'Formato email non valido',
      400,
      { email }
    );
  }
}

// Helper per retry con backoff esponenziale
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  context: string = 'Unknown'
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        logger.logWarning(
          `Tentativo ${attempt + 1}/${maxRetries} fallito. Riprovo tra ${delay}ms...`,
          context
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new AppError(
    ErrorType.EXTERNAL_API,
    `Operazione fallita dopo ${maxRetries} tentativi`,
    503,
    { lastError: lastError?.message, context }
  );
}

// Helper per gestione errori database
export function handleDatabaseError(error: unknown, operation: string): never {
  if (error instanceof Error) {
    // Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
      const prismaError = error as any;

      // Unique constraint violation
      if (prismaError.code === 'P2002') {
        throw new AppError(
          ErrorType.DATABASE,
          `Questo dato esiste già nel sistema`,
          409,
          { field: prismaError.meta?.target }
        );
      }

      // Record not found
      if (prismaError.code === 'P2025') {
        throw new AppError(
          ErrorType.NOT_FOUND,
          'Risorsa non trovata',
          404
        );
      }
    }

    // Timeout
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      throw new AppError(
        ErrorType.DATABASE,
        'Il database non risponde. Riprova tra qualche istante',
        503,
        { operation }
      );
    }
  }

  // Errore generico database
  throw new AppError(
    ErrorType.DATABASE,
    'Errore durante l\'operazione sul database',
    500,
    { operation, originalError: String(error) }
  );
}

// Helper per validazione file upload
export function validateFileUpload(file: File, maxSizeMB: number = 5): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    throw new AppError(
      ErrorType.FILE_UPLOAD,
      `File troppo grande. Dimensione massima: ${maxSizeMB}MB`,
      400,
      {
        fileSize: file.size,
        maxSize: maxSizeBytes,
        fileName: file.name
      }
    );
  }

  // Verifica tipo file
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new AppError(
      ErrorType.FILE_UPLOAD,
      'Tipo file non supportato. Formati ammessi: JPEG, PNG, WEBP',
      400,
      { fileType: file.type, fileName: file.name }
    );
  }
}

// Helper per safe JSON parse
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    logger.logWarning(`Errore parsing JSON, uso valore di default`, 'safeJsonParse');
    return defaultValue;
  }
}
