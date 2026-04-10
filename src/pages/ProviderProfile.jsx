import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, CheckCircle, ArrowLeft, Clock, Shield, ShieldCheck, AlertTriangle } from 'lucide-react';
import BookingModal from '../components/BookingModal';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import toast from 'react-hot-toast';
import './ProviderProfile.css';

const ProviderProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
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
  }, [id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('You must be logged in to leave a review.');
    
    setSubmittingReview(true);
    try {
      const res = await fetch(`${API_URL}/providers/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newReview)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');
      
      setReviews(prev => [...prev, { ...data, customer: { name: user.name } }]);
      setNewReview({ rating: 5, comment: '' });
      toast.success('Review submitted successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

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
            <h2>Reviews ({reviews.length})</h2>
            
            {user && user.role === 'customer' && (
              <form onSubmit={handleReviewSubmit} style={{
                marginBottom: '1.25rem', padding: '1rem',
                background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--surface-border)'
              }}>
                <h4 style={{ fontWeight: 700, marginBottom: '0.65rem', fontSize: '0.95rem' }}>Leave a Review</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Rating: </span>
                  <select 
                    style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                    value={newReview.rating} 
                    onChange={e => setNewReview({ ...newReview, rating: Number(e.target.value)})}
                  >
                    {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                  </select>
                </div>
                <textarea 
                  required
                  style={{ marginBottom: '0.65rem', minHeight: '70px', fontSize: '0.9rem' }}
                  placeholder="Share your experience..."
                  value={newReview.comment}
                  onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                />
                <button type="submit" disabled={submittingReview} className="btn btn-primary btn-sm">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}

            <div className="reviews-list">
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No reviews yet.</p>
              ) : (
                reviews.map(review => (
                  <div key={review._id} style={{
                    padding: '1rem', background: 'var(--bg-secondary)',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--surface-border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{review.customer?.name || 'Customer'}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Star size={13} fill="#ffc107" color="#ffc107" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{review.rating}</span>
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Booking Widget */}
        <aside className="profile-sidebar">
          <div className="glass-panel sticky-booking-card">
            <div className="booking-price">
              <span className="price">₹{provider.providerDetails.hourlyRate}</span>
              <span className="unit">/hr</span>
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

            <button 
              className="btn btn-primary btn-lg w-full mt-4"
              onClick={() => setIsBookingOpen(true)}
            >
              Book Now
            </button>
            <p className="booking-note text-center mt-2 text-muted">You won't be charged yet</p>
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
