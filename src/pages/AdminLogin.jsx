import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import './AdminLogin.css';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login(email, password, 'admin');
      if (res && res.user) {
        if (res.user.role !== 'admin') {
          setError('Access Denied. This security portal is strictly restricted to Super Administrators.');
          setLoading(false);
          return;
        }
        navigate('/admin-dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper fade-in">
      <div className="admin-login-card">
        
        <div className="admin-login-header">
          <div className="admin-tag">SECURITY CONSOLE</div>
          <div className="admin-header-row">
            <div className="admin-shield-icon-wrap">
              <ShieldCheck size={24} />
            </div>
            <h1 className="admin-login-title">ADMIN PORTAL</h1>
          </div>
          <p className="admin-login-subtitle">Restricted access for system administrators</p>
        </div>

        {error && (
          <div className="admin-login-error">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-form-group">
            <label className="admin-form-label">Admin Email</label>
            <div className="admin-input-wrapper">
              <div className="admin-input-icon">
                <Mail size={18} />
              </div>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@localfixr.com"
                className="admin-input-field"
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Password</label>
            <div className="admin-input-wrapper">
              <div className="admin-input-icon">
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="admin-input-field"
              />
            </div>
          </div>

          <div className="admin-credentials-row">
            <span>Admin: <strong>admin@localfixr.com</strong></span>
            <button 
              type="button" 
              className="admin-quick-fill-btn"
              onClick={() => { setEmail('admin@localfixr.com'); setPassword('password123'); }}
            >
              Fill Credentials
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="admin-submit-btn"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <>Sign In to Console <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="admin-back-row">
          <button 
            type="button" 
            onClick={() => navigate('/login')}
            className="admin-back-btn"
          >
            ← Return to Customer & Provider Login
          </button>
        </div>

        <div className="admin-security-badge">
          <span>🔒</span>
          <span>Secure 256-bit Encrypted Administration Channel</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
