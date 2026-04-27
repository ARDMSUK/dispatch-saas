const { PrismaClient } = require("@prisma/client"); const p = new PrismaClient(); p.tenant.findUnique({where: {slug: "beaconsfield"}, select: {consoleLayout: true}}).then(console.log);
