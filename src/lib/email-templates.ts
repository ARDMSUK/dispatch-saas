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

function formatAddressForDisplay(address: string | undefined | null): string {
  if (!address || typeof address !== 'string') return 'Pending';
  const trimmed = address.trim();
  if (trimmed === '') return 'Pending';

  const upperCount = (trimmed.match(/[A-Z]/g) || []).length;
  const lowerCount = (trimmed.match(/[a-z]/g) || []).length;

  if (lowerCount > upperCount) {
    return trimmed;
  }

  let titleCased = trimmed.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });

  titleCased = titleCased.replace(/\b([a-z][a-hj-y]?\d[a-z\d]? ?\d[a-z]{2})\b/gi, (match) => match.toUpperCase());

  const alwaysUpper = ['UK', 'USA', 'NHS', 'VIP'];
  alwaysUpper.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    titleCased = titleCased.replace(regex, word);
  });

  return titleCased;
}

export function BaseEmailLayout(contentHtml: string, orgSettings: any = {}, title: string = 'Notification') {
    const isLegacy = typeof orgSettings === 'string';
    const companyName = isLegacy ? orgSettings : (orgSettings?.name || 'Our Service');
    const brandColor = isLegacy ? '#10b981' : (orgSettings?.brandColor || '#f59e0b');
    const safeBrandColor = brandColor.startsWith('#') ? brandColor : '#f59e0b';
    const logoUrl = isLegacy ? null : orgSettings?.logoUrl;
    const phone = isLegacy ? null : orgSettings?.phone;
    const email = isLegacy ? null : orgSettings?.email;

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

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
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

                <!-- Content Body -->
                <tr>
                  <td style="padding: 0 20px 30px 20px;">
                    ${contentHtml}
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
    `.trim();
}

export const EmailTemplates = {
  bookingConfirmation: (booking: any, orgSettings: any = {}) => {
    const isLegacy = typeof orgSettings === 'string';
    const brandColor = isLegacy ? '#10b981' : (orgSettings?.brandColor || '#f59e0b');
    const safeBrandColor = brandColor.startsWith('#') ? brandColor : '#f59e0b';
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
            <span style="color: #333333; font-size: 16px;">${formatAddressForDisplay(via.address || via)}</span>
          </td>
        </tr>
      `).join('');
    }

    const notesHtml = booking?.notes ? `
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
          <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Notes</strong><br/>
          <span style="color: #333333; font-size: 16px;">${booking.notes}</span>
        </td>
      </tr>
    ` : '';

    const contentHtml = `
      <!-- Intro -->
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">✓ Booking Confirmed</span>
        <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px;">Booking Reference: ${bookingRef}</h2>
        <p style="margin: 0; color: #666666; font-size: 16px;">Hi ${passengerName}, your ride is successfully booked.</p>
      </div>

      <!-- Details Card -->
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
                  <span style="color: #333333; font-size: 16px;">${formatAddressForDisplay(booking?.pickupAddress)}</span>
                </td>
              </tr>
              ${viasHtml}
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Dropoff</strong><br/>
                  <span style="color: #333333; font-size: 16px;">${formatAddressForDisplay(booking?.dropoffAddress)}</span>
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
    `;

    return BaseEmailLayout(contentHtml, orgSettings, "Booking Confirmation");
  },

  
  paymentConfirmation: (booking: any, orgSettings: any = {}) => {
    const isLegacy = typeof orgSettings === 'string';
    const brandColor = isLegacy ? '#10b981' : (orgSettings?.brandColor || '#f59e0b');
    const safeBrandColor = brandColor.startsWith('#') ? brandColor : '#f59e0b';
    const bookingRef = booking?.id ? `#${booking.id.toString().padStart(6, '0')}` : 'Pending';
    const passengerName = booking?.passengerName || 'Customer';

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">💳 Payment Received</span>
        <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px;">Payment Receipt: ${bookingRef}</h2>
        <p style="margin: 0; color: #666666; font-size: 16px;">Hi ${passengerName}, thank you for your secure payment.</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <tr>
          <td style="padding: 15px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Amount Paid</strong><br/>
            <span style="color: ${safeBrandColor}; font-size: 28px; font-weight: bold;">${formatPrice(booking?.fare)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Date & Time</strong><br/>
                  <span style="color: #333333; font-size: 16px;">${formatDateTime(booking?.pickupTime)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Pickup</strong><br/>
                  <span style="color: #333333; font-size: 16px;">${formatAddressForDisplay(booking?.pickupAddress)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 15px;">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Dropoff</strong><br/>
                  <span style="color: #333333; font-size: 16px;">${formatAddressForDisplay(booking?.dropoffAddress)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    return BaseEmailLayout(contentHtml, orgSettings, "Payment Receipt");
  },

  paymentLink: (booking: any, orgSettings: any = {}) => {
    const isLegacy = typeof orgSettings === 'string';
    const brandColor = isLegacy ? '#10b981' : (orgSettings?.brandColor || '#f59e0b');
    const safeBrandColor = brandColor.startsWith('#') ? brandColor : '#f59e0b';
    const bookingRef = booking?.id ? `#${booking.id.toString().padStart(6, '0')}` : 'Pending';

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">💳 Payment Request</span>
        <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px;">Payment Due: ${bookingRef}</h2>
        <p style="margin: 0; color: #666666; font-size: 16px;">Please complete your secure card payment for your recent booking.</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
        <tr>
          <td style="padding: 15px; background-color: #f9fafb; text-align: center;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Amount Due</strong><br/>
            <span style="color: #333333; font-size: 28px; font-weight: bold;">${formatPrice(booking?.fare)}</span>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${booking?.paymentLink}" style="background-color: ${safeBrandColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
          Pay Now
        </a>
      </div>
      
      <div style="text-align: center;">
        <p style="margin: 0; color: #9ca3af; font-size: 14px; word-break: break-all;">
          Or use this link: <a href="${booking?.paymentLink}" style="color: ${safeBrandColor};">${booking?.paymentLink}</a>
        </p>
      </div>
    `;

    return BaseEmailLayout(contentHtml, orgSettings, "Payment Request");
  },

  driverArrived: (booking: any, driver: any, orgSettings: any = {}, enableLiveTracking = true) => {
    const isLegacy = typeof orgSettings === 'string';
    const brandColor = isLegacy ? '#10b981' : (orgSettings?.brandColor || '#f59e0b');
    const safeBrandColor = brandColor.startsWith('#') ? brandColor : '#f59e0b';
    const bookingRef = booking?.id ? `#${booking.id.toString().padStart(6, '0')}` : 'Pending';
    const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cabai.co.uk'}/track/${booking.id}`;
    const vehicle = driver?.vehicles && driver.vehicles.length > 0 ? driver.vehicles[0] : null;
    const vehicleString = vehicle ? `${vehicle.model} (${vehicle.reg})` : 'Your assigned vehicle';
    const driverName = driver?.name || 'A driver';
    const driverPhone = driver?.phone || 'Not provided';

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">📍 Driver Arrived</span>
        <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px;">Booking Reference: ${bookingRef}</h2>
        <p style="margin: 0; color: #666666; font-size: 16px;">${driverName} has arrived and is waiting outside!</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <tr>
          <td style="padding: 15px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="50%" valign="top">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Driver</strong><br/>
                  <span style="color: #333333; font-size: 16px; font-weight: bold;">${driverName}</span>
                </td>
                <td width="50%" valign="top" align="right">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Vehicle</strong><br/>
                  <span style="color: #333333; font-size: 16px; font-weight: bold;">${vehicleString}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Pickup Location</strong><br/>
            <span style="color: #333333; font-size: 16px;">${formatAddressForDisplay(booking?.pickupAddress)}</span>
          </td>
        </tr>
      </table>

      ${enableLiveTracking ? `
      <div style="text-align: center; margin-top: 25px;">
        <a href="${trackingLink}" style="background-color: ${safeBrandColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
          Track My Driver
        </a>
      </div>
      ` : ''}
    `;

    return BaseEmailLayout(contentHtml, orgSettings, "Driver Arrived");
  },

  jobReceipt: (booking: any, companyName: string = 'Our Service') => {
    const orgSettings = { name: companyName || 'Our Service' };
    const bookingRef = booking?.id ? `#${booking.id.toString().padStart(6, '0')}` : 'Pending';
    const passengerName = booking?.passengerName || 'Customer';
    const vehicleType = booking?.vehicleType || 'Standard Vehicle';
    const paymentMethod = booking?.paymentType || 'Standard Payment';
    
    // Fallbacks
    const pickupStr = booking?.pickupAddress ? formatAddressForDisplay(booking.pickupAddress) : 'Pickup location not specified';
    const dropoffStr = booking?.dropoffAddress ? formatAddressForDisplay(booking.dropoffAddress) : 'Drop-off location not specified';
    
    const viasHtml = (booking?.vias && Array.isArray(booking.vias) && booking.vias.length > 0)
      ? booking.vias.map((via: any, index: number) => `
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
              <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Via ${index + 1}</strong><br/>
              <span style="color: #333333; font-size: 16px;">${formatAddressForDisplay(via.address || via)}</span>
            </td>
          </tr>
        `).join('')
      : '';

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">✓ Journey Completed</span>
        <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px;">Receipt for Booking ${bookingRef}</h2>
        <p style="margin: 0; color: #666666; font-size: 16px;">Dear ${passengerName}, thank you for riding with ${orgSettings.name}. We hope you had a pleasant journey.</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
        <tr>
          <td style="padding: 15px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <strong style="color: #374151; font-size: 14px; text-transform: uppercase;">Journey Details</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Date & Time</strong><br/>
            <span style="color: #333333; font-size: 16px;">${formatDateTime(booking?.pickupTime)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Pickup</strong><br/>
            <span style="color: #333333; font-size: 16px;">${pickupStr}</span>
          </td>
        </tr>
        ${viasHtml}
        <tr>
          <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Dropoff</strong><br/>
            <span style="color: #333333; font-size: 16px;">${dropoffStr}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Vehicle Type</strong><br/>
            <span style="color: #333333; font-size: 16px;">${vehicleType}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 15px;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Payment Method</strong><br/>
            <span style="color: #333333; font-size: 16px;">${paymentMethod}</span>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background-color: #f3f4f6;">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Total Paid</strong><br/>
            <span style="color: #111827; font-size: 28px; font-weight: bold; display: block; margin-top: 5px;">${formatPrice(booking?.fare)}</span>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin-top: 25px;">
        <p style="margin: 0; color: #666666; font-size: 14px;">If you have any feedback or need assistance, please reply to this email.</p>
      </div>
    `;

    return BaseEmailLayout(contentHtml, orgSettings, "Booking Receipt");
  },

  jobCancelled: (booking: any, orgSettings: any = {}) => {
    const bookingRef = booking?.id ? `#${booking.id.toString().padStart(6, '0')}` : 'Pending';

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">✕ Booking Cancelled</span>
        <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px;">Booking Reference: ${bookingRef}</h2>
        <p style="margin: 0; color: #666666; font-size: 16px;">We're sorry, but this booking has been cancelled.</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <tr>
          <td style="padding: 15px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Date & Time</strong><br/>
                  <span style="color: #333333; font-size: 16px;">${formatDateTime(booking?.pickupTime)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 15px; border-bottom: 1px solid #eeeeee;">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Pickup</strong><br/>
                  <span style="color: #333333; font-size: 16px;">${formatAddressForDisplay(booking?.pickupAddress)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 15px;">
                  <strong style="color: #666666; font-size: 14px; text-transform: uppercase;">Dropoff</strong><br/>
                  <span style="color: #333333; font-size: 16px;">${formatAddressForDisplay(booking?.dropoffAddress)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    return BaseEmailLayout(contentHtml, orgSettings, "Booking Cancelled");
  }
};
