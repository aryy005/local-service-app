import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, CheckCircle, ArrowLeft, Clock, Shield } from 'lucide-react';
import BookingModal from '../components/BookingModal';
import { API_URL } from '../config';
import './ProviderProfile.css';

const ProviderProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await fetch(`${API_URL}/providers/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProvider(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProvider();
  }, [id]);

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
            <h2>Reviews (0)</h2>
            <div className="reviews-list">
              <p className="text-muted">No reviews yet.</p>
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
