import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Star, MapPin, CheckCircle, ArrowLeft, Clock, Shield, ShieldCheck, AlertTriangle, Lock } from 'lucide-react';
import BookingModal from '../components/BookingModal';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import toast from 'react-hot-toast';
import './ProviderProfile.css';

const ProviderProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    if (user?.role === 'provider') {
      navigate('/provider-dashboard', { replace: true });
      return;
    }

    const fetchProviderData = async () => {
      try {
        const [provRes, revRes, portRes] = await Promise.all([
          fetch(`${API_URL}/providers/${id}`),
          fetch(`${API_URL}/providers/${id}/reviews`),
          fetch(`${API_URL}/providers/${id}/portfolio`)
        ]);
        
        if (provRes.ok) setProvider(await provRes.json());
        if (revRes.ok) setReviews(await revRes.json());
        if (portRes.ok) setPortfolio(await portRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProviderData();
  }, [id, user, navigate]);

  if (loading) return <div className="container mt-8 text-center">Loading provider profile...</div>;

  if (!provider || !provider.providerDetails) {
    return (
      <div className="container mt-8">
        <h2>Provider not found</h2>
        <button className="btn btn-outline mt-4" onClick={() => navigate('/search')}>Back to Search</button>
      </div>
    );
  }

  return (
    <div className="provider-profile fade-in">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        Back
      </button>
      
      <div className="profile-layout">
        {/* Left Column: Details */}
        <div className="profile-main-column">
          <div className="glass-panel profile-header-card">
            <div className="profile-img-wrapper">
              <img src={provider.providerDetails.avatarUrl} alt={provider.name} className="profile-hero-img" />
            </div>
            
            <div className="profile-primary-info">
              <h1>
                {provider.name}
                {provider.providerDetails.aadhaarVerified && (
                  <span className="verified-badge large" style={{ marginLeft: '0.75rem', verticalAlign: 'middle' }}>
                    <ShieldCheck size={18} /> Aadhaar Verified
                  </span>
                )}
              </h1>
              <div className="profile-meta">
                <div className="meta-item rating">
                  <Star fill="var(--warning-color)" color="var(--warning-color)" size={18} />
                  <strong>{provider.providerDetails.rating}</strong> ({provider.providerDetails.reviewsCount || 0} reviews)
                </div>
                <div className="meta-item location">
                  <MapPin size={18} />
                  {provider.providerDetails.location}
                </div>
                {provider.providerDetails.experienceYears > 0 && (
                  <div className="meta-item location" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                    💼 <strong>{provider.providerDetails.experienceYears}</strong> Years Exp.
                  </div>
                )}
                {provider.providerDetails.totalJobsCompleted > 0 && (
                  <div className="meta-item location" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                    🏆 <strong>{provider.providerDetails.totalJobsCompleted}</strong> Jobs Done
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel profile-section">
            <h2>About</h2>
            <p className="profile-desc">{provider.providerDetails.description}</p>
          </div>

          <div className="glass-panel profile-section">
            <h2>Skills & Expertise</h2>
            <div className="skills-grid">
              {(provider.providerDetails.skills || []).map(skill => (
                <div key={skill} className="skill-badge">
                  <CheckCircle size={16} color="var(--accent-color)" />
                  {skill}
                </div>
              ))}
            </div>
          </div>

          {portfolio && portfolio.length > 0 && (
            <div className="glass-panel profile-section">
              <h2>Past Work Gallery</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                {portfolio.map((imgUrl, idx) => (
                  <img key={idx} src={imgUrl} alt={`Completed Job ${idx}`} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                ))}
              </div>
            </div>
          )}

          <div className="glass-panel profile-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ margin: 0 }}>Customer Reviews & Ratings ({reviews.length})</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255, 193, 7, 0.12)', border: '1px solid rgba(255, 193, 7, 0.3)', padding: '0.3rem 0.65rem', borderRadius: '2rem' }}>
                <Star size={15} fill="#ffc107" color="#ffc107" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706' }}>
                  {provider.providerDetails.rating || '5.0'} / 5.0 Rating
                </span>
              </div>
            </div>

            <div className="reviews-list">
              {reviews.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-border)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                    No reviews yet for this service professional. Reviews are submitted by customers after booking completion.
                  </p>
                </div>
              ) : (
                reviews.map(review => (
                  <div key={review._id} style={{
                    padding: '1rem', background: 'var(--bg-secondary)',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--surface-border)',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{review.customer?.name || 'Verified Customer'}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Star size={13} fill="#ffc107" color="#ffc107" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{review.rating}</span>
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Booking Widget */}
        <aside className="profile-sidebar">
          <div className="glass-panel sticky-booking-card">
            <div className="booking-price" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--surface-border)', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'block' }}>
                Service Base Price
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Starts from</span>
                <span className="price" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  ₹{provider.providerDetails.hourlyRate || 199}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                *Base inspection / standard starting rate. Final quote tailored on-site.
              </p>
            </div>
            
            <div className="booking-features">
              <div className="feature-item">
                <Clock size={16} />
                <span>Responds in ~1 hr</span>
              </div>
              <div className="feature-item">
                {provider.providerDetails.aadhaarVerified ? (
                  <>
                    <ShieldCheck size={16} color="#10b981" />
                    <span style={{ color: '#10b981', fontWeight: 600 }}>Aadhaar Verified</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} color="#f59e0b" />
                    <span style={{ color: '#f59e0b' }}>Not Verified</span>
                  </>
                )}
              </div>
            </div>

            {!user ? (
              <div style={{ marginTop: '1rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: '#EEF2FF', color: '#4F46E5', borderRadius: '50%', marginBottom: '0.5rem' }}>
                  <Lock size={18} />
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '0 0 0.25rem 0', fontWeight: 700 }}>
                  Account Required to Book
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.85rem 0', lineHeight: 1.4 }}>
                  Please sign in or create an account to book {provider.name} and track live GPS updates.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-primary btn-md w-full"
                    style={{ fontWeight: 700 }}
                    onClick={() => navigate(`/auth/login?redirect=${encodeURIComponent(location.pathname)}`)}
                  >
                    Sign In to Book
                  </button>
                  <button 
                    className="btn btn-outline btn-sm w-full"
                    onClick={() => navigate(`/auth/signup?redirect=${encodeURIComponent(location.pathname)}`)}
                  >
                    Create Free Account
                  </button>
                </div>
              </div>
            ) : user?.role === 'provider' ? (
              <div style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.85rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
                  🔒 Service Provider Account
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
                  Provider accounts cannot book services. You can only manage incoming jobs on your dashboard.
                </p>
                <button 
                  className="btn btn-primary btn-sm w-full"
                  onClick={() => navigate('/provider-dashboard')}
                >
                  Manage My Orders
                </button>
              </div>
            ) : (
              <>
                <button 
                  className="btn btn-primary btn-lg w-full mt-4"
                  onClick={() => setIsBookingOpen(true)}
                >
                  Book Now
                </button>
                <p className="booking-note text-center mt-2 text-muted">You won't be charged yet</p>
              </>
            )}
          </div>
        </aside>
      </div>

      {isBookingOpen && (
        <BookingModal 
          provider={provider} 
          onClose={() => setIsBookingOpen(false)} 
        />
      )}
    </div>
  );
};

export default ProviderProfile;
