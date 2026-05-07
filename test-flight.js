const API_KEY = 'e62d41b2e706d08d7eb9ad93c728f3d4';
const flightNumber = 'BA12';

async function test() {
    try {
        const url = `http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_iata=${flightNumber}&limit=1`;
        console.log("Fetching: " + url);
        const res = await fetch(url);
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch (e) {
        console.error(e);
    }
}

test();
