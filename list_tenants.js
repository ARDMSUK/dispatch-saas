const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.tenant.findMany().then(ts => console.log(ts.map(t => t.id))).finally(() => prisma.$disconnect());
