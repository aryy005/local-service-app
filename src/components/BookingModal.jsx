import { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle, MapPin, Lock, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getCurrentDetailedAddress } from '../utils/geolocation';
import { isValidPincode, sanitizeDigits } from '../utils/validation';
import { API_URL } from '../config';
import '../pages/Auth.css';
import './BookingModal.css';

// Suggestion chips tailored to service categories
const CATEGORY_SUGGESTIONS = {
  'Electrician': ['MCB tripping / short circuit', 'Ceiling fan repair', 'Switchboard sparking', 'Wiring inspection', 'Appliance installation'],
  'Plumber': ['Water pipe leakage', 'Tap replacement', 'Bathroom drain blockage', 'Water tank overflow', 'Low water pressure'],
  'AC Repair': ['AC not cooling', 'Water leaking from indoor unit', 'Gas leak & refill', 'Annual deep maintenance', 'Noisy blower motor'],
  'Carpenter': ['Door alignment & lock repair', 'Furniture assembly', 'Cabinet hinge loose', 'Custom wooden shelf', 'Window latch repair'],
  'Painter': ['Full room painting', 'Damp wall waterproofing', 'Wall crack putty & touch up', 'Texture wall painting'],
  'House Cleaning': ['Full home deep cleaning', 'Kitchen & tiles scrubbing', 'Bathroom sanitation', 'Sofa & upholstery shampooing'],
  'Cleaning': ['Full home deep cleaning', 'Kitchen & tiles scrubbing', 'Bathroom sanitation', 'Sofa & upholstery shampooing'],
  'Pest Control': ['Cockroach pest control', 'Termite inspection & treatment', 'Bed bug elimination', 'General pest spray']
};

