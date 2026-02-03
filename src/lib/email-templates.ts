
export const EmailTemplates = {
  bookingConfirmation: (booking: any) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Booking Confirmed: #${booking.id.toString().padStart(6, '0')}</h2>
      <p>Dear ${booking.passengerName},</p>
      <p>Thank you for booking with Thames Lines. Your booking has been received and confirmed.</p>
      
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

  driverAssigned: (booking: any, driver: any) => {
    const vehicle = driver.vehicles && driver.vehicles.length > 0 ? driver.vehicles[0] : { model: 'Unknown', reg: 'Unknown' };
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
    </div>
  `
  },

  jobReceipt: (booking: any) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Receipt: Journey Completed</h2>
      <p>Dear ${booking.passengerName},</p>
      <p>Thank you for riding with Thames Lines. We hope you had a pleasant journey.</p>
      
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
