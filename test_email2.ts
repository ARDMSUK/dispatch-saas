import { Resend } from 'resend';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const data = await resend.emails.send({
    from: 'CABAI <no-reply@cabai.co.uk>',
    to: 'digitaldmagency@gmail.com',
    subject: 'Test CABAI',
    html: '<p>Test</p>'
  });
  console.log(data);
}
test();
