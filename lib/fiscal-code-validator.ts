/**
 * Utility per la validazione e il controllo del Codice Fiscale italiano
 * Include validazione formale e verifica di coerenza con i dati anagrafici
 */

// Tabella per il calcolo del carattere di controllo
const ODD_CHARS: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
  'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
  'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
};

const EVEN_CHARS: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
  'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
  'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

const CHECK_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Mapping mesi per codice fiscale
const MONTH_CODES = 'ABCDEHLMPRST';

export interface FiscalCodeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FiscalCodeCoherenceCheck {
  isCoherent: boolean;
  issues: string[];
  suggestions: string[];
}

/**
 * Valida formalmente un codice fiscale italiano
 */
export function validateFiscalCode(fiscalCode: string): FiscalCodeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fiscalCode) {
    return { isValid: false, errors: ['Il codice fiscale è obbligatorio'], warnings: [] };
  }

  const fc = fiscalCode.trim().toUpperCase();

  // Lunghezza
  if (fc.length !== 16) {
    errors.push(`Il codice fiscale deve essere di 16 caratteri (attuale: ${fc.length})`);
    return { isValid: false, errors, warnings };
  }

  // Formato: 6 lettere, 2 cifre, 1 lettera, 2 cifre, 1 lettera/cifra, 3 cifre, 1 lettera
  const pattern = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  if (!pattern.test(fc)) {
    errors.push('Il formato del codice fiscale non è valido');
    return { isValid: false, errors, warnings };
  }

  // Verifica carattere di controllo
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = fc[i];
    sum += i % 2 === 0 ? ODD_CHARS[char] : EVEN_CHARS[char];
  }
  const expectedCheck = CHECK_CHARS[sum % 26];
  const actualCheck = fc[15];

  if (expectedCheck !== actualCheck) {
    errors.push(`Carattere di controllo non valido (atteso: ${expectedCheck}, trovato: ${actualCheck})`);
  }

  // Verifica mese
  const monthChar = fc[8];
  if (!MONTH_CODES.includes(monthChar)) {
    errors.push(`Carattere del mese non valido: ${monthChar}`);
  }

  // Verifica giorno
  const dayCode = parseInt(fc.substring(9, 11), 10);
  if (dayCode < 1 || (dayCode > 31 && dayCode < 41) || dayCode > 71) {
    errors.push(`Giorno di nascita non valido: ${dayCode}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Estrae informazioni dal codice fiscale
 */
export function extractFiscalCodeInfo(fiscalCode: string): {
  year: number | null;
  month: number | null;
  day: number | null;
  gender: 'M' | 'F' | null;
  birthPlace: string | null;
} {
  const fc = fiscalCode.trim().toUpperCase();

  if (fc.length !== 16) {
    return { year: null, month: null, day: null, gender: null, birthPlace: null };
  }

  // Anno di nascita (ultimi 2 caratteri dell'anno)
  const yearCode = parseInt(fc.substring(6, 8), 10);
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  const previousCentury = currentCentury - 100;

  // Se l'anno è maggiore degli ultimi 2 digit dell'anno corrente, è del secolo scorso
  const year = yearCode > (currentYear % 100) ? previousCentury + yearCode : currentCentury + yearCode;

  // Mese
  const monthChar = fc[8];
  const month = MONTH_CODES.indexOf(monthChar) + 1;

  // Giorno e sesso
  const dayCode = parseInt(fc.substring(9, 11), 10);
  let day: number;
  let gender: 'M' | 'F';

  if (dayCode > 40) {
    day = dayCode - 40;
    gender = 'F';
  } else {
    day = dayCode;
    gender = 'M';
  }

  // Codice catastale del comune
  const birthPlace = fc.substring(11, 15);

  return { year, month, day, gender, birthPlace };
}

/**
 * Verifica la coerenza tra codice fiscale e dati anagrafici
 */
export function checkFiscalCodeCoherence(
  fiscalCode: string,
  birthDate: string, // Formato: YYYY-MM-DD
  gender?: 'M' | 'F',
  surname?: string,
  name?: string
): FiscalCodeCoherenceCheck {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const validation = validateFiscalCode(fiscalCode);
  if (!validation.isValid) {
    return {
      isCoherent: false,
      issues: validation.errors,
      suggestions: ['Correggi prima gli errori formali del codice fiscale']
    };
  }

  const extracted = extractFiscalCodeInfo(fiscalCode);

  if (!birthDate) {
    suggestions.push('Inserisci la data di nascita per verificare la coerenza');
    return { isCoherent: true, issues, suggestions };
  }

  const birth = new Date(birthDate);
  const birthYear = birth.getFullYear();
  const birthMonth = birth.getMonth() + 1;
  const birthDay = birth.getDate();

  // Verifica anno
  if (extracted.year !== birthYear) {
    issues.push(`Anno di nascita non corrispondente: il CF indica ${extracted.year}, ma la data di nascita indica ${birthYear}`);
  }

  // Verifica mese
  if (extracted.month !== birthMonth) {
    const monthNames = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    issues.push(`Mese di nascita non corrispondente: il CF indica ${monthNames[extracted.month || 0]}, ma la data di nascita indica ${monthNames[birthMonth]}`);
  }

  // Verifica giorno
  if (extracted.day !== birthDay) {
    issues.push(`Giorno di nascita non corrispondente: il CF indica il ${extracted.day}, ma la data di nascita indica il ${birthDay}`);
  }

  // Verifica sesso (se fornito)
  if (gender && extracted.gender !== gender) {
    const genderMap = { 'M': 'Maschio', 'F': 'Femmina' };
    issues.push(`Sesso non corrispondente: il CF indica ${genderMap[extracted.gender || 'M']}, ma i dati indicano ${genderMap[gender]}`);
  }

  // Suggerimenti aggiuntivi
  if (issues.length > 0) {
    suggestions.push('Verifica attentamente il codice fiscale inserito');
    suggestions.push('Controlla che i dati anagrafici siano corretti');
    suggestions.push('In caso di dubbio, consulta la tessera sanitaria o un documento ufficiale');
  }

  return {
    isCoherent: issues.length === 0,
    issues,
    suggestions
  };
}

/**
 * Suggerisce un possibile codice fiscale corretto (solo per la parte data)
 * NOTA: Questo è solo un helper parziale, non calcola cognome/nome/comune
 */
export function suggestFiscalCodeDatePart(birthDate: string, gender: 'M' | 'F'): string {
  const birth = new Date(birthDate);
  const year = birth.getFullYear() % 100;
  const month = MONTH_CODES[birth.getMonth()];
  const day = gender === 'F' ? birth.getDate() + 40 : birth.getDate();

  return `??????${year.toString().padStart(2, '0')}${month}${day.toString().padStart(2, '0')}????`;
}

/**
 * Formatta il codice fiscale in maiuscolo e rimuove spazi
 */
export function formatFiscalCode(fiscalCode: string): string {
  return fiscalCode.trim().toUpperCase().replace(/\s/g, '');
}
