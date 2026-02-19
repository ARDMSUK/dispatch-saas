import { Resend } from 'resend';

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
            from: 'Dispatch SaaS <onboarding@resend.dev>', // Update this with your verified domain
            to,
            subject,
            html,
        });
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error };
    }
}

export const getResetPasswordEmail = (resetLink: string) => `
    <div style="font-family: sans-serif; max-w-md; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>You requested a password reset for your Dispatch SaaS account.</p>
        <p>Click the link below to set a new password:</p>
        <a href="${resetLink}" style="display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
        <p style="font-size: 12px; color: #666;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    </div>
`;

export const getWelcomeEmail = (name: string, loginUrl: string, email: string, tempPass: string) => `
    <div style="font-family: sans-serif; max-w-md; margin: 0 auto;">
        <h2>Welcome to the Team, ${name}!</h2>
        <p>An account has been created for you on Dispatch SaaS.</p>
        <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${tempPass}</p>
        </div>
        <p>Please log in and change your password immediately.</p>
    </div>
`;
