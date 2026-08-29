/**
 * Verification Services Module
 * Handles Email OTP, Indian Phone OTP, and UIDAI Aadhaar verification
 * 
 * Environment Variables Required:
 * ─────────────────────────────────────────────────────────────────
 * EMAIL:
 *   SMTP_HOST          - SMTP server host (e.g. smtp.gmail.com)
 *   SMTP_PORT          - SMTP port (587 for TLS)
 *   SMTP_USER          - SMTP username (email address)
 *   SMTP_PASS          - SMTP password or app-specific password
 *   SMTP_FROM          - From address for emails
 * 
 * PHONE (MSG91):
 *   MSG91_AUTH_KEY     - MSG91 authentication key
 *   MSG91_TEMPLATE_ID  - MSG91 OTP template ID
 * 
 * AADHAAR (Surepass UIDAI):
 *   SUREPASS_API_KEY   - Surepass API bearer token
 *   SUREPASS_BASE_URL  - API base URL (https://kyc-api.surepass.io/api/v1)
 * ─────────────────────────────────────────────────────────────────
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════
//                  IN-MEMORY OTP STORE
//    (Replace with Redis in production for multi-server setup)
// ═══════════════════════════════════════════════════════════════
const otpStore = new Map();

function generateOTP(length = 6) {
  return crypto.randomInt(100000, 999999).toString();
}

function storeOTP(key, otp, ttlMs = 5 * 60 * 1000) {
  otpStore.set(key, { otp, expiresAt: Date.now() + ttlMs });
}

function verifyStoredOTP(key, inputOtp) {
  const stored = otpStore.get(key);
  if (!stored) return { valid: false, error: 'No OTP found. Please request a new one.' };
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(key);
    return { valid: false, error: 'OTP has expired. Please request a new one.' };
  }
  if (stored.otp !== inputOtp) {
    return { valid: false, error: 'Invalid OTP. Please try again.' };
  }
  otpStore.delete(key);
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
//                    EMAIL VERIFICATION
//              Uses Nodemailer with SMTP
// ═══════════════════════════════════════════════════════════════

async function getEmailTransporter() {
  // If custom SMTP credentials or Gmail credentials are provided
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const isGmail = process.env.SMTP_USER.endsWith('@gmail.com') || (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail'));
    if (isGmail && !process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback to Ethereal Test Account for instant live email web preview
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      },
      isTestAccount: true
    });
  } catch (err) {
    return null;
  }
}

async function sendEmailOTP(email) {
  const otp = generateOTP();
  const key = `email:${email.toLowerCase()}`;
  storeOTP(key, otp);

  const transporter = await getEmailTransporter();
  
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || '"LocalFixr Security" <no-reply@localfixr.com>',
        to: email,
        subject: 'LocalFixr - Email Verification OTP',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">LocalFixr</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Email Verification</p>
            </div>
            <div style="padding: 32px 24px;">
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">Your verification code is:</p>
              <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #6366f1; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">This code expires in 5 minutes. Do not share this code with anyone.</p>
            </div>
          </div>
        `
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EMAIL OTP] Sent via test account. Preview: ${previewUrl}`);
      } else {
        console.log(`[EMAIL OTP] Sent OTP via SMTP to ${email}`);
      }
      return { sent: true, demo: false };
    } catch (err) {
      console.error(`[EMAIL OTP] Failed to send email:`, err.message);
    }
  }

  // Demo mode: log OTP to console
  console.log(`[EMAIL OTP] Demo mode - OTP for ${email}: ${otp}`);
  return { sent: true, demo: true, demo_otp: otp };
}

function verifyEmailOTP(email, otp) {
  const key = `email:${email.toLowerCase()}`;
  return verifyStoredOTP(key, otp);
}

/**
 * Sends an official, executive-quality HTML Welcome Letter to newly registered/completed service partners
 */
