import { fetchFlightStatus } from "./src/lib/flight-service.js";

async function test() {
    process.env.AVIATIONSTACK_API_KEY = "f6371aefe0583d7c13cc8f9e8bf1d2bd";
    const status = await fetchFlightStatus("LH2486");
    console.log(status);
}

test();
