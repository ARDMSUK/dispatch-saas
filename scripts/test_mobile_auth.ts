import axios from 'axios';

async function testMobileAuth() {
    try {
        console.log("Testing Driver Mobile Auth...");
        const res = await axios.post('http://localhost:3000/api/mobile/driver/auth', {
            tenantSlug: 'qa-live',
            callsign: '101',
            pin: '1234'
        });
        console.log("✅ Success! Token received:");
        console.log(res.data.token);
        console.log("Driver Data:", res.data.driver);
    } catch (err: any) {
        console.error("❌ Failed!");
        console.error(err.response?.data || err.message);
    }
}

testMobileAuth();
