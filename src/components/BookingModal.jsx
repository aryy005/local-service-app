import { useState } from 'react';
import { X, Calendar, Clock, CheckCircle, Navigation, MapPin, CreditCard, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getCurrentLocationName } from '../utils/geolocation';
import { API_URL } from '../config';
import PaymentModal from './PaymentModal';
import './BookingModal.css';

const BookingModal = ({ provider, onClose }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    timePreference: '',
    serviceAddress: '',
    description: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const location = await getCurrentLocationName();
      setFormData({ ...formData, serviceAddress: location.name || location });
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    
    if (user.role === 'provider') {
      setError('Service providers cannot book other providers. Create a customer account.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          providerId: provider._id,
          date: formData.date,
          timePreference: formData.timePreference,
          serviceAddress: formData.serviceAddress,
          description: formData.description
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error occurred');
      
      setCreatedBooking({ ...data, providerId: provider });
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="modal-content glass-panel">
        <button className="close-btn" onClick={() => {
          onClose();
          if (step === 2) navigate('/customer-dashboard');
        }}>
          <X size={24} />
        </button>

        {!user ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', background: '#EEF2FF', color: '#4F46E5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
              <Lock size={30} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Login Required</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              You must be logged in as a <strong>Customer</strong> to book <strong>{provider.name}</strong>, assign unique order tracking, and view real-time updates.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
              <button 
                className="btn btn-primary btn-lg w-full"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  onClose();
                  navigate(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                }}
              >
                Sign In to Continue
              </button>
              <button 
                className="btn btn-outline btn-md w-full"
                onClick={() => {
                  onClose();
                  navigate(`/auth/signup?redirect=${encodeURIComponent(window.location.pathname)}`);
                }}
              >
                Create a Free Account
              </button>
            </div>
          </div>
        ) : step === 1 ? (
          <>
            <div className="modal-header">
              <h2>Book {provider.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '0.15rem 0.5rem', borderRadius: '0.35rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  ₹{provider.providerDetails?.hourlyRate || 25}/hr
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  📍 {provider.city || provider.addressDetails?.city || provider.providerDetails?.location || 'Local Area'}
                </span>
                {provider.providerDetails?.experienceYears > 0 && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    • {provider.providerDetails.experienceYears} Years Exp.
                  </span>
                )}
              </div>

              {/* Provider Work Photos Preview */}
              {provider.providerDetails?.portfolioImages && provider.providerDetails.portfolioImages.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                    📸 Verified Work Photos:
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    {provider.providerDetails.portfolioImages.slice(0, 4).map((photo, i) => (
                      <img 
                        key={i} 
                        src={photo} 
                        alt="Work sample" 
                        style={{ width: '48px', height: '48px', borderRadius: '0.35rem', objectFit: 'cover', border: '1px solid var(--surface-border)', flexShrink: 0 }} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {user?.role === 'provider' ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', background: '#FEE2E2', color: '#DC2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                  <X size={28} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Service Provider Account</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Provider accounts cannot book services. On your account, you can only view, accept, and manage incoming orders on your <strong>Provider Dashboard</strong>.
                </p>
                <button className="btn btn-primary" onClick={() => { onClose(); navigate('/provider-dashboard'); }}>
                  Go to Provider Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="booking-form">
                {error && <div className="error-alert">{error}</div>}
              
              <div className="form-group">
                <label>Date</label>
                <div className="input-with-icon">
                  <Calendar size={18} className="input-icon" />
                  <input 
                    type="date" 
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Time Preference</label>
                <div className="input-with-icon">
                  <Clock size={18} className="input-icon" />
                  <select 
                    name="timePreference"
                    required
                    value={formData.timePreference}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Select a time slot</option>
                    <option value="morning">Morning (8AM - 12PM)</option>
                    <option value="afternoon">Afternoon (12PM - 4PM)</option>
                    <option value="evening">Evening (4PM - 8PM)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Service Address / Location</label>
                <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <MapPin size={18} className="input-icon" />
                  <input 
                    type="text" 
                    name="serviceAddress"
                    required
                    placeholder="Enter full address"
                    value={formData.serviceAddress}
                    onChange={handleChange}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button 
                    type="button" 
                    onClick={handleLocateMe}
                    className={`locate-btn ${isLocating ? 'locating' : ''}`}
                    title="Use Current Location"
                    disabled={isLocating}
                    style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex' }}
                  >
                    <Navigation size={18} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Job Description</label>
                <textarea 
                  name="description" 
                  rows="4" 
                  required
                  placeholder="Briefly describe what you need help with..."
                  value={formData.description}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
            )}
          </>
        ) : (
          <div className="success-state fade-in">
            <CheckCircle size={64} color="var(--accent-color)" className="success-icon" />
            <h2>Booking Requested Successfully!</h2>
            <p>Your service booking request has been sent to <strong>{provider.name}</strong>.</p>
            
            <div className="booking-summary glass-panel mt-4">
              <div className="summary-item" style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="label" style={{ fontWeight: 700, color: '#6366f1' }}>Unique Order ID:</span>
                <span style={{ fontWeight: 800, color: '#6366f1', fontSize: '1rem' }}>
                  {createdBooking?.orderId || ('ORD-' + createdBooking?._id?.slice(-6).toUpperCase())}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Date & Slot:</span>
                <span style={{ textTransform: 'capitalize' }}>{formData.date} ({formData.timePreference})</span>
              </div>
              <div className="summary-item">
                <span className="label">Address:</span>
                <span>{formData.serviceAddress}</span>
              </div>
              <div className="summary-item">
                <span className="label">Hourly / Base Rate:</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>₹{provider.providerDetails?.hourlyRate || 25}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.85rem', fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                onClick={() => {
                  onClose();
                  navigate('/customer-dashboard');
                }}
              >
                <CheckCircle size={18} /> View My Orders & Live Tracking
              </button>

              <button 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                onClick={() => setShowPaymentModal(true)}
              >
                <CreditCard size={18} /> Pay Now (₹{provider.providerDetails?.hourlyRate || 25})
              </button>
            </div>
          </div>
        )}
      </div>

      {showPaymentModal && createdBooking && (
        <PaymentModal 
          booking={createdBooking} 
          onClose={() => {
            setShowPaymentModal(false);
            onClose();
            navigate('/customer-dashboard');
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            onClose();
            navigate('/customer-dashboard');
          }}
        />
      )}
    </div>
  );
};

export default BookingModal;
