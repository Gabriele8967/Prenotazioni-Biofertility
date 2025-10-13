import { AppError, ErrorType } from './error-handler';

/**
 * Validatori per input utente
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class Validator {
  private errors: string[] = [];

  /**
   * Valida che un campo non sia vuoto
   */
  required(value: any, fieldName: string): this {
    if (value === null || value === undefined || value === '') {
      this.errors.push(`${fieldName} è obbligatorio`);
    }
    return this;
  }

  /**
   * Valida email
   */
  email(value: string, fieldName: string = 'Email'): this {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      this.errors.push(`${fieldName} non è valida`);
    }
    return this;
  }

  /**
   * Valida lunghezza minima
   */
  minLength(value: string, min: number, fieldName: string): this {
    if (value && value.length < min) {
      this.errors.push(`${fieldName} deve essere lungo almeno ${min} caratteri`);
    }
    return this;
  }

  /**
   * Valida lunghezza massima
   */
  maxLength(value: string, max: number, fieldName: string): this {
    if (value && value.length > max) {
      this.errors.push(`${fieldName} non può superare ${max} caratteri`);
    }
    return this;
  }

  /**
   * Valida numero di telefono italiano
   */
  italianPhone(value: string, fieldName: string = 'Telefono'): this {
    // Accetta formati: +39xxxxxxxxxx, 0039xxxxxxxxxx, 3xxxxxxxxx
    const phoneRegex = /^(\+39|0039)?[0-9]{9,10}$/;
    if (value && !phoneRegex.test(value.replace(/[\s-]/g, ''))) {
      this.errors.push(`${fieldName} non è valido`);
    }
    return this;
  }

  /**
   * Valida codice fiscale italiano
   */
  fiscalCode(value: string, fieldName: string = 'Codice fiscale'): this {
    const fcRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    if (value && !fcRegex.test(value.toUpperCase())) {
      this.errors.push(`${fieldName} non è valido`);
    }
    return this;
  }

  /**
   * Valida CAP italiano
   */
  italianPostalCode(value: string, fieldName: string = 'CAP'): this {
    const capRegex = /^[0-9]{5}$/;
    if (value && !capRegex.test(value)) {
      this.errors.push(`${fieldName} deve essere di 5 cifre`);
    }
    return this;
  }

  /**
   * Valida provincia italiana (sigla a 2 lettere)
   */
  italianProvince(value: string, fieldName: string = 'Provincia'): this {
    if (value && value.length !== 2) {
      this.errors.push(`${fieldName} deve essere una sigla di 2 lettere (es. RM)`);
    }
    return this;
  }

  /**
   * Valida data
   */
  date(value: string, fieldName: string): this {
    if (value && isNaN(Date.parse(value))) {
      this.errors.push(`${fieldName} non è una data valida`);
    }
    return this;
  }

  /**
   * Valida che la data sia futura
   */
  futureDate(value: string, fieldName: string): this {
    if (value) {
      const date = new Date(value);
      if (date < new Date()) {
        this.errors.push(`${fieldName} deve essere una data futura`);
      }
    }
    return this;
  }

  /**
   * Valida che la data sia passata
   */
  pastDate(value: string, fieldName: string): this {
    if (value) {
      const date = new Date(value);
      if (date > new Date()) {
        this.errors.push(`${fieldName} deve essere una data passata`);
      }
    }
    return this;
  }

  /**
   * Valida formato IBAN
   */
  iban(value: string, fieldName: string = 'IBAN'): this {
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
    if (value && !ibanRegex.test(value.replace(/\s/g, ''))) {
      this.errors.push(`${fieldName} non è valido`);
    }
    return this;
  }

  /**
   * Valida URL
   */
  url(value: string, fieldName: string = 'URL'): this {
    try {
      if (value) new URL(value);
    } catch {
      this.errors.push(`${fieldName} non è valido`);
    }
    return this;
  }

  /**
   * Valida regex custom
   */
  regex(value: string, pattern: RegExp, errorMessage: string): this {
    if (value && !pattern.test(value)) {
      this.errors.push(errorMessage);
    }
    return this;
  }

  /**
   * Valida che un valore sia in una lista
   */
  oneOf(value: any, allowedValues: any[], fieldName: string): this {
    if (value && !allowedValues.includes(value)) {
      this.errors.push(`${fieldName} deve essere uno di: ${allowedValues.join(', ')}`);
    }
    return this;
  }

  /**
   * Valida numero in un range
   */
  range(value: number, min: number, max: number, fieldName: string): this {
    if (value !== undefined && (value < min || value > max)) {
      this.errors.push(`${fieldName} deve essere tra ${min} e ${max}`);
    }
    return this;
  }

  /**
   * Ottieni il risultato della validazione
   */
  result(): ValidationResult {
    const result = {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
    };
    this.errors = []; // Reset per riuso
    return result;
  }

  /**
   * Lancia un errore se la validazione fallisce
   */
  throwIfInvalid(): void {
    const result = this.result();
    if (!result.isValid) {
      throw new AppError(
        ErrorType.VALIDATION,
        result.errors.join('; '),
        400,
        { errors: result.errors }
      );
    }
  }
}