async function sendPartnerWelcomeEmail(partnerUser) {
  if (!partnerUser || !partnerUser.email) return { sent: false, error: 'Invalid user email' };

  const partnerName = partnerUser.name || 'Service Partner';
  const partnerEmail = partnerUser.email;
  const p = partnerUser.providerDetails || {};
  const category = p.category || 'Home Services & Repairs';
  const hourlyRate = p.hourlyRate || 25;
  const location = partnerUser.city || p.location || 'Your Operating City';
  const partnerId = partnerUser._id ? partnerUser._id.toString() : Date.now().toString();
  const clientUrl = process.env.CLIENT_URL || 'https://local-service-app-ten.vercel.app';
  const partnerSignInUrl = `${clientUrl}/auth/login?role=provider&redirect=${encodeURIComponent('/provider-dashboard')}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partner Onboarding Letter - LocalFixr</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ffffff; padding:24px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:650px; background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:32px 36px; text-align:left;">
          
          <!-- Header (Matching Tax Invoice Header) -->
          <tr>
            <td style="padding-bottom:24px; border-bottom:2px solid #0f172a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="top" style="text-align:left;">
                    <h1 style="margin:0; font-size:26px; font-weight:800; color:#0f172a; letter-spacing:-0.03em;">
                      LocalFixr
                    </h1>
                    <p style="margin:4px 0 0 0; font-size:13px; color:#64748b;">
                      LocalFixr Technologies Inc.
                    </p>
                    <p style="margin:2px 0 0 0; font-size:12px; color:#94a3b8;">
                      Service Partner Onboarding &amp; Verification
                    </p>
                  </td>
                  <td valign="top" style="text-align:right;">
                    <h2 style="margin:0; font-size:18px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.04em;">
                      WELCOME LETTER
                    </h2>
                    <div style="margin-top:6px; font-size:13px; color:#4f46e5; font-weight:700; font-family:monospace;">
                      Partner ID: LF-PRO-${partnerId.slice(-6).toUpperCase()}
                    </div>
                    <div style="margin-top:2px; font-size:12px; color:#64748b;">
                      Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style="margin-top:4px;">
                      <span style="display:inline-block; padding:2px 8px; background:#ecfdf5; border:1px solid #a7f3d0; color:#047857; font-size:11px; font-weight:700; border-radius:4px; text-transform:uppercase;">
                        ✓ Verified Partner
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Salutation & Introduction -->
          <tr>
            <td style="padding:24px 0 16px 0;">
              <h3 style="margin:0 0 10px 0; font-size:17px; font-weight:700; color:#0f172a;">
                Dear ${partnerName},
              </h3>
              <p style="margin:0 0 12px 0; font-size:14px; line-height:1.6; color:#334155;">
                We are pleased to welcome you to the <strong>LocalFixr Service Partner Network</strong>. Your partner account and profile have been successfully registered on our marketplace platform.
              </p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#334155;">
                Below are the confirmed registration details and credentials associated with your partner workstation:
              </p>
            </td>
          </tr>

          <!-- Two-Column Details Grid (Same as Invoice Details Grid) -->
          <tr>
            <td style="padding:16px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0; border-radius:6px; background:#fafafa;">
                <tr>
                  <td width="50%" valign="top" style="padding:16px 18px; border-right:1px solid #e2e8f0;">
                    <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">
                      PARTNER INFORMATION
                    </div>
                    <div style="font-size:14px; font-weight:700; color:#0f172a; margin-bottom:4px;">
                      ${partnerName}
                    </div>
                    <div style="font-size:13px; color:#475569; margin-bottom:3px;">
                      Email: ${partnerEmail}
                    </div>
                    <div style="font-size:13px; color:#475569;">
                      Phone: ${partnerUser.phone || 'Provided during verification'}
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding:16px 18px;">
                    <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">
                      SERVICE SPECIFICATIONS
                    </div>
                    <div style="font-size:14px; font-weight:700; color:#4f46e5; margin-bottom:4px;">
                      ${category}
                    </div>
                    <div style="font-size:13px; color:#475569; margin-bottom:3px;">
                      Operating Area: <strong>${location}</strong>
                    </div>
                    <div style="font-size:13px; color:#059669; font-weight:600;">
                      Starting Base Price: <strong>Starts from ₹${hourlyRate}</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary Table (Same as Invoice Table) -->
          <tr>
            <td style="padding:12px 0 20px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; width:100%;">
                <thead>
                  <tr style="border-bottom:1px solid #cbd5e1; background:#f1f5f9;">
                    <th style="padding:10px 12px; font-size:12px; font-weight:700; color:#334155; text-align:left; text-transform:uppercase;">Program Feature</th>
                    <th style="padding:10px 12px; font-size:12px; font-weight:700; color:#334155; text-align:left; text-transform:uppercase;">Details</th>
                    <th style="padding:10px 12px; font-size:12px; font-weight:700; color:#334155; text-align:right; text-transform:uppercase;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:12px; font-size:13px; font-weight:600; color:#0f172a;">Partner Marketplace Access</td>
                    <td style="padding:12px; font-size:13px; color:#475569;">Receive customer repair &amp; service requests in ${location}</td>
                    <td style="padding:12px; font-size:13px; font-weight:700; color:#059669; text-align:right;">Active</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:12px; font-size:13px; font-weight:600; color:#0f172a;">Live GPS En-Route Navigation</td>
                    <td style="padding:12px; font-size:13px; color:#475569;">Real-time customer tracking &amp; doorstep routing</td>
                    <td style="padding:12px; font-size:13px; font-weight:700; color:#059669; text-align:right;">Enabled</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:12px; font-size:13px; font-weight:600; color:#0f172a;">Direct UPI Instant Payouts</td>
                    <td style="padding:12px; font-size:13px; color:#475569;">Instant settlement upon job completion</td>
                    <td style="padding:12px; font-size:13px; font-weight:700; color:#059669; text-align:right;">Active</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- 3 Steps Instructions -->
          <tr>
            <td style="padding:12px 0 24px 0;">
              <div style="font-size:13px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px;">
                Next Steps to Begin Taking Orders:
              </div>
              <ol style="margin:0; padding-left:18px; font-size:13px; line-height:1.7; color:#334155;">
                <li><strong>Complete Identity KYC:</strong> Ensure your Phone OTP &amp; Aadhaar verification is marked complete to display the verified trust badge on your profile.</li>
                <li><strong>Upload Portfolio:</strong> Add previous job photos to your portfolio to increase customer booking conversion.</li>
                <li><strong>Accept Live Jobs:</strong> Keep your Workstation active to receive and accept bookings.</li>
              </ol>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="padding:10px 0 28px 0; text-align:center;">
              <a href="${partnerSignInUrl}" target="_blank" style="display:inline-block; padding:12px 28px; background:#0f172a; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none; border-radius:6px;">
                Sign In to Partner Workstation &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e2e8f0; padding-top:16px; font-size:11px; color:#94a3b8; line-height:1.5;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="font-size:11px; color:#64748b;">
                    🛡️ Official Service Partner Engagement Letter • LocalFixr Marketplace
                  </td>
                  <td align="right" style="font-size:11px; color:#64748b;">
                    Support: support@localfixr.com
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const transporter = await getEmailTransporter();
  const subject = `Welcome to the LocalFixr Partner Network, ${partnerName}! 🌟 Official Onboarding Confirmation`;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `"LocalFixr Partner Network" <${process.env.SMTP_USER}>` : '"LocalFixr Partner Network" <onboarding@localfixr.com>'),
        to: partnerEmail,
        subject: subject,
        html: htmlContent
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`\n=============================================================`);
        console.log(`🌟 [PARTNER WELCOME EMAIL PREVIEW READY]`);
        console.log(`To: ${partnerEmail}`);
        console.log(`Subject: ${subject}`);
        console.log(`🔗 Click to view rendered letter: ${previewUrl}`);
        console.log(`=============================================================\n`);
        return { sent: true, demo: false, previewUrl };
      } else {
        console.log(`[PARTNER WELCOME EMAIL] Sent official welcome letter via real SMTP to ${partnerEmail}`);
        return { sent: true, demo: false };
      }
    } catch (err) {
      console.error(`[PARTNER WELCOME EMAIL] SMTP dispatch failed:`, err.message);
    }
  }

  // Demo / Local development mode fallback:
  console.log(`\n=============================================================`);
  console.log(`📨 [PARTNER WELCOME EMAIL DISPATCHED (DEV/DEMO MODE)]`);
  console.log(`To: ${partnerEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Partner ID: LF-PRO-${partnerId.slice(-6).toUpperCase()}`);
  console.log(`Category: ${category} | Starting Base Price: ₹${hourlyRate}`);
  console.log(`=============================================================\n`);
  return { sent: true, demo: true };
}

// ═══════════════════════════════════════════════════════════════
//               INDIAN PHONE NUMBER VERIFICATION
//         Validates +91 format and uses MSG91 for SMS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates Indian mobile number
 * Accepts: +91XXXXXXXXXX, 91XXXXXXXXXX, XXXXXXXXXX
 * Indian mobile numbers start with 6, 7, 8, or 9
 */
function validateIndianPhone(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Extract 10 digits
  let digits;
  if (cleaned.startsWith('+91')) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    digits = cleaned.slice(2);
  } else {
    digits = cleaned;
  }

  if (digits.length !== 10) {
    return { valid: false, error: 'Indian mobile number must be 10 digits' };
  }

  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { valid: false, error: 'Invalid Indian mobile number. Must start with 6, 7, 8, or 9' };
  }

  return { valid: true, normalized: `+91${digits}`, digits };
}

async function sendPhoneOTP(phone, channel = 'sms') {
  const validation = validateIndianPhone(phone);
  if (!validation.valid) {
    return { sent: false, error: validation.error };
  }

  const otp = generateOTP();
  const key = `phone:${validation.normalized}`;
  storeOTP(key, otp);

  // ── 1. WhatsApp Delivery Channel (Meta Cloud API or Twilio WhatsApp) ──
  if (channel === 'whatsapp' || process.env.WHATSAPP_TOKEN || process.env.TWILIO_ACCOUNT_SID) {
    // Meta WhatsApp Business Cloud API
    if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
      try {
        const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'hello_world';
        
        let payload = {
          messaging_product: 'whatsapp',
          to: validation.normalized.replace('+', ''),
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en_US' }
          }
        };

        // If template has parameters (non-default hello_world)
        if (templateName !== 'hello_world') {
          payload.template.components = [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }]
            }
          ];
        }

        let response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
          },
          body: JSON.stringify(payload)
        });
        
        let data = await response.json();

        // If custom template failed, retry with Meta's default test template 'hello_world'
        if (!data.messages && templateName !== 'hello_world') {
          console.log('[WHATSAPP OTP] Custom template failed, trying Meta default hello_world template...');
          payload.template = { name: 'hello_world', language: { code: 'en_US' } };
          response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
            },
            body: JSON.stringify(payload)
          });
          data = await response.json();
        }

        if (data.messages) {
          console.log(`[WHATSAPP OTP] Real OTP sent via Meta WhatsApp Cloud API to ${validation.normalized}`);
          return { sent: true, demo: false, channel: 'whatsapp', normalized: validation.normalized };
        } else {
          console.error('[WHATSAPP OTP] Meta Cloud API error details:', JSON.stringify(data));
        }
      } catch (err) {
        console.error('[WHATSAPP OTP] Meta request failed:', err.message);
      }
    }

    // Twilio WhatsApp API
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
        
        const params = new URLSearchParams();
        params.append('From', fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`);
        params.append('To', `whatsapp:${validation.normalized}`);
        params.append('Body', `Your LocalFixr verification code is: ${otp}`);

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params
        });
        const data = await response.json();
        if (data.sid) {
          console.log(`[WHATSAPP OTP] Real OTP sent via Twilio WhatsApp to ${validation.normalized}`);
          return { sent: true, demo: false, channel: 'whatsapp', normalized: validation.normalized };
        }
        console.error('[WHATSAPP OTP] Twilio error:', data);
      } catch (err) {
        console.error('[WHATSAPP OTP] Twilio failed:', err.message);
      }
    }
  }

  // ── 2. SMS Delivery Channel (Fast2SMS / MSG91) ──
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.FAST2SMS_API_KEY}&route=otp&variables_values=${otp}&flash=0&numbers=${validation.digits}`, {
        method: 'GET',
        headers: { 'cache-control': 'no-cache' }
      });
      const data = await response.json();
      if (data.return) {
        console.log(`[PHONE OTP] Real SMS sent via Fast2SMS to ${validation.normalized}`);
        return { sent: true, demo: false, channel: 'sms', normalized: validation.normalized };
      }
      console.error('[PHONE OTP] Fast2SMS error:', data);
    } catch (err) {
      console.error('[PHONE OTP] Fast2SMS failed:', err.message);
    }
  }

  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
    try {
      const response = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': process.env.MSG91_AUTH_KEY
        },
        body: JSON.stringify({
          template_id: process.env.MSG91_TEMPLATE_ID,
          mobile: validation.normalized.replace('+', ''),
          otp: otp
        })
      });
      const data = await response.json();
      if (data.type === 'success') {
        console.log(`[PHONE OTP] Real SMS sent via MSG91 to ${validation.normalized}`);
        return { sent: true, demo: false, channel: 'sms', normalized: validation.normalized };
      }
      console.error('[PHONE OTP] MSG91 error:', data);
    } catch (err) {
      console.error('[PHONE OTP] MSG91 failed:', err.message);
    }
  }

  // ── 3. Fallback Demo Mode ──
  console.log(`[PHONE OTP] Demo mode - OTP for ${validation.normalized}: ${otp} (Channel: ${channel})`);
  return { sent: true, demo: true, demo_otp: otp, channel, normalized: validation.normalized };
}

function verifyPhoneOTP(phone, otp) {
  const validation = validateIndianPhone(phone);
  if (!validation.valid) return { valid: false, error: validation.error };
  
  const key = `phone:${validation.normalized}`;
  return verifyStoredOTP(key, otp);
}

// ═══════════════════════════════════════════════════════════════
//                  UIDAI AADHAAR VERIFICATION
//      Integrates with Surepass API for real UIDAI e-KYC
// ═══════════════════════════════════════════════════════════════

const SUREPASS_BASE_URL = process.env.SUREPASS_BASE_URL || 'https://kyc-api.surepass.io/api/v1';
const SUREPASS_API_KEY = process.env.SUREPASS_API_KEY;

/**
 * Validate Aadhaar number format using Verhoeff algorithm checksum
 */
function isValidAadhaar(aadhaar) {
  if (!/^\d{12}$/.test(aadhaar)) return false;
  
  // Verhoeff algorithm tables
  const d = [
    [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0]
  ];
  const p = [
    [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]
  ];

  let c = 0;
  const digits = aadhaar.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]];
  }
  return c === 0;
}

function hashAadhaar(aadhaarNumber) {
  return crypto.createHash('sha256').update(aadhaarNumber).digest('hex');
}

/**
 * Send OTP to Aadhaar-linked mobile via UIDAI (through Surepass API)
 * Returns a reference_id (client_id) needed for OTP verification
 */
async function sendAadhaarOTP(aadhaarNumber) {
  const aadhaarClean = aadhaarNumber.replace(/\s/g, '');
  
  if (!isValidAadhaar(aadhaarClean)) {
    return { sent: false, error: 'Invalid Aadhaar number. Check digits and try again.' };
  }

  // ── Real UIDAI API via Surepass ──
  if (SUREPASS_API_KEY) {
    try {
      const response = await fetch(`${SUREPASS_BASE_URL}/aadhaar-v2/generate-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUREPASS_API_KEY}`
        },
        body: JSON.stringify({ id_number: aadhaarClean })
      });

      const data = await response.json();

      if (data.success || data.status_code === 200) {
        const clientId = data.data?.client_id;
        console.log(`[AADHAAR UIDAI] OTP sent for ****${aadhaarClean.slice(-4)}, ref: ${clientId}`);
        return {
          sent: true,
          demo: false,
          clientId,
          maskedAadhaar: `XXXX-XXXX-${aadhaarClean.slice(-4)}`,
          message: data.data?.message || 'OTP sent to Aadhaar-linked mobile'
        };
      } else {
        return {
          sent: false,
          error: data.message || data.data?.message || 'UIDAI service error. Please try again.'
        };
      }
    } catch (err) {
      console.error('[AADHAAR UIDAI] API error:', err.message);
      return { sent: false, error: 'Aadhaar verification service unavailable. Please try later.' };
    }
  }

  // ── Demo/Fallback mode ──
  const demoOtp = '123456';
  const demoClientId = `demo_${Date.now()}_${aadhaarClean.slice(-4)}`;
  const key = `aadhaar:${aadhaarClean}`;
  storeOTP(key, demoOtp);

  console.log(`[AADHAAR DEMO] OTP ${demoOtp} for ****${aadhaarClean.slice(-4)}`);
  return {
    sent: true,
    demo: true,
    clientId: demoClientId,
    maskedAadhaar: `XXXX-XXXX-${aadhaarClean.slice(-4)}`,
    demo_otp: demoOtp,
    message: 'Demo mode: OTP sent'
  };
}

/**
 * Verify OTP and complete Aadhaar e-KYC via UIDAI (through Surepass API)
 * Returns verified status and basic KYC data (name, gender, DOB)
 */
async function verifyAadhaarOTP(aadhaarNumber, otp, clientId) {
  const aadhaarClean = aadhaarNumber.replace(/\s/g, '');

  if (!isValidAadhaar(aadhaarClean)) {
    return { verified: false, error: 'Invalid Aadhaar number.' };
  }

  // ── Real UIDAI API via Surepass ──
  if (SUREPASS_API_KEY && clientId && !clientId.startsWith('demo_')) {
    try {
      const response = await fetch(`${SUREPASS_BASE_URL}/aadhaar-v2/submit-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUREPASS_API_KEY}`
        },
        body: JSON.stringify({
          client_id: clientId,
          otp: otp
        })
      });

      const data = await response.json();

      if (data.success || data.status_code === 200) {
        const kycData = data.data || {};
        console.log(`[AADHAAR UIDAI] Verified: ${kycData.full_name || 'OK'} (****${aadhaarClean.slice(-4)})`);
        return {
          verified: true,
          aadhaarLastFour: aadhaarClean.slice(-4),
          aadhaarHash: hashAadhaar(aadhaarClean),
          refId: clientId,
          // KYC data from UIDAI
          kycData: {
            name: kycData.full_name || '',
            gender: kycData.gender || '',
            dob: kycData.dob || '',
            address: kycData.address ? `${kycData.address.loc || ''}, ${kycData.address.dist || ''}, ${kycData.address.state || ''}` : ''
          }
        };
      } else {
        return {
          verified: false,
          error: data.message || data.data?.message || 'OTP verification failed.'
        };
      }
    } catch (err) {
      console.error('[AADHAAR UIDAI] Verify error:', err.message);
      return { verified: false, error: 'Aadhaar verification service unavailable.' };
    }
  }

  // ── Demo/Fallback mode ──
  const key = `aadhaar:${aadhaarClean}`;
  const result = verifyStoredOTP(key, otp);
  
  if (!result.valid) {
    return { verified: false, error: result.error };
  }

  return {
    verified: true,
    aadhaarLastFour: aadhaarClean.slice(-4),
    aadhaarHash: hashAadhaar(aadhaarClean),
    refId: clientId || 'demo',
    kycData: null // No KYC data in demo mode
  };
}

// ═══════════════════════════════════════════════════════════════
//                       EXPORTS
// ═══════════════════════════════════════════════════════════════
module.exports = {
  // Email
  sendEmailOTP,
  verifyEmailOTP,
  sendPartnerWelcomeEmail,
  // Phone
  validateIndianPhone,
  sendPhoneOTP,
  verifyPhoneOTP,
  // Aadhaar
  isValidAadhaar,
  hashAadhaar,
  sendAadhaarOTP,
  verifyAadhaarOTP
};
