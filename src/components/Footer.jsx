import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ShieldCheck, Copy, Check, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Footer = () => {
  const { user } = useAuth();
  const isProvider = user?.role === 'provider';
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText('support@localfixr.site');
    setCopiedEmail(true);
    toast.success('support@localfixr.site copied!');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <footer style={{
      marginTop: 'auto',
      padding: '3.5rem 0 1.5rem',
      background: '#111111',
      color: '#ffffff',
      borderTop: '2px solid #222222',
      fontFamily: "var(--font-sans, 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif)"
    }}>
      <div className="container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '2.5rem',
        marginBottom: '2.75rem',
      }}>
        {/* 1. Brand & Support Badge */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <img 
              src="/logo.png" 
              alt="Localfixr Logo" 
              style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} 
            />
            <span style={{ fontWeight: 900, fontSize: '1.35rem', color: '#ffffff', letterSpacing: '-0.02em' }}>Localfixr</span>
          </div>
          <p style={{ fontSize: '0.86rem', color: '#aaaaaa', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            {isProvider 
              ? 'Localfixr Partner Network. Empowering certified trade professionals with digital workstations, GPS dispatch, and instant payments.' 
              : "Local Services. Real People. Certified, nearby skilled trade professionals for doorstep home repairs and maintenance."}
          </p>

          {/* Official Support Card */}
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #333333',
            borderRadius: '8px',
            padding: '0.75rem 0.95rem'
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888888', marginBottom: '4px' }}>
              Customer Support Desk
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <a 
                href="mailto:support@localfixr.site" 
                style={{ 
                  color: '#D2FE00', 
                  fontWeight: 800, 
                  fontSize: '0.88rem', 
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Send email to support@localfixr.site"
              >
                <Mail size={14} /> support@localfixr.site
              </a>
              <button 
                type="button" 
                onClick={handleCopyEmail}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#aaaaaa',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Copy support email address"
              >
                {copiedEmail ? <Check size={14} color="#D2FE00" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Company & Documentation */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D2FE00', marginBottom: '1rem' }}>Company</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <Link to="/about" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none', transition: 'color 0.15s' }}>
              About Localfixr
            </Link>
            <Link to="/how-it-works" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none', transition: 'color 0.15s' }}>
              How It Works (Blog Guide)
            </Link>
            <Link to="/guidelines" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none', transition: 'color 0.15s' }}>
              Partner Guidelines
            </Link>
            <Link to="/safety" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none', transition: 'color 0.15s' }}>
              Safety &amp; Trust (Verification &amp; Security)
            </Link>
          </div>
        </div>

        {/* 3. Workspace / Customer Quick Links */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D2FE00', marginBottom: '1rem' }}>
            {isProvider ? 'Partner Workstation' : 'For Customers'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {isProvider ? (
              <>
                <Link to="/provider-dashboard" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>Active Bookings &amp; Orders</Link>
                <Link to="/provider-dashboard" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>Earnings &amp; Payouts</Link>
                <Link to="/provider-dashboard" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>Digital ID &amp; Profile</Link>
                <Link to="/guidelines" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>Code of Conduct</Link>
              </>
            ) : (
              <>
                <Link to="/search" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>Browse All Services</Link>
                <Link to="/how-it-works" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>Step-by-Step Guide</Link>
                <Link to="/customer-dashboard" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>My Bookings</Link>
                <Link to="/safety" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>How We Verify Pros</Link>
              </>
            )}
          </div>
        </div>

        {/* 4. Help & Support */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D2FE00', marginBottom: '1rem' }}>Help &amp; Support</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <Link to="/support" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>
              Customer Support Center
            </Link>
            <Link to="/support" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>
              Frequently Asked Questions
            </Link>
            <Link to="/safety" style={{ fontSize: '0.88rem', color: '#cccccc', textDecoration: 'none' }}>
              Report a Safety Concern
            </Link>
            <a href="mailto:support@localfixr.site" style={{ fontSize: '0.88rem', color: '#D2FE00', textDecoration: 'none', fontWeight: 700 }}>
              ✉ support@localfixr.site
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Contact Bar */}
      <div className="container" style={{
        paddingTop: '1.5rem',
        borderTop: '1px solid #262626',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <p style={{ fontSize: '0.82rem', color: '#888888', margin: 0 }}>
          &copy; {new Date().getFullYear()} Localfixr Technologies. All rights reserved. &bull; <a href="mailto:support@localfixr.site" style={{ color: '#888888', textDecoration: 'none' }}>support@localfixr.site</a>
        </p>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Link to="/safety" style={{ fontSize: '0.82rem', color: '#aaaaaa', textDecoration: 'none' }}>Privacy &amp; Data Security</Link>
          <Link to="/guidelines" style={{ fontSize: '0.82rem', color: '#aaaaaa', textDecoration: 'none' }}>Partner Terms</Link>
          <Link to="/support" style={{ fontSize: '0.82rem', color: '#aaaaaa', textDecoration: 'none' }}>Contact Us</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
