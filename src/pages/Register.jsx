import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigation } from 'lucide-react';
import { getCurrentLocationName } from '../utils/geolocation';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '',
    password: '',
    role: 'customer',
    // Provider specific fields
    category: '',
    hourlyRate: '',
    location: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const location = await getCurrentLocationName();
      setFormData({ ...formData, location });
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role
      };

      if (formData.role === 'provider') {
        payload.providerDetails = {
          category: formData.category,
          hourlyRate: Number(formData.hourlyRate),
          location: formData.location,
          description: formData.description
        };
      }

      const data = await register(payload);
      if (data.user.role === 'provider') {
        navigate('/provider-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page fade-in">
      <div className="auth-card glass-panel" style={{ maxWidth: formData.role === 'provider' ? '800px' : '500px' }}>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join the platform to get started</p>
        
        {error && <div className="error-alert">{error}</div>}

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
            I am a service provider
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form mt-6">
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: formData.role === 'provider' ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
            
            {/* Common Fields */}
            <div className="common-fields">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="123-456-7890" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength="6" />
              </div>
            </div>

            {/* Provider Fields */}
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
                    <button 
                      type="button" 
                      onClick={handleLocateMe}
                      className={`locate-btn ${isLocating ? 'locating' : ''}`}
                      title="Use Current Location"
                      disabled={isLocating}
                      style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex' }}
                    >
                      <Navigation size={18} />
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Hourly Rate (₹)</label>
                  <input type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} required min="5" />
                </div>
                <div className="form-group">
                  <label>Bio & Skills Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows="3" required></textarea>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary w-full mt-6" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="auth-redirect mt-6">
          Already have an account? <Link to="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
