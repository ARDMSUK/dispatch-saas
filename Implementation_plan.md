# Update WhatsApp AI Agent Booking Requirements

The WhatsApp AI agent does not currently collect all necessary requirements for quote/booking, and bookings are not persisting (likely due to either hallucination of the success message without tool calls, or silent date parsing errors).

## User Review Required
No major breaking changes, but the `Job` database schema will be updated to include `passengerEmail String?` so we can store the passenger's email natively. 

## Proposed Changes

### `prisma/schema.prisma`
- Add `passengerEmail String?` to the `Job` model.

### `src/app/api/whatsapp/webhook/route.ts`
- Update the system prompt to explicitly demand all required information:
  * Date of travel
  * Pickup time
  * Pickup Address (with postcode)
  * Destination address
  * No of passengers
  * No of bags
  * Name
  * Email Address
  * Telephone number
  * Return journey requirements (Date, Time, Flight Number if airport)
- Update the `create_booking` OpenAI tool schema to accept all of these extracted fields.
- Modify the database insertion logic to handle the new fields (like `luggage`, `flightNumber`, and `passengerEmail`).
- If a return journey is requested, spawn a *second* job representing the return leg with reversed pickup/dropoff, linked via `parentJob`.
- Add error logging inside the tool execution so that any `prisma.job.create` failures don't just disappear silently.

## Verification Plan
1. Push the database schema.
2. Send test messages to the WhatsApp webhook to invoke the modified system prompt and verify tool calls.
