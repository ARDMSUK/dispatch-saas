
function formatPrice(fare: any): string {
  if (fare === null || fare === undefined || isNaN(Number(fare))) {
    return 'Metered/Pending';
  }
  return `£${Number(fare).toFixed(2)}`;
}

function formatDateTime(dateString: any): string {
  if (!dateString) return 'Pending';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Pending';
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch (e) {
    return String(dateString);
  }
}

function parseVias(viasRaw: any): any[] {
  if (!viasRaw) return [];
  try {
    if (typeof viasRaw === 'string') {
      return JSON.parse(viasRaw);
    }
    if (Array.isArray(viasRaw)) {
      return viasRaw;
    }
    return [];
  } catch (e) {
    return [];
  }
}

export const EmailTemplates = {
  bookingConfirmation: (booking: any, orgSettings: any = {}) => {
    // If orgSettings is passed as a string from legacy code, use it as companyName
    const isLegacy = typeof orgSettings === 'string';
    const companyName = isLegacy ? orgSettings : (orgSettings?.name || 'Our Service');
    const brandColor = isLegacy ? '#10b981' : (orgSettings?.brandColor || '#f59e0b');
    const safeBrandColor = brandColor.startsWith('#') ? brandColor : '#f59e0b';
    const logoUrl = isLegacy ? null : orgSettings?.logoUrl;
    const phone = isLegacy ? null : orgSettings?.phone;
    const email = isLegacy ? null : orgSettings?.email;
    const bookingRef = booking?.id ? `#${booking.id.toString().padStart(6, '0')}` : 'Pending';
    const passengerName = booking?.passengerName || 'Customer';
    const passengerPhone = booking?.passengerPhone || '';
    
    const vias = parseVias(booking?.vias);
    let viasHtml = '';
    if (vias && vias.length > 0) {
      viasHtml = vias.map((via: any, index: number) => `
        <tr>
          <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Via ${index + 1}</strong><br/>
            <span style="color: #333333; font-size: 16px;">${via.address || via}</span>
          </td>
        </tr>
      `).join('');
    }

    const headerHtml = logoUrl 
      ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 60px; max-width: 200px; display: block; margin: 0 auto;" />`
      : `<h1 style="color: #333333; margin: 0; font-size: 24px; text-align: center;">${companyName}</h1>`;

    const contactHtml = (phone || email) ? `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px;">
        <tr>
          <td align="center" style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #333333; font-size: 18px;">Need help?</h3>
            <p style="margin: 0; color: #666666; font-size: 15px;">
              ${phone ? `Call us: <strong style="color: #333;">${phone}</strong><br/>` : ''}
              ${email ? `Email us: <a href="mailto:${email}" style="color: ${safeBrandColor}; text-decoration: none;">${email}</a>` : ''}
            </p>
          </td>
        </tr>
      </table>
    ` : '';

    const notesHtml = booking?.notes ? `
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
          <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Notes</strong><br/>
          <span style="color: #333333; font-size: 16px;">${booking.notes}</span>
        </td>
      </tr>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5; padding: 20px 10px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <!-- Header Stripe -->
                <tr>
                  <td height="6" style="background-color: ${safeBrandColor}; line-height: 6px; font-size: 6px;">&nbsp;</td>
                </tr>
                
                <!-- Logo/Company Name -->
                <tr>
                  <td align="center" style="padding: 30px 20px 20px 20px;">
                    ${headerHtml}
                  </td>
                </tr>

                <!-- Intro -->
                <tr>
                  <td align="center" style="padding: 0 20px 20px 20px;">
                    <span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">✓ Booking Confirmed</span>
                    <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px;">Booking Reference: ${bookingRef}</h2>
                    <p style="margin: 0; color: #666666; font-size: 16px;">Hi ${passengerName}, your ride is successfully booked.</p>
                  </td>
                </tr>

                <!-- Details Card -->
                <tr>
                  <td style="padding: 0 20px 30px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      
                      <!-- Pickup Time & Vehicle -->
                      <tr>
                        <td style="padding: 15px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50%" valign="top">
                                <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Date & Time</strong><br/>
                                <span style="color: #333333; font-size: 16px; font-weight: bold;">${formatDateTime(booking?.pickupTime)}</span>
                              </td>
                              <td width="50%" valign="top" align="right">
                                <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Vehicle</strong><br/>
                                <span style="color: #333333; font-size: 16px; font-weight: bold;">${booking?.vehicleType || 'Standard'}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Journey Details -->
                      <tr>
                        <td style="padding: 15px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
                                <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Pickup</strong><br/>
                                <span style="color: #333333; font-size: 16px;">${booking?.pickupAddress || 'Pending'}</span>
                              </td>
                            </tr>
                            ${viasHtml}
                            <tr>
                              <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
                                <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Dropoff</strong><br/>
                                <span style="color: #333333; font-size: 16px;">${booking?.dropoffAddress || 'Pending'}</span>
                              </td>
                            </tr>
                            <!-- Passenger & Payment Info -->
                            <tr>
                              <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td width="50%" valign="top">
                                      <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Passenger</strong><br/>
                                      <span style="color: #333333; font-size: 16px;">${passengerName}${passengerPhone ? '<br/>' + passengerPhone : ''}</span>
                                    </td>
                                    <td width="50%" valign="top" align="right">
                                      <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Payment Method</strong><br/>
                                      <span style="color: #333333; font-size: 16px;">${booking?.paymentType || 'CASH'}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            ${notesHtml}
                            
                            <!-- Price -->
                            <tr>
                              <td style="padding: 15px; background-color: #ffffff; text-align: center;">
                                <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Total Price</strong><br/>
                                <span style="color: ${safeBrandColor}; font-size: 28px; font-weight: bold;">${formatPrice(booking?.fare)}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${contactHtml}

                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 20px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                      &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  },

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
    const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cabai.co.uk'}/track/${booking.id}`;

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
    const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cabai.co.uk'}/track/${booking.id}`;

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
  `,

  jobCancelled: (booking: any, companyName: string = 'Our Service') => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Booking Cancelled: #${booking.id.toString().padStart(6, '0')}</h2>
      <p>Dear ${booking.passengerName},</p>
      <p>We sincerely apologize for the inconvenience, but due to a lack of availability, we are unable to accept your booking with ${companyName}.</p>
      
      <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Pickup:</strong> ${booking.pickupAddress}</p>
        <p><strong>Date:</strong> ${new Date(booking.pickupTime).toLocaleString()}</p>
        <p><strong>Status:</strong> Cancelled</p>
      </div>

      <p>If you have any questions, please reply to this email.</p>
    </div>
  `
};
