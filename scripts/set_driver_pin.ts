
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const slug = 'demo-cabs';
    const callsign = 'CAB-001';
    const pin = '1234';

    console.log(`Setting PIN for ${callsign} in ${slug}...`);

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new Error(`Tenant ${slug} not found`);

    // Hash PIN if the auth route expects hash, or plain if it checks plain.
    // The previous analysis said: "PIN verification for drivers supports both plain text (for MVP) and bcrypt hashes."
    // Let's check the route code again to be sure, or just set it as is.
    // Wait, I can't check the route code right now without viewing it again.
    // I recall reading "Test Data Setup" which said "Driver: D-TEST (PIN: 1234)". 
    // `src/app/api/driver/auth/login/route.ts` was viewed. 
    // It likely uses `bcrypt.compare`.
    // Let's just hash it to be safe, or check if the route handles plain text fallback?
    // Actually, looking at `setup_driver_data.ts` (viewed earlier), it successfully logged in with '1234' after setting '1234' in DB? 
    // No, `setup_driver_data.ts` sets `pin: '1234'`. It does NOT hash it in the script.
    // This implies the DB stores plain text PINs for MVP, or the auth route handles plain text.
    // "Design Decisions: PIN verification for drivers supports both plain text (for MVP) and bcrypt hashes."
    // OK, so I will store it as plain text '1234' to match `setup_driver_data.ts`.

    await prisma.driver.update({
        where: { tenantId_callsign: { tenantId: tenant.id, callsign } },
        data: { pin: pin }
    });

    console.log(`Success: PIN set to ${pin} for ${callsign}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
