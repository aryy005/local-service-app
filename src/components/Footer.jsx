import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Footer = () => {
  const { user } = useAuth();
  const isProvider = user?.role === 'provider';

  return (
    <footer style={{
      marginTop: 'auto',
      padding: '2.5rem 0 1.5rem',
      borderTop: '1px solid var(--surface-border)',
      background: 'var(--bg-secondary)',
    }}>
      <div className="container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem',
      }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '28px', height: '28px', background: 'var(--primary-color)', color: 'white',
              borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '800', fontSize: '0.65rem'
            }}>LF</div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>LocalFixr</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {isProvider 
              ? 'LocalFixr Partner Portal. Manage client bookings, track revenue, and receive instant payouts.' 
              : "Your neighborhood's trusted service marketplace. Verified professionals, fair prices."}
          </p>
        </div>

        {/* Company */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Company</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Link to={isProvider ? '/provider-dashboard' : '/'} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>About LocalFixr</Link>
            <Link to={isProvider ? '/provider-dashboard' : '/'} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Partner Guidelines</Link>
          </div>
        </div>

        {/* Workspace Quick Links */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {isProvider ? 'Partner Workstation' : 'For Customers'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {isProvider ? (
              <>
                <Link to="/provider-dashboard" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>My Jobs & Orders</Link>
                <Link to="/provider-dashboard" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Earnings & Withdrawals</Link>
                <Link to="/provider-dashboard" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Profile & Verification</Link>
              </>
            ) : (
              <>
                <Link to="/search" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Browse Services</Link>
                <Link to="/" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>How it Works</Link>
              </>
            )}
          </div>
        </div>

        {/* Support */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Help & Support</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Link to={isProvider ? '/provider-dashboard' : '/'} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Partner Support</Link>
            <Link to={isProvider ? '/provider-dashboard' : '/'} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Safety & Trust</Link>
          </div>
        </div>
      </div>

      <div className="container" style={{
        paddingTop: '1rem',
        borderTop: '1px solid var(--surface-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} LocalFixr. All rights reserved.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="#" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Privacy</a>
          <a href="#" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Terms</a>
          <a href="#" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
