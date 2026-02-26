import { fetchFlightStatus } from "./src/lib/flight-service.js";

async function test() {
    process.env.AVIATIONSTACK_API_KEY = "dummy_for_now";
    const status = await fetchFlightStatus("LH2486");
    console.log(status);
}

test();
