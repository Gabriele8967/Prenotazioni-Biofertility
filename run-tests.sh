#!/bin/bash

# Script per eseguire la test suite del flusso di prenotazione
# Usage: ./run-tests.sh

echo "🧪 Avvio Test Suite - Flusso di Prenotazione"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verifica che DATABASE_URL sia configurato
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL non configurato"
    echo ""
    echo "Opzioni:"
    echo "  1. Export DATABASE_URL prima di eseguire:"
    echo "     export DATABASE_URL='postgresql://...'"
    echo "     ./run-tests.sh"
    echo ""
    echo "  2. Usa file .env.local:"
    echo "     source .env.local"
    echo "     ./run-tests.sh"
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL configurato"
echo ""

# Esegui test
echo "🚀 Esecuzione test..."
echo ""

npx tsx tests/booking-flow-test.ts

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Test Suite completata con successo!"
    echo ""
    echo "Prossimi passi:"
    echo "  - Verifica docs/TEST_RESULTS.md per dettagli"
    echo "  - Esegui 'npm run build' per verificare compilazione"
    echo "  - Pronto per il deploy in produzione"
else
    echo "❌ Alcuni test sono falliti"
    echo ""
    echo "Azioni consigliate:"
    echo "  - Controlla l'output sopra per dettagli errori"
    echo "  - Correggi i problemi rilevati"
    echo "  - Riesegui i test"
fi

echo ""

exit $EXIT_CODE
