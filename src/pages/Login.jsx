import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(formData.email, formData.password, formData.role);
      handleRoleRedirect(data.user.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const data = await googleLogin(credentialResponse.credential, formData.role, 'login');
      handleRoleRedirect(data.user.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed or was closed. Please try again.');
  };

  return (
    <div className="auth-page fade-in">
      <div className="auth-card glass-panel">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your account</p>
        
        {error && <div className="error-alert">{error}</div>}

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

        <form onSubmit={handleSubmit} className="auth-form mt-4">
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ margin: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
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
            text="continue_with"
          />
        </div>
        
        <p className="auth-redirect mt-6">
          Don't have an account? <Link to={redirectUrl ? `/auth/signup?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/signup'}>Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
