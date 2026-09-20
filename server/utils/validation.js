/**
 * Backend Validation & Sanitization Utilities for Localfixr
 * Provides server-side validation rules and data sanitizers for routes and models.
 */

// Strict RFC compliant regex for emails (disallows consecutive dots or malformed domain labels)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;

// Indian mobile numbers: exactly 10 digits starting with 6, 7, 8, or 9
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

// Standard UPI Virtual Payment Address (VPA) format (e.g. user@okhdfcbank, 9876543210@paytm)
const UPI_VPA_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

// Indian Postal Index Number (PIN): exactly 6 digits, first digit 1-9
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

// Indian Aadhaar number: exactly 12 digits, first digit 2-9
const AADHAAR_REGEX = /^[2-9][0-9]{11}$/;

function sanitizeDigits(val, maxLen) {
  if (val === null || val === undefined) return '';
  const digits = val.toString().replace(/\D/g, '');
  return maxLen ? digits.slice(0, maxLen) : digits;
}

function sanitizeEmail(email) {
  if (!email) return '';
  return email.toString().trim().toLowerCase();
}

function isValidEmail(email) {
  if (!email) return false;
  return EMAIL_REGEX.test(sanitizeEmail(email));
}

function isValidPhone(phone) {
  if (!phone) return false;
  let clean = phone.toString().replace(/[\s\-()]/g, '');
  if (clean.startsWith('+91')) clean = clean.slice(3);
  else if (clean.startsWith('91') && clean.length === 12) clean = clean.slice(2);
  return INDIAN_PHONE_REGEX.test(clean);
}

function normalizePhone(phone) {
  if (!phone) return '';
  let clean = phone.toString().replace(/[\s\-()]/g, '');
  if (clean.startsWith('+91')) clean = clean.slice(3);
  else if (clean.startsWith('91') && clean.length === 12) clean = clean.slice(2);
  return clean.replace(/\D/g, '').slice(0, 10);
}

function isValidUpi(upiId) {
  if (!upiId) return false;
  return UPI_VPA_REGEX.test(upiId.toString().trim());
}

function isValidPincode(pincode) {
  if (!pincode) return false;
  return PINCODE_REGEX.test(pincode.toString().trim());
}

function isValidAadhaar(aadhaar) {
  if (!aadhaar) return false;
  const clean = aadhaar.toString().replace(/\s/g, '');
  return AADHAAR_REGEX.test(clean);
}

function isValidRate(rate) {
  const num = Number(rate);
  return !isNaN(num) && num > 0;
}

module.exports = {
  EMAIL_REGEX,
  INDIAN_PHONE_REGEX,
  UPI_VPA_REGEX,
  PINCODE_REGEX,
  AADHAAR_REGEX,
  sanitizeDigits,
  sanitizeEmail,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  isValidUpi,
  isValidPincode,
  isValidAadhaar,
  isValidRate
};
