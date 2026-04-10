const express = require('express');
const router = express.Router();
const {
  sendEmailOTP,
  verifyEmailOTP,
  validateIndianPhone,
  sendPhoneOTP,
  verifyPhoneOTP,
  sendAadhaarOTP,
  verifyAadhaarOTP
} = require('../services/verification');

// ═══════════════════════════════════════════════════════════════
//                    EMAIL VERIFICATION
// ═══════════════════════════════════════════════════════════════

// @route   POST api/verify/email/send-otp
// @desc    Send OTP to email address
router.post('/email/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const result = await sendEmailOTP(email);

    if (!result.sent) {
      return res.status(500).json({ message: 'Failed to send verification email.' });
    }

    const response = {
      message: `Verification OTP sent to ${email}`,
      email
    };

    // Include demo OTP only in demo mode (no SMTP configured)
    if (result.demo) {
      response.demo_otp = result.demo_otp;
      response.demo_mode = true;
    }

    res.json(response);
  } catch (err) {
    console.error('[Email Verify Error]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/verify/email/verify-otp
// @desc    Verify email OTP
router.post('/email/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const result = verifyEmailOTP(email, otp);

    if (!result.valid) {
      return res.status(400).json({ message: result.error });
    }

    res.json({ verified: true, message: 'Email verified successfully', email });
  } catch (err) {
    console.error('[Email Verify Error]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
//              INDIAN PHONE NUMBER VERIFICATION
// ═══════════════════════════════════════════════════════════════

// @route   POST api/verify/phone/send-otp
// @desc    Send OTP to Indian mobile number (+91)
router.post('/phone/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    // Validate Indian number format
    const validation = validateIndianPhone(phone);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const result = await sendPhoneOTP(phone);

    if (!result.sent) {
      return res.status(400).json({ message: result.error });
    }

    const response = {
      message: `OTP sent to ${result.normalized}`,
      normalized: result.normalized
    };

    if (result.demo) {
      response.demo_otp = result.demo_otp;
      response.demo_mode = true;
    }

    res.json(response);
  } catch (err) {
    console.error('[Phone Verify Error]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/verify/phone/verify-otp
// @desc    Verify Indian phone OTP
router.post('/phone/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required.' });
    }

    const result = verifyPhoneOTP(phone, otp);

    if (!result.valid) {
      return res.status(400).json({ message: result.error });
    }

    res.json({ verified: true, message: 'Phone number verified successfully' });
  } catch (err) {
    console.error('[Phone Verify Error]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
//              AADHAAR VERIFICATION (UIDAI via Surepass)
// ═══════════════════════════════════════════════════════════════

// @route   POST api/verify/aadhaar/send-otp
// @desc    Request UIDAI OTP for Aadhaar verification
router.post('/aadhaar/send-otp', async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;

    if (!aadhaarNumber) {
      return res.status(400).json({ message: 'Aadhaar number is required.' });
    }

    const result = await sendAadhaarOTP(aadhaarNumber);

    if (!result.sent) {
      return res.status(400).json({ message: result.error });
    }

    const response = {
      message: result.message,
      maskedAadhaar: result.maskedAadhaar,
      clientId: result.clientId // Needed for verify step
    };

    if (result.demo) {
      response.demo_otp = result.demo_otp;
      response.demo_mode = true;
    }

    res.json(response);
  } catch (err) {
    console.error('[Aadhaar Verify Error]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/verify/aadhaar/verify-otp
// @desc    Verify UIDAI OTP and complete Aadhaar e-KYC
router.post('/aadhaar/verify-otp', async (req, res) => {
  try {
    const { aadhaarNumber, otp, clientId } = req.body;

    if (!aadhaarNumber || !otp) {
      return res.status(400).json({ message: 'Aadhaar number and OTP are required.' });
    }

    const result = await verifyAadhaarOTP(aadhaarNumber, otp, clientId);

    if (!result.verified) {
      return res.status(400).json({ message: result.error });
    }

    res.json({
      verified: true,
      message: 'Aadhaar verified successfully via UIDAI',
      aadhaarLastFour: result.aadhaarLastFour,
      refId: result.refId,
      kycData: result.kycData // Name, gender, DOB from UIDAI (null in demo)
    });
  } catch (err) {
    console.error('[Aadhaar Verify Error]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
