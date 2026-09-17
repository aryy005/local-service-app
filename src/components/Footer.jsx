import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Footer = () => {
  const { user } = useAuth();
  const isProvider = user?.role === 'provider';

  return (
    <footer style={{
      marginTop: 'auto',
      padding: '3rem 0 1.5rem',
      background: '#141414',
      color: '#ffffff',
      borderTop: '1px solid #262626'
    }}>
      <div className="container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '2rem',
        marginBottom: '2.5rem',
      }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <img 
              src="/logo.png" 
              alt="Localfixr Logo" 
              style={{ width: '30px', height: '30px', borderRadius: '6px', objectFit: 'cover', overflow: 'hidden' }} 
            />
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#ffffff', fontFamily: "var(--font-sans, 'Space Grotesk', sans-serif)" }}>Localfixr</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#aaaaaa', lineHeight: 1.6 }}>
            {isProvider 
              ? 'Localfixr Partner Portal. Manage client bookings, track revenue, and receive instant payouts.' 
              : "Local Services. Real People. Skilled professionals, verified and nearby to help — just around the corner."}
          </p>
        </div>

        {/* Company */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D2FE00', marginBottom: '1rem' }}>Company</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to={isProvider ? '/provider-dashboard' : '/'} style={{ fontSize: '0.88rem', color: '#dddddd' }}>About Localfixr</Link>
            <Link to={isProvider ? '/provider-dashboard' : '/'} style={{ fontSize: '0.88rem', color: '#dddddd' }}>Partner Guidelines</Link>
          </div>
        </div>

        {/* Workspace Quick Links */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D2FE00', marginBottom: '1rem' }}>
            {isProvider ? 'Partner Workstation' : 'For Customers'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isProvider ? (
              <>
                <Link to="/provider-dashboard" style={{ fontSize: '0.88rem', color: '#dddddd' }}>My Jobs & Orders</Link>
                <Link to="/provider-dashboard" style={{ fontSize: '0.88rem', color: '#dddddd' }}>Earnings & Withdrawals</Link>
                <Link to="/provider-dashboard" style={{ fontSize: '0.88rem', color: '#dddddd' }}>Profile & Verification</Link>
              </>
            ) : (
              <>
                <Link to="/search" style={{ fontSize: '0.88rem', color: '#dddddd' }}>Browse Services</Link>
                <Link to="/" style={{ fontSize: '0.88rem', color: '#dddddd' }}>How it Works</Link>
              </>
            )}
          </div>
        </div>

        {/* Support */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D2FE00', marginBottom: '1rem' }}>Help & Support</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to={isProvider ? '/provider-dashboard' : '/'} style={{ fontSize: '0.88rem', color: '#dddddd' }}>Partner Support</Link>
            <Link to={isProvider ? '/provider-dashboard' : '/'} style={{ fontSize: '0.88rem', color: '#dddddd' }}>Safety & Trust</Link>
          </div>
        </div>
      </div>

      <div className="container" style={{
        paddingTop: '1.25rem',
        borderTop: '1px solid #262626',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <p style={{ fontSize: '0.8rem', color: '#888888' }}>
          © {new Date().getFullYear()} Localfixr. All rights reserved.
        </p>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <a href="#" style={{ fontSize: '0.8rem', color: '#888888' }}>Privacy</a>
          <a href="#" style={{ fontSize: '0.8rem', color: '#888888' }}>Terms</a>
          <a href="#" style={{ fontSize: '0.8rem', color: '#888888' }}>Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
