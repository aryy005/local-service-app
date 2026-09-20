import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Navigation, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { categories } from '../data/mockData';
import { getCurrentDetailedAddress } from '../utils/geolocation';
import { 
  isValidEmail, 
  isValidPhone, 
  isValidPincode, 
  isValidRate, 
  sanitizeDigits 
} from '../utils/validation';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({ 
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
    category: 'cat-5', // Default: Electrician
    hourlyRate: 199,
    street: '',
    city: '',
    state: '',
    pincode: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');
  
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const handleRoleRedirect = (role) => {
    if (role === 'admin') {
      navigate('/admin-dashboard');
    } else if (role === 'provider') {
      navigate('/provider-dashboard');
    } else if (redirectUrl && redirectUrl.startsWith('/')) {
      navigate(redirectUrl);
    } else {
      navigate('/search');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData({ ...formData, phone: sanitizeDigits(value, 10) });
    } else if (name === 'pincode') {
      setFormData({ ...formData, pincode: sanitizeDigits(value, 6) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleDetectLiveLocation = async () => {
    setLocating(true);
    setError('');
    setLocationSuccessMsg('');
    try {
      const loc = await getCurrentDetailedAddress();
      setFormData(prev => ({
        ...prev,
        street: loc.street || prev.street,
        city: loc.city || prev.city,
        state: loc.state || prev.state,
        pincode: loc.pincode || prev.pincode
      }));
      setLocationSuccessMsg('Live location captured successfully!');
      setTimeout(() => setLocationSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Could not auto-detect live location. Please enter manually.');
    } finally {
      setLocating(false);
    }
  };

  const [pendingGoogleCredential, setPendingGoogleCredential] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    
    // Check if user has already filled in all required fields
    if (!formData.phone || !formData.street || !formData.city || !formData.state || !formData.pincode) {
      // Hold credential and show the Address Collection Modal
      setPendingGoogleCredential(credentialResponse.credential);
      setShowAddressModal(true);
      return;
    }

    // Complete Google Sign-Up with provided address
    await executeGoogleRegister(credentialResponse.credential, formData);
  };

  const executeGoogleRegister = async (credential, addressInfo) => {
    setLoading(true);
    setError('');
    try {
      const data = await googleLogin(credential, formData.role, 'register', {
        street: addressInfo.street || '',
        city: addressInfo.city || '',
        state: addressInfo.state || '',
        pincode: addressInfo.pincode || '',
        phone: addressInfo.phone || '',
        category: formData.role === 'provider' ? formData.category : undefined,
        hourlyRate: formData.role === 'provider' ? Number(formData.hourlyRate) : undefined
      });
      setShowAddressModal(false);
      handleRoleRedirect(data.user.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressModalSubmit = (e) => {
    e.preventDefault();
    if (!formData.phone || !formData.street || !formData.city || !formData.state || !formData.pincode) {
      setError('All fields are required. Please fill in Phone, Street Address, City, State, and Pincode.');
      return;
    }
    if (!isValidPhone(formData.phone)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }
    if (!isValidPincode(formData.pincode)) {
      setError('Please enter a valid 6-digit Indian PIN code (e.g. 141001).');
      return;
    }
    if (pendingGoogleCredential) {
      executeGoogleRegister(pendingGoogleCredential, formData);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-Up failed or was closed. Please try again.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.street || !formData.city || !formData.state || !formData.pincode) {
      setError('All fields are required. Please fill in your name, email, phone, password, and complete service address.');
      return;
    }

    if (formData.name.trim().length < 2) {
      setError('Please enter a valid full name (at least 2 characters).');
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address (e.g. yourname@example.com).');
      return;
    }

    if (!isValidPhone(formData.phone)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    if (!isValidPincode(formData.pincode)) {
      setError('Please enter a valid 6-digit Indian PIN code (e.g. 141001).');
      return;
    }

    if (formData.role === 'provider' && !isValidRate(formData.hourlyRate)) {
      setError('Starting hourly rate must be greater than ₹0.');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
        category: formData.category,
        hourlyRate: Number(formData.hourlyRate),
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        location: `${formData.street ? formData.street.trim() + ', ' : ''}${formData.city.trim()}, ${formData.state.trim()} - ${formData.pincode.trim()}`
      });

      handleRoleRedirect(data.user.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page fade-in">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-tag">ACCESS PORTAL</div>
        <h1 className="auth-title">CREATE ACCOUNT</h1>
        <p className="auth-subtitle">Join LocalFixr in seconds — verified local services</p>
        
        {error && <div className="error-alert">⚠️ {error}</div>}

        {/* Role Selector */}
        <div className="role-selector">
          <button 
            type="button" 
            className={`role-btn ${formData.role === 'customer' ? 'active' : ''}`}
            onClick={() => setFormData({...formData, role: 'customer'})}
          >
            Customer
          </button>
          <button 
            type="button" 
            className={`role-btn ${formData.role === 'provider' ? 'active' : ''}`}
            onClick={() => setFormData({...formData, role: 'provider'})}
          >
            Provider
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label>Password (At least 6 characters)</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              minLength="6" 
              placeholder="••••••••"
            />
          </div>

          <div className="form-group">
            <label>Mobile Number (10 Digits)</label>
            <input 
              type="tel" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              required 
              maxLength={10}
              placeholder="10-digit mobile (e.g. 9876543210)"
            />
          </div>

          {/* Location Precision Address Block (For both Customer and Provider) */}
          <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem', borderTop: '2px solid #111111', paddingTop: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label style={{ margin: 0, fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#111111' }}>
                Service Location & Address
              </label>
              <button
                type="button"
                onClick={handleDetectLiveLocation}
                disabled={locating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#111111',
                  background: '#D2FE00',
                  border: '2px solid #111111',
                  borderRadius: '6px',
                  boxShadow: '2px 2px 0 #111111',
                  cursor: locating ? 'not-allowed' : 'pointer'
                }}
              >
                {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                <span>{locating ? 'Detecting...' : 'Use Live GPS'}</span>
              </button>
            </div>

            {locationSuccessMsg && (
              <div style={{ fontSize: '0.82rem', color: '#15803D', marginBottom: '0.65rem', fontWeight: 800 }}>
                ✓ {locationSuccessMsg}
              </div>
            )}
            
            <div className="form-group">
              <label>Street Address / House / Flat</label>
              <input 
                type="text" 
                name="street" 
                value={formData.street} 
                onChange={handleChange} 
                required
                placeholder="e.g. Flat 402, Model Town, GT Road"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
              <div className="form-group">
                <label>City</label>
                <input 
                  type="text" 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange} 
                  required 
                  placeholder="e.g. Ludhiana"
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <input 
                  type="text" 
                  name="state" 
                  value={formData.state} 
                  onChange={handleChange} 
                  required 
                  placeholder="e.g. Punjab"
                />
              </div>

              <div className="form-group">
                <label>Pincode</label>
                <input 
                  type="text" 
                  name="pincode" 
                  value={formData.pincode} 
                  onChange={handleChange} 
                  required 
                  maxLength={6}
                  placeholder="6 digits (e.g. 141001)"
                />
              </div>
            </div>
          </div>

          {formData.role === 'provider' && (
            <div style={{ marginTop: '0.5rem', marginBottom: '1.25rem', borderTop: '2px solid #111111', paddingTop: '1.15rem' }}>
              <div className="form-group">
                <label>Service Category Offered</label>
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleChange}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '5px', 
                    border: '2px solid #111111', 
                    background: '#FFFFFF', 
                    color: '#111111', 
                    fontWeight: 700,
                    boxShadow: '2px 2px 0 #111111',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#FFFFFF', color: '#111111' }}>
                      {c.name} — {c.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Starting / Base Inspection Price (₹)</label>
                <input 
                  type="number" 
                  name="hourlyRate" 
                  value={formData.hourlyRate} 
                  onChange={handleChange} 
                  required 
                  min="1"
                  placeholder="e.g. 199"
                />
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account →'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR CONTINUE WITH</span>
        </div>

        <div className="google-auth-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            shape="rectangular"
            text="signup_with"
            width="100%"
          />
        </div>
        
        <p className="auth-redirect">
          Already have an account?{' '}
          <Link 
            to={redirectUrl ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/login'}
            className="auth-redirect-link"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* ── Google Sign-Up Address Details Modal ── */}
      {showAddressModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', border: '2.5px solid #111111', width: '100%', maxWidth: '460px', padding: '2rem', borderRadius: '8px', boxShadow: '6px 6px 0 #111111', color: '#111111' }}>
            <div className="auth-tag">FINAL STEP</div>
            <h2 className="auth-title" style={{ fontSize: '1.4rem', margin: '0.25rem 0 0.5rem 0' }}>
              Service Address
            </h2>
            <p className="auth-subtitle" style={{ fontSize: '0.84rem', marginBottom: '1.25rem' }}>
              Please provide your phone & address so verified professionals can reach you.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#111111' }}>
                Your Location
              </span>
              <button
                type="button"
                onClick={handleDetectLiveLocation}
                disabled={locating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#111111',
                  background: '#D2FE00',
                  border: '2px solid #111111',
                  borderRadius: '6px',
                  boxShadow: '2px 2px 0 #111111',
                  cursor: locating ? 'not-allowed' : 'pointer'
                }}
              >
                {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                <span>{locating ? 'Detecting...' : 'Use Live GPS'}</span>
              </button>
            </div>

            {locationSuccessMsg && (
              <div style={{ fontSize: '0.82rem', color: '#15803D', marginBottom: '0.75rem', fontWeight: 800 }}>
                ✓ {locationSuccessMsg}
              </div>
            )}

            <form onSubmit={handleAddressModalSubmit} className="auth-form">
              <div className="form-group">
                <label>Mobile Number (10 Digits)</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  required
                  maxLength={10}
                  placeholder="10-digit mobile (e.g. 9876543210)"
                />
              </div>

              <div className="form-group">
                <label>Street Address</label>
                <input 
                  type="text" 
                  name="street" 
                  value={formData.street} 
                  onChange={handleChange} 
                  required
                  placeholder="e.g. Flat 402, Green Avenue"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div className="form-group">
                  <label>City</label>
                  <input 
                    type="text" 
                    name="city" 
                    value={formData.city} 
                    onChange={handleChange} 
                    required 
                    placeholder="e.g. Ludhiana"
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <input 
                    type="text" 
                    name="state" 
                    value={formData.state} 
                    onChange={handleChange} 
                    required 
                    placeholder="e.g. Punjab"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Pincode</label>
                <input 
                  type="text" 
                  name="pincode" 
                  value={formData.pincode} 
                  onChange={handleChange} 
                  required 
                  maxLength={6}
                  placeholder="6 digits (e.g. 141001)"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddressModal(false);
                    setPendingGoogleCredential(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.85rem',
                    background: '#FFFFFF',
                    color: '#111111',
                    border: '2px solid #111111',
                    borderRadius: '6px',
                    boxShadow: '2px 2px 0 #111111',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="auth-submit-btn" 
                  style={{ flex: 1.6, marginTop: 0 }}
                  disabled={loading}
                >
                  {loading ? 'Completing...' : 'Complete →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
