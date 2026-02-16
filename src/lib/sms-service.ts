
import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const client = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN)
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

export const SmsService = {
    async sendBookingConfirmation(booking: any) {
        if (!booking.passengerPhone) return;

        const date = new Date(booking.pickupTime).toLocaleString([], {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const message = `Thames Lines: Booking #${booking.id} Confirmed.\nPickup: ${date}\nFrom: ${booking.pickupAddress}`;
        return this.sendSms(booking.passengerPhone, message);
    },

    async sendDriverAssigned(booking: any, driver: any) {
        if (!booking.passengerPhone) return;

        const vehicle = driver.vehicles?.[0];
        const vehicleDesc = vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model} (${vehicle.reg})` : 'our car';

        const message = `Thames Lines: Driver Assigned.\n${driver.name} is on the way in ${vehicleDesc}.\nCall: ${driver.phone}`;
        return this.sendSms(booking.passengerPhone, message);
    },

    async sendJobReceipt(booking: any) {
        // Receipts are better via Email, but a short text works too
        // Skipping SMS receipt to save cost/spam unless requested
        return { success: true, skipped: true };
    },

    async sendSms(to: string, body: string) {
        if (client && TWILIO_PHONE_NUMBER) {
            try {
                console.log(`[SmsService] Sending real SMS to ${to}...`);
                const message = await client.messages.create({
                    body: body,
                    from: TWILIO_PHONE_NUMBER,
                    to: to
                });
                return { success: true, sid: message.sid };
            } catch (error) {
                console.error("[SmsService] Failed to send SMS", error);
                return { success: false, error };
            }
        } else {
            // Mock Sending Logic
            console.log("==================================================");
            console.log(`[MOCK SMS] To: ${to}`);
            console.log(`[MOCK SMS] Message: ${body}`);
            console.log("==================================================");
            return { success: true, method: 'MOCK' };
        }
    }
};
