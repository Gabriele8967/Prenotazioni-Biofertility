export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>

        <div className="prose prose-blue max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Titolare del Trattamento</h2>
            <p>
              Il Titolare del trattamento dei dati è: <strong>JUNIOR S.R.L.</strong> (Centro Biofertility)<br />
              Sede legale: Viale Eroi di Rodi 214, 00128 Roma (RM)<br />
              Sede operativa: Via Velletri 7, 00198 Roma (RM)<br />
              P.IVA: 05470161000<br />
              Codice Fiscale: 05470161000<br />
              Email: centrimanna2@gmail.com<br />
              PEC: juniorsrlroma@pec.it
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Dati Raccolti</h2>
            <p>I dati personali raccolti attraverso il nostro sistema di prenotazione includono:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Dati identificativi</strong>: nome, cognome, email, numero di telefono</li>
              <li><strong>Dati relativi alla prenotazione</strong>: servizio richiesto, data e ora appuntamento, note mediche</li>
              <li><strong>Dati tecnici</strong>: indirizzo IP, user agent, cookies tecnici</li>
              <li><strong>Dati sensibili (particolari)</strong>: informazioni sulla salute necessarie per la prenotazione (Art. 9 GDPR)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Base Giuridica e Finalità</h2>
            <p>I tuoi dati personali sono trattati per le seguenti finalità:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Esecuzione del contratto</strong> (Art. 6.1.b GDPR): gestione prenotazioni e erogazione servizi sanitari</li>
              <li><strong>Consenso esplicito</strong> (Art. 9.2.a GDPR): trattamento dati sulla salute per finalità sanitarie</li>
              <li><strong>Obbligo legale</strong> (Art. 6.1.c GDPR): conservazione documenti fiscali e sanitari</li>
              <li><strong>Consenso marketing</strong> (Art. 6.1.a GDPR): invio comunicazioni promozionali (opzionale)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Modalità di Trattamento</h2>
            <p>I dati personali sono trattati con strumenti automatizzati e manuali, con logiche strettamente correlate alle finalità e comunque in modo da garantire la sicurezza e riservatezza dei dati.</p>
            <p className="mt-3"><strong>Misure di sicurezza adottate:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Crittografia delle comunicazioni (HTTPS/TLS)</li>
              <li>Password hashate con algoritmo bcrypt</li>
              <li>Backup regolari e disaster recovery</li>
              <li>Accesso limitato ai dati solo al personale autorizzato</li>
              <li>Audit log di tutte le operazioni sui dati sensibili</li>
              <li>Firewall e sistemi anti-intrusione</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Periodo di Conservazione</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Dati prenotazione</strong>: conservati per 10 anni (obbligo normativa sanitaria)</li>
              <li><strong>Dati fatturazione</strong>: conservati per 10 anni (obbligo fiscale)</li>
              <li><strong>Dati marketing</strong>: conservati fino a revoca del consenso</li>
              <li><strong>Log di accesso</strong>: conservati per 12 mesi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Comunicazione e Diffusione</h2>
            <p>I tuoi dati personali possono essere comunicati a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personale sanitario</strong>: medici e operatori autorizzati</li>
              <li><strong>Fornitori di servizi IT</strong>: hosting, manutenzione sistemi (Data Processor)</li>
              <li><strong>Provider di pagamento</strong>: per processare i pagamenti</li>
              <li><strong>Autorità competenti</strong>: su richiesta legale</li>
            </ul>
            <p className="mt-3">I dati non saranno mai venduti o ceduti a terze parti per scopi commerciali.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Trasferimenti Extra-UE</h2>
            <p>I dati possono essere trasferiti verso paesi extra-UE solo attraverso fornitori che garantiscano adeguate misure di protezione (es. Google Cloud - Privacy Shield/Standard Contractual Clauses).</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. I Tuoi Diritti (Art. 15-22 GDPR)</h2>
            <p>In qualsiasi momento puoi esercitare i seguenti diritti:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Diritto di accesso</strong> (Art. 15): ottenere conferma se i tuoi dati sono trattati</li>
              <li><strong>Diritto di rettifica</strong> (Art. 16): correggere dati inesatti o incompleti</li>
              <li><strong>Diritto di cancellazione</strong> (Art. 17 - &quot;diritto all&apos;oblio&quot;): richiedere cancellazione dati non più necessari</li>
              <li><strong>Diritto di limitazione</strong> (Art. 18): limitare il trattamento in determinate circostanze</li>
              <li><strong>Diritto di portabilità</strong> (Art. 20): ricevere i dati in formato strutturato</li>
              <li><strong>Diritto di opposizione</strong> (Art. 21): opporsi al trattamento per motivi legittimi</li>
              <li><strong>Revoca consenso</strong>: revocare il consenso in qualsiasi momento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Come Esercitare i Diritti</h2>
            <p>Per esercitare i tuoi diritti, puoi contattarci tramite:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email: <a href="mailto:centrimanna2@gmail.com" className="text-blue-600 hover:underline">centrimanna2@gmail.com</a></li>
              <li>PEC: <a href="mailto:juniorsrlroma@pec.it" className="text-blue-600 hover:underline">juniorsrlroma@pec.it</a></li>
              <li>Telefono: 06 841 5269</li>
              <li>Posta: JUNIOR S.R.L., Viale Eroi di Rodi 214, 00128 Roma (RM)</li>
            </ul>
            <p className="mt-3">Risponderemo entro 30 giorni dalla ricezione della richiesta.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Cookies</h2>
            <p>Il sito utilizza solo cookies tecnici strettamente necessari per il funzionamento del sistema di autenticazione. Non utilizziamo cookies di profilazione o tracciamento.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Minori</h2>
            <p>Il servizio non è destinato a minori di 16 anni. Se sei genitore/tutore e scopri che un minore ha fornito dati senza consenso, contattaci immediatamente.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Modifiche alla Privacy Policy</h2>
            <p>Ci riserviamo il diritto di modificare questa privacy policy. Le modifiche saranno comunicate con preavviso e pubblicate su questa pagina con data di aggiornamento.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">13. Reclami</h2>
            <p>Hai il diritto di presentare reclamo all&apos;Autorità Garante per la Protezione dei Dati Personali:</p>
            <p className="mt-2">
              <strong>Garante per la protezione dei dati personali</strong><br />
              Piazza Venezia 11, 00187 Roma<br />
              Tel: +39 06 696771<br />
              Fax: +39 06 69677785<br />
              Email: garante@gpdp.it<br />
              PEC: protocollo@pec.gpdp.it
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">14. Responsabile della Protezione Dati</h2>
            <p>
              <strong>JUNIOR S.R.L.</strong>, in quanto struttura sanitaria con meno di 250 dipendenti e trattamento dati sanitari non su larga scala, non è obbligata alla nomina di un DPO (Data Protection Officer) ai sensi dell&apos;art. 37 GDPR.
            </p>
            <p className="mt-2">
              Per qualsiasi questione relativa alla protezione dei dati personali, contattare direttamente il Titolare del Trattamento agli indirizzi indicati nella sezione 9.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t">
          <p className="text-sm text-gray-600">
            Documento conforme al Regolamento (UE) 2016/679 (GDPR) e al D.Lgs. 196/2003 (Codice Privacy) come modificato dal D.Lgs. 101/2018
          </p>
        </div>
      </div>
    </div>
  );
}
