async function test() {
    const res = await fetch(`http://api.aviationstack.com/v1/flights?access_key=INVALID_KEY&flight_iata=BA12&limit=1`);
    console.log(res.status, await res.text());
}
test();
