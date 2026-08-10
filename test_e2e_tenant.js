async function run() {
    const API_URL = 'https://app.cabai.co.uk';
    const slug = 'passenger-e2e';
    const phone = '+447000000000';

    console.log(`1. Fetching config for tenant: ${slug}`);
    try {
        const configRes = await fetch(`${API_URL}/api/booker/${slug}/config`);
        const configText = await configRes.text();
        console.log(`Config Status: ${configRes.status}`);
        console.log(`Config Response: ${configText.substring(0, 200)}...`);

        console.log(`\n2. Requesting OTP for phone: ${phone}`);
        const otpRes = await fetch(`${API_URL}/api/booker/${slug}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const otpText = await otpRes.text();
        console.log(`OTP Request Status: ${otpRes.status}`);
        console.log(`OTP Request Response: ${otpText}`);

    } catch (err) {
        console.error('Error during testing:', err);
    }
}

run();
