const BASE_URL = 'http://localhost:3000';

async function loginAndGetCookie() {
    const res = await fetch(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await res.json();
    const cookieHeader = res.headers.getSetCookie();
    let cookie = '';
    if (cookieHeader && cookieHeader.length > 0) {
        cookie = cookieHeader.map(c => c.split(';')[0]).join('; ');
    }

    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
        },
        body: new URLSearchParams({
            email: 'hello@cabai.co.uk',
            password: 'Greenstar520!',
            csrfToken: csrfToken,
            json: 'true'
        })
    });

    const loginCookies = loginRes.headers.getSetCookie();
    if (loginCookies && loginCookies.length > 0) {
        cookie += '; ' + loginCookies.map(c => c.split(';')[0]).join('; ');
    }
    return cookie;
}

async function runTests() {
    try {
        console.log('Logging in...');
        const cookie = await loginAndGetCookie();
        console.log('Got cookie.');

        const uuid = Date.now().toString() + Math.random().toString().substring(2, 6);
        const tenantId = 'cm0e1t97l0001y589a01x2345'; // Assumption based on standard tests, but we'll use API.
        
        // Helper to post
        const postJob = async (body) => {
            return fetch(`${BASE_URL}/api/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookie
                },
                body: JSON.stringify(body)
            });
        };

        const basePayload = {
            pickupAddress: "10 Downing St, London",
            dropoffAddress: "Heathrow Airport",
            pickupTime: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            passengerName: "Gate 2 Test",
            passengerPhone: "07700900000",
            fare: "50",
            paymentType: "CASH"
        };

        console.log('\n--- 1. Recurring series first submission -> complete expected series created ---');
        const recurPayload1 = {
            ...basePayload,
            idempotencyKey: uuid,
            isRecurring: true,
            recurrenceRule: 'DAILY',
            recurrenceInterval: "1",
            recurrenceEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString() // 3 days
        };
        const res1 = await postJob(recurPayload1);
        const data1 = await res1.json();
        console.log(`Status 1: ${res1.status}`);
        if (res1.status === 201 && data1.job) {
            console.log(`Created first job: ${data1.job.id}, key: ${data1.job.idempotencyKey}`);
        } else {
            console.error(data1);
        }

        console.log('\n--- 2. Recurring retry same key -> same complete series returned, no duplicates ---');
        const res2 = await postJob(recurPayload1);
        const data2 = await res2.json();
        console.log(`Status 2: ${res2.status}`);
        if (res2.status === 200 && data2.job) {
            console.log(`Returned existing first job: ${data2.job.id}, key: ${data2.job.idempotencyKey}`);
        } else {
            console.error(data2);
        }

        console.log('\n--- 3. Concurrent recurring submissions -> one complete series only ---');
        const uuid2 = Date.now().toString() + Math.random().toString().substring(2, 6);
        const recurPayload2 = { ...recurPayload1, idempotencyKey: uuid2 };
        const reqs = [
            postJob(recurPayload2),
            postJob(recurPayload2),
            postJob(recurPayload2)
        ];
        const responses = await Promise.all(reqs);
        for (let i = 0; i < responses.length; i++) {
            const r = responses[i];
            const d = await r.json();
            console.log(`Concurrent response ${i}: Status ${r.status}, Job ID: ${d.job?.id}`);
        }

        console.log('\n--- 4. Different recurring request key -> second legitimate series allowed ---');
        const uuid3 = Date.now().toString() + Math.random().toString().substring(2, 6);
        const recurPayload3 = { ...recurPayload1, idempotencyKey: uuid3 };
        const res4 = await postJob(recurPayload3);
        const data4 = await res4.json();
        console.log(`Status 4: ${res4.status}, Job ID: ${data4.job?.id}`);

        console.log('\n--- 5. Partial pre-existing deterministic key set -> controlled error, not false 200 ---');
        // Let's create a single job with the first key of a series, then try the series.
        const uuidPartial = Date.now().toString() + Math.random().toString().substring(2, 6);
        const singlePayload = {
            ...basePayload,
            idempotencyKey: uuidPartial // This creates key uuidPartial:0
        };
        await postJob(singlePayload);
        const recurPayloadPartial = {
            ...recurPayload1,
            idempotencyKey: uuidPartial // Tries to create uuidPartial:0, uuidPartial:1, uuidPartial:2...
        };
        const res5 = await postJob(recurPayloadPartial);
        console.log(`Status 5: ${res5.status}`);
        const data5 = await res5.json();
        console.log(data5);

        console.log('\n--- 6. Return booking creates its intended :0 / :1 pair ---');
        const uuidReturn = Date.now().toString() + Math.random().toString().substring(2, 6);
        const returnPayload = {
            ...basePayload,
            idempotencyKey: uuidReturn,
            returnBooking: true,
            returnDate: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString()
        };
        const res6 = await postJob(returnPayload);
        console.log(`Status 6: ${res6.status}`);
        const data6 = await res6.json();
        console.log(`Job 1 ID: ${data6.job?.id}, Key: ${data6.job?.idempotencyKey}`);
        console.log(`Job 2 ID: ${data6.returnJob?.id}, Key: ${data6.returnJob?.idempotencyKey}`);

        console.log('\n--- 7. Retry return booking -> exactly same pair returned ---');
        const res7 = await postJob(returnPayload);
        console.log(`Status 7: ${res7.status}`);
        const data7 = await res7.json();
        console.log(`Returned Job 1 ID: ${data7.job?.id}, Key: ${data7.job?.idempotencyKey}`);
        console.log(`Returned Job 2 ID: ${data7.returnJob?.id}, Key: ${data7.returnJob?.idempotencyKey}`);

        console.log('\n--- 8. Driver manual assignment strictly requires FREE ---');
        const jobId = data4.job?.id;
        if (jobId) {
            // Fetch drivers to find a FREE one and a non-FREE one
            // We can just try driver IDs 1 through 10, or directly query DB if needed.
            // For now, let's just make the PATCH request assuming driver 1 exists.
            
            // First we need to fetch drivers.
            const driversRes = await fetch(`${BASE_URL}/api/drivers`, {
                headers: { 'Cookie': cookie }
            });
            const drivers = await driversRes.json();
            
            if (drivers.length > 0) {
                const freeDriver = drivers.find(d => d.status === 'FREE');
                const busyDriver = drivers.find(d => d.status !== 'FREE');
                
                if (busyDriver) {
                    console.log(`Testing assignment to non-FREE driver (${busyDriver.status}):`);
                    const assignRes = await fetch(`${BASE_URL}/api/jobs/${jobId}/assign`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
                        body: JSON.stringify({ driverId: busyDriver.id, currentVersion: 0 }) // Adjust version if needed
                    });
                    console.log(`Status: ${assignRes.status}`);
                    console.log(await assignRes.json());
                } else {
                    console.log("No non-FREE driver found to test.");
                }

                if (freeDriver) {
                    console.log(`Testing assignment to FREE driver (${freeDriver.status}):`);
                    const assignRes2 = await fetch(`${BASE_URL}/api/jobs/${jobId}/assign`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
                        body: JSON.stringify({ driverId: freeDriver.id, currentVersion: data4.job?.version || 0 })
                    });
                    console.log(`Status: ${assignRes2.status}`);
                    console.log(await assignRes2.json());
                } else {
                    console.log("No FREE driver found to test.");
                }
            } else {
                console.log("No drivers returned.");
            }
        }

    } catch (e) {
        console.error(e);
    }
}

runTests();
