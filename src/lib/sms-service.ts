
import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const client = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN)
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

export const SmsService = {
    parseTemplate(template: string, booking: any, driver?: any) {
        const vehicle = driver?.vehicles?.[0];
        const vehicleDesc = vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model} (${vehicle.reg})` : 'our car';

        const date = new Date(booking.pickupTime).toLocaleString([], {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return template
            .replace(/{booking_id}/g, booking.id || '')
            .replace(/{pickup_time}/g, date)
            .replace(/{pickup_address}/g, booking.pickupAddress || '')
            .replace(/{dropoff_address}/g, booking.dropoffAddress || '')
            .replace(/{driver_name}/g, driver?.name || '')
            .replace(/{driver_phone}/g, driver?.phone || '')
            .replace(/{vehicle_details}/g, vehicleDesc);
    },

    async sendBookingConfirmation(booking: any, orgSettings?: any) {
        if (!booking.passengerPhone) return;

        let message = '';
        if (orgSettings?.smsTemplateConfirmation) {
            message = this.parseTemplate(orgSettings.smsTemplateConfirmation, booking);
        } else {
            const date = new Date(booking.pickupTime).toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const company = orgSettings?.name || 'Dispatch';
            message = `${company}: Booking #${booking.id} Confirmed.\nPickup: ${date}\nFrom: ${booking.pickupAddress}`;
        }

        return this.sendSms(booking.passengerPhone, message);
    },

    async sendDriverAssigned(booking: any, driver: any, orgSettings?: any) {
        if (!booking.passengerPhone) return;

        let message = '';
        if (orgSettings?.smsTemplateDriverAssigned) {
            message = this.parseTemplate(orgSettings.smsTemplateDriverAssigned, booking, driver);
        } else {
            const vehicle = driver.vehicles?.[0];
            const vehicleDesc = vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model} (${vehicle.reg})` : 'our car';
            const company = orgSettings?.name || 'Dispatch';
            message = `${company}: Driver Assigned.\n${driver.name} is on the way in ${vehicleDesc}.\nCall: ${driver.phone}`;
        }

        return this.sendSms(booking.passengerPhone, message);
    },

    async sendDriverArrived(booking: any, driver: any, orgSettings?: any) {
        if (!booking.passengerPhone) return;

        let message = '';
        if (orgSettings?.smsTemplateDriverArrived) {
            message = this.parseTemplate(orgSettings.smsTemplateDriverArrived, booking, driver);
        } else {
            const vehicle = driver.vehicles?.[0];
            const vehicleDesc = vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model} (${vehicle.reg})` : 'our car';
            const company = orgSettings?.name || 'Dispatch';
            message = `${company}: Driver Arrived.\n${driver.name} is waiting outside in ${vehicleDesc}.\nCall: ${driver.phone}`;
        }

        return this.sendSms(booking.passengerPhone, message);
    },

    async sendJobOfferToDriver(booking: any, driver: any, orgSettings?: any) {
        if (!driver.phone) return;

        const date = new Date(booking.pickupTime).toLocaleString([], {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const company = orgSettings?.name || 'Dispatch';
        const message = `${company}: New Job Assigned.\nPickup: ${date}\nFrom: ${booking.pickupAddress}\nTo: ${booking.dropoffAddress}\nLog in to view details.`;
        return this.sendSms(driver.phone, message);
    },

    async sendJobReceipt(booking: any) {
        // Receipts are better via Email, but a short text works too
        // Skipping SMS receipt to save cost/spam unless requested
        return { success: true, skipped: true };
    },

    async sendSms(to: string, body: string, config?: { accountSid?: string, authToken?: string, fromNumber?: string } | null) {

        // Priority: Passed Config > Global Env
        const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
        const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = config?.fromNumber || process.env.TWILIO_PHONE_NUMBER;

        if (accountSid && authToken && fromNumber) {
            try {
                // Initialize client dynamically
                const dynamicClient = twilio(accountSid, authToken);

                console.log(`[SmsService] Sending real SMS to ${to} via ${fromNumber}...`);
                const message = await dynamicClient.messages.create({
                    body: body,
                    from: fromNumber,
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
            console.log(`[MOCK SMS] Config Missing: SID=${!!accountSid}, Auth=${!!authToken}, From=${!!fromNumber}`);
            console.log("==================================================");
            return { success: true, method: 'MOCK' };
        }
    }
};
