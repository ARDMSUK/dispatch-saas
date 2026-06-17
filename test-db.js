const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      messages: true
    }
  });

  for (const t of tickets) {
    console.log(`\nTicket: ${t.subject} (${t.status}) - Messages: ${t.messages.length}`);
    for (const m of t.messages) {
      console.log(`  [${m.senderType}] ${m.content.substring(0, 50).replace(/\n/g, ' ')}...`);
    }
  }
}
main().finally(() => prisma.$disconnect());
