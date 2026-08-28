import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { categories } from '../data/mockData';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import './Home.css';
import ProviderCard from '../components/ProviderCard';
import SkeletonLoader from '../components/SkeletonLoader';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [providersList, setProvidersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'provider') {
      navigate('/provider-dashboard', { replace: true });
      return;
    }

    const fetchProviders = async () => {
      try {
        const res = await fetch(`${API_URL}/providers`);
        if (res.ok) {
          const data = await res.json();
          setProvidersList(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, [user, navigate]);

  // Filter providers by user's registered city if logged in
  const userCity = user?.city || user?.addressDetails?.city;
  let cityFilteredProviders = providersList;
  if (userCity && userCity.trim() !== '') {
    cityFilteredProviders = providersList.filter(p => {
      const pCity = (p.city || p.addressDetails?.city || p.providerDetails?.location || '').toLowerCase();
      return pCity.includes(userCity.trim().toLowerCase());
    });
  }

  // Get top 3 providers for the highlighted section
  const topProviders = cityFilteredProviders.sort((a, b) => (b.providerDetails?.rating || 0) - (a.providerDetails?.rating || 0)).slice(0, 3);

  const getIcon = (iconName) => {
    const IconComponent = Icons[iconName] || Icons.HelpCircle;
    return <IconComponent size={28} />;
  };

  return (
    <div className="home-page fade-in">
      
      {/* Hero Banner (UC-style) */}
      <section className="hero-banner">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Home services,<br />on demand.</h1>
            <p className="hero-subtitle">
              Book trusted professionals for any service — verified, rated, and in your neighborhood.
            </p>
            <div className="hero-actions">
              <Link to="/search" className="btn btn-primary btn-lg">
                <Icons.Search size={18} /> Explore Services
              </Link>
              {!user && (
                <Link to="/auth/signup" className="btn btn-outline btn-lg">
                  Become a Pro
                </Link>
              )}
            </div>
            <div className="hero-trust-strip">
              <div className="trust-item">
                <Icons.ShieldCheck size={18} />
                <span>Aadhaar Verified Pros</span>
              </div>
              <div className="trust-item">
                <Icons.Star size={18} />
                <span>4.8 Avg Rating</span>
              </div>
              <div className="trust-item">
                <Icons.Clock size={18} />
                <span>Instant Service</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-card-icon">
                <Icons.Wrench size={32} />
              </div>
              <span>Plumbing</span>
            </div>
            <div className="hero-card">
              <div className="hero-card-icon accent">
                <Icons.Zap size={32} />
              </div>
              <span>Electrical</span>
            </div>
            <div className="hero-card">
              <div className="hero-card-icon warning">
                <Icons.Paintbrush size={32} />
              </div>
              <span>Painting</span>
            </div>
            <div className="hero-card">
              <div className="hero-card-icon success">
                <Icons.Hammer size={32} />
              </div>
              <span>Carpentry</span>
            </div>
          </div>
        </div>
      </section>

      {/* Service Categories (UC-style grid) */}
      <section className="categories-section">
        <div className="section-header">
          <h2>What are you looking for?</h2>
          <Link to="/search" className="view-all-link">See all →</Link>
        </div>
        <div className="categories-grid">
          {categories.map((category) => (
            <Link to={`/search?category=${category.id}`} key={category.id} className="category-card">
              <div className="cat-icon-wrapper">
                {getIcon(category.icon)}
              </div>
              <div className="cat-info">
                <h3 className="cat-name">{category.name}</h3>
                <p className="cat-desc">{category.description}</p>
              </div>
              <Icons.ChevronRight size={18} className="cat-arrow" />
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="section-header">
          <h2>How LocalFixr works</h2>
        </div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Choose a service</h3>
            <p>Browse categories or search for the service you need</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Pick a professional</h3>
            <p>Compare ratings, reviews, and prices from verified pros</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Book & relax</h3>
            <p>Schedule at your convenience and track your booking</p>
          </div>
        </div>
      </section>

      {/* Top Providers */}
      <section className="top-providers-section">
        <div className="section-header">
          <h2>Top Rated Professionals</h2>
          <Link to="/search" className="view-all-link">View all →</Link>
        </div>
        <div className="providers-grid">
          {loading ? (
            <>
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
            </>
          ) : topProviders.length > 0 ? (
            topProviders.map(provider => (
              <ProviderCard key={provider.id} provider={provider} />
            ))
          ) : (
            <div className="glass-panel p-6 text-center" style={{ borderLeft: '4px solid #f59e0b', borderRadius: '1rem', width: '100%', gridColumn: '1 / -1' }}>
              <p style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem 0', fontSize: '1.05rem' }}>
                📍 Service is not available in your city{userCity ? ` (${userCity})` : ''}, it will be active soon
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                We are rapidly expanding to your location!
              </p>
              <Link to="/search" className="btn btn-outline btn-sm">
                Explore Available Cities
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner - Hidden for logged in users */}
      {!user && (
        <section className="cta-banner">
          <div className="cta-content">
            <h2>Are you a skilled professional?</h2>
            <p>Join thousands of service providers and grow your business with LocalFixr</p>
            <div className="cta-features">
              <span>✓ Set your own rates</span>
              <span>✓ Low 10% commission</span>
              <span>✓ Get verified badge</span>
              <span>✓ Instant UPI payouts</span>
            </div>
            <Link to="/auth/signup" className="btn btn-primary btn-lg" style={{ marginTop: '1.5rem' }}>
              Register as a Professional →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
