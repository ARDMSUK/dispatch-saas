import { calculatePrice } from './src/lib/pricing';
async function main() {
    const res = await calculatePrice({
        pickup: 'Red Lion',
        dropoff: 'Terminal Five',
        distanceMiles: 0.1,
        vehicleType: 'Saloon',
        isWaitAndReturn: true,
        waitingTime: 20,
    });
    console.log(res);
}
main().catch(console.error);
