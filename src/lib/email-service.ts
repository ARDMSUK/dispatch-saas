

import { EmailTemplates } from "./email-templates";
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const EmailService = {
    async sendBookingConfirmation(booking: any) {
        const subject = `Booking Confirmed #${booking.id.toString().padStart(6, '0')}`;
        const html = EmailTemplates.bookingConfirmation(booking);
        const to = booking.customer?.email || booking.passengerEmail || booking.email;

        if (!to) {
            console.warn(`[EmailService] No email address found for booking #${booking.id}`);
            return { success: false, error: 'No email address found' };
        }

        return this.sendEmail(to, subject, html);
    },

    async sendDriverAssigned(booking: any, driver: any) {
        const subject = `Driver Assigned - ${driver.name} is on the way`;
        const html = EmailTemplates.driverAssigned(booking, driver);
        const to = booking.customer?.email || booking.passengerEmail || booking.email;

        if (!to) {
            console.warn(`[EmailService] No email address found for booking #${booking.id}`);
            return { success: false, error: 'No email address found' };
        }

        return this.sendEmail(to, subject, html);
    },

    async sendJobReceipt(booking: any) {
        const subject = `Receipt for Your Journey #${booking.id.toString().padStart(6, '0')}`;
        const html = EmailTemplates.jobReceipt(booking);
        const to = booking.customer?.email || booking.passengerEmail || booking.email;

        if (!to) {
            console.warn(`[EmailService] No email address found for booking #${booking.id}`);
            return { success: false, error: 'No email address found' };
        }

        return this.sendEmail(to, subject, html);
    },

    async sendEmail(to: string, subject: string, html: string) {
        if (RESEND_API_KEY) {
            // Real Sending Logic
            try {
                console.log(`[EmailService] Sending real email to ${to} via Resend...`);
                if (!resend) {
                    throw new Error("Resend client not initialized");
                }
                const data = await resend.emails.send({
                    from: 'Thames Lines <onboarding@resend.dev>', // Update this with your verified domain
                    to: [to],
                    subject: subject,
                    html: html,
                });
                return { success: true, method: 'RESEND', data };
            } catch (error) {
                console.error("[EmailService] Failed to send email", error);
                return { success: false, error };
            }
        } else {
            // Mock Sending Logic
            console.log("==================================================");
            console.log(`[MOCK EMAIL] To: ${to}`);
            console.log(`[MOCK EMAIL] Subject: ${subject}`);
            console.log(`[MOCK EMAIL] HTML Preview: ${html.substring(0, 100)}...`);
            console.log("==================================================");
            return { success: true, method: 'MOCK' };
        }
    }
};
