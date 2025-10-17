#!/usr/bin/env tsx
/**
 * Script Audit: Stripe vs Fatture in Cloud
 *
 * Confronta i pagamenti ricevuti su Stripe con le fatture emesse
 * su Fatture in Cloud per trovare incongruenze.
 *
 * Casi gestiti:
 * - Pagamenti Stripe senza fattura corrispondente
 * - Fatture senza pagamento Stripe
 * - Importi non corrispondenti
 * - SEPA Direct Debit (ritardo emissione)
 * - Stripe Checkout vs Payment Intent
 *
 * Usage:
 *   npx tsx scripts/audit/stripe-vs-fatture-audit.ts [--months=3] [--export=csv]
 */

import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

// ========== CONFIGURAZIONE ==========

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const FATTURE_API_KEY = process.env.FATTURE_IN_CLOUD_API_KEY;
const FATTURE_API_UID = process.env.FATTURE_IN_CLOUD_UID;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY mancante in .env');
  process.exit(1);
}

if (!FATTURE_API_KEY || !FATTURE_API_UID) {
  console.error('❌ Credenziali Fatture in Cloud mancanti in .env');
  console.error('   Serve: FATTURE_IN_CLOUD_API_KEY e FATTURE_IN_CLOUD_UID');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// ========== TYPES ==========

type StripePayment = {
  id: string;
  amount: number; // in centesimi
  currency: string;
  status: string;
  created: number; // Unix timestamp
  customer_email: string | null;
  payment_method_type: string | null;
  metadata: Record<string, string>;
  description: string | null;
};

type FatturaInCloud = {
  id: string;
  numero: string;
  data: string; // YYYY-MM-DD
  importo_totale: number;
  cliente: string;
  pagata: boolean;
  metadata: string | null; // Dove potrebbe esserci riferimento Stripe
};

type Discrepancy = {
  tipo: 'STRIPE_SENZA_FATTURA' | 'FATTURA_SENZA_STRIPE' | 'IMPORTO_DIVERSO' | 'SEPA_PENDING';
  gravita: 'ALTA' | 'MEDIA' | 'BASSA';
  stripe_id?: string;
  fattura_id?: string;
  importo_stripe?: number;
  importo_fattura?: number;
  dettagli: string;
  soluzione: string;
  data: string;
};

// ========== FUNZIONI FETCH ==========

async function fetchStripePayments(monthsBack: number = 3): Promise<StripePayment[]> {
  console.log(`\n📥 Recupero pagamenti Stripe (ultimi ${monthsBack} mesi)...`);

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  const startTimestamp = Math.floor(startDate.getTime() / 1000);

  const payments: StripePayment[] = [];

  // Fetch Payment Intents (pagamenti diretti) - TUTTE LE PAGINE
  console.log('   Recupero Payment Intents...');
  let hasMorePI = true;
  let startingAfterPI: string | undefined = undefined;

  while (hasMorePI) {
    const paymentIntents = await stripe.paymentIntents.list({
      created: { gte: startTimestamp },
      limit: 100,
      starting_after: startingAfterPI,
    });

    for (const pi of paymentIntents.data) {
      if (pi.status === 'succeeded') {
        payments.push({
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          created: pi.created,
          customer_email: pi.receipt_email || null,
          payment_method_type: pi.payment_method_types?.[0] || null,
          metadata: pi.metadata,
          description: pi.description || null,
        });
      }
    }

    hasMorePI = paymentIntents.has_more;
    if (hasMorePI && paymentIntents.data.length > 0) {
      startingAfterPI = paymentIntents.data[paymentIntents.data.length - 1].id;
      console.log(`      +${paymentIntents.data.length} Payment Intents (continuando...)`);
    }
  }

  // Fetch Checkout Sessions (prenotazioni online) - TUTTE LE PAGINE
  console.log('   Recupero Checkout Sessions...');
  let hasMoreCS = true;
  let startingAfterCS: string | undefined = undefined;

  while (hasMoreCS) {
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: startTimestamp },
      limit: 100,
      starting_after: startingAfterCS,
    });

    for (const session of sessions.data) {
      if (session.payment_status === 'paid' && session.payment_intent) {
        // Evitiamo duplicati se già preso dal PaymentIntent
        const exists = payments.find(p => p.id === session.payment_intent);
        if (!exists) {
          payments.push({
            id: session.payment_intent as string,
            amount: session.amount_total || 0,
            currency: session.currency || 'eur',
            status: 'succeeded',
            created: session.created,
            customer_email: session.customer_email || session.customer_details?.email || null,
            payment_method_type: null,
            metadata: session.metadata || {},
            description: null,
          });
        }
      }
    }

    hasMoreCS = sessions.has_more;
    if (hasMoreCS && sessions.data.length > 0) {
      startingAfterCS = sessions.data[sessions.data.length - 1].id;
      console.log(`      +${sessions.data.length} Checkout Sessions (continuando...)`);
    }
  }

  console.log(`✅ Trovati ${payments.length} pagamenti Stripe totali`);
  return payments;
}

