export default function ConsensoInformato() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Consenso Informato al Trattamento Sanitario
          </h1>

          <div className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                1. Identificazione della Struttura Sanitaria
              </h2>
              <p>
                <strong>Denominazione</strong>: Centro Medico Biofertility
                <br />
                <strong>Indirizzo</strong>: Via Velletri 7, Roma
                <br />
                <strong>Telefono</strong>: 068415269
                <br />
                <strong>Email</strong>: info@biofertility.it
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                2. Finalità del Trattamento
              </h2>
              <p>
                Il presente consenso informato ha lo scopo di garantire che il paziente riceva
                informazioni chiare e complete riguardo alle prestazioni sanitarie che verranno
                erogate, ai relativi rischi e benefici, e alle alternative terapeutiche disponibili.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                3. Informazioni sulla Prestazione Sanitaria
              </h2>
              <p>
                Il paziente verrà sottoposto a visita medica specialistica e/o esami diagnostici
                secondo quanto concordato in fase di prenotazione. Il professionista sanitario
                fornirà tutte le informazioni necessarie prima di procedere con qualsiasi intervento.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Benefici Attesi</h3>
              <ul className="list-disc pl-6">
                <li>Diagnosi accurata della condizione clinica</li>
                <li>Individuazione del percorso terapeutico più appropriato</li>
                <li>Monitoraggio dello stato di salute</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Possibili Rischi e Complicanze</h3>
              <ul className="list-disc pl-6">
                <li>Disagi lievi e transitori legati all'esame (es. fastidio, dolore lieve)</li>
                <li>Reazioni allergiche ai materiali utilizzati (raramente)</li>
                <li>
                  Specifici rischi legati alla prestazione che verranno illustrati dal medico
                  prima della visita
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                4. Alternative Terapeutiche
              </h2>
              <p>
                Il medico illustrerà eventuali alternative diagnostiche o terapeutiche disponibili,
                con i relativi vantaggi e svantaggi rispetto alla prestazione proposta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                5. Trattamento dei Dati Sanitari (Art. 9 GDPR)
              </h2>
              <p>
                <strong>Il paziente prende atto che:</strong>
              </p>
              <ul className="list-disc pl-6">
                <li>
                  I dati personali, compresi quelli relativi alla salute (dati "supersensibili"),
                  saranno trattati nel rispetto del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003
                  (Codice Privacy)
                </li>
                <li>
                  Il trattamento dei dati sanitari richiede il <strong>consenso esplicito</strong> del
                  paziente, che può essere revocato in qualsiasi momento
                </li>
                <li>
                  I dati saranno conservati per il tempo necessario alle finalità sanitarie e per gli
                  obblighi di legge (10 anni dalla data dell'ultima prestazione, come da normativa
                  sanitaria)
                </li>
                <li>
                  I dati potranno essere comunicati solo a soggetti autorizzati (es. laboratori di
                  analisi, medici consulenti) e per le finalità strettamente connesse alla prestazione
                  sanitaria
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                6. Diritti dell'Interessato
              </h2>
              <p>
                Ai sensi degli artt. 15-22 del GDPR, il paziente ha diritto di:
              </p>
              <ul className="list-disc pl-6">
                <li>Accedere ai propri dati personali e sanitari</li>
                <li>Richiedere la rettifica di dati inesatti</li>
                <li>
                  Richiedere la cancellazione dei dati (salvo obblighi di legge di conservazione)
                </li>
                <li>Limitare il trattamento dei dati</li>
                <li>Opporsi al trattamento dei dati</li>
                <li>Ricevere i propri dati in formato elettronico (portabilità)</li>
                <li>
                  Proporre reclamo al Garante per la Protezione dei Dati Personali
                  (www.garanteprivacy.it)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                7. Revoca del Consenso
              </h2>
              <p>
                Il paziente ha diritto di revocare in qualsiasi momento il consenso al trattamento
                dei dati sanitari e/o al trattamento sanitario, fermo restando che la revoca non
                pregiudica la liceità del trattamento basato sul consenso prestato prima della
                revoca.
              </p>
              <p className="mt-2">
                La revoca può essere comunicata via email a: privacy@biofertility.it o tramite
                raccomandata A/R all'indirizzo della struttura.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                8. Dichiarazione del Paziente
              </h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="font-semibold">
                  Il paziente dichiara di aver ricevuto, letto e compreso le informazioni contenute
                  nel presente consenso informato e di aver avuto la possibilità di porre domande e
                  ricevere risposte esaurienti da parte del personale sanitario.
                </p>
              </div>
            </section>

            <section className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3 text-yellow-800">
                ⚠️ Nota Importante
              </h3>
              <p className="text-sm">
                Il consenso informato verrà richiesto nuovamente in forma digitale durante la
                procedura di prenotazione online. La prestazione sanitaria non potrà essere erogata
                in assenza del consenso esplicito del paziente.
              </p>
              <p className="text-sm mt-2">
                <strong>Documentazione richiesta alla visita</strong>: Si prega di portare con sé un
                documento di identità valido e la tessera sanitaria.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold mb-4">9. Riferimenti Normativi</h2>
              <ul className="text-sm space-y-1">
                <li>• Regolamento UE 2016/679 (GDPR)</li>
                <li>• D.Lgs. 196/2003 (Codice Privacy) e successive modifiche</li>
                <li>• Provvedimento Garante Privacy del 16/07/2009 - Linee guida in materia di dossier sanitario</li>
                <li>• Codice di Deontologia Medica (art. 33-38)</li>
                <li>• Legge 219/2017 - Norme in materia di consenso informato</li>
              </ul>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
              <p>Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>
              <p className="mt-2">
                Per informazioni: privacy@biofertility.it | Tel. 068415269
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
