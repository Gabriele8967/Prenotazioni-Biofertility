export default function TerminiCondizioni() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Termini e Condizioni di Utilizzo del Servizio
          </h1>

          <div className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                1. Oggetto del Servizio
              </h2>
              <p>
                Il presente documento disciplina l'utilizzo del sistema di prenotazione online
                del Centro Medico Biofertility (di seguito "il Centro" o "il Titolare").
              </p>
              <p>
                Il servizio consente agli utenti di prenotare visite mediche specialistiche e
                prestazioni sanitarie erogate dal Centro, attraverso la piattaforma digitale
                accessibile all'indirizzo https://prenotazioni-biofertility.vercel.app
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                2. Accettazione dei Termini
              </h2>
              <p>
                L'utilizzo del servizio di prenotazione implica l'accettazione integrale dei
                presenti Termini e Condizioni. L'utente che non intenda accettare, in tutto o
                in parte, i presenti Termini e Condizioni è invitato a non utilizzare il servizio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                3. Modalità di Prenotazione
              </h2>
              <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Procedura</h3>
              <p>
                La prenotazione avviene attraverso i seguenti passaggi:
              </p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Selezione del tipo di visita/prestazione sanitaria</li>
                <li>Scelta del professionista sanitario</li>
                <li>Selezione di data e orario tra quelli disponibili</li>
                <li>Inserimento dei dati personali del paziente</li>
                <li>Accettazione della Privacy Policy, del Consenso Informato e dei presenti Termini</li>
                <li>Conferma della prenotazione</li>
              </ol>

              <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Conferma</h3>
              <p>
                Al completamento della prenotazione, l'utente riceverà:
              </p>
              <ul className="list-disc pl-6">
                <li>Email di conferma con i dettagli della prenotazione</li>
                <li>Invito al calendario Google (se configurato)</li>
                <li>Link per il pagamento (se richiesto)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                4. Obblighi dell'Utente
              </h2>
              <p>
                L'utente si impegna a:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Fornire dati personali <strong>veritieri, accurati e aggiornati</strong>
                </li>
                <li>
                  Presentarsi all'appuntamento munito di <strong>documento di identità valido</strong> e
                  tessera sanitaria
                </li>
                <li>
                  Comunicare tempestivamente eventuali <strong>allergie, patologie o terapie in corso</strong>
                </li>
                <li>
                  Rispettare l'orario concordato (presentarsi con 10 minuti di anticipo)
                </li>
                <li>
                  Comunicare con <strong>almeno 24 ore di preavviso</strong> eventuali cancellazioni o
                  modifiche
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                5. Cancellazioni e Modifiche
              </h2>
              <h3 className="text-xl font-semibold mt-4 mb-2">5.1 Cancellazione da parte del Paziente</h3>
              <ul className="list-disc pl-6">
                <li>
                  <strong>Più di 24 ore prima</strong>: Cancellazione gratuita, rimborso totale (se pagato)
                </li>
                <li>
                  <strong>Meno di 24 ore prima</strong>: Penale del 50% sulla tariffa
                </li>
                <li>
                  <strong>Mancata presentazione (no-show)</strong>: Addebito della tariffa intera
                </li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">5.2 Cancellazione da parte del Centro</h3>
              <p>
                Il Centro si riserva il diritto di cancellare o riprogrammare l'appuntamento per:
              </p>
              <ul className="list-disc pl-6">
                <li>Impedimento improvviso del professionista sanitario</li>
                <li>Cause di forza maggiore</li>
                <li>Emergenze sanitarie</li>
              </ul>
              <p className="mt-2">
                In tal caso, il Centro comunicherà tempestivamente la cancellazione e offrirà
                alternative di riprogrammazione o rimborso integrale.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                6. Tariffe e Pagamenti
              </h2>
              <h3 className="text-xl font-semibold mt-4 mb-2">6.1 Tariffe</h3>
              <p>
                Le tariffe delle prestazioni sono indicate chiaramente durante il processo di
                prenotazione e sono comprensive di IVA (ove applicabile).
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">6.2 Modalità di Pagamento</h3>
              <p>Il pagamento può essere effettuato:</p>
              <ul className="list-disc pl-6">
                <li>Online tramite link fornito via email</li>
                <li>Presso il Centro al momento della visita (contanti, carta, bancomat)</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">6.3 Fatturazione</h3>
              <p>
                Su richiesta, il Centro rilascia fattura detraibile ai fini fiscali. La richiesta
                di fattura deve essere effettuata al momento del pagamento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                7. Responsabilità del Centro
              </h2>
              <p>
                Il Centro garantisce l'erogazione delle prestazioni sanitarie secondo i migliori
                standard professionali e nel rispetto delle normative vigenti.
              </p>
              <p className="mt-2">
                <strong>Il Centro non è responsabile per:</strong>
              </p>
              <ul className="list-disc pl-6">
                <li>Malfunzionamenti del sistema di prenotazione dovuti a cause esterne</li>
                <li>Interruzioni del servizio per manutenzione programmata (previa comunicazione)</li>
                <li>Dati forniti in modo errato o incompleto dall'utente</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                8. Protezione dei Dati Personali
              </h2>
              <p>
                Il trattamento dei dati personali avviene nel rispetto del GDPR (Regolamento UE
                2016/679) e della normativa italiana in materia di privacy.
              </p>
              <p className="mt-2">
                Per informazioni dettagliate sul trattamento dei dati, consultare la{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                9. Proprietà Intellettuale
              </h2>
              <p>
                Tutti i contenuti presenti sulla piattaforma (testi, immagini, loghi, grafica)
                sono di proprietà del Centro Medico Biofertility o utilizzati su licenza.
              </p>
              <p className="mt-2">
                È vietata la riproduzione, anche parziale, dei contenuti senza autorizzazione
                scritta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                10. Modifiche ai Termini e Condizioni
              </h2>
              <p>
                Il Centro si riserva il diritto di modificare in qualsiasi momento i presenti
                Termini e Condizioni. Le modifiche saranno pubblicate su questa pagina con
                indicazione della data di ultimo aggiornamento.
              </p>
              <p className="mt-2">
                L'utilizzo continuato del servizio dopo la pubblicazione delle modifiche
                costituisce accettazione dei nuovi Termini.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                11. Legge Applicabile e Foro Competente
              </h2>
              <p>
                I presenti Termini e Condizioni sono regolati dalla legge italiana.
              </p>
              <p className="mt-2">
                Per qualsiasi controversia relativa all'interpretazione, esecuzione o risoluzione
                dei presenti Termini e Condizioni, sarà competente in via esclusiva il Foro di
                <strong> Roma</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                12. Contatti
              </h2>
              <p>
                Per informazioni, chiarimenti o reclami relativi al servizio di prenotazione:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-3">
                <p>
                  <strong>Centro Medico Biofertility</strong>
                </p>
                <p>Via Velletri 7, Roma</p>
                <p>Tel: 068415269</p>
                <p>Email: info@biofertility.it</p>
                <p>PEC: centrobio fertility@pec.it (esempio)</p>
              </div>
            </section>

            <section className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6">
              <h3 className="text-xl font-semibold mb-3">
                📄 Dichiarazione di Accettazione
              </h3>
              <p className="text-sm">
                Procedendo con la prenotazione, l'utente dichiara di aver letto, compreso e
                accettato integralmente i presenti Termini e Condizioni, la Privacy Policy e il
                Consenso Informato.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
              <p>
                <strong>Ultimo aggiornamento</strong>: {new Date().toLocaleDateString('it-IT')}
              </p>
              <p className="mt-2">Versione 1.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
