/**
 * Script di test per la validazione del codice fiscale
 */

import { validateFiscalCode, checkFiscalCodeCoherence, extractFiscalCodeInfo, formatFiscalCode } from '../lib/fiscal-code-validator';

console.log('🧪 Test Validazione Codice Fiscale\n');

// Test 1: Codice fiscale valido
console.log('📋 Test 1: Codice fiscale formalmente valido');
const validFC = 'RSSMRA80A01H501U';
const validation1 = validateFiscalCode(validFC);
console.log(`CF: ${validFC}`);
console.log(`Valido: ${validation1.isValid ? '✅' : '❌'}`);
if (!validation1.isValid) {
  console.log('Errori:', validation1.errors);
}
console.log('');

// Test 2: Codice fiscale non valido (carattere controllo errato)
console.log('📋 Test 2: Codice fiscale con carattere di controllo errato');
const invalidFC = 'RSSMRA80A01H501X'; // Ultimo carattere errato
const validation2 = validateFiscalCode(invalidFC);
console.log(`CF: ${invalidFC}`);
console.log(`Valido: ${validation2.isValid ? '✅' : '❌'}`);
if (!validation2.isValid) {
  console.log('Errori:', validation2.errors.join(', '));
}
console.log('');

// Test 3: Estrazione informazioni dal CF
console.log('📋 Test 3: Estrazione informazioni dal codice fiscale');
const extracted = extractFiscalCodeInfo(validFC);
console.log(`CF: ${validFC}`);
console.log(`Anno: ${extracted.year}`);
console.log(`Mese: ${extracted.month}`);
console.log(`Giorno: ${extracted.day}`);
console.log(`Sesso: ${extracted.gender}`);
console.log(`Comune: ${extracted.birthPlace}`);
console.log('');

// Test 4: Verifica coerenza con dati anagrafici corretti
console.log('📋 Test 4: Verifica coerenza con dati corretti');
const birthDate = '1980-01-01';
const coherence1 = checkFiscalCodeCoherence(validFC, birthDate, 'M');
console.log(`CF: ${validFC}`);
console.log(`Data nascita: ${birthDate}`);
console.log(`Sesso: M`);
console.log(`Coerente: ${coherence1.isCoherent ? '✅' : '❌'}`);
if (!coherence1.isCoherent) {
  console.log('Problemi:', coherence1.issues.join(', '));
  console.log('Suggerimenti:', coherence1.suggestions.join(', '));
}
console.log('');

// Test 5: Verifica coerenza con data di nascita errata
console.log('📋 Test 5: Verifica coerenza con data di nascita errata');
const wrongBirthDate = '1985-06-15';
const coherence2 = checkFiscalCodeCoherence(validFC, wrongBirthDate, 'M');
console.log(`CF: ${validFC}`);
console.log(`Data nascita: ${wrongBirthDate}`);
console.log(`Coerente: ${coherence2.isCoherent ? '✅' : '❌'}`);
if (!coherence2.isCoherent) {
  console.log('Problemi:', coherence2.issues.join(', '));
  console.log('Suggerimenti:', coherence2.suggestions.join(', '));
}
console.log('');

// Test 6: CF femmina (giorno +40)
console.log('📋 Test 6: Codice fiscale femminile');
const femaleFC = 'RSSMRA80A41H501E'; // Giorno 41 = 1 + 40 (femmina)
const validation6 = validateFiscalCode(femaleFC);
const extracted6 = extractFiscalCodeInfo(femaleFC);
console.log(`CF: ${femaleFC}`);
console.log(`Valido: ${validation6.isValid ? '✅' : '❌'}`);
console.log(`Sesso: ${extracted6.gender}`);
console.log(`Giorno: ${extracted6.day}`);
console.log('');

// Test 7: Formattazione CF
console.log('📋 Test 7: Formattazione codice fiscale');
const messyFC = '  rssmra80a01h501u  ';
const formatted = formatFiscalCode(messyFC);
console.log(`Input: "${messyFC}"`);
console.log(`Output: "${formatted}"`);
console.log('');

// Test 8: CF troppo corto
console.log('📋 Test 8: Codice fiscale troppo corto');
const shortFC = 'RSSMRA80A01';
const validation8 = validateFiscalCode(shortFC);
console.log(`CF: ${shortFC}`);
console.log(`Valido: ${validation8.isValid ? '✅' : '❌'}`);
if (!validation8.isValid) {
  console.log('Errori:', validation8.errors.join(', '));
}
console.log('');

console.log('✅ Test completati!');
