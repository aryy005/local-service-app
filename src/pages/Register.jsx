import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { categories } from '../data/mockData';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({ 
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
    category: 'cat-5', // Default: Electrician
    hourlyRate: 25,
    street: '',
    city: '',
    state: '',
    pincode: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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
      navigate('/customer-dashboard');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const data = await googleLogin(credentialResponse.credential, formData.role);
      handleRoleRedirect(data.user.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-Up failed or was closed. Please try again.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.city || !formData.state || !formData.pincode) {
      setError('Please fill in all required fields including City, State, and Pincode');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        category: formData.category,
        hourlyRate: Number(formData.hourlyRate),
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        location: `${formData.street ? formData.street + ', ' : ''}${formData.city}, ${formData.state} - ${formData.pincode}`
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
            <label>Password</label>
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

          {/* Location Precision Address Block (For both Customer and Provider) */}
          <div style={{ marginTop: '1rem', marginBottom: '1rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#6366f1', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              📍 Location & Address Precision
            </h4>
            
            <div className="form-group mb-3">
              <label>Street Address / House / Flat / Street No.</label>
              <input 
                type="text" 
                name="street" 
                value={formData.street} 
                onChange={handleChange} 
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
                  placeholder="e.g. 141001"
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
                <label>Hourly Rate (₹/hr)</label>
                <input 
                  type="number" 
                  name="hourlyRate" 
                  value={formData.hourlyRate} 
                  onChange={handleChange} 
                  required 
                  min="1"
                  placeholder="e.g. 25"
                />
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
    </div>
  );
};

export default Register;
