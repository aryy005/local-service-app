import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { categories } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import './Home.css';

// ─── Urban Company Featured Popular Services (with High-res Imagery) ────────
const featuredServices = [
  {
    id: 'srv-1',
    categoryId: 'cat-5',
    categoryName: 'Electrician',
    title: 'Switchboard, Wiring & Fan Fitting',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=600',
    rating: 4.86,
    reviewsCount: '24.5K',
    price: 199,
    duration: '30 mins',
    badge: '⚡ Bestseller',
    description: 'Expert diagnostics, short circuit repairs, switchboards & appliance installations.'
  },
  {
    id: 'srv-2',
    categoryId: 'cat-6',
    categoryName: 'Plumber',
    title: 'Tap Leakage, Pipe & Drain Repair',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
    rating: 4.89,
    reviewsCount: '38.2K',
    price: 249,
    duration: '40 mins',
    badge: '💧 Most Popular',
    description: 'High-pressure jet unblocking, tap replacement, pipe leakage, and bathroom fixtures.'
  },
  {
    id: 'srv-3',
    categoryId: 'cat-8',
    categoryName: 'Cleaning',
    title: 'Full Bathroom & Kitchen Deep Clean',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=600',
    rating: 4.92,
    reviewsCount: '52.1K',
    price: 399,
    duration: '60 mins',
    badge: '✨ Top Rated',
    description: 'Hard water stain removal, machine floor scrubbing, tile sanitization & sparkling shine.'
  },
  {
    id: 'srv-4',
    categoryId: 'cat-2',
    categoryName: 'Carpenter',
    title: 'Furniture Assembly & Lock Repair',
    image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&q=80&w=600',
    rating: 4.83,
    reviewsCount: '18.4K',
    price: 299,
    duration: '45 mins',
    badge: '🔨 Expert Care',
    description: 'Bed & wardrobe assembly, hinge adjustment, custom woodwork, and door lock fixes.'
  },
  {
    id: 'srv-5',
    categoryId: 'cat-3',
    categoryName: 'Painter',
    title: 'Accent Wall Painting & Waterproofing',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=600',
    rating: 4.88,
    reviewsCount: '12.6K',
    price: 499,
    duration: '90 mins',
    badge: '🎨 Premium Finish',
    description: 'Laser-guided color consultation, Asian Paints premium finish, and damp-proof coating.'
  },
  {
    id: 'srv-6',
    categoryId: 'cat-1',
    categoryName: 'Tailor',
    title: 'Custom Stitching & Express Alteration',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=600',
    rating: 4.85,
    reviewsCount: '14.9K',
    price: 199,
    duration: '35 mins',
    badge: '🪡 Doorstep Pickup',
    description: 'Perfect-fit blouse, suit, trousers alterations with free doorstep pickup & drop.'
  },
  {
    id: 'srv-7',
    categoryId: 'cat-7',
    categoryName: 'Laundry',
    title: 'Wash, Steam Iron & Express Dry Clean',
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&q=80&w=600',
    rating: 4.84,
    reviewsCount: '16.3K',
    price: 149,
    duration: '24 hours',
    badge: '👔 Crisp Finish',
    description: 'Eco-friendly antibacterial washing, wrinkle-free steam press, and spotless dry cleaning.'
  },
  {
    id: 'srv-8',
    categoryId: 'cat-4',
    categoryName: 'Cobbler',
    title: 'Leather Shoe Spa, Resole & Stitching',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=600',
    rating: 4.81,
    reviewsCount: '9.2K',
    price: 199,
    duration: '30 mins',
    badge: '👞 Premium Care',
    description: 'Deep leather conditioning, anti-fungal deodorization, sole repairs, and polish.'
  }
];

