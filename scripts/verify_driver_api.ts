
async function verify() {
    const BASE_URL = 'http://localhost:3000/api';
    const SLUG = 'zercabs';
    const CALLSIGN = 'D-TEST';
    const PIN = '1234';

    console.log("Starting Verification...");

    // 1. Login
    console.log("\n[1] Logging in...");
    const loginRes = await fetch(`${BASE_URL}/driver/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companySlug: SLUG, callsign: CALLSIGN, pin: PIN })
    });

    if (!loginRes.ok) {
        console.error("Login Failed:", await loginRes.text());
        return;
    }

    const { token, driver } = await loginRes.json();
    console.log("Login Success! Token received for:", driver.name);

    // 2. Get Profile
    console.log("\n[2] Fetching Profile...");
    const profileRes = await fetch(`${BASE_URL}/driver/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const profile = await profileRes.json();
    console.log("Profile:", profile.name, "| Status:", profile.status);

    // 3. Update Status
    console.log("\n[3] Updating Status to BUSY...");
    await fetch(`${BASE_URL}/driver/profile`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'BUSY' })
    });
    console.log("Status Updated.");

    // 4. Fetch Jobs
    console.log("\n[4] Fetching Jobs...");
    const jobsRes = await fetch(`${BASE_URL}/driver/jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const jobs = await jobsRes.json();
    console.log(`Found ${jobs.length} jobs.`);
    if (jobs.length > 0) {
        const jobId = jobs[0].id;
        console.log(`First Job ID: ${jobId}, Status: ${jobs[0].status}`);

        // 5. Update Job Status
        console.log(`\n[5] Updating Job ${jobId} to EN_ROUTE...`);
        const updateRes = await fetch(`${BASE_URL}/driver/jobs/${jobId}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'EN_ROUTE', lat: 51.5074, lng: -0.1278 })
        });

        if (updateRes.ok) {
            console.log("Job Status Updated successfully.");
        } else {
            console.error("Job Status Update Failed:", await updateRes.text());
        }
    } else {
        console.warn("No jobs found to test status update.");
    }

    console.log("\nVerification Complete.");
}

verify().catch(console.error);
