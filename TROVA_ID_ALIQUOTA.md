# 🔍 Come Trovare l'ID dell'Aliquota IVA

Sei sulla pagina giusta: `https://secure.fattureincloud.it/settings/vat`

---

## 🎯 Metodo Browser (il più semplice)

### Step 1: Ispeziona la pagina

1. Sulla pagina `https://secure.fattureincloud.it/settings/vat`

2. **Trova l'aliquota "Escluso Art.10"** nella lista (quella con 0%)

3. **Fai clic destro** sulla riga dell'aliquota "Escluso Art.10"

4. **Seleziona "Ispeziona" o "Inspect"** (dipende dal browser)

5. **Nel codice HTML** cerca attributi che contengono l'ID:
   - `data-id="XXXXX"`
   - `data-vat-id="XXXXX"`  
   - `id="vat-XXXXX"`
   - `value="XXXXX"`

6. **Il numero è l'ID che ti serve!**

---

## 🖱️ Metodo Modifica (alternativo)

Se nella lista c'è un pulsante "Modifica" o un'icona ✏️:

1. **Passa il mouse** sopra il pulsante "Modifica" di "Escluso Art.10"

2. **Guarda in basso a sinistra del browser** (status bar)
   - Vedrai un link tipo: `.../vat/edit/XXXXX`
   - XXXXX è l'ID!

3. Oppure **fai clic destro sul pulsante** "Modifica"
   - Seleziona "Copia indirizzo link"
   - Incolla da qualche parte per vedere l'URL
   - L'ID è nel link

---

## 💻 Metodo Console Browser (per esperti)

1. **Apri la Console** del browser:
   - Chrome/Edge: `F12` o `Ctrl+Shift+J`
   - Firefox: `F12` o `Ctrl+Shift+K`
   - Safari: `Cmd+Option+C`

2. **Vai nella tab "Console"**

3. **Incolla questo comando** e premi Invio:

```javascript
// Trova tutte le aliquote IVA nella pagina
const aliquote = Array.from(document.querySelectorAll('[data-id], [data-vat-id], tr[id]'));
aliquote.forEach(el => {
  const text = el.textContent || el.innerText;
  if (text && text.includes('Escluso Art.10')) {
    console.log('🎯 TROVATO!');
    console.log('Elemento:', el);
    console.log('ID trovato:', el.dataset.id || el.dataset.vatId || el.id);
    console.log('Testo:', text);
  }
});
```

4. **Guarda l'output** nella console - ti mostrerà l'ID!

---

## 📸 Metodo Screenshot

Se nessuno dei metodi sopra funziona:

1. **Fai uno screenshot** della pagina con la lista delle aliquote IVA
   - Assicurati che si veda "Escluso Art.10" con valore 0%

2. **Fai clic destro** su "Escluso Art.10"

3. **Seleziona "Ispeziona"**

4. **Fai uno screenshot** anche del codice HTML che appare

5. **Inviami gli screenshot** - ti aiuterò a trovare l'ID

---

## 🆘 Se ancora non funziona

Prova questo script che uso io per recuperare l'ID via API:

```bash
# Esegui dalla cartella del progetto
npx tsx scripts/get-vat-types.ts
```

Lo script ti mostrerà tutte le aliquote con i loro ID!

---

## ✅ Una volta trovato l'ID

Quando hai l'ID (esempio: **78945**), configuralo così:

```bash
# Modifica il file .env
nano .env  # o usa il tuo editor

# Aggiungi questa riga (sostituisci 78945 con l'ID che hai trovato):
FATTUREINCLOUD_EXEMPT_VAT_ID="78945"
```

Poi **riavvia l'applicazione**!

---

**Fammi sapere se riesci a trovare l'ID con uno di questi metodi! 🚀**
