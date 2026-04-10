import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigation, Shield, CheckCircle, AlertCircle, Loader, Mail, Phone, ShieldCheck } from 'lucide-react';
import { getCurrentLocationName } from '../utils/geolocation';
import { API_URL } from '../config';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({ 
    name: '', email: '', phone: '', password: '',
    role: 'customer',
    category: '', hourlyRate: '', experienceYears: '', location: '', description: '',
    aadhaarNumber: '',
  });

  // ─── Verification States ───
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailDemoOtp, setEmailDemoOtp] = useState('');

  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneDemoOtp, setPhoneDemoOtp] = useState('');
  const [phoneNormalized, setPhoneNormalized] = useState('');

  const [aadhaarStep, setAadhaarStep] = useState('input');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');
  const [maskedAadhaar, setMaskedAadhaar] = useState('');
  const [aadhaarClientId, setAadhaarClientId] = useState('');
  const [aadhaarDemoOtp, setAadhaarDemoOtp] = useState('');
  const [aadhaarKycData, setAadhaarKycData] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Reset verification when email/phone changes
    if (name === 'email') {
      setEmailVerified(false); setEmailOtpSent(false); setEmailOtp(''); setEmailError('');
    }
    if (name === 'phone') {
      setPhoneVerified(false); setPhoneOtpSent(false); setPhoneOtp(''); setPhoneError('');
    }
  };

  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setFormData({ ...formData, aadhaarNumber: formatted });
    if (aadhaarStep !== 'input') {
      setAadhaarStep('input'); setAadhaarOtp(''); setAadhaarError('');
    }
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    try { setFormData({ ...formData, location: await getCurrentLocationName() }); }
    catch (err) { alert(err.message); }
    finally { setIsLocating(false); }
  };

  // ─── EMAIL OTP ───
  const handleSendEmailOtp = async () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setEmailError('Enter a valid email address'); return;
    }
    setEmailLoading(true); setEmailError('');
    try {
      const res = await fetch(`${API_URL}/verify/email/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setEmailOtpSent(true);
      if (data.demo_otp) setEmailDemoOtp(data.demo_otp);
    } catch (err) { setEmailError(err.message); }
    finally { setEmailLoading(false); }
  };

  const handleVerifyEmailOtp = async () => {
    if (emailOtp.length < 6) { setEmailError('Enter the 6-digit OTP'); return; }
    setEmailLoading(true); setEmailError('');
    try {
      const res = await fetch(`${API_URL}/verify/email/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: emailOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setEmailVerified(true);
    } catch (err) { setEmailError(err.message); }
    finally { setEmailLoading(false); }
  };

  // ─── PHONE OTP ───
  const handleSendPhoneOtp = async () => {
    if (!formData.phone) { setPhoneError('Enter your phone number'); return; }
    setPhoneLoading(true); setPhoneError('');
    try {
      const res = await fetch(`${API_URL}/verify/phone/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPhoneOtpSent(true);
      setPhoneNormalized(data.normalized || '');
      if (data.demo_otp) setPhoneDemoOtp(data.demo_otp);
    } catch (err) { setPhoneError(err.message); }
    finally { setPhoneLoading(false); }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length < 6) { setPhoneError('Enter the 6-digit OTP'); return; }
    setPhoneLoading(true); setPhoneError('');
    try {
      const res = await fetch(`${API_URL}/verify/phone/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, otp: phoneOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPhoneVerified(true);
    } catch (err) { setPhoneError(err.message); }
    finally { setPhoneLoading(false); }
  };

  // ─── AADHAAR OTP (UIDAI) ───
  const handleSendAadhaarOtp = async () => {
    const aadhaarClean = formData.aadhaarNumber.replace(/\s/g, '');
    if (aadhaarClean.length !== 12) { setAadhaarError('Enter a valid 12-digit Aadhaar number'); return; }
    setAadhaarLoading(true); setAadhaarError('');
    try {
      const res = await fetch(`${API_URL}/verify/aadhaar/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaarNumber: aadhaarClean })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMaskedAadhaar(data.maskedAadhaar);
      setAadhaarClientId(data.clientId || '');
      setAadhaarStep('otp');
      if (data.demo_otp) setAadhaarDemoOtp(data.demo_otp);
    } catch (err) { setAadhaarError(err.message); }
    finally { setAadhaarLoading(false); }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (aadhaarOtp.length < 6) { setAadhaarError('Enter the 6-digit OTP'); return; }
    setAadhaarLoading(true); setAadhaarError('');
    try {
      const aadhaarClean = formData.aadhaarNumber.replace(/\s/g, '');
      const res = await fetch(`${API_URL}/verify/aadhaar/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaarNumber: aadhaarClean, otp: aadhaarOtp, clientId: aadhaarClientId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAadhaarStep('verified');
      if (data.kycData) setAadhaarKycData(data.kycData);
    } catch (err) { setAadhaarError(err.message); }
    finally { setAadhaarLoading(false); }
  };

  // ─── SUBMIT ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!emailVerified) { setError('Please verify your email address'); return; }
    if (!phoneVerified) { setError('Please verify your phone number'); return; }
    if (formData.role === 'provider' && aadhaarStep !== 'verified') {
      setError('Please complete Aadhaar verification'); return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name, email: formData.email, phone: formData.phone,
        password: formData.password, role: formData.role,
        emailVerified: true, phoneVerified: true,
      };

      if (formData.role === 'provider') {
        payload.providerDetails = {
          category: formData.category,
          hourlyRate: Number(formData.hourlyRate),
          experienceYears: Number(formData.experienceYears) || 0,
          location: formData.location,
          description: formData.description,
          aadhaarNumber: formData.aadhaarNumber.replace(/\s/g, ''),
          aadhaarVerified: true,
          aadhaarRefId: aadhaarClientId,
        };
      }

      const data = await register(payload);
      navigate(data.user.role === 'provider' ? '/provider-dashboard' : '/');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const canSubmit = emailVerified && phoneVerified && (formData.role !== 'provider' || aadhaarStep === 'verified');

  return (
    <div className="auth-page fade-in">
      <div className="auth-card glass-panel" style={{ maxWidth: formData.role === 'provider' ? '860px' : '540px' }}>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join LocalPro — verify your identity to get started</p>
        
        {error && <div className="error-alert">{error}</div>}

        <div className="role-selector">
          <button type="button" className={`role-btn ${formData.role === 'customer' ? 'active' : ''}`}
            onClick={() => setFormData({...formData, role: 'customer'})}>
            I need services
          </button>
          <button type="button" className={`role-btn ${formData.role === 'provider' ? 'active' : ''}`}
            onClick={() => setFormData({...formData, role: 'provider'})}>
            I am a service provider
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form mt-6">
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: formData.role === 'provider' ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
            
            {/* ─── LEFT: Common Fields ─── */}
            <div className="common-fields">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required />
              </div>

              {/* ─── EMAIL with Verification ─── */}
              <div className="form-group">
                <label>Email Address</label>
                <div className="verify-input-row">
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required
                    disabled={emailVerified} className={emailVerified ? 'input-verified' : ''} />
                  {!emailVerified && !emailOtpSent && (
                    <button type="button" className="btn-verify-inline" onClick={handleSendEmailOtp}
                      disabled={emailLoading || !formData.email}>
                      {emailLoading ? <Loader size={14} className="spin-icon" /> : <Mail size={14} />}
                      Verify
                    </button>
                  )}
                  {emailVerified && <span className="inline-verified-badge"><CheckCircle size={14} /> Verified</span>}
                </div>
                {emailError && <span className="field-error"><AlertCircle size={12} /> {emailError}</span>}
                {emailOtpSent && !emailVerified && (
                  <div className="otp-inline-group">
                    <input type="text" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP" maxLength="6" className="otp-inline-input" />
                    <button type="button" className="btn-verify-small" onClick={handleVerifyEmailOtp}
                      disabled={emailLoading || emailOtp.length < 6}>
                      {emailLoading ? <Loader size={12} className="spin-icon" /> : 'Confirm'}
                    </button>
                    <button type="button" className="btn-resend" onClick={handleSendEmailOtp} disabled={emailLoading}>Resend</button>
                    {emailDemoOtp && <span className="demo-hint">Demo OTP: <b>{emailDemoOtp}</b></span>}
                  </div>
                )}
              </div>

              {/* ─── PHONE with Indian Verification ─── */}
              <div className="form-group">
                <label>Phone Number <span className="label-hint">(Indian +91)</span></label>
                <div className="verify-input-row">
                  <div className="phone-input-wrapper">
                    <span className="phone-prefix">+91</span>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required
                      placeholder="98765 43210" maxLength="14"
                      disabled={phoneVerified} className={phoneVerified ? 'input-verified phone-with-prefix' : 'phone-with-prefix'} />
                  </div>
                  {!phoneVerified && !phoneOtpSent && (
                    <button type="button" className="btn-verify-inline" onClick={handleSendPhoneOtp}
                      disabled={phoneLoading || !formData.phone}>
                      {phoneLoading ? <Loader size={14} className="spin-icon" /> : <Phone size={14} />}
                      Verify
                    </button>
                  )}
                  {phoneVerified && <span className="inline-verified-badge"><CheckCircle size={14} /> Verified</span>}
                </div>
                {phoneError && <span className="field-error"><AlertCircle size={12} /> {phoneError}</span>}
                {phoneOtpSent && !phoneVerified && (
                  <div className="otp-inline-group">
                    {phoneNormalized && <span className="otp-sent-to">OTP sent to {phoneNormalized}</span>}
                    <input type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP" maxLength="6" className="otp-inline-input" />
                    <button type="button" className="btn-verify-small" onClick={handleVerifyPhoneOtp}
                      disabled={phoneLoading || phoneOtp.length < 6}>
                      {phoneLoading ? <Loader size={12} className="spin-icon" /> : 'Confirm'}
                    </button>
                    <button type="button" className="btn-resend" onClick={handleSendPhoneOtp} disabled={phoneLoading}>Resend</button>
                    {phoneDemoOtp && <span className="demo-hint">Demo OTP: <b>{phoneDemoOtp}</b></span>}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength="6" />
              </div>
            </div>

            {/* ─── RIGHT: Provider Fields ─── */}
            {formData.role === 'provider' && (
              <div className="provider-fields">
                <div className="form-group">
                  <label>Service Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} required>
                    <option value="" disabled>Select category</option>
                    <option value="cat-1">Tailor</option>
                    <option value="cat-2">Carpenter</option>
                    <option value="cat-3">Painter</option>
                    <option value="cat-4">Cobbler</option>
                    <option value="cat-5">Electrician</option>
                    <option value="cat-6">Plumber</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Location / Area</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required placeholder="e.g. Downtown Area" style={{ width: '100%', paddingRight: '2.5rem' }} />
                    <button type="button" onClick={handleLocateMe}
                      className={`locate-btn ${isLocating ? 'locating' : ''}`}
                      title="Use Current Location" disabled={isLocating}
                      style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex' }}>
                      <Navigation size={18} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Hourly Rate (₹)</label>
                    <input type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} required min="5" />
                  </div>
                  <div className="form-group">
                    <label>Years of Experience</label>
                    <input type="number" name="experienceYears" value={formData.experienceYears} onChange={handleChange} required min="0" placeholder="e.g. 5" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Bio & Skills Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows="3" required></textarea>
                </div>
              </div>
            )}
          </div>

          {/* ─── AADHAAR VERIFICATION (Provider only) ─── */}
          {formData.role === 'provider' && (
            <div className="aadhaar-section">
              <div className="aadhaar-header">
                <Shield size={20} />
                <h3>Aadhaar Verification (UIDAI)</h3>
                <span className="aadhaar-required">Required</span>
              </div>
              <p className="aadhaar-desc">
                Verify your Aadhaar via UIDAI to prove your identity. OTP will be sent to your Aadhaar-linked mobile number.
              </p>
              
              {aadhaarError && <div className="aadhaar-error"><AlertCircle size={16} />{aadhaarError}</div>}

              {aadhaarStep === 'input' && (
                <div className="aadhaar-input-group">
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>Aadhaar Number</label>
                    <input type="text" value={formData.aadhaarNumber} onChange={handleAadhaarChange}
                      placeholder="1234 5678 9012" maxLength="14" className="aadhaar-input" required />
                  </div>
                  <button type="button" className="btn btn-aadhaar" onClick={handleSendAadhaarOtp}
                    disabled={aadhaarLoading || formData.aadhaarNumber.replace(/\s/g, '').length !== 12}>
                    {aadhaarLoading ? <><Loader size={16} className="spin-icon" /> Requesting UIDAI OTP...</> : <>
                      <ShieldCheck size={16} /> Request UIDAI OTP</>}
                  </button>
                </div>
              )}

              {aadhaarStep === 'otp' && (
                <div className="aadhaar-otp-group">
                  <p className="otp-info">
                    UIDAI OTP sent to mobile linked with <strong>{maskedAadhaar}</strong>
                  </p>
                  <div className="otp-input-row">
                    <input type="text" value={aadhaarOtp}
                      onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP" maxLength="6" className="otp-input" />
                    <button type="button" className="btn btn-aadhaar" onClick={handleVerifyAadhaarOtp}
                      disabled={aadhaarLoading || aadhaarOtp.length < 6}>
                      {aadhaarLoading ? <><Loader size={16} className="spin-icon" /> Verifying with UIDAI...</> : 'Verify OTP'}
                    </button>
                  </div>
                  <button type="button" className="btn-link" onClick={handleSendAadhaarOtp} disabled={aadhaarLoading}>Resend OTP</button>
                  {aadhaarDemoOtp && (
                    <p className="otp-demo-hint">💡 Demo Mode: Use OTP <strong>{aadhaarDemoOtp}</strong></p>
                  )}
                </div>
              )}

              {aadhaarStep === 'verified' && (
                <div className="aadhaar-verified-badge">
                  <CheckCircle size={24} />
                  <div>
                    <strong>Aadhaar Verified via UIDAI ✓</strong>
                    <p>Your identity has been verified through the UIDAI e-KYC system</p>
                    {aadhaarKycData && aadhaarKycData.name && (
                      <p style={{ marginTop: '0.25rem', fontSize: '0.82rem' }}>
                        Name (UIDAI): <strong>{aadhaarKycData.name}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Verification Progress ─── */}
          <div className="verification-progress">
            <div className={`progress-item ${emailVerified ? 'done' : ''}`}>
              {emailVerified ? <CheckCircle size={16} /> : <Mail size={16} />}
              <span>Email</span>
            </div>
            <div className={`progress-item ${phoneVerified ? 'done' : ''}`}>
              {phoneVerified ? <CheckCircle size={16} /> : <Phone size={16} />}
              <span>Phone</span>
            </div>
            {formData.role === 'provider' && (
              <div className={`progress-item ${aadhaarStep === 'verified' ? 'done' : ''}`}>
                {aadhaarStep === 'verified' ? <CheckCircle size={16} /> : <Shield size={16} />}
                <span>Aadhaar</span>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading || !canSubmit}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          {!canSubmit && (
            <p className="aadhaar-mandatory-note">
              <Shield size={14} /> Complete all verifications above to create your account
            </p>
          )}
        </form>
        
        <p className="auth-redirect mt-6">
          Already have an account? <Link to="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
