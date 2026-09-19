import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Lock, Key, UserCheck, Smartphone, 
  FileCheck, EyeOff, Server, AlertTriangle, Mail, 
  Copy, Check, ArrowRight, CheckCircle2, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Documentation.css';

const SafetyAndTrust = () => {
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
              <ShieldCheck size={13} />
              <span>Safety, Vetting &amp; Privacy Shield</span>
            </div>
          </div>
          <h1 className="doc-hero-title">
            Your Safety and Trust.<br />
            <span className="highlight">Guaranteed by Design.</span>
          </h1>
          <p className="doc-hero-lead">
            Inviting a professional into your home or business requires complete confidence. Learn how Localfixr screens every specialist and employs bank-grade encryption to protect your privacy and data.
          </p>

          <div className="doc-meta-row">
            <div className="doc-meta-item">
              <UserCheck size={16} color="#D2FE00" />
              <span>Multi-Tier Identity KYC</span>
            </div>
            <div className="doc-meta-item">
              <Lock size={16} color="#D2FE00" />
              <span>256-Bit SSL/TLS Data Encryption</span>
            </div>
            <div className="doc-meta-item">
              <Mail size={16} color="#D2FE00" />
              <span>support@localfixr.site</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main Content ─── */}
      <div className="doc-container">
        <div className="doc-article-card">
          
          <div className="doc-intro-box">
            At Localfixr, safety is not an afterthought or marketing slogan. From identity verification before a partner can accept their first order to zero-retention payment architectures, our entire system is engineered to protect both customers and service specialists.
          </div>

          {/* PART 1: PROFESSIONAL VERIFICATION */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">01</span>
              How We Verify Every Professional
            </h2>
            <p className="doc-paragraph">
              Unlike open classifieds or directories where anyone can post a phone number, Localfixr enforces a strict <strong>4-Tier Partner Verification Gate</strong>. No specialist can receive customer orders until each verification checkpoint is completed and approved.
            </p>

            <div className="doc-verify-item">
              <div className="doc-verify-badge">Tier 1</div>
              <div>
                <h3 className="doc-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCheck size={18} color="#10B981" />
                  Government Aadhaar KYC Verification
                </h3>
                <p className="doc-card-desc">
                  Every specialist submits their Government Aadhaar number for real-time OTP authentication through authorized identity gateways. This confirms their legal name, age, and authentic identity, eliminating anonymous accounts and fake profiles.
                </p>
              </div>
            </div>

            <div className="doc-verify-item">
              <div className="doc-verify-badge">Tier 2</div>
              <div>
                <h3 className="doc-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Smartphone size={18} color="#10B981" />
                  Two-Factor Mobile OTP Validation
                </h3>
                <p className="doc-card-desc">
                  The specialist’s primary contact number is authenticated via cryptographic SMS/WhatsApp OTP. This guarantees an active, reachable communication channel for order coordination and emergency contact.
                </p>
              </div>
            </div>

            <div className="doc-verify-item">
              <div className="doc-verify-badge">Tier 3</div>
              <div>
                <h3 className="doc-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCheck size={18} color="#10B981" />
                  Trade Experience &amp; Portfolio Inspection
                </h3>
                <p className="doc-card-desc">
                  Specialists must furnish verifiable proof of trade experience (minimum years in trade) and upload authentic photographic portfolios of previous field work. Fabricated or stock imagery is flagged and rejected during review.
                </p>
              </div>
            </div>

            <div className="doc-verify-item">
              <div className="doc-verify-badge">Tier 4</div>
              <div>
                <h3 className="doc-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="#10B981" />
                  Platform Admin Screening &amp; Official Digital ID Issuance
                </h3>
                <p className="doc-card-desc">
                  Our compliance team conducts a final manual review of the technician’s credentials, trade category, and payout details. Upon approval, an official <strong>Localfixr Digital ID Card</strong> with a unique Partner Code (e.g. <code>LFX-PRV-4821</code>) and tamper-proof verification seal is issued. Specialists must present this ID upon arriving at any customer premise.
                </p>
              </div>
            </div>
          </div>

          {/* PART 2: DATA SECURITY & PRIVACY */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">02</span>
              How Your Data &amp; Privacy Are Secured
            </h2>
            <p className="doc-paragraph">
              We treat user privacy and technical data security with the utmost seriousness. Our platform infrastructure is built following industry security standards:
            </p>

            <div className="doc-grid-2">
              <div className="doc-card">
                <div className="doc-card-icon">
                  <Lock size={22} />
                </div>
                <h3 className="doc-card-title">256-Bit SSL/TLS Encryption</h3>
                <p className="doc-card-desc">
                  All communications between your browser or mobile phone and our servers travel through hardened HTTPS connections encrypted with modern cryptographic ciphers (TLS 1.3 / AES-256).
                </p>
              </div>

              <div className="doc-card">
                <div className="doc-card-icon">
                  <Key size={22} />
                </div>
                <h3 className="doc-card-title">Zero Financial Data Retention</h3>
                <p className="doc-card-desc">
                  Payments are conducted via NPCI-compliant UPI intents and direct banking rails. Localfixr never stores your bank account passwords, UPI PINs, or credit/debit card numbers on any server.
                </p>
              </div>

              <div className="doc-card">
                <div className="doc-card-icon">
                  <EyeOff size={22} />
                </div>
                <h3 className="doc-card-title">Privacy Masking &amp; Scope Limiting</h3>
                <p className="doc-card-desc">
                  Your address and phone number are only visible to the specialist assigned to your active order during the service window. We never sell or share your contact info with third-party advertisers.
                </p>
              </div>

              <div className="doc-card">
                <div className="doc-card-icon">
                  <Server size={22} />
                </div>
                <h3 className="doc-card-title">Hardened Role-Based Access</h3>
                <p className="doc-card-desc">
                  User accounts and session tokens are strictly scoped with JSON Web Tokens (JWT) and Bcrypt cryptographic hashing. Customers, specialists, and admins are quarantined into distinct privilege boundaries.
                </p>
              </div>
            </div>
          </div>

          {/* PART 3: CUSTOMER DOORSTEP CHECKLIST */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">03</span>
              Doorstep Safety Guidelines for Customers
            </h2>

            <div className="doc-alert doc-alert-success">
              <CheckCircle2 size={22} color="#166534" style={{ flexShrink: 0 }} />
              <div>
                <div className="doc-alert-title">Simple Checks for Complete Safety</div>
                <div className="doc-alert-text">
                  <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem', lineHeight: '1.6' }}>
                    <li><strong>Check the Digital ID Card:</strong> When the technician arrives, ask to view their official Localfixr Digital ID card on their phone. Ensure the photo and Partner ID match your booking details.</li>
                    <li><strong>Follow In-App Milestones:</strong> Track status transitions from <em>Accepted</em> to <em>In Progress</em> to ensure the booking is officially logged in the system.</li>
                    <li><strong>Keep Payments on Platform:</strong> Pay only via the dynamic QR code generated on the provider’s screen or mark cash received in the app so an official tax receipt is generated.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Reporting Banner */}
          <div className="doc-contact-banner">
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 0.5rem' }}>Safety &amp; Compliance Escalation Desk</h3>
            <p style={{ color: '#CCCCCC', maxWidth: '600px', margin: '0 auto 1.25rem', fontSize: '0.95rem' }}>
              Have an inquiry regarding partner verification, incident reporting, or data privacy? Contact our dedicated safety team immediately:
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

export default SafetyAndTrust;
