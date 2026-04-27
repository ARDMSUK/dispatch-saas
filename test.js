const { PrismaClient } = require("@prisma/client"); const p = new PrismaClient(); p.job.findUnique({where: {id: 190}, select: {pickupTime: true}}).then(console.log);
