import { Resend } from 'resend';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const data = await resend.emails.send({
    from: 'Dispatch SaaS <no-reply@taximarketingservices.co.uk>',
    to: 'digitaldmagency@gmail.com',
    subject: 'Test',
    html: '<p>Test</p>'
  });
  console.log(data);
}
test();
