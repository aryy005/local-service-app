import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, ArrowUpRight, ShieldCheck, CreditCard, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Home.css';

/* ─── SVG Icons matching reference exactly ─── */
const IconBolt = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
  </svg>
);

const IconFaucet = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8h14" /><path d="M5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    <path d="M19 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    <path d="M12 8v5" /><path d="M9 21v-4a3 3 0 0 1 6 0v4" />
    <path d="M8 21h8" />
  </svg>
);

const IconHammer = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 12-8.5 8.5a2.12 2.12 0 0 1-3-3L12 9" />
    <path d="M17.64 15 22 10.64" />
    <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" />
  </svg>
);

const IconPaint = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="11" height="5" rx="1" />
    <path d="M14 5h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1" />
    <path d="M8 8v13" /><line x1="5" y1="21" x2="11" y2="21" />
  </svg>
);

const IconScissors = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

const IconSnowflake = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
    <polyline points="8 2 12 6 16 2" />
    <polyline points="2 16 6 12 2 8" />
    <polyline points="16 22 12 18 8 22" />
    <polyline points="22 8 18 12 22 16" />
  </svg>
);

const popularServices = [
  { id: 'ps-1', name: 'Electrician', icon: <IconBolt />,     categoryId: 'cat-5' },
  { id: 'ps-2', name: 'Plumber',     icon: <IconFaucet />,   categoryId: 'cat-6' },
  { id: 'ps-3', name: 'Carpenter',   icon: <IconHammer />,   categoryId: 'cat-2' },
  { id: 'ps-4', name: 'Painter',     icon: <IconPaint />,    categoryId: 'cat-3' },
  { id: 'ps-5', name: 'Tailor',      icon: <IconScissors />, categoryId: 'cat-1' },
  { id: 'ps-6', name: 'AC Repair',   icon: <IconSnowflake />,categoryId: 'cat-7' },
];

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : '/search');
  };

  const handleServiceClick = (categoryId) => {
    if (!user) {
      navigate(`/auth/signup?redirect=${encodeURIComponent(`/search?category=${categoryId}`)}`);
    } else {
      navigate(`/search?category=${categoryId}`);
    }
  };

  return (
    <div className="lf-home">

      {/* ═══ HERO — full-bleed background image ═══ */}
      <section className="lf-hero">
        <div className="lf-hero-bg">

          {/* Text content overlaid on left */}
          <div className="lf-hero-inner">
            <h1 className="lf-hero-title">
              LOCAL<br />
              SERVICES.<br />
              <span className="lf-lime">REAL PEOPLE.</span>
            </h1>

            <p className="lf-hero-sub">
              Skilled professionals, verified and nearby<br />
              to help — just around the corner.
            </p>

            <form onSubmit={handleSearchSubmit} className="lf-search-form">
              <div className="lf-search-pill">
                <MapPin size={18} className="lf-pin-icon" />
                <input
                  type="text"
                  placeholder="Search for a service (e.g, electrician, plumber...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="lf-search-input"
                />
                <button type="submit" className="lf-search-btn" aria-label="Search">
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>

          {/* Trust badge — bottom-right corner on the photo */}
          <div className="lf-trust-badge">
            <div className="lf-badge-row">
              <span>LOCAL</span>
              <ArrowUpRight size={14} strokeWidth={3} />
            </div>
            <div>TRUSTED</div>
            <div className="lf-badge-row">
              <span>VERIFIED</span>
              <ArrowUpRight size={14} strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* ─── Dark value strip ─── */}
        <div className="lf-value-strip">
          <div className="lf-strip-item">
            <ShieldCheck size={22} className="lf-strip-icon" />
            <div>
              <div className="lf-strip-title">Verified Professionals</div>
              <div className="lf-strip-sub">Background checked &amp; rated</div>
            </div>
          </div>
          <div className="lf-strip-item">
            <Clock size={22} className="lf-strip-icon" />
            <div>
              <div className="lf-strip-title">Quick &amp; Easy Booking</div>
              <div className="lf-strip-sub">Book in a few clicks</div>
            </div>
          </div>
          <div className="lf-strip-item">
            <CreditCard size={22} className="lf-strip-icon" />
            <div>
              <div className="lf-strip-title">Secure Payments</div>
              <div className="lf-strip-sub">Multiple payment options</div>
            </div>
          </div>
          <button
            className="lf-strip-cta"
            onClick={() => { if (!user) navigate('/auth/signup'); else navigate('/search'); }}
          >
            <span>GET<br />STARTED</span>
            <ArrowRight size={22} />
          </button>
        </div>
      </section>

      {/* ═══ POPULAR SERVICES ═══ */}
      <section className="lf-services-section">
        <div className="lf-services-inner">
          <div className="lf-services-head">
            <h2 className="lf-services-title">Popular Services</h2>
            <Link to="/search" className="lf-view-all">View all →</Link>
          </div>
          <div className="lf-services-grid">
            {popularServices.map((svc) => (
              <button
                key={svc.id}
                className="lf-service-card"
                onClick={() => handleServiceClick(svc.categoryId)}
              >
                <div className="lf-service-icon">{svc.icon}</div>
                <span className="lf-service-name">{svc.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
