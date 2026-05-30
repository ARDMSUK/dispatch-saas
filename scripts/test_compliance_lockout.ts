import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';

const prisma = new PrismaClient();

async function signDriverToken(payload: { driverId: string; tenantId: string; name: string; callsign: string }) {
    const SECRET_KEY = process.env.AUTH_SECRET || 'fc830c2f305c48600f68d6013d508269';
    const key = new TextEncoder().encode(SECRET_KEY);
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(key);
}

async function testLockout() {
    console.log("--- STARTING COMPLIANCE LOCKOUT TESTS ---");
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error("No tenant found in the database. Run setup first.");
    }

    // 1. Create/find a test driver
    const callsign = "D-COMP-TEST";
    let driver = await prisma.driver.findFirst({
        where: { tenantId: tenant.id, callsign }
    });

    if (driver) {
        // Clean existing documents for clean state
        await prisma.document.deleteMany({ where: { driverId: driver.id } });
        await prisma.driver.update({
            where: { id: driver.id },
            data: {
                status: "OFF_DUTY",
                complianceOverrideActive: false,
                complianceOverrideReason: null,
                licenseExpiry: null
            }
        });
    } else {
        driver = await prisma.driver.create({
            data: {
                tenantId: tenant.id,
                callsign,
                name: "Compliance Test Driver",
                phone: "+447999999999",
                pin: "9999",
                status: "OFF_DUTY",
                complianceOverrideActive: false
            }
        });
    }

    const token = await signDriverToken({
        driverId: driver.id,
        tenantId: tenant.id,
        name: driver.name,
        callsign: driver.callsign
    });

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const statusApiUrl = 'http://localhost:3000/api/driver/status';

    // Helper to send status change request
    async function setStatus(status: string) {
        const res = await fetch(statusApiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ status })
        });
        return {
            status: res.status,
            body: await res.json()
        };
    }

    try {
        // --- CASE 1: No documents uploaded (should block going FREE/online) ---
        console.log("\n[CASE 1] Attempting to go online with NO documents...");
        const res1 = await setStatus('FREE');
        console.log("Response status:", res1.status);
        console.log("Response body:", JSON.stringify(res1.body, null, 2));
        if (res1.status !== 403 || !res1.body.error.includes("Compliance Lockout")) {
            throw new Error("Case 1 Failed: Driver was not blocked from going online with missing documents.");
        }
        console.log("✅ Case 1 Passed: Driver blocked successfully due to missing documents.");

        // --- CASE 2: Upload expired driving license ---
        console.log("\n[CASE 2] Uploading an EXPIRED driving license...");
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 5); // 5 days ago
        
        await prisma.document.create({
            data: {
                tenantId: tenant.id,
                driverId: driver.id,
                type: "DRIVING_LICENSE",
                expiryDate: expiredDate,
                status: "APPROVED"
            }
        });
        // Also upload the other two documents but make them valid
        const farFuture = new Date();
        farFuture.setDate(farFuture.getDate() + 100);
        await prisma.document.create({
            data: {
                tenantId: tenant.id,
                driverId: driver.id,
                type: "PCO_BADGE",
                expiryDate: farFuture,
                status: "APPROVED"
            }
        });
        await prisma.document.create({
            data: {
                tenantId: tenant.id,
                driverId: driver.id,
                type: "INSURANCE",
                expiryDate: farFuture,
                status: "APPROVED"
            }
        });

        const res2 = await setStatus('FREE');
        console.log("Response status:", res2.status);
        console.log("Response body:", JSON.stringify(res2.body, null, 2));
        if (res2.status !== 403 || !res2.body.error.includes("Compliance Lockout") || !res2.body.blocks[0].includes("Expired")) {
            throw new Error("Case 2 Failed: Driver was not blocked with an expired driving license.");
        }
        console.log("✅ Case 2 Passed: Driver blocked successfully due to expired document.");

        // --- CASE 3: Manual compliance override active by dispatcher ---
        console.log("\n[CASE 3] Toggling dispatcher override for the expired document...");
        await prisma.driver.update({
            where: { id: driver.id },
            data: {
                complianceOverrideActive: true,
                complianceOverrideReason: "Temporary licensing extension by TfL"
            }
        });

        const res3 = await setStatus('FREE');
        console.log("Response status:", res3.status);
        console.log("Response body:", JSON.stringify(res3.body, null, 2));
        if (res3.status !== 200 || !res3.body.success || res3.body.status !== 'FREE') {
            throw new Error("Case 3 Failed: Manual override did not allow the driver to go online.");
        }
        console.log("✅ Case 3 Passed: Manual compliance override bypass successfully allowed driver online.");

        // Reset status to OFF_DUTY and disable override for next test
        await prisma.driver.update({
            where: { id: driver.id },
            data: {
                status: "OFF_DUTY",
                complianceOverrideActive: false,
                complianceOverrideReason: null
            }
        });

        // --- CASE 4: Expiration within 7 days warning period ---
        console.log("\n[CASE 4] Setting document to expire in 3 days (within 7 days warning window)...");
        // Update driving license to expire in 3 days
        const soonExpiringDate = new Date();
        soonExpiringDate.setDate(soonExpiringDate.getDate() + 3);
        const drivingLicenseDoc = await prisma.document.findFirst({
            where: { driverId: driver.id, type: "DRIVING_LICENSE" }
        });
        await prisma.document.update({
            where: { id: drivingLicenseDoc!.id },
            data: { expiryDate: soonExpiringDate }
        });

        const res4 = await setStatus('FREE');
        console.log("Response status:", res4.status);
        console.log("Response body:", JSON.stringify(res4.body, null, 2));
        if (res4.status !== 200 || !res4.body.success || res4.body.status !== 'FREE') {
            throw new Error("Case 4 Failed: Driver should be allowed online with warnings.");
        }
        if (!res4.body.warnings || res4.body.warnings.length === 0 || !res4.body.warnings[0].includes("expiring soon")) {
            throw new Error("Case 4 Failed: Expected 7-day expiration warning was not returned.");
        }
        console.log("✅ Case 4 Passed: Driver allowed online with non-blocking 7-day warning.");

    } finally {
        // Cleanup test data
        console.log("\nCleaning up test data...");
        await prisma.document.deleteMany({ where: { driverId: driver.id } });
        await prisma.driver.delete({ where: { id: driver.id } });
        console.log("Cleanup complete.");
        await prisma.$disconnect();
    }
}

testLockout().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
