import { Link } from 'react-router-dom';

const Footer = () => {
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
            }}>LP</div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>LocalPro</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Your neighborhood's trusted service marketplace. Verified professionals, fair prices.
          </p>
        </div>

        {/* Company */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Company</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Link to="/" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>About Us</Link>
            <Link to="/" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Careers</Link>
            <Link to="/" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Blog</Link>
          </div>
        </div>

        {/* For Customers */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>For Customers</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Link to="/search" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Browse Services</Link>
            <Link to="/" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>How it Works</Link>
            <Link to="/" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Safety</Link>
          </div>
        </div>

        {/* For Professionals */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>For Professionals</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Link to="/auth/signup" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Register as Pro</Link>
            <Link to="/" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Partner Guidelines</Link>
            <Link to="/" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Support</Link>
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
          © {new Date().getFullYear()} LocalPro. All rights reserved.
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