/**
 * Helper per sanitizzazione input
 */
export const sanitize = {
  /**
   * Rimuove caratteri pericolosi per XSS
   */
  xss(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },

  /**
   * Rimuove spazi extra
   */
  trim(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  },

  /**
   * Normalizza email (lowercase, trim)
   */
  email(email: string): string {
    return email.toLowerCase().trim();
  },

  /**
   * Normalizza telefono (rimuove spazi e trattini)
   */
  phone(phone: string): string {
    return phone.replace(/[\s-]/g, '');
  },

  /**
   * Normalizza codice fiscale (uppercase, trim)
   */
  fiscalCode(code: string): string {
    return code.toUpperCase().trim();
  },

  /**
   * Normalizza nome (capitalizza prima lettera)
   */
  name(name: string): string {
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  /**
   * Rimuove caratteri SQL pericolosi
   */
  sql(input: string): string {
    return input.replace(/['";\\]/g, '');
  },
};

/**
 * Schema di validazione per dati paziente
 */
export function validatePatientData(data: {
  name: string;
  email: string;
  phone?: string;
  fiscalCode: string;
  luogoNascita: string;
  dataNascita: string;
  professione: string;
  indirizzo: string;
  citta: string;
  provincia: string;
  cap: string;
  numeroDocumento: string;
  scadenzaDocumento: string;
}): ValidationResult {
  const validator = new Validator();

  return validator
    .required(data.name, 'Nome')
    .minLength(data.name, 2, 'Nome')
    .maxLength(data.name, 100, 'Nome')
    .required(data.email, 'Email')
    .email(data.email)
    .italianPhone(data.phone || '', 'Telefono')
    .required(data.fiscalCode, 'Codice Fiscale')
    .fiscalCode(data.fiscalCode)
    .required(data.luogoNascita, 'Luogo di nascita')
    .required(data.dataNascita, 'Data di nascita')
    .date(data.dataNascita, 'Data di nascita')
    .pastDate(data.dataNascita, 'Data di nascita')
    .required(data.professione, 'Professione')
    .required(data.indirizzo, 'Indirizzo')
    .required(data.citta, 'Città')
    .required(data.provincia, 'Provincia')
    .italianProvince(data.provincia)
    .required(data.cap, 'CAP')
    .italianPostalCode(data.cap)
    .required(data.numeroDocumento, 'Numero documento')
    .required(data.scadenzaDocumento, 'Scadenza documento')
    .date(data.scadenzaDocumento, 'Scadenza documento')
    .futureDate(data.scadenzaDocumento, 'Scadenza documento')
    .result();
}

/**
 * Schema di validazione per prenotazione
 */
export function validateBookingData(data: {
  serviceId: string;
  staffId: string;
  startTime: string;
  patientEmail: string;
}): ValidationResult {
  const validator = new Validator();

  return validator
    .required(data.serviceId, 'Servizio')
    .required(data.staffId, 'Operatore')
    .required(data.startTime, 'Data e ora')
    .date(data.startTime, 'Data e ora')
    .futureDate(data.startTime, 'Data e ora')
    .required(data.patientEmail, 'Email paziente')
    .email(data.patientEmail, 'Email paziente')
    .result();
}

/**
 * Helper per validare dimensione file
 */
export function validateFileSize(
  file: File,
  maxSizeMB: number = 5
): ValidationResult {
  const maxBytes = maxSizeMB * 1024 * 1024;
  const errors: string[] = [];

  if (file.size > maxBytes) {
    errors.push(
      `File troppo grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). Massimo: ${maxSizeMB}MB`
    );
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper per validare tipo file
 */
export function validateFileType(
  file: File,
  allowedTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
): ValidationResult {
  const errors: string[] = [];

  if (!allowedTypes.includes(file.type)) {
    errors.push(
      `Tipo file non supportato. Formati ammessi: ${allowedTypes.join(', ')}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
