import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, CheckCircle2, AlertOctagon, Award, Clock, 
  ShieldCheck, Wrench, IndianRupee, HeartHandshake, 
  Mail, Copy, Check, ArrowRight, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Documentation.css';

const PartnerGuidelines = () => {
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
          <Link 
            to={user ? (user.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard') : '/'} 
            className="doc-back-link"
          >
            &larr; Back to {user ? 'Dashboard' : 'Home'}
          </Link>

          <div className="doc-category-badge">
            <Award size={13} />
            <span>Service Excellence &bull; Code of Conduct</span>
          </div>
          <h1 className="doc-hero-title">
            Partner Guidelines &amp;<br />
            <span className="highlight">Standards of Excellence.</span>
          </h1>
          <p className="doc-hero-lead">
            As a Localfixr Verified Partner, you represent trust, expertise, and integrity. These guidelines define our shared commitment to five-star service, fair pricing, and mutual respect.
          </p>

          <div className="doc-meta-row">
            <div className="doc-meta-item">
              <ShieldCheck size={16} color="#D2FE00" />
              <span>Mandatory for All Verified Partners</span>
            </div>
            <div className="doc-meta-item">
              <HeartHandshake size={16} color="#D2FE00" />
              <span>Fair Work &amp; Equal Dignity</span>
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
            "Our partners are the heart of Localfixr. When you deliver exceptional, honest craftsmanship, you build a loyal clientele and elevate the reputation of all skilled trades across your city."
          </div>

          {/* SECTION 1: PUNCTUALITY & COMMUNICATION */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">01</span>
              Punctuality &amp; Stage Updates
            </h2>
            <p className="doc-paragraph">
              Customers organize their day around service appointments. Respecting their schedule is paramount to earning 5-star reviews and repeat bookings.
            </p>
            
            <div className="doc-grid-2">
              <div className="doc-card">
                <div className="doc-card-icon">
                  <Clock size={22} />
                </div>
                <h3 className="doc-card-title">Arrive on Time</h3>
                <p className="doc-card-desc">
                  Always arrive within the agreed booking slot. If transit delays, bad weather, or complex prior jobs cause a delay, message or call the customer at least 20 minutes prior.
                </p>
              </div>

              <div className="doc-card">
                <div className="doc-card-icon">
                  <CheckCircle2 size={22} />
                </div>
                <h3 className="doc-card-title">Advance Job Stages Live</h3>
                <p className="doc-card-desc">
                  Update your Provider Workstation as you progress: tap <strong>On The Way</strong> when traveling, <strong>In Progress</strong> upon arrival, and <strong>Completed</strong> when the fix is done.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: DIGITAL ID & PROFESSIONAL PRESENTATION */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">02</span>
              Identity Verification &amp; Presentation
            </h2>
            <p className="doc-paragraph">
              When visiting a customer's private residence or corporate office, professionalism creates immediate peace of mind.
            </p>
            <ul style={{ paddingLeft: '1.25rem', color: '#374151', lineHeight: '1.8', fontSize: '0.95rem', margin: '0.5rem 0 1.25rem' }}>
              <li><strong>Display Your Digital ID Card:</strong> Greet the customer and present your official Localfixr Digital ID Card on your phone before entering the premises.</li>
              <li><strong>Neat &amp; Appropriate Attire:</strong> Wear clean work clothes suitable for your trade and bring standard personal safety gear (shoes, gloves, eyewear) where necessary.</li>
              <li><strong>Tool Readiness:</strong> Ensure all primary diagnostic instruments, hand tools, and standard safety meters are tested and readily available in your toolkit.</li>
              <li><strong>Clean Worksite Courtesy:</strong> Always clear away wire snips, pipe cuttings, dust, and spare packaging upon completing the job.</li>
            </ul>
          </div>

          {/* SECTION 3: TRANSPARENT BILLING & CASH HANDLING */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">03</span>
              Transparent Billing &amp; Zero Hidden Fees
            </h2>
            <p className="doc-paragraph">
              Fair, unambiguous pricing is the core principle of Localfixr. Violating pricing rules leads to immediate account deactivation.
            </p>

            <div className="doc-grid-2">
              <div className="doc-card">
                <div className="doc-card-icon">
                  <IndianRupee size={22} />
                </div>
                <h3 className="doc-card-title">Itemize Extra Parts</h3>
                <p className="doc-card-desc">
                  If replacement hardware or materials (e.g. capacitors, valves, switches) are purchased, use the <strong>"Adjust Bill / Add Extra Expenses"</strong> tool in your workstation before requesting payment.
                </p>
              </div>

              <div className="doc-card">
                <div className="doc-card-icon">
                  <ShieldCheck size={22} />
                </div>
                <h3 className="doc-card-title">Use On-Screen QR or Cash Log</h3>
                <p className="doc-card-desc">
                  Always use the <strong>"Show QR Code &amp; Collect Payment"</strong> modal. If the customer pays in cash, record it in the app so an official tax invoice is generated for their records.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: ZERO-TOLERANCE CODE */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">04</span>
              Zero-Tolerance Policies
            </h2>

            <div className="doc-alert doc-alert-warning">
              <AlertOctagon size={24} color="#B45309" style={{ flexShrink: 0 }} />
              <div>
                <div className="doc-alert-title">Strict Code of Conduct</div>
                <div className="doc-alert-text">
                  Localfixr maintains an uncompromising stance against the following behaviors:
                  <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem', lineHeight: '1.6' }}>
                    <li><strong>No Harassment or Discrimination:</strong> Any verbal abuse, harassment, discrimination, or inappropriate conduct results in immediate permanent ban and legal escalation.</li>
                    <li><strong>No Substance Use:</strong> Operating under the influence of alcohol, drugs, or smoking on customer premises is strictly prohibited.</li>
                    <li><strong>No Off-Platform Solicitation:</strong> Bypassing the platform to negotiate private cash work forfeits platform insurance and partner protection benefits.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: PARTNER SUPPORT & DISPUTE DESK */}
          <div className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">05</span>
              Partner Support &amp; Dispute Protection
            </h2>
            <p className="doc-paragraph">
              We stand by our partners. If a customer is unreachable upon arrival, refuses to pay a legitimate bill, or behaves disrespectfully, you are protected by our <strong>Partner Safety &amp; Compensation Desk</strong>.
            </p>
            <p className="doc-paragraph">
              Simply document the issue through your dashboard or email our specialist liaison team directly. We investigate fairly and ensure your time and labor are respected.
            </p>
          </div>

          {/* Partner Desk Banner */}
          <div className="doc-contact-banner">
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 0.5rem' }}>Partner Liaison &amp; Support Desk</h3>
            <p style={{ color: '#CCCCCC', maxWidth: '600px', margin: '0 auto 1.25rem', fontSize: '0.95rem' }}>
              Need help with profile verification, payout UPI changes, or customer dispute resolution? We are at your service:
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

export default PartnerGuidelines;
