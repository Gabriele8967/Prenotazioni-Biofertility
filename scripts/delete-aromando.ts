import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const emailToDelete = 'aromando@gmail.com';

async function main() {
  console.log(`--- Inizio pulizia per l'utente: ${emailToDelete} ---`);

  try {
    // 1. Trova l'utente
    const user = await prisma.user.findUnique({
      where: { email: emailToDelete },
    });

    if (!user) {
      console.log(`✅ Utente non trovato. Nessuna azione necessaria.`);
      return;
    }

    console.log(` trovato utente con ID: ${user.id}`);

    // 2. Elimina le prenotazioni associate
    const deletedBookings = await prisma.booking.deleteMany({
      where: { patientId: user.id },
    });

    if (deletedBookings.count > 0) {
      console.log(` rimosse ${deletedBookings.count} prenotazioni associate.`);
    } else {
      console.log(` Nessuna prenotazione associata da rimuovere.`);
    }

    // 3. Elimina l'utente
    await prisma.user.delete({
      where: { id: user.id },
    });

    console.log(`✅ Utente ${emailToDelete} rimosso con successo.`);

  } catch (error) {
    console.error(`❌ Errore durante la rimozione dell'utente:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log(`--- Pulizia completata ---`);
  }
}

main();
