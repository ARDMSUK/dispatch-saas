import { Resend } from 'resend';
import { BaseEmailLayout } from './email-templates';

interface EmailParams {
    to: string;
    subject: string;
    html: string;
    apiKey?: string | null;
}

export async function sendEmail({ to, subject, html, apiKey }: EmailParams) {
    // Priority: Passed API Key > Global Env
    const key = apiKey || process.env.RESEND_API_KEY;

    if (!key) {
        console.warn('RESEND_API_KEY is not set (and no tenant key provided). Email not sent.');
        console.log(`[Mock Email] To: ${to}, Subject: ${subject}, Content: ${html.substring(0, 100)}...`);
        return { success: true, mock: true };
    }

    try {
        const resend = new Resend(key);
        const data = await resend.emails.send({
            from: 'CABAI <no-reply@cabai.co.uk>',
            to,
            subject,
            html,
        });

        if (data.error) {
            console.error('Resend API Error:', data.error);
            return { success: false, error: data.error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error };
    }
}

export const getResetPasswordEmail = (resetLink: string, brandColor: string = '#f59e0b', logoUrl: string = '') => {
    const safeBrandColor = brandColor.startsWith('#') ? brandColor : '#f59e0b';
    const orgSettings = {
        name: 'Account Security',
        brandColor: safeBrandColor,
        logoUrl: logoUrl
    };

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">🔒 Password Reset</span>
        <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px;">Reset Your Password</h2>
        <p style="margin: 0; color: #666666; font-size: 16px;">We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
      </div>

      <div style="text-align: center; margin: 35px 0;">
        <a href="${resetLink}" style="background-color: ${safeBrandColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
          Reset Password
        </a>
      </div>

      <div style="text-align: center;">
        <p style="margin: 0; color: #9ca3af; font-size: 14px;">This secure link will expire in 1 hour.</p>
      </div>
    `;

    return BaseEmailLayout(contentHtml, orgSettings, "Password Reset");
};

export const getWelcomeEmail = (
    name: string,
    loginUrl: string,
    email: string,
    tempPass: string,
    tenantName: string = 'Cabai',
    brandColor: string = '#f59e0b',
    logoUrl: string = ''
) => {
    const safeBrandColor = brandColor.startsWith('#') ? brandColor : '#f59e0b';
    const orgSettings = {
        name: tenantName,
        brandColor: safeBrandColor,
        logoUrl: logoUrl
    };

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">👋 Welcome Aboard</span>
        <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px;">Welcome to ${tenantName}!</h2>
        <p style="margin: 0; color: #666666; font-size: 16px;">Hi ${name}, your account is ready. Here are your details to get started.</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <tr>
          <td style="padding: 15px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="100%" valign="top">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Portal URL</strong><br/>
                  <span style="color: #333333; font-size: 16px;"><a href="${loginUrl}" style="color: ${safeBrandColor}; text-decoration: none; font-weight: bold;">${loginUrl}</a></span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Email</strong><br/>
                  <span style="color: #333333; font-size: 16px;">${email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 15px;">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Temporary Password</strong><br/>
                  <span style="display: inline-block; background-color: #f3f4f6; color: #111827; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 16px; margin-top: 5px;">${tempPass}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin-top: 25px;">
        <p style="margin: 0; color: #666666; font-size: 14px;">For security reasons, please log in and change your password immediately.</p>
      </div>
    `;

    return BaseEmailLayout(contentHtml, orgSettings, "Welcome");
};

export const getPassengerReceiptEmail = (
    tenantName: string,
    jobId: string,
    pickup: string,
    dropoff: string,
    time: string,
    price: string,
    brandColor: string = '#f59e0b',
    logoUrl: string = ''
) => `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
        ${logoUrl ? `<div style="text-align: center; margin-bottom: 30px;"><img src="${logoUrl}" alt="${tenantName} Logo" style="max-height: 60px;" /></div>` : `<h1 style="text-align: center; color: ${brandColor};">${tenantName}</h1>`}
        <h2 style="border-bottom: 2px solid ${brandColor}; padding-bottom: 10px;">Booking Receipt</h2>
        <p>Thank you for booking with us. Your journey details are below.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: ${brandColor};">Booking REF: #${jobId}</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Date/Time:</strong></td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #ddd;">${new Date(time).toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Pickup:</strong></td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #ddd;">${pickup}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Dropoff:</strong></td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #ddd;">${dropoff}</td></tr>
                <tr><td style="padding: 12px 0 0 0; font-size: 1.2em;"><strong>Total Fare:</strong></td><td style="padding: 12px 0 0 0; font-size: 1.2em; text-align: right; color: ${brandColor};"><strong>${price}</strong></td></tr>
            </table>
        </div>
        <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">This is an automated receipt generated by the Dispatch Platform.</p>
    </div>
`;


export const getSupportEscalationEmail = (ticketId: string, tenantName: string, subject: string, brandColor: string = '#ef4444', logoUrl: string = '') => {
    const safeBrandColor = brandColor.startsWith('#') ? brandColor : '#ef4444';
    const orgSettings = {
        name: tenantName,
        brandColor: safeBrandColor,
        logoUrl: logoUrl
    };

    const adminLink = `https://app.cabai.co.uk/admin/support/${ticketId}`;

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">🚨 Support Ticket Escalated</span>
        <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px;">Action Required</h2>
        <p style="margin: 0; color: #666666; font-size: 16px;">The AI Support Agent for <strong>${tenantName}</strong> has escalated a ticket to human support.</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
        <tr>
          <td style="padding: 15px; background-color: #fef2f2; border-bottom: 1px solid #fecaca;">
            <strong style="color: #991b1b; font-size: 14px; text-transform: uppercase;">Ticket Details</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 15px 5px 15px;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Ticket ID</strong><br/>
            <span style="color: #333333; font-size: 16px;">${ticketId}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 15px 15px 15px;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Subject</strong><br/>
            <span style="color: #333333; font-size: 16px;">${subject}</span>
          </td>
        </tr>
      </table>

      <div style="text-align: center;">
        <p style="margin: 0 0 15px 0; color: #666666; font-size: 16px;">Please log in to the admin console to review the chat transcript and reply to the user.</p>
        <a href="${adminLink}" style="background-color: ${safeBrandColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
          View Ticket in Admin Console
        </a>
      </div>
    `;

    return BaseEmailLayout(contentHtml, orgSettings, "Support Escalation");
};
