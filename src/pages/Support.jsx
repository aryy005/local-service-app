import React, { useState } from 'react';
import { 
  Mail, MessageCircle, Clock, ShieldCheck, 
  HelpCircle, ChevronDown, ChevronUp, Copy, Check, 
  Send, Sparkles, AlertCircle, CheckCircle2, Phone 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/validation';
import './Documentation.css';

const FAQS = [
  {
    q: 'How does doorstep payment via the Specialist QR Code work?',
    a: 'When your service is finished, the specialist taps "Show QR Code" on their device. An official UPI QR code generated with your exact itemized order total appears on their screen. You can scan it directly with Google Pay, PhonePe, Paytm, or BHIM. The moment payment is authorized, both your screen and the specialist’s workstation update simultaneously, and an official Tax Invoice is generated.'
  },
  {
    q: 'Can I pay cash directly to the service specialist?',
    a: 'Yes, absolutely! If you prefer paying cash, simply hand the exact amount to the technician. The technician will mark "Cash Collected" in their Provider Workstation, which instantly closes the booking on your dashboard and generates your official receipt.'
  },
  {
    q: 'What if additional replacement parts or extra materials are required?',
    a: 'Before installing any new parts (such as circuit breakers, water valves, or replacement capacitors), the specialist will inform you of the exact retail cost. They will record the items in their Workstation, and the extra cost will appear clearly on your confirmed bill with zero hidden surcharges.'
  },
  {
    q: 'How do I track my technician in real time?',
    a: 'As soon as the specialist accepts your booking and starts traveling, you can tap "Live Tracker" from your Customer Dashboard. You will see an interactive map with live route guidance, status milestones (On The Way, Arrived, In Progress), and instant buttons to call or message the technician.'
  },
  {
    q: 'How does Localfixr ensure technician background and safety?',
    a: 'Every specialist must complete a 4-tier verification protocol: Government UIDAI Aadhaar KYC, cryptographic phone OTP verification, past portfolio vetting, and administrative background screening. Approved partners carry an official Localfixr Digital ID Card with a tamper-proof partner code.'
  },
  {
    q: 'What should I do if I have a dispute or need to cancel?',
    a: 'You can cancel any booking request free of charge before the specialist arrives on-site. If you encounter any issue during or after service, email our safety and grievance team at support@localfixr.site, and a resolution manager will assist you promptly.'
  }
];

const Support = () => {
  const { user } = useAuth();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [ticketData, setTicketData] = useState({
    name: '',
    email: '',
    orderId: '',
    issueType: 'Booking & Schedule',
    message: ''
  });

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@localfixr.site');
    setCopiedEmail(true);
    toast.success('Support email copied to clipboard!');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleToggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!ticketData.name || !ticketData.email || !ticketData.message) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (!isValidEmail(ticketData.email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setFormSubmitted(true);
    toast.success('Support inquiry received! We will reply within 2-4 hours.');
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
              <HelpCircle size={13} />
              <span>24/7 Help Desk &bull; Customer Care</span>
            </div>
          </div>
          <h1 className="doc-hero-title">
            Help &amp; Support.<br />
            <span className="highlight">We're Here Whenever You Need Us.</span>
          </h1>
          <p className="doc-hero-lead">
            Have a question about an active booking, billing breakdown, partner verification, or service issue? Our dedicated customer care desk is ready to help.
          </p>

          <div className="doc-meta-row">
            <div className="doc-meta-item">
              <Mail size={16} color="#D2FE00" />
              <span>Official Support: <strong>support@localfixr.site</strong></span>
            </div>
            <div className="doc-meta-item">
              <Clock size={16} color="#D2FE00" />
              <span>Response Window: 2 to 4 Hours</span>
            </div>
            <div className="doc-meta-item">
              <ShieldCheck size={16} color="#D2FE00" />
              <span>7 Days a Week: 8 AM - 10 PM IST</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main Content ─── */}
      <div className="doc-container">
        
        {/* Support Channel Cards */}
        <div className="doc-grid-3">
          
          {/* Card 1: Email Support */}
          <div className="doc-card" style={{ background: '#111111', color: '#FFFFFF', borderColor: '#333333' }}>
            <div className="doc-card-icon" style={{ background: '#D2FE00', color: '#111111' }}>
              <Mail size={22} />
            </div>
            <h3 className="doc-card-title" style={{ color: '#FFFFFF' }}>Email Desk &amp; Inquiries</h3>
            <p className="doc-card-desc" style={{ color: '#CCCCCC', fontSize: '0.86rem' }}>
              For order assistance, dispute escalation, general inquiries, and info.
            </p>
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a 
                href="mailto:support@localfixr.site" 
                style={{ 
                  background: '#D2FE00', 
                  color: '#111111', 
                  padding: '0.55rem 0.85rem', 
                  borderRadius: 6, 
                  fontWeight: 900, 
                  fontSize: '0.85rem', 
                  textDecoration: 'none', 
                  textAlign: 'center' 
                }}
              >
                support@localfixr.site (Support)
              </a>
              <a 
                href="mailto:info@localfixr.site" 
                style={{ 
                  background: '#1c1c1c', 
                  color: '#D2FE00', 
                  border: '1px solid #333333',
                  padding: '0.55rem 0.85rem', 
                  borderRadius: 6, 
                  fontWeight: 900, 
                  fontSize: '0.85rem', 
                  textDecoration: 'none', 
                  textAlign: 'center' 
                }}
              >
                info@localfixr.site (Info &amp; Help)
              </a>
              <button 
                type="button" 
                onClick={handleCopyEmail}
                style={{ 
                  background: 'transparent', 
                  color: '#FFFFFF', 
                  border: '1px solid #444444', 
                  padding: '0.45rem', 
                  borderRadius: 6, 
                  fontWeight: 700, 
                  fontSize: '0.78rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                {copiedEmail ? <Check size={14} color="#D2FE00" /> : <Copy size={14} />}
                <span>{copiedEmail ? 'Copied Email' : 'Copy Email'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Live Chat & WhatsApp */}
          <div className="doc-card" style={{ background: '#FFFFFF', borderColor: '#111111', boxShadow: '4px 4px 0px #111111' }}>
            <div className="doc-card-icon" style={{ background: '#25D366', color: '#FFFFFF' }}>
              <MessageCircle size={22} />
            </div>
            <h3 className="doc-card-title">In-App Chat &amp; WhatsApp</h3>
            <p className="doc-card-desc" style={{ fontSize: '0.86rem' }}>
              Communicate instantly with assigned technicians directly through your active booking drawer or WhatsApp.
            </p>
            <div style={{ marginTop: '1.25rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={15} /> Real-Time Socket Connection
              </span>
            </div>
          </div>

          {/* Card 3: Safety & Trust Desk */}
          <div className="doc-card" style={{ background: '#FFFFFF', borderColor: '#111111', boxShadow: '4px 4px 0px #111111' }}>
            <div className="doc-card-icon" style={{ background: '#111111', color: '#D2FE00' }}>
              <ShieldCheck size={22} />
            </div>
            <h3 className="doc-card-title">Safety &amp; Compliance</h3>
            <p className="doc-card-desc" style={{ fontSize: '0.86rem' }}>
              Report service discrepancies, verify a technician's credentials, or file a billing review.
            </p>
            <div style={{ marginTop: '1.25rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#111111', fontWeight: 800 }}>
                Direct SLA: Priority Escalation
              </span>
            </div>
          </div>

        </div>

        {/* ─── Frequently Asked Questions Section ─── */}
        <div className="doc-article-card" style={{ marginTop: '3rem' }}>
          <h2 className="doc-h2" style={{ marginBottom: '1.5rem' }}>
            <HelpCircle size={24} />
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="doc-faq-item">
                  <button 
                    type="button" 
                    className="doc-faq-question"
                    onClick={() => handleToggleFaq(idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div className="doc-faq-answer">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Direct Contact Form Section ─── */}
        <div className="doc-article-card">
          <h2 className="doc-h2" style={{ marginBottom: '0.5rem' }}>
            <Send size={22} />
            Send Us a Message
          </h2>
          <p className="doc-paragraph" style={{ marginBottom: '1.5rem' }}>
            Fill out the form below and our customer care team will review your ticket and reply directly to your email address from <strong>support@localfixr.site</strong>.
          </p>

          {formSubmitted ? (
            <div className="doc-alert doc-alert-success" style={{ padding: '1.75rem' }}>
              <CheckCircle2 size={28} color="#166534" />
              <div>
                <div className="doc-alert-title" style={{ fontSize: '1.1rem' }}>Support Ticket Submitted Successfully!</div>
                <div className="doc-alert-text">
                  Thank you, <strong>{ticketData.name}</strong>. A support specialist has received your inquiry and will email you at <strong>{ticketData.email}</strong> within 2 to 4 hours.
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="doc-grid-2" style={{ margin: 0 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aryan Malik"
                    value={ticketData.name}
                    onChange={(e) => setTicketData({ ...ticketData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #111111', borderRadius: 8, fontSize: '0.92rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={ticketData.email}
                    onChange={(e) => setTicketData({ ...ticketData, email: e.target.value.trim().toLowerCase() })}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem 1rem', 
                      border: ticketData.email && !isValidEmail(ticketData.email) ? '1.5px solid #EF4444' : '1.5px solid #111111', 
                      borderRadius: 8, 
                      fontSize: '0.92rem', 
                      outline: 'none' 
                    }}
                  />
                  {ticketData.email && !isValidEmail(ticketData.email) && (
                    <div style={{ color: '#EF4444', fontSize: '0.72rem', fontWeight: 600, marginTop: '3px' }}>
                      Please enter a valid email address
                    </div>
                  )}
                </div>
              </div>

              <div className="doc-grid-2" style={{ margin: 0 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Booking / Order ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ORD-6F4A1B"
                    value={ticketData.orderId}
                    onChange={(e) => setTicketData({ ...ticketData, orderId: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #111111', borderRadius: 8, fontSize: '0.92rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    Issue Category *
                  </label>
                  <select
                    value={ticketData.issueType}
                    onChange={(e) => setTicketData({ ...ticketData, issueType: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #111111', borderRadius: 8, fontSize: '0.92rem', outline: 'none', background: '#FFFFFF' }}
                  >
                    <option value="Booking & Schedule">Booking &amp; Scheduling</option>
                    <option value="Payment & Invoices">Payment &amp; Invoices</option>
                    <option value="Service Quality & Technician">Service Quality &amp; Technician</option>
                    <option value="Partner Onboarding & KYC">Partner Onboarding &amp; KYC</option>
                    <option value="General Feedback & Other">General Feedback &amp; Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  How Can We Help? (Describe your issue or question) *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Please describe what happened, and any specific questions or assistance you need..."
                  value={ticketData.message}
                  onChange={(e) => setTicketData({ ...ticketData, message: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #111111', borderRadius: 8, fontSize: '0.92rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#111111',
                  color: '#D2FE00',
                  border: 'none',
                  padding: '0.9rem 1.75rem',
                  borderRadius: 8,
                  fontWeight: 900,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: 'fit-content',
                  boxShadow: '3px 3px 0px #D2FE00'
                }}
              >
                <Send size={16} />
                <span>Submit Support Ticket</span>
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};

export default Support;
