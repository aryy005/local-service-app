/**
 * Comprehensive Validation & Sanitization Utilities for Localfixr
 * Provides client-side validation rules and real-time input sanitizers.
 */

// Strict RFC compliant regex for emails (disallows consecutive dots or malformed domain labels)
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;

// Indian mobile numbers: exactly 10 digits starting with 6, 7, 8, or 9
export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

// Standard UPI Virtual Payment Address (VPA) format (e.g. user@okhdfcbank, 9876543210@paytm)
export const UPI_VPA_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

// Indian Postal Index Number (PIN): exactly 6 digits, first digit 1-9
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

// Indian Aadhaar number: exactly 12 digits, first digit 2-9
export const AADHAAR_REGEX = /^[2-9][0-9]{11}$/;

/**
 * Strips all non-digit characters and caps string at maxLen
 * Ideal for real-time onChange masking for phone, pincode, OTP, aadhaar.
 */
export function sanitizeDigits(val, maxLen) {
  if (val === null || val === undefined) return '';
  const digits = val.toString().replace(/\D/g, '');
  return maxLen ? digits.slice(0, maxLen) : digits;
}

/**
 * Normalizes email: trims and converts to lowercase
 */
export function sanitizeEmail(email) {
  if (!email) return '';
  return email.toString().trim().toLowerCase();
}

/**
 * Validates email format
 */
export function isValidEmail(email) {
  if (!email) return false;
  return EMAIL_REGEX.test(sanitizeEmail(email));
}

/**
 * Validates Indian 10-digit mobile number
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  // Strip spaces, dashes, parentheses and country code +91 / 91 if present
  let clean = phone.toString().replace(/[\s\-()]/g, '');
  if (clean.startsWith('+91')) clean = clean.slice(3);
  else if (clean.startsWith('91') && clean.length === 12) clean = clean.slice(2);
  
  return INDIAN_PHONE_REGEX.test(clean);
}

/**
 * Normalizes phone to standard 10 digits
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  let clean = phone.toString().replace(/[\s\-()]/g, '');
  if (clean.startsWith('+91')) clean = clean.slice(3);
  else if (clean.startsWith('91') && clean.length === 12) clean = clean.slice(2);
  return clean.replace(/\D/g, '').slice(0, 10);
}

/**
 * Validates UPI Virtual Payment Address (VPA)
 */
export function isValidUpi(upiId) {
  if (!upiId) return false;
  return UPI_VPA_REGEX.test(upiId.toString().trim());
}

/**
 * Validates 6-digit Indian PIN code
 */
export function isValidPincode(pincode) {
  if (!pincode) return false;
  return PINCODE_REGEX.test(pincode.toString().trim());
}

/**
 * Validates 12-digit Aadhaar number format
 */
export function isValidAadhaar(aadhaar) {
  if (!aadhaar) return false;
  const clean = aadhaar.toString().replace(/\s/g, '');
  return AADHAAR_REGEX.test(clean);
}

/**
 * Validates hourly / base rate (> 0)
 */
export function isValidRate(rate) {
  const num = Number(rate);
  return !isNaN(num) && num > 0;
}
