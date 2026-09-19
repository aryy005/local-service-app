import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Clock, Calendar, Search, MapPin, Navigation, 
  CreditCard, QrCode, Star, ArrowRight, ShieldCheck, 
  Sparkles, CheckCircle, Mail, Copy, Check, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Documentation.css';

const HowItWorks = () => {
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
              <BookOpen size={13} />
              <span>Product Walkthrough &bull; Editorial Blog</span>
            </div>
          </div>
          <h1 className="doc-hero-title">
            How Localfixr Works:<br />
            <span className="highlight">From Booking to Doorstep Fix.</span>
          </h1>
          <p className="doc-hero-lead">
            An in-depth, step-by-step breakdown of how our hyper-local platform coordinates live matching, GPS dispatch, itemized billing, and instant on-screen QR code settlements.
          </p>

          <div className="doc-meta-row">
            <div className="doc-meta-item">
              <Calendar size={15} />
              <span>Published by Localfixr Product Team</span>
            </div>
            <div className="doc-meta-item">
              <Clock size={15} />
              <span>6 min read</span>
            </div>
            <div className="doc-meta-item">
              <Mail size={15} />
              <span>Questions? support@localfixr.site</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Blog Article Container ─── */}
      <div className="doc-container">
        <article className="doc-article-card">
          
          <div className="doc-intro-box">
            Whether you are a homeowner facing a burst pipe at 8:00 AM or a certified electrician looking for reliable local customers without paying predatory commission fees, Localfixr redefines the service experience. Here is the complete inside look into how our platform operates under the hood.
          </div>

          {/* CHAPTER 1 */}
          <section className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">01</span>
              Smart Search or Instant AI Diagnosis
            </h2>
            <p className="doc-paragraph">
              Finding help starts in seconds. Users can either type their service need into the search bar (e.g. <em>"AC cooling coil repair"</em> or <em>"Bathroom mixer leak"</em>) or browse through 15+ curated trade categories.
            </p>
            <p className="doc-paragraph">
              Not sure what the exact problem is? Localfixr features an integrated <strong>AI Diagnosis Assistant</strong>. Simply upload a picture or describe symptoms (e.g., <em>"Water is dripping from the indoor AC unit and making a whistling noise"</em>). The AI identifies probable faults, estimates labor requirements, and directly suggests the most qualified local specialists nearby.
            </p>

            <div className="doc-alert doc-alert-info">
              <Sparkles size={22} style={{ flexShrink: 0 }} />
              <div>
                <div className="doc-alert-title">Pro-Tip for Customers</div>
                <div className="doc-alert-text">
                  You can filter technicians by verified customer rating (4.5★+), distance in kilometers, or starting base price to find the optimal match for your budget and schedule.
                </div>
              </div>
            </div>
          </section>

          {/* CHAPTER 2 */}
          <section className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">02</span>
              Transparent Booking &amp; Instant Specialist Alert
            </h2>
            <p className="doc-paragraph">
              Once you select a specialist, you review their full digital profile — including their <strong>Aadhaar KYC verification badge</strong>, past photo portfolio of completed work, customer reviews, and hourly rate.
            </p>
            <p className="doc-paragraph">
              You choose your preferred date and time slot and describe the problem. The moment you hit <strong>"Confirm Booking"</strong>, our backend notifies the specialist on their Provider Workstation in real time via Socket.IO webhooks and push notifications. The specialist reviews your request and accepts the order directly.
            </p>
          </section>

          {/* CHAPTER 3 */}
          <section className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">03</span>
              Live GPS Tracking &amp; In-App Chat
            </h2>
            <p className="doc-paragraph">
              Say goodbye to the frustrating uncertainty of <em>"I will arrive between 10 AM and 6 PM"</em>. When the specialist heads out, they update their status to <strong>"On The Way"</strong>.
            </p>
            <p className="doc-paragraph">
              Both parties gain access to the interactive <strong>Live GPS Tracker Modal</strong>, complete with:
            </p>
            <ul style={{ paddingLeft: '1.25rem', color: '#374151', lineHeight: '1.7', fontSize: '0.95rem', margin: '0.75rem 0 1.25rem' }}>
              <li>Real-time route mapping powered by OpenStreetMap &amp; Leaflet</li>
              <li>Milestone checkpoints: <em>Accepted &rarr; In Transit &rarr; In Progress &rarr; Completed &rarr; Paid</em></li>
              <li>Encrypted in-app messaging and one-click WhatsApp chat for easy gate passes and location notes</li>
              <li>Audio milestone chimes that confirm status progressions without needing to stare at the screen</li>
            </ul>
          </section>

          {/* CHAPTER 4 */}
          <section className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">04</span>
              Service Execution &amp; Itemized Bill Adjustment
            </h2>
            <p className="doc-paragraph">
              Upon arriving at your premises, the technician inspects the job and presents their official <strong>Localfixr Digital ID Card</strong>. Once the diagnostic is agreed upon, work commences.
            </p>
            <p className="doc-paragraph">
              If replacement parts or additional hardware are needed (such as copper piping, switchboards, or new valves), the technician opens their workstation bill adjuster. They specify the exact cost and description of extra parts, which immediately updates the confirmed digital bill on the customer’s screen for total transparency.
            </p>

            <div className="doc-alert doc-alert-warning">
              <ShieldCheck size={22} color="#854D0E" style={{ flexShrink: 0 }} />
              <div>
                <div className="doc-alert-title">Zero Hidden Surcharges</div>
                <div className="doc-alert-text">
                  Specialists are prohibited from charging off-platform fees or hidden service taxes. Every rupee billed must be reflected in the itemized digital invoice.
                </div>
              </div>
            </div>
          </section>

          {/* CHAPTER 5 */}
          <section className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">05</span>
              Dual-Screen UPI QR Code or In-Person Cash Settlement
            </h2>
            <p className="doc-paragraph">
              Payment is where Localfixr introduces true convenience. Customers do not even need to unlock their phone, navigate to their bookings, or open the app if they prefer not to:
            </p>
            
            <div className="doc-grid-2">
              <div className="doc-card">
                <div className="doc-card-icon">
                  <QrCode size={22} />
                </div>
                <h3 className="doc-card-title">Dynamic On-Screen QR Code</h3>
                <p className="doc-card-desc">
                  The specialist taps <strong>"Show QR Code"</strong> on their phone. A dynamic UPI QR code generated with the exact order amount appears. The customer scans it with Google Pay, PhonePe, Paytm, or BHIM.
                </p>
              </div>

              <div className="doc-card">
                <div className="doc-card-icon">
                  <CreditCard size={22} />
                </div>
                <h3 className="doc-card-title">Real-Time Dual Window Sync</h3>
                <p className="doc-card-desc">
                  The second the payment clears, both the customer and provider devices receive a real-time webhook. The job closes automatically, and cash payments can also be marked verified with a single tap.
                </p>
              </div>
            </div>
          </section>

          {/* CHAPTER 6 */}
          <section className="doc-section">
            <h2 className="doc-h2">
              <span className="doc-step-number">06</span>
              Official Digital Tax Invoices &amp; Verified Reviews
            </h2>
            <p className="doc-paragraph">
              Once closed, an official <strong>Digital Tax Invoice &amp; Work Summary</strong> is generated with a unique transaction reference ID. Both parties can download or review it at any time from their dashboard.
            </p>
            <p className="doc-paragraph">
              Customers leave genuine star ratings and written reviews that help future neighbors choose the best specialists. Independent technicians build permanent, portable reputations that they truly own.
            </p>
          </section>

          {/* Bottom Banner */}
          <div className="doc-contact-banner">
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 0.5rem' }}>Experience the New Standard of Home Services</h3>
            <p style={{ color: '#CCCCCC', maxWidth: '600px', margin: '0 auto 1.25rem', fontSize: '0.95rem' }}>
              Have any questions or need special booking assistance? We are always here to help.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button 
                type="button" 
                onClick={() => navigate('/search')} 
                className="doc-contact-email-btn"
              >
                <span>Browse Local Services →</span>
              </button>

              <a href="mailto:support@localfixr.site" className="doc-secondary-btn">
                <Mail size={16} />
                <span>support@localfixr.site</span>
              </a>
            </div>
          </div>

        </article>
      </div>
    </div>
  );
};

export default HowItWorks;
