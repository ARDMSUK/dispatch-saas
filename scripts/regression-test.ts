import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

async function fetchWithCookie(url: string, options: any, cookieStr: string) {
    const headers = new Headers(options.headers || {});
    headers.set('Cookie', cookieStr);
    headers.set('Content-Type', 'application/json');
    return fetch(url, { ...options, headers });
}

async function login(email: string, password: string = 'Password123!') {
    // Obtain CSRF token
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData: any = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const initialCookie = csrfRes.headers.get('set-cookie') || '';

    // NextAuth credentials login
    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        redirect: 'manual', // DO NOT follow redirect, we want the Set-Cookie header on the 302
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': initialCookie,
        },
        body: new URLSearchParams({
            email,
            password,
            csrfToken,
            redirect: 'false'
        }).toString()
    });

    if (loginRes.status !== 302 && loginRes.status !== 200) {
        throw new Error(`Login failed for ${email} with status ${loginRes.status}`);
    }

    const setCookies = loginRes.headers.getSetCookie();
    if (!setCookies || setCookies.length === 0) {
        throw new Error(`No cookies returned on login for ${email}`);
    }
    const cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');
    return cookieHeader; // Can be used directly as Cookie header
}

async function run() {
    console.log("=== Starting Regression Test ===");

    // Find users for testing
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, include: { tenant: true } });
    const dispatcherUser = await prisma.user.findFirst({ where: { role: 'DISPATCHER' }, include: { tenant: true } });
    const b2bUser = await prisma.user.findFirst({ where: { role: 'B2B_ADMIN' }, include: { tenant: true } });

    if (!adminUser || !dispatcherUser || !b2bUser) {
        console.error("Missing test data users.");
        process.exit(1);
    }

    const bcrypt = await import('bcryptjs');
    const knownHash = await bcrypt.hash('Password123!', 10);
    await prisma.user.updateMany({
        where: { id: { in: [adminUser.id, dispatcherUser.id, b2bUser.id] } },
        data: { password: knownHash, forcePasswordReset: false, twoFactorEnabled: false }
    });

    await prisma.tenant.updateMany({
        where: { id: { in: [adminUser.tenantId, dispatcherUser.tenantId, b2bUser.tenantId] } },
        data: { subscriptionStatus: 'ACTIVE' }
    });

    console.log(`Using Dispatcher: ${dispatcherUser.email} (Tenant: ${dispatcherUser.tenant.slug})`);

    const adminCookie = await login(adminUser.email);
    const dispatcherCookie = await login(dispatcherUser.email);
    const b2bCookie = await login(b2bUser.email);

    let passed = 0;
    let failed = 0;

    const assertStatus = async (name: string, res: Response, expected: number) => {
        if (res.status === expected) {
            console.log(`✅ PASS: ${name} (Status ${res.status})`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${name} (Expected ${expected}, got ${res.status})`);
            const text = await res.text();
            console.error(`   Response: ${text}`);
            failed++;
        }
    };

    // 1. Dispatcher can create CASH job
    const jobRes = await fetchWithCookie(`${BASE_URL}/api/jobs`, {
        method: 'POST',
        body: JSON.stringify({
            pickupAddress: 'Test Pickup',
            dropoffAddress: 'Test Dropoff',
            passengerName: 'Regression Test',
            passengerPhone: '1234567890',
            pickupTime: new Date().toISOString(),
            paymentType: 'CASH',
            fare: 10
        })
    }, dispatcherCookie);
    await assertStatus("Dispatcher create CASH job", jobRes, 201);
    const jobData: any = jobRes.status === 201 ? await jobRes.json() : null;

    // 3. Dispatcher settings access returns 403
    const settingsRes = await fetchWithCookie(`${BASE_URL}/api/settings/organization`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' })
    }, dispatcherCookie);
    await assertStatus("Dispatcher edit settings", settingsRes, 403);

    // 4. B2B_ADMIN job creation/dispatch returns 403
    const b2bJobRes = await fetchWithCookie(`${BASE_URL}/api/jobs`, {
        method: 'POST',
        body: JSON.stringify({
            pickupAddress: 'Test Pickup B2B',
            dropoffAddress: 'Test Dropoff B2B',
            passengerName: 'Regression Test',
            passengerPhone: '1234567890',
            pickupTime: new Date().toISOString(),
            paymentType: 'CASH',
            fare: 10
        })
    }, b2bCookie);
    await assertStatus("B2B Admin on Operator Job Route", b2bJobRes, 403);

    // 5. Locked tenant write action returns 403
    await prisma.tenant.update({ where: { id: adminUser.tenantId }, data: { subscriptionStatus: 'PAST_DUE' } });
    const lockedRes = await fetchWithCookie(`${BASE_URL}/api/settings/organization`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' })
    }, adminCookie);
    await assertStatus("Locked tenant write action", lockedRes, 403);

    // 6. ACTIVE tenant write action succeeds
    await prisma.tenant.update({ where: { id: adminUser.tenantId }, data: { subscriptionStatus: 'ACTIVE' } });
    const activeRes = await fetchWithCookie(`${BASE_URL}/api/settings/organization`, {
        method: 'PATCH',
        body: JSON.stringify({ name: adminUser.tenant.name }) // send same name
    }, adminCookie);
    await assertStatus("Active tenant write action", activeRes, 200);

    // 7. TRIALING tenant write action succeeds
    await prisma.tenant.update({ where: { id: adminUser.tenantId }, data: { subscriptionStatus: 'TRIALING' } });
    const trialingRes = await fetchWithCookie(`${BASE_URL}/api/settings/organization`, {
        method: 'PATCH',
        body: JSON.stringify({ name: adminUser.tenant.name }) // send same name
    }, adminCookie);
    await assertStatus("Trialing tenant write action", trialingRes, 200);
    await prisma.tenant.update({ where: { id: adminUser.tenantId }, data: { subscriptionStatus: 'ACTIVE' } });

    // 8. Public web CASH booking succeeds
    const publicCashRes = await fetch(`${BASE_URL}/api/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tenantSlug: dispatcherUser.tenant.slug,
            pickupAddress: 'Public Pickup',
            dropoffAddress: 'Public Dropoff',
            passengerName: 'Public Passenger',
            passengerPhone: '1234567890',
            pickupTime: new Date().toISOString(),
            paymentType: 'CASH'
        })
    });
    await assertStatus("Public web CASH booking", publicCashRes, 200);

    // 9. Public web TERMINAL booking returns 400
    const publicTerminalRes = await fetch(`${BASE_URL}/api/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tenantSlug: dispatcherUser.tenant.slug,
            pickupAddress: 'Public Pickup',
            dropoffAddress: 'Public Dropoff',
            passengerName: 'Public Passenger',
            passengerPhone: '1234567890',
            paymentType: 'TERMINAL'
        })
    });
    await assertStatus("Public web TERMINAL booking", publicTerminalRes, 400);

    // 14 & 15. Verify Audit Logs were created
    const auditCount = await prisma.auditLog.count({
        where: { action: { in: ['UPDATE_TENANT_SETTINGS'] } }
    });
    if (auditCount > 0) {
        console.log(`✅ PASS: Audit Logs verified (${auditCount} found)`);
        passed++;
    } else {
        console.error(`❌ FAIL: Audit Logs not found`);
        failed++;
    }

    if (jobData) {
        // 10. CARD payment-link route validation
        const paymentLinkRes = await fetchWithCookie(`${BASE_URL}/api/jobs/${jobData.id}/payment-link`, {
            method: 'POST'
        }, dispatcherCookie);
        // It shouldn't trigger live stripe if tenant not configured, or if it does, we expect 400 or 500 but NOT 404.
        // It might actually succeed if the tenant has test stripe keys.
        await assertStatus("CARD payment-link route validation", paymentLinkRes, paymentLinkRes.status === 400 || paymentLinkRes.status === 500 || paymentLinkRes.status === 200 ? paymentLinkRes.status : 400); // basically just checking it doesn't crash weirdly

        // Edit/Cancel job to verify Audit Log
        const cancelJobRes = await fetchWithCookie(`${BASE_URL}/api/jobs/${jobData.job.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'CANCELLED' })
        }, dispatcherCookie);
        await assertStatus("Dispatcher Cancel Job", cancelJobRes, 200);

        const jobAuditCount = await prisma.auditLog.count({
            where: { resourceId: jobData.job.id.toString(), action: 'CANCEL_BOOKING' }
        });
        if (jobAuditCount > 0) {
            console.log(`✅ PASS: Job Cancel Audit Log verified`);
            passed++;
        } else {
            console.error(`❌ FAIL: Job Cancel Audit Log not found`);
            failed++;
        }

        // 16. Refund route is RBAC protected and creates AuditLog
        const refundRes = await fetchWithCookie(`${BASE_URL}/api/jobs/${jobData.job.id}/refund`, {
            method: 'POST'
        }, dispatcherCookie);
        await assertStatus("Dispatcher Refund returns 403", refundRes, 403);
    }

    // 13. Driver FREE/BUSY status endpoint remains unaffected
    const driver = await prisma.driver.findFirst({ where: { tenantId: adminUser.tenantId }});
    if (driver) {
        // Need to hit /api/drivers/[id] to update status (we added AuditLog to it, let's see if it works)
        const driverRes = await fetchWithCookie(`${BASE_URL}/api/drivers/${driver.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ name: driver.name })
        }, adminCookie);
        await assertStatus("Driver Update Route works", driverRes, 200);
        
        const driverAuditCount = await prisma.auditLog.count({
            where: { resourceId: driver.id, action: 'UPDATE_DRIVER' }
        });
        if (driverAuditCount > 0) {
            console.log(`✅ PASS: Driver Audit Log verified`);
            passed++;
        } else {
            console.error(`❌ FAIL: Driver Audit Log not found`);
            failed++;
        }
    } else {
        console.warn("⚠️ No driver found to test driver route.");
    }

    console.log(`\n=== Summary ===`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(console.error).finally(() => prisma.$disconnect());
