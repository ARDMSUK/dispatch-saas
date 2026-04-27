const { PrismaClient } = require("@prisma/client"); const p = new PrismaClient(); p.user.findFirst({where: {email: "dmagency@gmail.com"}, include: {tenant: true}}).then(console.log);
