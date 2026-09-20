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
      <div className="auth-card glass-panel" style={{ maxWidth: '480px' }}>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join LocalFixr in seconds — no hassle setup</p>
        
        {error && <div className="error-alert">{error}</div>}

        {/* Role Selector */}
        <div className="role-selector">
          <button 
            type="button" 
            className={`role-btn ${formData.role === 'customer' ? 'active' : ''}`}
            onClick={() => setFormData({...formData, role: 'customer'})}
          >
            I need services
          </button>
          <button 
            type="button" 
            className={`role-btn ${formData.role === 'provider' ? 'active' : ''}`}
            onClick={() => setFormData({...formData, role: 'provider'})}
          >
            I offer services
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form mt-4">
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
            <label>Password *</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              minLength="6" 
              placeholder="At least 6 characters"
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
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
          <div style={{ marginTop: '1rem', marginBottom: '1rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, color: '#6366f1', fontSize: '0.9rem', fontWeight: 700 }}>
                Service Location & Address
              </h4>
              <button
                type="button"
                onClick={handleDetectLiveLocation}
                disabled={locating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#6366f1',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '6px',
                  cursor: locating ? 'not-allowed' : 'pointer'
                }}
              >
                {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                <span>{locating ? 'Detecting Location...' : 'Use Live Location'}</span>
              </button>
            </div>

            {locationSuccessMsg && (
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginBottom: '0.5rem', fontWeight: 600 }}>
                ✓ {locationSuccessMsg}
              </div>
            )}
            
            <div className="form-group mb-3">
              <label>Street Address / House / Flat / Street No. *</label>
              <input 
                type="text" 
                name="street" 
                value={formData.street} 
                onChange={handleChange} 
                required
                placeholder="e.g. Flat 402, Model Town, GT Road"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label>City *</label>
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
                <label>State *</label>
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
                <label>Pincode *</label>
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
            <>
              <div className="form-group">
                <label style={{ fontWeight: 700, color: '#6366f1' }}>🛠️ Service Offered (Select Category)</label>
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleChange}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    borderRadius: '0.5rem', 
                    border: '1px solid var(--surface-border)', 
                    background: 'var(--surface-card)', 
                    color: 'var(--text-main)', 
                    fontWeight: 600,
                    outline: 'none' 
                  }}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#1e293b', color: '#fff' }}>
                      {c.name} — {c.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Starting / Base Price (₹)</label>
                <input 
                  type="number" 
                  name="hourlyRate" 
                  value={formData.hourlyRate} 
                  onChange={handleChange} 
                  required 
                  min="1"
                  placeholder="e.g. 199"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Starting price for your base service or minimum inspection fee.
                </span>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="google-auth-container mt-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '0.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}></div>
            <span style={{ padding: '0 0.75rem', fontSize: '0.85rem', opacity: 0.7 }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}></div>
          </div>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_blue"
            shape="pill"
            text="signup_with"
          />
        </div>
        
        <p className="auth-redirect mt-6">
          Already have an account? <Link to={redirectUrl ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/login'}>Sign in</Link>
        </p>
      </div>

      {/* ── Google Sign-Up Address Details Modal ── */}
      {showAddressModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="glass-panel" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '460px', padding: '2rem', borderRadius: '1.25rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
              Enter Your Service Address
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Please provide your address so nearby verified service professionals can reach your doorstep.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Service Location
              </span>
              <button
                type="button"
                onClick={handleDetectLiveLocation}
                disabled={locating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--primary, #0047FF)',
                  background: 'rgba(0, 71, 255, 0.08)',
                  border: '1px solid rgba(0, 71, 255, 0.25)',
                  borderRadius: '8px',
                  cursor: locating ? 'not-allowed' : 'pointer'
                }}
              >
                {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                <span>{locating ? 'Detecting Location...' : 'Use Live Location'}</span>
              </button>
            </div>

            {locationSuccessMsg && (
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginBottom: '0.75rem', fontWeight: 600 }}>
                ✓ {locationSuccessMsg}
              </div>
            )}

            <form onSubmit={handleAddressModalSubmit}>
              <div className="form-group mb-3">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Phone Number *</label>
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

              <div className="form-group mb-3">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>House / Flat / Street Address *</label>
                <input 
                  type="text" 
                  name="street" 
                  value={formData.street} 
                  onChange={handleChange} 
                  required
                  placeholder="e.g. Flat 402, Green Avenue"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>City *</label>
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
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>State *</label>
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

              <div className="form-group mb-4">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pincode *</label>
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

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowAddressModal(false);
                    setPendingGoogleCredential(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1.5 }}
                  disabled={loading}
                >
                  {loading ? 'Completing...' : 'Complete Sign-Up →'}
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
