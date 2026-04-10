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

function getEmailTransporter() {
  // If SMTP credentials are configured, use them
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  // Fallback: no real email sending (demo mode)
  return null;
}

async function sendEmailOTP(email) {
  const otp = generateOTP();
  const key = `email:${email.toLowerCase()}`;
  storeOTP(key, otp);

  const transporter = getEmailTransporter();
  
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'LocalPro - Email Verification OTP',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">LocalPro</h1>
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
      console.log(`[EMAIL OTP] Sent OTP to ${email}`);
      return { sent: true, demo: false };
    } catch (err) {
      console.error(`[EMAIL OTP] Failed to send email:`, err.message);
      // Fall through to demo mode
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

async function sendPhoneOTP(phone) {
  const validation = validateIndianPhone(phone);
  if (!validation.valid) {
    return { sent: false, error: validation.error };
  }

  const otp = generateOTP();
  const key = `phone:${validation.normalized}`;
  storeOTP(key, otp);

  // Try MSG91 if configured
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
        console.log(`[PHONE OTP] Sent via MSG91 to ${validation.normalized}`);
        return { sent: true, demo: false, normalized: validation.normalized };
      }
      console.error('[PHONE OTP] MSG91 error:', data);
    } catch (err) {
      console.error('[PHONE OTP] MSG91 failed:', err.message);
    }
  }

  // Demo mode
  console.log(`[PHONE OTP] Demo mode - OTP for ${validation.normalized}: ${otp}`);
  return { sent: true, demo: true, demo_otp: otp, normalized: validation.normalized };
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
