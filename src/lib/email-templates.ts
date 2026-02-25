
export const EmailTemplates = {
  bookingConfirmation: (booking: any, companyName: string = 'Our Service') => `
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
  `,

  paymentConfirmation: (booking: any, companyName: string = 'Our Service') => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Receipt: #${booking.id.toString().padStart(6, '0')}</h2>
      <p>Dear ${booking.passengerName},</p>
      <p>Thank you for your secure card payment. This email confirms we have received your payment for the upcoming journey with ${companyName}.</p>
      
      <div style="background: #f4f4f5; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Amount Paid:</strong> £${booking.fare ? booking.fare.toFixed(2) : '0.00'}</p>
        <p><strong>Booking Ref:</strong> #${booking.id.toString().padStart(6, '0')}</p>
        <p><strong>Date:</strong> ${new Date(booking.pickupTime).toLocaleString()}</p>
      </div>

      <p>We look forward to seeing you soon.</p>
    </div>
  `,

  driverAssigned: (booking: any, driver: any, companyName: string = 'Our Service', enableLiveTracking = true) => {
    const vehicle = driver.vehicles && driver.vehicles.length > 0 ? driver.vehicles[0] : { model: 'Unknown', reg: 'Unknown' };
    const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://dispatch-saas.vercel.app'}/track/${booking.id}`;

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Driver Assigned</h2>
      <p>Good news! A driver is on the way for your booking #${booking.id.toString().padStart(6, '0')}.</p>
      
      <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Driver:</strong> ${driver.name}</p>
        <p><strong>Vehicle:</strong> ${vehicle.model} (${vehicle.reg})</p>
        <p><strong>Phone:</strong> ${driver.phone}</p>
      </div>

      <p>You can track your driver or contact them directly if needed.</p>
      
      ${enableLiveTracking ? `
      <div style="margin-top: 30px;">
        <a href="${trackingLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Track My Driver
        </a>
      </div>
      ` : ''}
    </div>
  `
  },

  driverArrived: (booking: any, driver: any, companyName: string = 'Our Service', enableLiveTracking = true) => {
    const vehicle = driver.vehicles && driver.vehicles.length > 0 ? driver.vehicles[0] : { model: 'Unknown', reg: 'Unknown' };
    const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://dispatch-saas.vercel.app'}/track/${booking.id}`;

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Driver Arrived</h2>
      <p>Your driver has arrived and is waiting outside for you!</p>
      
      <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Driver:</strong> ${driver.name}</p>
        <p><strong>Vehicle:</strong> ${vehicle.model} (${vehicle.reg})</p>
        <p><strong>Phone:</strong> ${driver.phone}</p>
      </div>

      <p>Please make your way out to the vehicle.</p>
      
      ${enableLiveTracking ? `
      <div style="margin-top: 30px;">
        <a href="${trackingLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Track My Driver
        </a>
      </div>
      ` : ''}
    </div>
  `
  },

  jobReceipt: (booking: any, companyName: string = 'Our Service') => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Receipt: Journey Completed</h2>
      <p>Dear ${booking.passengerName},</p>
      <p>Thank you for riding with ${companyName}. We hope you had a pleasant journey.</p>
      
      <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Booking Ref:</strong> #${booking.id.toString().padStart(6, '0')}</p>
        <p><strong>Date:</strong> ${new Date(booking.pickupTime).toLocaleString()}</p>
        <p><strong>From:</strong> ${booking.pickupAddress}</p>
        <p><strong>To:</strong> ${booking.dropoffAddress}</p>
        <hr style="border: 1px solid #e5e5e5; margin: 15px 0;">
        <p style="font-size: 1.2em;"><strong>Total Paid:</strong> £${booking.fare ? booking.fare.toFixed(2) : '0.00'}</p>
      </div>

      <p>If you have any feedback or need assistance, please reply to this email.</p>
    </div>
  `
};