async function fetchFattureInCloud(monthsBack: number = 3): Promise<FatturaInCloud[]> {
  console.log(`\n📥 Recupero fatture da Fatture in Cloud (ultimi ${monthsBack} mesi)...`);

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  const anno = startDate.getFullYear();
  const mese = startDate.getMonth() + 1;

  const baseUrl = 'https://api-v2.fattureincloud.it/c';
  let allFatture: FatturaInCloud[] = [];
  let currentPage = 1;
  let totalPages = 1;

  // Fetch tutte le pagine
  do {
    const url = `${baseUrl}/${FATTURE_API_UID}/issued_documents?type=invoice&date_from=${anno}-${mese.toString().padStart(2, '0')}-01&page=${currentPage}&per_page=100`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${FATTURE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Errore API Fatture in Cloud: ${response.status}`);
      console.error(await response.text());
      throw new Error('Fetch fatture fallita');
    }

    const data = await response.json();
    totalPages = data.last_page || 1;

    const fatture: FatturaInCloud[] = (data.data || []).map((f: any) => ({
      id: f.id,
      numero: f.number || f.numeration || 'N/A',
      data: f.date,
      importo_totale: parseFloat(f.amount_net || f.amount_gross || 0),
      cliente: f.entity?.name || 'Sconosciuto',
      pagata: f.payment_status === 'paid',
      metadata: f.ei_raw?.IdTrasmittente?.IdCodice || null,
    }));

    allFatture = allFatture.concat(fatture);
    console.log(`   Pagina ${currentPage}/${totalPages}: +${fatture.length} fatture`);

    currentPage++;
  } while (currentPage <= totalPages);

  console.log(`✅ Trovate ${allFatture.length} fatture totali`);
  return allFatture;
}

// ========== HELPER FUNCTIONS ==========

/**
 * Normalizza una stringa per il confronto:
 * - Lowercase
 * - Rimuove accenti
 * - Rimuove caratteri speciali
 * - Rimuove spazi multipli
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .replace(/[^a-z0-9\s]/g, '') // Solo lettere, numeri, spazi
    .replace(/\s+/g, ' ') // Spazi multipli → singolo
    .trim();
}

/**
 * Estrae nome e cognome da email
 * es: "mario.rossi@gmail.com" → "mario rossi"
 */
function extractNameFromEmail(email: string | null): string | null {
  if (!email) return null;
  const localPart = email.split('@')[0];
  // Sostituisci separatori con spazi
  return localPart.replace(/[._-]/g, ' ');
}

/**
 * Calcola similarità tra due stringhe (0-1)
 * Usa algoritmo semplice: parole in comune / totale parole
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(' ').filter(w => w.length > 2)); // Ignora parole < 3 caratteri
  const words2 = new Set(str2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);

  return intersection.length / union.size;
}

/**
 * Verifica se due nomi sono simili
 */
function areNamesSimilar(name1: string | null, name2: string | null, threshold: number = 0.5): boolean {
  if (!name1 || !name2) return false;

  const normalized1 = normalizeString(name1);
  const normalized2 = normalizeString(name2);

  // Match esatto
  if (normalized1 === normalized2) return true;

  // Match per similarità
  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}

// ========== LOGICA MATCHING ==========

function matchPaymentsToInvoices(
  payments: StripePayment[],
  fatture: FatturaInCloud[]
): { matched: Array<{ payment: StripePayment; fattura: FatturaInCloud }>; discrepancies: Discrepancy[] } {
  console.log(`\n🔍 Confronto ${payments.length} pagamenti con ${fatture.length} fatture...`);

  const matched: Array<{ payment: StripePayment; fattura: FatturaInCloud }> = [];
  const discrepancies: Discrepancy[] = [];

  const unmatchedPayments = new Set(payments.map(p => p.id));
  const unmatchedFatture = new Set(fatture.map(f => f.id));

  // 1. Match per metadata (ideale se salvato in Fatture in Cloud)
  for (const payment of payments) {
    for (const fattura of fatture) {
      // Check se metadata contiene Stripe ID
      if (fattura.metadata && fattura.metadata.includes(payment.id)) {
        matched.push({ payment, fattura });
        unmatchedPayments.delete(payment.id);
        unmatchedFatture.delete(fattura.id);
        break;
      }
    }
  }

  // 2. Match per importo + data + nome (± 7 giorni per SEPA)
  for (const payment of payments) {
    if (!unmatchedPayments.has(payment.id)) continue;

    const paymentAmount = payment.amount / 100; // Converti centesimi → euro
    const paymentDate = new Date(payment.created * 1000);

    // Estrai nome da metadata Stripe (WooCommerce) o email
    const paymentName = payment.metadata?.customer_name ||
                        extractNameFromEmail(payment.customer_email);

    for (const fattura of fatture) {
      if (!unmatchedFatture.has(fattura.id)) continue;

      const fatturaDate = new Date(fattura.data);
      const daysDiff = Math.abs((fatturaDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
      const amountDiff = Math.abs(paymentAmount - fattura.importo_totale);

      // Match se:
      // - Importo uguale (±1€)
      // - Data entro 7 giorni
      // - Nome simile (se disponibile)
      const amountMatch = amountDiff < 1;
      const dateMatch = daysDiff <= 7;
      const nameMatch = paymentName ? areNamesSimilar(paymentName, fattura.cliente, 0.5) : true;

      if (amountMatch && dateMatch && nameMatch) {
        matched.push({ payment, fattura });
        unmatchedPayments.delete(payment.id);
        unmatchedFatture.delete(fattura.id);
        break;
      }
    }
  }

  // 3. Match SOLO per nome + importo (senza vincolo data stretta) per casi edge
  // Utile se la fattura è stata emessa con molto ritardo
  for (const payment of payments) {
    if (!unmatchedPayments.has(payment.id)) continue;

    const paymentAmount = payment.amount / 100;
    const paymentName = payment.metadata?.customer_name ||
                        extractNameFromEmail(payment.customer_email);

    if (!paymentName) continue; // Skip se non abbiamo nome

    for (const fattura of fatture) {
      if (!unmatchedFatture.has(fattura.id)) continue;

      const amountDiff = Math.abs(paymentAmount - fattura.importo_totale);

      // Match se:
      // - Nome molto simile (soglia alta 0.7)
      // - Importo uguale (±0.5€ tolleranza ridotta)
      const amountMatch = amountDiff < 0.5;
      const nameMatch = areNamesSimilar(paymentName, fattura.cliente, 0.7);

      if (amountMatch && nameMatch) {
        matched.push({ payment, fattura });
        unmatchedPayments.delete(payment.id);
        unmatchedFatture.delete(fattura.id);
        break;
      }
    }
  }

  console.log(`✅ Matched: ${matched.length} coppie`);
  console.log(`⚠️  Unmatched Stripe: ${unmatchedPayments.size}`);
  console.log(`⚠️  Unmatched Fatture: ${unmatchedFatture.size}`);

  // 3. Genera discrepanze per unmatched
  for (const paymentId of unmatchedPayments) {
    const payment = payments.find(p => p.id === paymentId)!;
    const isSEPA = payment.payment_method_type === 'sepa_debit';

    // Estrai email e nome cliente
    const customerEmail = payment.customer_email || payment.metadata?.customer_email || 'N/A';
    const customerName = payment.metadata?.customer_name || payment.metadata?.billing_name || extractNameFromEmail(customerEmail) || 'N/A';

    const dettagliBase = isSEPA
      ? `Pagamento SEPA del ${new Date(payment.created * 1000).toLocaleDateString()}`
      : `Pagamento ${payment.payment_method_type || 'sconosciuto'} del ${new Date(payment.created * 1000).toLocaleDateString()}`;

    const dettagliCompleti = `${dettagliBase} - Cliente: ${customerName} (${customerEmail})`;

    discrepancies.push({
      tipo: 'STRIPE_SENZA_FATTURA',
      gravita: isSEPA ? 'MEDIA' : 'ALTA',
      stripe_id: payment.id,
      importo_stripe: payment.amount / 100,
      dettagli: isSEPA
        ? `${dettagliCompleti} - Potrebbe essere in attesa di conferma (7-14 giorni)`
        : `${dettagliCompleti} senza fattura corrispondente`,
      soluzione: isSEPA
        ? 'Attendere conferma SEPA (fino a 14 giorni) o verificare manualmente su Stripe se pagamento completato'
        : 'Emettere fattura manualmente su Fatture in Cloud con riferimento Stripe ID: ' + payment.id,
      data: new Date(payment.created * 1000).toISOString().split('T')[0],
    });
  }

  for (const fatturaId of unmatchedFatture) {
    const fattura = fatture.find(f => f.id === fatturaId)!;

    discrepancies.push({
      tipo: 'FATTURA_SENZA_STRIPE',
      gravita: 'MEDIA',
      fattura_id: fattura.numero,
      importo_fattura: fattura.importo_totale,
      dettagli: `Fattura ${fattura.numero} del ${fattura.data} per €${fattura.importo_totale.toFixed(2)} senza pagamento Stripe`,
      soluzione: 'Verificare se: 1) Pagamento effettuato con altro metodo (bonifico, contanti) 2) Fattura annullata 3) Errore inserimento',
      data: fattura.data,
    });
  }

  // 4. Check importi diversi nei matched
  for (const { payment, fattura } of matched) {
    const paymentAmount = payment.amount / 100;
    const diff = Math.abs(paymentAmount - fattura.importo_totale);

    if (diff > 0.5) { // Differenza > 50 centesimi
      discrepancies.push({
        tipo: 'IMPORTO_DIVERSO',
        gravita: 'ALTA',
        stripe_id: payment.id,
        fattura_id: fattura.numero,
        importo_stripe: paymentAmount,
        importo_fattura: fattura.importo_totale,
        dettagli: `Importo Stripe (€${paymentAmount.toFixed(2)}) ≠ Fattura (€${fattura.importo_totale.toFixed(2)}) - Differenza: €${diff.toFixed(2)}`,
        soluzione: 'Verificare IVA, sconti, o errore manuale. Correggere fattura o richiedere integrazione pagamento.',
        data: new Date(payment.created * 1000).toISOString().split('T')[0],
      });
    }
  }

  return { matched, discrepancies };
}

// ========== REPORT GENERATION ==========

function generateReport(discrepancies: Discrepancy[]): void {
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 REPORT INCONGRUENZE STRIPE vs FATTURE IN CLOUD`);
  console.log(`${'='.repeat(80)}\n`);

  if (discrepancies.length === 0) {
    console.log('✅ Nessuna incongruenza trovata! Tutto perfetto! 🎉\n');
    return;
  }

  console.log(`⚠️  Trovate ${discrepancies.length} incongruenze\n`);

  // Raggruppa per tipo
  const grouped = discrepancies.reduce((acc, d) => {
    if (!acc[d.tipo]) acc[d.tipo] = [];
    acc[d.tipo].push(d);
    return acc;
  }, {} as Record<string, Discrepancy[]>);

  for (const [tipo, items] of Object.entries(grouped)) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📌 ${tipo} (${items.length} casi)`);
    console.log(`${'─'.repeat(80)}\n`);

    items.forEach((item, idx) => {
      console.log(`${idx + 1}. [${item.gravita}] ${item.data}`);
      console.log(`   ${item.dettagli}`);
      if (item.stripe_id) console.log(`   Stripe: ${item.stripe_id}`);
      if (item.fattura_id) console.log(`   Fattura: ${item.fattura_id}`);
      if (item.importo_stripe) console.log(`   Importo Stripe: €${item.importo_stripe.toFixed(2)}`);
      if (item.importo_fattura) console.log(`   Importo Fattura: €${item.importo_fattura.toFixed(2)}`);
      console.log(`   💡 Soluzione: ${item.soluzione}`);
      console.log();
    });
  }

  // Salva CSV
  const csvPath = path.join(process.cwd(), 'audit-report.csv');
  const csvContent = [
    'Data,Tipo,Gravità,Stripe ID,Fattura,Importo Stripe,Importo Fattura,Dettagli,Soluzione',
    ...discrepancies.map(d =>
      `${d.data},"${d.tipo}","${d.gravita}","${d.stripe_id || ''}","${d.fattura_id || ''}",${d.importo_stripe || ''},${d.importo_fattura || ''},"${d.dettagli}","${d.soluzione}"`
    ),
  ].join('\n');

  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`\n💾 Report salvato in: ${csvPath}\n`);
}

// ========== MAIN ==========

async function main() {
  const args = process.argv.slice(2);
  const monthsArg = args.find(a => a.startsWith('--months='));
  const months = monthsArg ? parseInt(monthsArg.split('=')[1]) : 3;

  console.log('🔍 Audit Stripe vs Fatture in Cloud');
  console.log(`📅 Periodo: ultimi ${months} mesi\n`);

  try {
    const [stripePayments, fatture] = await Promise.all([
      fetchStripePayments(months),
      fetchFattureInCloud(months),
    ]);

    const { matched, discrepancies } = matchPaymentsToInvoices(stripePayments, fatture);

    generateReport(discrepancies);

    console.log(`\n✅ Audit completato!`);
    console.log(`   Pagamenti Stripe: ${stripePayments.length}`);
    console.log(`   Fatture: ${fatture.length}`);
    console.log(`   Matched: ${matched.length}`);
    console.log(`   Incongruenze: ${discrepancies.length}\n`);
  } catch (error) {
    console.error('\n❌ Errore durante audit:', error);
    process.exit(1);
  }
}

main();