const BookingModal = ({ provider, initialDate, initialTime, onClose, onSuccess }) => {
  const { user, token, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Steps: 1 = Service Description, 2 = Address Verification & Live Location, 3 = Confirmation
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null);

  // Pre-determined Date & Time (from provider profile carousel or smart defaults)
  const scheduledDate = initialDate || new Date().toISOString().split('T')[0];
  const scheduledTime = initialTime || '10:00 AM';

  // Step 1: Service Description
  const [description, setDescription] = useState('');

  // Step 2: Address Verification (pre-filled from user profile)
  const [addressData, setAddressData] = useState({
    street: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [saveToProfile, setSaveToProfile] = useState(true);

  // Pre-populate address when user is loaded
  useEffect(() => {
    if (user) {
      const addr = user.addressDetails || {};
      setAddressData({
        street: addr.street || '',
        city: addr.city || user.city || '',
        state: addr.state || '',
        pincode: addr.pincode || ''
      });
    }
  }, [user]);

  if (!provider) return null;

  const categoryName = provider.providerDetails?.categoryName || 'Service Professional';
  const suggestions = CATEGORY_SUGGESTIONS[categoryName] || [
    'General inspection & diagnosis',
    'Emergency repair needed',
    'Standard maintenance service',
    'Component replacement'
  ];

  // Geolocation handler using Drop Pin
  const handleFetchLiveLocation = async () => {
    setIsLocating(true);
    setError('');
    setLocationSuccess('');

    try {
      const geoResult = await getCurrentDetailedAddress();
      setAddressData({
        street: geoResult.street || addressData.street,
        city: geoResult.city || addressData.city,
        state: geoResult.state || addressData.state,
        pincode: geoResult.pincode || addressData.pincode
      });
      setLocationSuccess(`Live location detected: ${geoResult.formatted || geoResult.city}`);
    } catch (err) {
      setError(`Location Error: ${err.message}. Please type your address manually below.`);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectSavedAddress = (saved) => {
    setAddressData({
      street: saved.street || '',
      city: saved.city || '',
      state: saved.state || '',
      pincode: saved.pincode || ''
    });
  };

  // Step 1 Submit: Validate Description -> Advance to Step 2
  const handleProceedToAddress = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a brief description of the issue.');
      return;
    }
    setError('');
    setStep(2);
  };

  // Step 2 Submit: Submit Booking to Backend
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setError('');

    const fullAddress = [
      addressData.street,
      addressData.city,
      addressData.state,
      addressData.pincode
    ].filter(Boolean).join(', ');

    if (!addressData.street.trim() || !addressData.city.trim()) {
      setError('Please verify that street and city are filled in.');
      return;
    }

    if (addressData.pincode && !isValidPincode(addressData.pincode)) {
      setError('Please enter a valid 6-digit Indian postal pincode (e.g. 110001).');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        providerId: provider._id || provider.id,
        date: scheduledDate,
        timePreference: scheduledTime,
        description: description.trim(),
        serviceAddress: fullAddress
      };

      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create booking');
      }

      // Optionally update user's profile address in background
      if (saveToProfile && updateProfile) {
        updateProfile({
          addressDetails: {
            street: addressData.street,
            city: addressData.city,
            state: addressData.state,
            pincode: addressData.pincode
          }
        }).catch(() => {});
      }

      setCreatedBooking(data);
      setStep(3); // Confirmation screen
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="modal-content" style={{ maxWidth: '520px', padding: '2rem' }}>
        
        {/* Neo-brutalist Close Button */}
        <button 
          className="modal-close" 
          onClick={() => {
            onClose?.();
            if (step === 3) navigate('/customer-dashboard?tab=bookings');
          }}
          title="Close"
        >
          <X size={18} />
        </button>

        {!user ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              background: '#FFFFFF', 
              border: '2.5px solid #111111', 
              boxShadow: '3px 3px 0 #111111', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1.25rem auto',
              color: '#111111'
            }}>
              <Lock size={26} strokeWidth={2.5} />
            </div>
            <div className="auth-tag">ACCESS REQUIRED</div>
            <h2 className="auth-title" style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>
              SIGN IN TO BOOK
            </h2>
            <p className="auth-subtitle" style={{ marginBottom: '1.75rem' }}>
              You must be signed in as a Customer to book <strong>{provider.name}</strong> and track order status.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
              <button 
                className="auth-submit-btn"
                onClick={() => {
                  onClose?.();
                  navigate(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                }}
              >
                SIGN IN TO CONTINUE →
              </button>
              <button 
                className="btn btn-outline"
                style={{ 
                  padding: '0.8rem', 
                  fontWeight: 800, 
                  border: '2px solid #111111', 
                  borderRadius: '6px', 
                  boxShadow: '2px 2px 0 #111111',
                  background: '#FFFFFF',
                  color: '#111111',
                  textTransform: 'uppercase',
                  fontSize: '0.85rem'
                }}
                onClick={() => {
                  onClose?.();
                  navigate(`/auth/signup?redirect=${encodeURIComponent(window.location.pathname)}`);
                }}
              >
                CREATE A FREE ACCOUNT
              </button>
            </div>
          </div>
        ) : user.role === 'provider' ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              background: '#FEE2E2', 
              border: '2.5px solid #111111', 
              boxShadow: '3px 3px 0 #111111', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1rem auto',
              color: '#DC2626'
            }}>
              <X size={28} strokeWidth={2.5} />
            </div>
            <div className="auth-tag">PROVIDER ACCOUNT</div>
            <h2 className="auth-title" style={{ fontSize: '1.45rem', marginBottom: '0.5rem' }}>
              CUSTOMER ONLY
            </h2>
            <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>
              Service Partner accounts cannot book services. Please sign in with a Customer account.
            </p>
            <button 
              className="auth-submit-btn" 
              onClick={() => { onClose?.(); navigate('/provider-dashboard'); }}
            >
              GO TO PROVIDER DASHBOARD →
            </button>
          </div>
        ) : (
          <>
            {/* Top Step Progress Bar */}
            {step < 3 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '2px solid #111111', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    width: '26px', 
                    height: '26px', 
                    borderRadius: '4px', 
                    background: step === 1 ? '#111111' : '#D2FE00', 
                    color: step === 1 ? '#D2FE00' : '#111111', 
                    border: '1.5px solid #111111',
                    fontSize: '0.78rem', 
                    fontWeight: 900, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    {step === 1 ? '1' : '✔'}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: step === 1 ? '#111111' : '#666666' }}>
                    1. Issue Details
                  </span>
                </div>

                <div style={{ width: '32px', height: '2.5px', background: step === 2 ? '#111111' : '#CCCCCC' }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    width: '26px', 
                    height: '26px', 
                    borderRadius: '4px', 
                    background: step === 2 ? '#111111' : '#FFFFFF', 
                    color: step === 2 ? '#D2FE00' : '#888888', 
                    border: '1.5px solid #111111',
                    fontSize: '0.78rem', 
                    fontWeight: 900, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    2
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: step === 2 ? '#111111' : '#666666' }}>
                    2. Address Check
                  </span>
                </div>
              </div>
            )}

            {/* Provider & Schedule Header Strip */}
            {step < 3 && (
              <div style={{ 
                background: '#FAF9F6', 
                border: '2px solid #111111', 
                boxShadow: '2.5px 2.5px 0 #111111',
                borderRadius: '6px', 
                padding: '0.85rem 1rem', 
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img 
                    src={provider.providerDetails?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} 
                    alt={provider.name} 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #111111' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#111111' }}>{provider.name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#555555', fontWeight: 600 }}>
                      {categoryName} • Starts ₹{provider.providerDetails?.hourlyRate || 199}/hr
                    </div>
                  </div>
                </div>

                <div style={{ 
                  background: '#FFFFFF', 
                  border: '1.5px solid #111111', 
                  borderRadius: '4px', 
                  padding: '0.35rem 0.65rem', 
                  fontSize: '0.76rem', 
                  fontWeight: 800, 
                  color: '#111111',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <Calendar size={13} color="#111111" />
                  <span>{scheduledDate}</span>
                  <span>•</span>
                  <Clock size={13} color="#111111" />
                  <span>{scheduledTime}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="error-alert">
                ⚠️ {error}
              </div>
            )}

            {/* ── STEP 1: SERVICE DESCRIPTION ONLY ── */}
            {step === 1 && (
              <form onSubmit={handleProceedToAddress} className="modal-form">
                <div>
                  <div className="auth-tag" style={{ marginBottom: '0.4rem' }}>STEP 1 OF 2</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#111111', margin: '0 0 0.35rem 0', textTransform: 'uppercase' }}>
                    Describe Your Issue
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#555555', margin: '0 0 0.85rem 0', lineHeight: 1.4 }}>
                    Explain the repair or task in your words so the technician brings the exact tools needed.
                  </p>
                  
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Ceiling fan is making humming noise and running slow, switchboard sparks when turned on..."
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem 1rem', 
                      borderRadius: '5px', 
                      border: '2px solid #111111', 
                      fontWeight: 500, 
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      outline: 'none',
                      background: '#FFFFFF',
                      boxShadow: '2px 2px 0 #111111',
                      resize: 'vertical',
                      minHeight: '90px'
                    }}
                    onFocus={(e) => { e.target.style.boxShadow = '4px 4px 0 #D2FE00'; }}
                    onBlur={(e) => { e.target.style.boxShadow = '2px 2px 0 #111111'; }}
                  />
                </div>

                {/* Quick Suggestion Chips */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sparkles size={13} color="#111111" /> Quick Suggestions (Click to Add):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {suggestions.map((chip, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setDescription(prev => {
                            if (!prev.trim()) return chip;
                            if (prev.includes(chip)) return prev;
                            return `${prev}, ${chip}`;
                          });
                        }}
                        style={{
                          background: '#FFFFFF',
                          border: '1.5px solid #111111',
                          boxShadow: '1.5px 1.5px 0 #111111',
                          borderRadius: '4px',
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#111111',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.background = '#D2FE00'; 
                          e.currentTarget.style.transform = 'translate(1px, 1px)';
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.background = '#FFFFFF'; 
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '2px solid #111111', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={onClose}
                    style={{ 
                      padding: '0.75rem 1.25rem', 
                      fontWeight: 800,
                      background: '#FFFFFF',
                      color: '#111111',
                      border: '2px solid #111111',
                      boxShadow: '2px 2px 0 #111111',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={!description.trim()}
                    className="auth-submit-btn"
                    style={{ 
                      width: 'auto',
                      padding: '0.75rem 1.4rem', 
                      margin: 0,
                      fontSize: '0.88rem',
                      opacity: description.trim() ? 1 : 0.5,
                      cursor: description.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Continue to Address Check <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 2: ADDRESS VERIFICATION & LIVE LOCATION ── */}
            {step === 2 && (
              <form onSubmit={handleConfirmBooking} className="modal-form">
                <div>
                  <div className="auth-tag" style={{ marginBottom: '0.4rem' }}>STEP 2 OF 2</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#111111', margin: '0 0 0.35rem 0', textTransform: 'uppercase' }}>
                    Verify Service Address
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#555555', margin: '0 0 0.85rem 0', lineHeight: 1.4 }}>
                    Confirm the service destination so <strong>{provider.name}</strong> arrives at the exact spot.
                  </p>

                  {/* Drop Pin Live Location Button */}
                  <div style={{ marginBottom: '1.15rem' }}>
                    <button
                      type="button"
                      onClick={handleFetchLiveLocation}
                      disabled={isLocating}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#FFFFFF',
                        border: '2px solid #111111',
                        borderRadius: '6px',
                        boxShadow: '3px 3px 0 #111111',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        color: '#111111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        cursor: isLocating ? 'wait' : 'pointer',
                        transition: 'all 0.15s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#D2FE00';
                        e.currentTarget.style.transform = 'translate(1px, 1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <MapPin size={18} color="#EF4444" fill="#FEE2E2" />
                      <span>{isLocating ? 'Acquiring GPS Live Location...' : 'Use Current Live Location'}</span>
                    </button>

                    {locationSuccess && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16A34A', fontSize: '0.78rem', fontWeight: 700, marginTop: '0.4rem' }}>
                        <CheckCircle size={14} /> {locationSuccess}
                      </div>
                    )}
                  </div>

                  {/* Saved Addresses Quick Selector */}
                  {user.savedAddresses && user.savedAddresses.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111111', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Or select a saved location:
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {user.savedAddresses.map((addr, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSavedAddress(addr)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '4px',
                              border: addressData.street === addr.street ? '2px solid #111111' : '1.5px solid #111111',
                              background: addressData.street === addr.street ? '#D2FE00' : '#FFFFFF',
                              boxShadow: '2px 2px 0 #111111',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#111111'
                            }}
                          >
                            <MapPin size={13} color="#111111" />
                            <span>{addr.label || 'Saved Address'} ({addr.city})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Address Fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label>
                        House / Flat / Street Address *
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Flat 402, Green Valley Apartments, MG Road"
                        value={addressData.street}
                        onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div>
                        <label>City / Town *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Mumbai"
                          value={addressData.city}
                          onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <label>State</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Maharashtra"
                          value={addressData.state}
                          onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', alignItems: 'center' }}>
                      <div>
                        <label>Pincode</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder="e.g. 400001"
                          value={addressData.pincode}
                          onChange={(e) => setAddressData({ ...addressData, pincode: sanitizeDigits(e.target.value, 6) })}
                          style={{
                            borderColor: addressData.pincode && !isValidPincode(addressData.pincode) ? '#EF4444' : undefined
                          }}
                        />
                        {addressData.pincode && !isValidPincode(addressData.pincode) && (
                          <div style={{ color: '#EF4444', fontSize: '0.68rem', fontWeight: 700, marginTop: '2px' }}>
                            6-digit pincode
                          </div>
                        )}
                      </div>

                      <div style={{ paddingTop: '1.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.78rem', textTransform: 'none', fontWeight: 600 }}>
                          <input 
                            type="checkbox" 
                            checked={saveToProfile}
                            onChange={(e) => setSaveToProfile(e.target.checked)}
                            style={{ width: 'auto', margin: 0 }}
                          />
                          <span>Save as default address</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Destination Overview Preview Box */}
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '0.75rem 1rem', 
                    background: '#FAF9F6', 
                    border: '1.5px solid #111111', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    color: '#111111'
                  }}>
                    <MapPin size={16} color="#111111" style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Target: </strong>
                      {[addressData.street, addressData.city, addressData.state, addressData.pincode].filter(Boolean).join(', ') || 'Address not filled yet'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', paddingTop: '0.85rem', borderTop: '2px solid #111111', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    style={{ 
                      padding: '0.75rem 1.25rem', 
                      fontWeight: 800, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem',
                      background: '#FFFFFF',
                      color: '#111111',
                      border: '2px solid #111111',
                      boxShadow: '2px 2px 0 #111111',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading || !addressData.street.trim() || !addressData.city.trim()}
                    className="auth-submit-btn"
                    style={{ 
                      width: 'auto',
                      padding: '0.75rem 1.5rem', 
                      margin: 0,
                      fontSize: '0.88rem',
                      opacity: (addressData.street.trim() && addressData.city.trim()) ? 1 : 0.5,
                      cursor: loading ? 'wait' : 'pointer'
                    }}
                  >
                    {loading ? 'DISPATCHING...' : 'CONFIRM & REQUEST BOOKING →'}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: BOOKING CONFIRMATION (Platform Theme - NO PAY NOW OPTION) ── */}
            {step === 3 && (
              <div className="fade-in" style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                
                {/* Neo-brutalist Success Icon */}
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: '#D2FE00', 
                  border: '2.5px solid #111111', 
                  boxShadow: '3px 3px 0 #111111', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 1.25rem auto',
                  color: '#111111'
                }}>
                  <CheckCircle size={36} strokeWidth={2.5} />
                </div>

                <div className="auth-tag">BOOKING REQUESTED</div>
                <h2 className="auth-title" style={{ fontSize: '1.65rem', margin: '0.4rem 0 0.35rem 0' }}>
                  ORDER DISPATCHED!
                </h2>
                <p className="auth-subtitle" style={{ marginBottom: '1.25rem' }}>
                  Your service booking request has been sent to <strong>{provider.name}</strong>.
                </p>
                
                {/* Neo-brutal Order Summary Box */}
                <div style={{ 
                  background: '#FAF9F6', 
                  border: '2px solid #111111', 
                  boxShadow: '3px 3px 0 #111111', 
                  borderRadius: '6px', 
                  padding: '1.25rem', 
                  marginBottom: '1.5rem',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #111111', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#111111' }}>
                      Unique Order ID:
                    </span>
                    <span style={{ 
                      background: '#111111', 
                      color: '#D2FE00', 
                      padding: '0.2rem 0.65rem', 
                      borderRadius: '4px', 
                      fontWeight: 900, 
                      fontSize: '0.92rem', 
                      letterSpacing: '0.05em',
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                      {createdBooking?.orderId || ('ORD-' + createdBooking?._id?.slice(-6).toUpperCase())}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#555555', fontWeight: 600 }}>Date & Slot:</span>
                    <span style={{ fontWeight: 800, color: '#111111' }}>{scheduledDate} ({scheduledTime})</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#555555', fontWeight: 600 }}>Service Address:</span>
                    <span style={{ fontWeight: 800, color: '#111111', maxWidth: '65%', textAlign: 'right' }}>
                      {[addressData.street, addressData.city, addressData.state, addressData.pincode].filter(Boolean).join(', ')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '0.85rem' }}>
                    <span style={{ color: '#555555', fontWeight: 600 }}>Starting Rate:</span>
                    <span style={{ fontWeight: 900, color: '#111111' }}>Starts from ₹{provider.providerDetails?.hourlyRate || 199}</span>
                  </div>

                  <div style={{ 
                    background: '#EBEAE5', 
                    border: '1.5px solid #111111', 
                    borderRadius: '4px', 
                    padding: '0.55rem 0.75rem', 
                    fontSize: '0.78rem', 
                    fontWeight: 700, 
                    color: '#111111', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem' 
                  }}>
                    <span>🛡️</span>
                    <span>No advance fee required. Pay safely after service completion.</span>
                  </div>
                </div>

                {/* Primary Action Button (NO PAY NOW OPTION) */}
                <button 
                  type="button"
                  className="auth-submit-btn" 
                  style={{ width: '100%', padding: '0.9rem', fontSize: '0.92rem' }}
                  onClick={() => {
                    onClose?.();
                    navigate('/customer-dashboard?tab=bookings');
                  }}
                >
                  VIEW MY ORDERS & LIVE TRACKING →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
