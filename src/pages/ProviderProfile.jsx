import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, CheckCircle, ArrowLeft, Clock, Shield } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProviderData = async () => {
      try {
        const [provRes, revRes] = await Promise.all([
          fetch(`${API_URL}/providers/${id}`),
          fetch(`${API_URL}/providers/${id}/reviews`)
        ]);
        
        if (provRes.ok) setProvider(await provRes.json());
        if (revRes.ok) setReviews(await revRes.json());
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
              <h1>{provider.name}</h1>
              <div className="profile-meta">
                <div className="meta-item rating">
                  <Star fill="var(--warning-color)" color="var(--warning-color)" size={18} />
                  <strong>{provider.providerDetails.rating}</strong> ({provider.providerDetails.reviewsCount || 0} reviews)
                </div>
                <div className="meta-item location">
                  <MapPin size={18} />
                  {provider.providerDetails.location}
                </div>
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

          <div className="glass-panel profile-section">
            <h2>Reviews ({reviews.length})</h2>
            
            {user && user.role === 'customer' && (
              <form onSubmit={handleReviewSubmit} className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="font-bold mb-2">Leave a Review</h4>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-sm font-medium">Rating: </span>
                  <select 
                    className="p-1 border rounded"
                    value={newReview.rating} 
                    onChange={e => setNewReview({ ...newReview, rating: Number(e.target.value)})}
                  >
                    {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                  </select>
                </div>
                <textarea 
                  required
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mb-2"
                  placeholder="Share your experience..."
                  value={newReview.comment}
                  onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                />
                <button type="submit" disabled={submittingReview} className="btn btn-primary text-sm">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}

            <div className="reviews-list space-y-4">
              {reviews.length === 0 ? (
                <p className="text-muted">No reviews yet.</p>
              ) : (
                reviews.map(review => (
                  <div key={review._id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <strong className="text-gray-900 dark:text-white">{review.customer?.name || 'Customer'}</strong>
                      <div className="flex items-center">
                        <Star size={14} fill="var(--warning-color)" color="var(--warning-color)" />
                        <span className="ml-1 text-sm font-bold">{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">{review.comment}</p>
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
                <Shield size={16} />
                <span>Verified Professional</span>
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
