import { useState } from 'react';
import { X, Calendar, Clock, CheckCircle, Navigation, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getCurrentLocationName } from '../utils/geolocation';
import './BookingModal.css';

const BookingModal = ({ provider, onClose }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
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
      setFormData({ ...formData, serviceAddress: location });
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
      navigate('/auth/login');
      return;
    }
    
    if (user.role === 'provider') {
      setError('Service providers cannot book other providers. Create a customer account.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/bookings', {
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
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        {step === 1 ? (
          <>
            <div className="modal-header">
              <h2>Book {provider.name}</h2>
              <p>Fill in the details below to request a service.</p>
            </div>

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
          </>
        ) : (
          <div className="success-state fade-in">
            <CheckCircle size={64} color="var(--accent-color)" className="success-icon" />
            <h2>Booking Requested!</h2>
            <p>Your request has been sent to <strong>{provider.name}</strong>.</p>
            <p className="mt-2 text-muted">You will receive a confirmation shortly when the provider accepts the job.</p>
            
            <div className="booking-summary glass-panel mt-4">
              <div className="summary-item">
                <span className="label">Date:</span>
                <span>{formData.date}</span>
              </div>
              <div className="summary-item">
                <span className="label">Time:</span>
                <span style={{textTransform: 'capitalize'}}>{formData.timePreference}</span>
              </div>
              <div className="summary-item">
                <span className="label">Address:</span>
                <span>{formData.serviceAddress}</span>
              </div>
            </div>

            <button className="btn btn-primary mt-8 w-full" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
