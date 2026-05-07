async function test() {
    const res = await fetch(`http://api.aviationstack.com/v1/flights?access_key=e62d41b2e706d08d7eb9ad93c728f3d4&flight_iata=BA60&limit=1`);
    console.log(res.status, await res.text());
}
test();
