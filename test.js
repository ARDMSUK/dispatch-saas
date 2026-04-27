const { PrismaClient } = require("@prisma/client"); const p = new PrismaClient(); p.job.count({where: {flightNumber: {not: null}}}).then(console.log);
