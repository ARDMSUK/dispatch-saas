

import { EmailTemplates } from "./email-templates";
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const EmailService = {
    async sendBookingConfirmation(booking: any, orgSettings?: any) {
        const companyName = orgSettings?.name || 'CABAI System';
        const replyTo = orgSettings?.email;
        const subject = `Booking Confirmed #${booking.id.toString().padStart(6, '0')}`;
        const html = EmailTemplates.bookingConfirmation(booking, companyName);
        const to = booking.customer?.email || booking.passengerEmail || booking.email;

        if (!to) {
            console.warn(`[EmailService] No email address found for booking #${booking.id}`);
            return { success: false, error: 'No email address found' };
        }

        return this.sendEmail(to, subject, html, companyName, replyTo);
    },

    async sendPaymentConfirmation(booking: any, orgSettings?: any) {
        const companyName = orgSettings?.name || 'CABAI System';
        const replyTo = orgSettings?.email;
        const subject = `Payment Receipt - Booking #${booking.id.toString().padStart(6, '0')}`;
        const html = EmailTemplates.paymentConfirmation(booking, companyName);
        const to = booking.customer?.email || booking.passengerEmail || booking.email;

        if (!to) {
            console.warn(`[EmailService] No email address found for booking #${booking.id}`);
            return { success: false, error: 'No email address found' };
        }

        return this.sendEmail(to, subject, html, companyName, replyTo);
    },

    async sendDriverAssigned(booking: any, driver: any, orgSettings?: any) {
        const companyName = orgSettings?.name || 'CABAI System';
        const replyTo = orgSettings?.email;
        const subject = `Driver Assigned - ${driver.name} is on the way`;
        const html = EmailTemplates.driverAssigned(booking, driver, companyName, orgSettings?.enableLiveTracking !== false);
        const to = booking.customer?.email || booking.passengerEmail || booking.email;

        if (!to) {
            console.warn(`[EmailService] No email address found for booking #${booking.id}`);
            return { success: false, error: 'No email address found' };
        }

        return this.sendEmail(to, subject, html, companyName, replyTo);
    },

    async sendDriverArrived(booking: any, driver: any, orgSettings?: any) {
        const companyName = orgSettings?.name || 'CABAI System';
        const replyTo = orgSettings?.email;
        const subject = `Driver Arrived - ${driver.name} is waiting outside`;
        const html = EmailTemplates.driverArrived(booking, driver, companyName, orgSettings?.enableLiveTracking !== false);
        const to = booking.customer?.email || booking.passengerEmail || booking.email;

        if (!to) {
            console.warn(`[EmailService] No email address found for booking #${booking.id}`);
            return { success: false, error: 'No email address found' };
        }

        return this.sendEmail(to, subject, html, companyName, replyTo);
    },

    async sendJobReceipt(booking: any, orgSettings?: any) {
        const companyName = orgSettings?.name || 'CABAI System';
        const replyTo = orgSettings?.email;
        const subject = `Receipt for Your Journey #${booking.id.toString().padStart(6, '0')}`;
        const html = EmailTemplates.jobReceipt(booking, companyName);
        const to = booking.customer?.email || booking.passengerEmail || booking.email;

        if (!to) {
            console.warn(`[EmailService] No email address found for booking #${booking.id}`);
            return { success: false, error: 'No email address found' };
        }

        return this.sendEmail(to, subject, html, companyName, replyTo);
    },

    async sendJobCancelled(booking: any, orgSettings?: any) {
        const companyName = orgSettings?.name || 'CABAI System';
        const replyTo = orgSettings?.email;
        const subject = `Booking Cancelled #${booking.id.toString().padStart(6, '0')}`;
        const html = EmailTemplates.jobCancelled(booking, companyName);
        const to = booking.customer?.email || booking.passengerEmail || booking.email;

        if (!to) {
            console.warn(`[EmailService] No email address found for booking #${booking.id}`);
            return { success: false, error: 'No email address found' };
        }

        return this.sendEmail(to, subject, html, companyName, replyTo);
    },

    async sendEmail(to: string, subject: string, html: string, companyName: string = 'CABAI System', replyTo?: string) {
        if (RESEND_API_KEY) {
            // Real Sending Logic
            try {
                console.log(`[EmailService] Sending real email to ${to} via Resend...`);
                if (!resend) {
                    throw new Error("Resend client not initialized");
                }
                const emailPayload: any = {
                    from: `${companyName} <no-reply@cabai.co.uk>`,
                    to: [to],
                    subject: subject,
                    html: html,
                };
                
                if (replyTo) {
                    emailPayload.reply_to = replyTo;
                }
                
                const data = await resend.emails.send(emailPayload);
                return { success: true, method: 'RESEND', data };
            } catch (error) {
                console.error("[EmailService] Failed to send email", error);
                return { success: false, error };
            }
        } else {
            // Mock Sending Logic
            console.log("==================================================");
            console.log(`[MOCK EMAIL] From: ${companyName} <no-reply@cabai.co.uk>`);
            if (replyTo) console.log(`[MOCK EMAIL] Reply-To: ${replyTo}`);
            console.log(`[MOCK EMAIL] To: ${to}`);
            console.log(`[MOCK EMAIL] Subject: ${subject}`);
            console.log(`[MOCK EMAIL] HTML Preview: ${html.substring(0, 100)}...`);
            console.log("==================================================");
            return { success: true, method: 'MOCK' };
        }
    }
};
