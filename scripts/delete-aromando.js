const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const emailToDelete = 'aromando@gmail.com';

async function main() {
  console.log(`--- Inizio pulizia (JS) per l'utente: ${emailToDelete} ---`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: emailToDelete },
    });

    if (!user) {
      console.log(`✅ Utente non trovato. Nessuna azione necessaria.`);
      return;
    }

    console.log(` trovato utente con ID: ${user.id}`);

    const deletedBookings = await prisma.booking.deleteMany({
      where: { patientId: user.id },
    });

    if (deletedBookings.count > 0) {
      console.log(` rimosse ${deletedBookings.count} prenotazioni associate.`);
    } else {
      console.log(` Nessuna prenotazione associata da rimuovere.`);
    }

    await prisma.user.delete({
      where: { id: user.id },
    });

    console.log(`✅ Utente ${emailToDelete} rimosso con successo.`);

  } catch (error) {
    console.error(`❌ Errore durante la rimozione dell'utente:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log(`--- Pulizia completata (JS) ---`);
  }
}

main();
