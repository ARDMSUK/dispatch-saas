const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
    try {
        console.log('Using API Key:', process.env.RESEND_API_KEY ? 'Found' : 'Missing');
        const { data, error } = await resend.emails.send({
            from: 'CABAI <no-reply@cabai.co.uk>',
            to: 'ar@bourneendtaxis.com',
            subject: 'Test Email from Antigravity',
            html: '<p>This is a test email.</p>',
        });

        if (error) {
            console.error('Resend Error:', JSON.stringify(error, null, 2));
        } else {
            console.log('Success:', data);
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

testEmail();
