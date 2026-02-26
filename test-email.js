const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Polyfill minimal email service for local logging
const EmailTemplates = {
    bookingConfirmation: (booking, companyName = 'Our Service') => {
        return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Booking Confirmed: #${booking.id.toString().padStart(6, '0')}</h2>
      <p>Dear ${booking.passengerName},</p>
      <p>Thank you for booking with ${companyName}. Your booking has been received and confirmed.</p>
      
      <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Pickup:</strong> ${booking.pickupAddress}</p>
        <p><strong>Dropoff:</strong> ${booking.dropoffAddress}</p>
        <p><strong>Date:</strong> ${new Date(booking.pickupTime).toLocaleString()}</p>
        <p><strong>Vehicle:</strong> ${booking.vehicleType}</p>
        <p><strong>Price:</strong> ${booking.fare ? `£${booking.fare.toFixed(2)}` : 'Metered/Pending'}</p>
      </div>

      <p>We will notify you when a driver has been assigned.</p>
    </div>
  `;
    }
};

async function main() {
    const job = await prisma.job.findFirst({
        orderBy: { updatedAt: 'desc' },
        include: { customer: true }
    });

    if (!job) {
        console.log("No job found");
        return;
    }

    console.log(`Testing with Job #${job.id}, Customer Email: ${job?.customer?.email} or ${job?.passengerEmail}`);

    try {
        const companyName = 'Our Service';
        const subject = `Booking Confirmed #${job.id.toString().padStart(6, '0')}`;

        // This line fails if job.pickupTime is missing or invalid in the original template
        console.log("Generating HTML...");
        const html = EmailTemplates.bookingConfirmation(job, companyName);
        console.log("HTML generated successfully.");

        const to = job.customer?.email || job.passengerEmail || job.email;
        if (!to) {
            console.log("Error: No email address found");
        } else {
            console.log(`Would send to: ${to}`);
        }
    } catch (e) {
        console.error("Error generating/sending email:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
