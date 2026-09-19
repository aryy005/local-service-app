import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, MapPin, Zap, Users, HeartHandshake, 
  ArrowRight, Mail, CheckCircle2, Award, Copy, Check 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Documentation.css';

const About = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@localfixr.site');
    setCopiedEmail(true);
    toast.success('Support email copied to clipboard!');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="doc-page">
      {/* ─── Hero ─── */}
      <section className="doc-hero">
        <div className="doc-hero-container">
          <div className="doc-hero-top-row">
            <Link 
              to={user ? (user.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard') : '/'} 
              className="doc-back-link"
            >
              &larr; Back to {user ? 'Dashboard' : 'Home'}
            </Link>

            <div className="doc-category-badge">
              <Users size={13} />
              <span>Our Mission &amp; Vision</span>
            </div>
          </div>
          <h1 className="doc-hero-title">
            Local Services. Real People.<br />
            <span className="highlight">Welcome to Localfixr.</span>
          </h1>
          <p className="doc-hero-lead">
            Localfixr is India's hyper-local home service ecosystem built on radical transparency, direct technician empowerment, and uncompromising trust. We connect homeowners and businesses with verified, skilled trade specialists right in their neighborhood.
          </p>

          <div className="doc-meta-row">
            <div className="doc-meta-item">
              <ShieldCheck size={16} color="#D2FE00" />
              <span>100% Aadhaar KYC Verified Specialists</span>
            </div>
            <div className="doc-meta-item">
              <Zap size={16} color="#D2FE00" />
              <span>Instant Live GPS Dispatch</span>
            </div>
            <div className="doc-meta-item">
              <Mail size={16} color="#D2FE00" />
              <span>support@localfixr.site</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main Article ─── */}
      <div className="doc-container">
        <div className="doc-article-card">
          
          <div className="doc-intro-box">
            "For years, getting a skilled electrician, plumber, or appliance technician meant relying on word-of-mouth, haggling over arbitrary pricing, and letting unverified strangers into your home. Localfixr was created to fix the broken gig economy for both customers and trade professionals."
          </div>

          {/* Section: Who We Are */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">01</span>
              Who We Are
            </h2>
            <p className="doc-paragraph">
              Localfixr is a modern, technology-driven platform that bridges the gap between everyday homeowners needing reliable assistance and hardworking, skilled trade professionals who take pride in their craft. From emergency electrical failures and leaking water pipelines to seasonal AC servicing, carpentry, and home maintenance, Localfixr provides instant access to local talent within minutes.
            </p>
            <p className="doc-paragraph">
              Unlike legacy platforms that act as distant aggregators charging exorbitant commissions and treating technicians as disposable labor, Localfixr is architected around <strong>partner dignity</strong> and <strong>customer peace of mind</strong>.
            </p>
          </div>

          {/* Section: Core Pillars */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">02</span>
              The 4 Pillars of Localfixr
            </h2>

            <div className="doc-grid-2">
              <div className="doc-card">
                <div className="doc-card-icon">
                  <MapPin size={22} />
                </div>
                <h3 className="doc-card-title">Hyper-Local Discovery</h3>
                <p className="doc-card-desc">
                  We match you with specialists situated within your immediate neighborhood (5-15 km radius). This ensures rapid arrival times, reduced transit costs, and genuine community accountability.
                </p>
              </div>

              <div className="doc-card">
                <div className="doc-card-icon">
                  <ShieldCheck size={22} />
                </div>
                <h3 className="doc-card-title">Rigorous 4-Step Vetting</h3>
                <p className="doc-card-desc">
                  Every specialist undergoes real-time Government Aadhaar verification, phone OTP validation, portfolio inspection, and admin approval before receiving their official Digital ID Card.
                </p>
              </div>

              <div className="doc-card">
                <div className="doc-card-icon">
                  <Award size={22} />
                </div>
                <h3 className="doc-card-title">Radical Billing Honesty</h3>
                <p className="doc-card-desc">
                  No sudden surprises or hidden checkout surcharges. Upfront base rates are stated clearly, and any extra parts or materials must be itemized and approved before payment.
                </p>
              </div>

              <div className="doc-card">
                <div className="doc-card-icon">
                  <HeartHandshake size={22} />
                </div>
                <h3 className="doc-card-title">Direct Partner Payouts</h3>
                <p className="doc-card-desc">
                  With dual-window dynamic UPI QR codes and cash collection options, specialists receive their hard-earned compensation immediately with full invoice generation for the customer.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Empowering Local Trades */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">03</span>
              Empowering Independent Trade Professionals
            </h2>
            <p className="doc-paragraph">
              Skilled electricians, plumbers, carpenters, and appliance mechanics form the backbone of urban living. Yet, most have historically lacked access to modern digital tooling, GPS route management, instant customer communication, and official credentialing.
            </p>
            <p className="doc-paragraph">
              Localfixr equips each specialist with a full <strong>Provider Workstation</strong> — featuring live order management, in-app messaging, verified customer reviews, dynamic QR-code payment generation, and downloadable official Partner ID cards. By elevating tradespeople into recognized, reputable micro-entrepreneurs, we foster safer, stronger communities.
            </p>
          </div>

          {/* Contact & Support Callout */}
          <div className="doc-contact-banner">
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 0.5rem' }}>Have Questions or Feedback?</h3>
            <p style={{ color: '#CCCCCC', maxWidth: '600px', margin: '0 auto 1.25rem', fontSize: '0.95rem' }}>
              Our dedicated community and customer support desk is here to assist you 7 days a week. Reach out to our team directly:
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <a href="mailto:support@localfixr.site" className="doc-contact-email-btn">
                <Mail size={18} />
                <span>support@localfixr.site</span>
              </a>

              <button type="button" onClick={handleCopyEmail} className="doc-secondary-btn">
                {copiedEmail ? <Check size={18} color="#D2FE00" /> : <Copy size={18} />}
                <span>{copiedEmail ? 'Copied!' : 'Copy Email Address'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default About;