// ─── Urban Company Verified Customer Reviews ────────────────────────────────
const customerReviews = [
  {
    name: 'Ananya Sharma',
    city: 'New Delhi',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    rating: 5,
    service: 'Full Home Deep Clean',
    review: 'Booked in under a minute. The professional arrived with high-end machines and left my apartment sparkling clean. Super transparent pricing with zero hassle!'
  },
  {
    name: 'Vikram Mehta',
    city: 'Mumbai',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    rating: 5,
    service: 'Electrician & Switchboard Wiring',
    review: 'The live GPS tracking is incredible! I could see the electrician approaching my building in real-time. He was polite, fixed the circuit in 20 mins, and charged exact standard rate.'
  },
  {
    name: 'Pooja Iyer',
    city: 'Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
    rating: 5,
    service: 'Tap & Pipeline Leakage Repair',
    review: 'No more negotiating with local handymen. Background verified plumber, upfront pricing, and paid instantly via UPI QR code. Truly the Urban Company standard!'
  }
];

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeBanner, setActiveBanner] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.role === 'provider') {
      navigate('/provider-dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Handle Book Now Click (Directly redirects guests to Sign Up)
  const handleBookNow = (service) => {
    if (!user) {
      navigate(`/auth/signup?redirect=${encodeURIComponent(`/search?category=${service.categoryId}`)}`);
    } else {
      navigate(`/search?category=${service.categoryId}`);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const getIcon = (iconName) => {
    const IconComponent = Icons[iconName] || Icons.HelpCircle;
    return <IconComponent size={24} />;
  };

  return (
    <div className="home-page uc-home fade-in">
      
      {/* ─── 1. HERO SECTION (Urban Company Style) ─── */}
      <section className="uc-hero-section">
        <div className="uc-hero-container">
          <div className="uc-hero-left">
            <div className="uc-badge-pill">
              <Icons.Sparkles size={14} className="text-yellow-400" />
              <span>India's Most Trusted Home Services Platform</span>
            </div>

            <h1 className="uc-hero-title">
              Home services,<br />
              <span className="uc-gradient-text">on demand.</span>
            </h1>

            <p className="uc-hero-desc">
              Book certified & background-verified professionals for electrical, plumbing, cleaning, carpentry, and home improvement.
            </p>

            {/* Smart Search Bar */}
            <form onSubmit={handleSearchSubmit} className="uc-search-form">
              <div className="uc-search-input-wrap">
                <Icons.Search size={20} className="uc-search-icon" />
                <input 
                  type="text"
                  placeholder="Search for 'Electrician', 'Deep Cleaning', 'Tap Leak'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="uc-search-input"
                />
              </div>
              <button type="submit" className="uc-search-btn">
                Search Services
              </button>
            </form>

            {/* Quick Popular Pills */}
            <div className="uc-quick-pills">
              <span className="uc-pills-label">Popular:</span>
              <button onClick={() => navigate('/search?category=cat-5')} className="uc-pill">⚡ Electrician</button>
              <button onClick={() => navigate('/search?category=cat-6')} className="uc-pill">💧 Plumber</button>
              <button onClick={() => navigate('/search?category=cat-8')} className="uc-pill">✨ Cleaning</button>
              <button onClick={() => navigate('/search?category=cat-2')} className="uc-pill">🔨 Carpenter</button>
            </div>

            {/* Trust Badges Bar */}
            <div className="uc-hero-trust-bar">
              <div className="uc-trust-box">
                <div className="uc-trust-icon-box">
                  <Icons.ShieldCheck size={20} />
                </div>
                <div>
                  <div className="uc-trust-val">100% Verified</div>
                  <div className="uc-trust-lbl">Background Checked</div>
                </div>
              </div>

              <div className="uc-trust-box">
                <div className="uc-trust-icon-box">
                  <Icons.Star size={20} />
                </div>
                <div>
                  <div className="uc-trust-val">4.88 ★ Rating</div>
                  <div className="uc-trust-lbl">Over 1M+ Bookings</div>
                </div>
              </div>

              <div className="uc-trust-box">
                <div className="uc-trust-icon-box">
                  <Icons.Navigation size={20} />
                </div>
                <div>
                  <div className="uc-trust-val">Live GPS Tracking</div>
                  <div className="uc-trust-lbl">Doorstep in 30 Mins</div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Right Visual Showcase */}
          <div className="uc-hero-right">
            <div className="uc-hero-image-grid">
              <div className="uc-hero-img-card card-main">
                <img 
                  src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=600" 
                  alt="Certified Electrician" 
                />
                <div className="uc-img-card-overlay">
                  <span className="uc-img-tag">⚡ Verified Pro</span>
                  <h4>Doorstep Electrical Repair</h4>
                  <p>Starts at ₹199</p>
                </div>
              </div>

              <div className="uc-hero-img-card card-sub">
                <img 
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=600" 
                  alt="Deep Cleaning" 
                />
                <div className="uc-img-card-overlay">
                  <span className="uc-img-tag bg-emerald-600">✨ Deep Clean</span>
                  <h4>Full Home Sanitization</h4>
                  <p>Starts at ₹399</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. ADVERTISEMENT & PROMOTIONAL OFFERS (Urban Company Style) ─── */}
      <section className="uc-promo-section">
        <div className="uc-promo-grid">
          <div className="uc-promo-card promo-gradient-purple">
            <div className="uc-promo-text">
              <span className="uc-promo-badge">NEW USER SPECIAL</span>
              <h3>Flat 20% OFF On First Booking</h3>
              <p>Use coupon code <strong>LOCALFIX20</strong> on your first service order.</p>
              <button 
                onClick={() => {
                  if (!user) navigate('/auth/signup');
                  else navigate('/search');
                }}
                className="uc-promo-btn"
              >
                Claim Offer Now →
              </button>
            </div>
            <div className="uc-promo-icon-art">
              <Icons.Tag size={72} />
            </div>
          </div>

          <div className="uc-promo-card promo-gradient-emerald">
            <div className="uc-promo-text">
              <span className="uc-promo-badge bg-emerald-900/60">100% QUALITY PROMISE</span>
              <h3>The LocalFixr Safety Cover</h3>
              <p>Aadhaar verified experts, transparent fixed pricing & 30-day rework warranty.</p>
              <button 
                onClick={() => {
                  if (!user) navigate('/auth/signup');
                  else navigate('/search');
                }}
                className="uc-promo-btn"
              >
                Explore Guarantee →
              </button>
            </div>
            <div className="uc-promo-icon-art">
              <Icons.ShieldCheck size={72} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. WHAT ARE YOU LOOKING FOR? (Categories Grid) ─── */}
      <section className="uc-categories-section">
        <div className="uc-section-head">
          <div>
            <h2 className="uc-section-title">Explore All Categories</h2>
            <p className="uc-section-subtitle">Select a category to browse certified professionals & standard pricing</p>
          </div>
          <Link to="/search" className="uc-view-all-link">
            View All Services <Icons.ChevronRight size={18} />
          </Link>
        </div>

        <div className="uc-cat-icons-grid">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => {
                if (!user) {
                  navigate(`/auth/signup?redirect=${encodeURIComponent(`/search?category=${cat.id}`)}`);
                } else {
                  navigate(`/search?category=${cat.id}`);
                }
              }}
              className="uc-cat-item-card"
            >
              <div className="uc-cat-icon-circle">
                {getIcon(cat.icon)}
              </div>
              <span className="uc-cat-item-name">{cat.name}</span>
              <span className="uc-cat-item-sub">{cat.description?.split(',')[0]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 4. TRENDING SERVICES (Urban Company Picture Cards + Book Now) ─── */}
      <section className="uc-trending-section">
        <div className="uc-section-head">
          <div>
            <div className="uc-section-tag">MOST BOOKED</div>
            <h2 className="uc-section-title">Popular Services in Demand</h2>
            <p className="uc-section-subtitle">Top-rated home services delivered with premium equipment and warranty</p>
          </div>
          <Link to="/search" className="uc-view-all-link">
            See full catalog <Icons.ChevronRight size={18} />
          </Link>
        </div>

        <div className="uc-services-grid">
          {featuredServices.map((service) => (
            <div key={service.id} className="uc-service-card">
              <div className="uc-service-img-wrap">
                <img src={service.image} alt={service.title} />
                <span className="uc-service-card-badge">{service.badge}</span>
                <span className="uc-service-card-duration">
                  <Icons.Clock size={12} /> {service.duration}
                </span>
              </div>

              <div className="uc-service-body">
                <div className="uc-service-category-tag">
                  {service.categoryName}
                </div>

                <h3 className="uc-service-title">{service.title}</h3>
                <p className="uc-service-desc">{service.description}</p>

                <div className="uc-service-rating-row">
                  <span className="uc-rating-pill">
                    <Icons.Star size={13} fill="#ffc107" color="#ffc107" />
                    <strong>{service.rating}</strong>
                  </span>
                  <span className="uc-reviews-count">({service.reviewsCount} bookings)</span>
                </div>

                <div className="uc-service-footer">
                  <div className="uc-price-block">
                    <span className="uc-price-label">Starts at</span>
                    <span className="uc-price-amount">₹{service.price}</span>
                  </div>

                  <button 
                    onClick={() => handleBookNow(service)}
                    className="uc-book-now-btn"
                  >
                    Book Now <Icons.ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 5. WHY LOCALFIXR (The Urban Company Assurance) ─── */}
      <section className="uc-why-section">
        <div className="uc-why-container">
          <div className="uc-why-header">
            <span className="uc-section-tag">WHY CHOOSE US</span>
            <h2>The LocalFixr Quality Assurance</h2>
            <p>We take full responsibility for your experience from booking to completion</p>
          </div>

          <div className="uc-why-grid">
            <div className="uc-why-card">
              <div className="uc-why-icon-box icon-purple">
                <Icons.UserCheck size={28} />
              </div>
              <h3>Aadhaar & Background Verified</h3>
              <p>Every technician undergoes comprehensive ID verification, criminal background check, and skill audit.</p>
            </div>

            <div className="uc-why-card">
              <div className="uc-why-icon-box icon-emerald">
                <Icons.DollarSign size={28} />
              </div>
              <h3>Transparent Fixed Pricing</h3>
              <p>No sudden price jumps or hidden fees. Transparent hourly rates and standard rate cards before you book.</p>
            </div>

            <div className="uc-why-card">
              <div className="uc-why-icon-box icon-blue">
                <Icons.Navigation size={28} />
              </div>
              <h3>Live GPS En-Route Tracking</h3>
              <p>Know exactly where your service partner is with real-time Socket.io and Leaflet map GPS tracking.</p>
            </div>

            <div className="uc-why-card">
              <div className="uc-why-icon-box icon-amber">
                <Icons.RotateCcw size={28} />
              </div>
              <h3>Free Re-Work Guarantee</h3>
              <p>Not 100% satisfied? We offer a free 30-day inspection and rework guarantee on all completed services.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. HOW IT WORKS (3 Simple Steps) ─── */}
      <section className="uc-steps-section">
        <div className="uc-steps-header">
          <span className="uc-section-tag">EASY 3 STEPS</span>
          <h2>How LocalFixr Works</h2>
          <p>Get doorstep repairs and professional services in 3 seamless steps</p>
        </div>

        <div className="uc-steps-timeline">
          <div className="uc-step-box">
            <div className="uc-step-num">1</div>
            <div className="uc-step-illustration">
              <Icons.Smartphone size={32} />
            </div>
            <h3>Choose Service & Slot</h3>
            <p>Pick from our extensive service catalog and choose your preferred date and time slot.</p>
          </div>

          <div className="uc-step-divider-line" />

          <div className="uc-step-box">
            <div className="uc-step-num">2</div>
            <div className="uc-step-illustration">
              <Icons.Truck size={32} />
            </div>
            <h3>Track Expert Arrival</h3>
            <p>Your certified professional arrives on time. Track their live GPS location right from your screen.</p>
          </div>

          <div className="uc-step-divider-line" />

          <div className="uc-step-box">
            <div className="uc-step-num">3</div>
            <div className="uc-step-illustration">
              <Icons.CheckCircle2 size={32} />
            </div>
            <h3>Pay Securely & Relax</h3>
            <p>Inspect the completed work, pay via instant UPI QR code or card, and rate your experience.</p>
          </div>
        </div>
      </section>

      {/* ─── 7. CUSTOMER REVIEWS & TESTIMONIALS ─── */}
      <section className="uc-testimonials-section">
        <div className="uc-section-head">
          <div>
            <div className="uc-section-tag">CUSTOMER LOVE</div>
            <h2 className="uc-section-title">What Our Customers Say</h2>
            <p className="uc-section-subtitle">Real experiences from verified homeowners across India</p>
          </div>
        </div>

        <div className="uc-reviews-grid">
          {customerReviews.map((rev, index) => (
            <div key={index} className="uc-review-card">
              <div className="uc-review-stars">
                {[...Array(rev.rating)].map((_, i) => (
                  <Icons.Star key={i} size={16} fill="#ffc107" color="#ffc107" />
                ))}
              </div>

              <p className="uc-review-text">"{rev.review}"</p>

              <div className="uc-review-author">
                <img src={rev.avatar} alt={rev.name} className="uc-author-avatar" />
                <div>
                  <div className="uc-author-name">{rev.name}</div>
                  <div className="uc-author-city">{rev.city} • <span className="text-emerald-500 font-semibold">{rev.service}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 8. PARTNER ONBOARDING BANNER (Hidden for logged in users) ─── */}
      {!user && (
        <section className="uc-partner-cta">
          <div className="uc-partner-content">
            <div className="uc-partner-left">
              <span className="uc-promo-badge">LOCALFIXR FOR PROFESSIONALS</span>
              <h2>Are you an experienced service professional?</h2>
              <p>
                Join thousands of verified electricians, plumbers, carpenters, and technicians earning ₹40,000+ monthly with guaranteed instant UPI payouts.
              </p>
              <div className="uc-partner-perks">
                <span>✓ Zero Joining Fee</span>
                <span>✓ Flexible Hours</span>
                <span>✓ Weekly & Instant Payouts</span>
                <span>✓ High Value Orders</span>
              </div>
              <Link to="/auth/signup" className="uc-partner-join-btn">
                Register as a Service Partner →
              </Link>
            </div>
            <div className="uc-partner-right">
              <div className="uc-partner-stat-box">
                <div className="stat-big">₹45,000+</div>
                <div className="stat-desc">Average monthly partner earnings</div>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

export default Home;
