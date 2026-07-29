import { config } from 'dotenv';
config({ path: '.env.local' });

import { prisma } from '../src/lib/prisma';
import { signDriverToken, verifyDriverToken } from '../src/lib/driver-auth';
import { signMobileToken, verifyMobileToken } from '../src/lib/mobile-auth';

async function run() {
    console.log('--- Starting Safe Chunk 5 Driver Lockout Test ---');
    
    const activeTenant = await prisma.tenant.findFirst({
        where: { subscriptionStatus: { in: ['ACTIVE', 'TRIALING'] } }
    });
    
    const lockedTenant = await prisma.tenant.findFirst({
        where: { subscriptionStatus: { notIn: ['ACTIVE', 'TRIALING'] } }
    });
    
    if (!activeTenant) throw new Error('No active tenant found');
    if (!lockedTenant) throw new Error('No locked tenant found');
    
    console.log(`Active tenant ID: ${activeTenant.id} (${activeTenant.subscriptionStatus})`);
    console.log(`Locked tenant ID: ${lockedTenant.id} (${lockedTenant.subscriptionStatus})`);
    
    const activeDriverToken = await signDriverToken({
        driverId: 'active-driver-123',
        tenantId: activeTenant.id,
        name: 'Active Driver',
        callsign: 'AD1'
    });
    
    const lockedDriverToken = await signDriverToken({
        driverId: 'locked-driver-456',
        tenantId: lockedTenant.id,
        name: 'Locked Driver',
        callsign: 'LD1'
    });
    
    const activeVerification = await verifyDriverToken(activeDriverToken);
    console.log(`Active Driver JWT Verification: ${activeVerification ? 'PASS (Token decoded)' : 'FAIL (Rejected)'}`);
    
    const lockedVerification = await verifyDriverToken(lockedDriverToken);
    console.log(`Locked Driver JWT Verification: ${lockedVerification ? 'FAIL (Should be rejected)' : 'PASS (Rejected correctly)'}`);
    
    const activeMobileToken = await signMobileToken({
        tenantId: activeTenant.id,
        tenantSlug: activeTenant.slug,
        driverId: 'active-mobile-123',
        callsign: 'AM1',
        role: "DRIVER"
    });
    
    const lockedMobileToken = await signMobileToken({
        tenantId: lockedTenant.id,
        tenantSlug: lockedTenant.slug,
        driverId: 'locked-mobile-456',
        callsign: 'LM1',
        role: "DRIVER"
    });
    
    const activeMobileVerification = await verifyMobileToken(activeMobileToken);
    console.log(`Active Mobile JWT Verification: ${activeMobileVerification ? 'PASS (Token decoded)' : 'FAIL (Rejected)'}`);
    
    const lockedMobileVerification = await verifyMobileToken(lockedMobileToken);
    console.log(`Locked Mobile JWT Verification: ${lockedMobileVerification ? 'FAIL (Should be rejected)' : 'PASS (Rejected correctly)'}`);
    
    process.exit(0);
}

run().catch(console.error);
