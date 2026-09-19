import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, ArrowRight, ArrowUpRight, ShieldCheck, CreditCard, 
  Clock, Smartphone, Download, QrCode, Zap, CheckCircle2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Home.css';

/* ─── Google Play & Apple App Store SVG Badges ─── */
const GooglePlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M3.609 1.814L13.793 12 3.61 22.186A2.37 2.37 0 0 1 3 20.5V3.5c0-.66.224-1.267.609-1.686z" fill="#00D2FF"/>
    <path d="M17.436 8.357L13.793 12l3.643 3.643 4.148-2.396a1.458 1.458 0 0 0 0-2.494l-4.148-2.396z" fill="#FFC800"/>
    <path d="M3.61 1.814l10.183 10.186 3.643-3.643L5.457.777C4.69.334 3.992.83 3.61 1.814z" fill="#00F076"/>
    <path d="M13.793 12L3.61 22.186c.382.984 1.08 1.48 1.847 1.037l11.979-6.92L13.793 12z" fill="#FF3A44"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.56.64-1.05 1.7-0.92 2.72 1 .08 2.02-.47 2.62-1.22z"/>
  </svg>
);

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
            aria-label="Get Started"
          >
            <span>GET<span className="lf-cta-space"> </span><br className="lf-cta-br" />STARTED</span>
            <ArrowRight size={22} className="lf-cta-arrow" />
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

      {/* ═══ MOBILE APP POSTER & PLAY STORE DOWNLOAD SHOWCASE (Visible only before signing up) ═══ */}
      {!user && (
        <section className="lf-app-showcase-section">
          <div className="lf-app-showcase-inner">
            
            {/* Section Heading */}
            <div className="lf-app-header">
              <div className="lf-app-badge">
                <Smartphone size={14} />
                <span>Mobile App Now Available</span>
              </div>
              <h2 className="lf-app-title">
                Get the <span className="lf-lime-text">LocalFixr App</span> on Google Play
              </h2>
              <p className="lf-app-sub">
                Book verified doorstep experts, track live GPS technician arrivals in real time, and make seamless dynamic UPI QR code payments directly from your phone.
              </p>
            </div>

            {/* Poster Feature Showcase Frame */}
            <div className="lf-poster-wrapper">
              <img 
                src="/localfixr_app_poster.jpg" 
                alt="LocalFixr Mobile App & Doorstep Services Poster" 
                className="lf-poster-img"
              />
            </div>

            {/* Download Hub & Action Bar */}
            <div className="lf-download-hub">
              <div>
                <h3 className="lf-download-info-title">
                  Install LocalFixr on Your Smartphone
                </h3>
                <p className="lf-download-info-p">
                  Enjoy the complete hyper-local service experience in the palm of your hand. Tap below to get it on the Play Store, scan the QR code with your mobile camera, or launch the instant app.
                </p>

                <div className="lf-store-badges-row">
                  {/* Google Play Store Badge */}
                  <a 
                    href="https://play.google.com/store/apps" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="lf-store-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.success('Redirecting to Google Play Store package...');
                      window.open('https://play.google.com/store/apps', '_blank');
                    }}
                    title="Get LocalFixr on Google Play Store"
                  >
                    <GooglePlayIcon />
                    <div className="lf-store-btn-text">
                      <span className="lf-store-subtext">GET IT ON</span>
                      <span className="lf-store-maintext">Google Play</span>
                    </div>
                  </a>

                  {/* Apple App Store Badge */}
                  <a 
                    href="https://www.apple.com/app-store/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="lf-store-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.success('App Store iOS release preview!');
                      window.open('https://www.apple.com/app-store/', '_blank');
                    }}
                    title="Download on Apple App Store"
                  >
                    <AppleIcon />
                    <div className="lf-store-btn-text">
                      <span className="lf-store-subtext">Download on the</span>
                      <span className="lf-store-maintext">App Store</span>
                    </div>
                  </a>

                  {/* Direct APK / PWA Button */}
                  <button 
                    type="button" 
                    className="lf-apk-btn"
                    onClick={() => {
                      toast.success('Launching LocalFixr Instant App...');
                      navigate('/search');
                    }}
                  >
                    <Download size={16} />
                    <span>Install Instant App</span>
                  </button>
                </div>
              </div>

              {/* QR Code Card */}
              <div className="lf-download-qr-box">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https%3A%2F%2Flocalfixr.site%2Fsearch" 
                  alt="Scan to download LocalFixr app" 
                  className="lf-download-qr-img" 
                />
                <span className="lf-download-qr-label">Scan to Download</span>
                <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 600 }}>Android &bull; iOS Web</span>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="lf-app-features-grid">
              <div className="lf-app-feature-pill">
                <div className="lf-app-feature-icon">
                  <Zap size={20} />
                </div>
                <div>
                  <div className="lf-app-feature-title">Live GPS Tracking</div>
                  <div className="lf-app-feature-desc">Watch technician arrival on map</div>
                </div>
              </div>

              <div className="lf-app-feature-pill">
                <div className="lf-app-feature-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="lf-app-feature-title">Aadhaar KYC Verified</div>
                  <div className="lf-app-feature-desc">100% screened specialists</div>
                </div>
              </div>

              <div className="lf-app-feature-pill">
                <div className="lf-app-feature-icon">
                  <QrCode size={20} />
                </div>
                <div>
                  <div className="lf-app-feature-title">Dynamic UPI QR &amp; Cash</div>
                  <div className="lf-app-feature-desc">Pay directly on screen or cash</div>
                </div>
              </div>

              <div className="lf-app-feature-pill">
                <div className="lf-app-feature-icon">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="lf-app-feature-title">60-Second Booking</div>
                  <div className="lf-app-feature-desc">Transparent fixed hourly rates</div>
                </div>
              </div>
            </div>

          </div>
        </section>
      )}

    </div>
  );
};

export default Home;
