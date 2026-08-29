import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Edit2, Save, Phone, MessageSquare, CreditCard, FileText, CheckCircle, Navigation, MessageCircle, Star, Heart } from 'lucide-react';
import { API_URL } from '../config';
import ChatModal from '../components/ChatModal';
import BookingModal from '../components/BookingModal';
import AIDiagnosisModal from '../components/AIDiagnosisModal';
import PaymentModal from '../components/PaymentModal';
import InvoiceModal from '../components/InvoiceModal';
import ServiceTrackerModal from '../components/ServiceTrackerModal';
import ReviewTipModal from '../components/ReviewTipModal';
import { openWhatsAppChat, formatWhatsAppBookingMessage } from '../utils/whatsapp';
import { useLanguage } from '../context/LanguageContext';

const CustomerDashboard = () => {
  const { user, token, updateProfile, addAddress, updateAddress, deleteAddress } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'profile'
  const [activeChat, setActiveChat] = useState(null);
  const [activeBookingProvider, setActiveBookingProvider] = useState(null);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [activePaymentBooking, setActivePaymentBooking] = useState(null);
  const [activeInvoiceBooking, setActiveInvoiceBooking] = useState(null);
  const [activeTrackerBooking, setActiveTrackerBooking] = useState(null);
  const [activeReviewBooking, setActiveReviewBooking] = useState(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: ''
  });

  // Add New Address Modal State
  const [showNewAddressModal, setShowNewAddressModal] = useState(false);
  const [newAddressData, setNewAddressData] = useState({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false
  });

  // Inline Phone Verification State
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneDemoOtp, setPhoneDemoOtp] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (user.role === 'provider') {
      navigate('/provider-dashboard');
      return;
    }

    if (user) {
      setFormData({ 
        name: user.name || '', 
        phone: user.phone || '',
        street: user.addressDetails?.street || '',
        city: user.city || user.addressDetails?.city || '',
        state: user.addressDetails?.state || '',
        pincode: user.addressDetails?.pincode || ''
      });
      setPhoneInput(user.phone || '');
    }

    const fetchBookings = async () => {
      try {
        const res = await fetch(`${API_URL}/bookings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setBookings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [user, token, navigate]);

  const handleSendPhoneOtp = async (channel = 'sms') => {
    if (!phoneInput) { setPhoneError('Enter your mobile number'); return; }
    setPhoneLoading(true); setPhoneError('');
    try {
      const res = await fetch(`${API_URL}/verify/phone/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, channel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPhoneOtpSent(true);
      if (data.demo_otp) setPhoneDemoOtp(data.demo_otp);
    } catch (err) { setPhoneError(err.message); }
    finally { setPhoneLoading(false); }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length < 6) { setPhoneError('Enter 6-digit OTP'); return; }
    setPhoneLoading(true); setPhoneError('');
    try {
      const res = await fetch(`${API_URL}/verify/phone/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, otp: phoneOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await updateProfile({ phone: phoneInput, phoneVerified: true });
      setPhoneOtpSent(false);
      alert('Phone number verified successfully!');
    } catch (err) { setPhoneError(err.message); }
    finally { setPhoneLoading(false); }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile({ 
        name: formData.name, 
        phone: formData.phone,
        city: formData.city,
        addressDetails: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        }
      });
      setIsEditing(false);
      alert('Profile details updated successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddNewAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      await addAddress(newAddressData);
      setShowNewAddressModal(false);
      setNewAddressData({ label: 'Home', street: '', city: user.city || '', state: '', pincode: '', isDefault: false });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSetDefaultAddress = async (addrId) => {
    try {
      await updateAddress(addrId, { isDefault: true });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (window.confirm('Are you sure you want to remove this address?')) {
      try {
        await deleteAddress(addrId);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading) return <div className="container mt-8 text-center">{t('loading')}</div>;

  return (
    <div className="container fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="section-header" style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>{t('dashboardTitle')}</h1>
            <p className="subtitle" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>{t('welcome')}, {user?.name}</p>
          </div>
          <button onClick={() => setIsAIOpen(true)} className="btn btn-primary" style={{ background: 'linear-gradient(45deg, #8B5CF6, #EC4899)', border: 'none' }}>
            {t('aiDiagnosisBtn')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button 
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setActiveTab('orders')}
          >
            {t('myOrders')}
          </button>
          <button 
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setActiveTab('profile')}
          >
            {t('myProfile')}
          </button>
        </div>
      </div>

      {/* ── Phone Verification Banner for Customers ── */}
      {!user?.phoneVerified && (
        <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '1rem', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📱 Add & Verify Your Phone Number
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Verify your mobile number via OTP so service providers can reach you for bookings.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('profile')}>
            Verify Phone Number
          </button>
        </div>
      )}

      {/* ── 1. Orders Tab ── */}
      {activeTab === 'orders' && (
        <div className="bookings-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {bookings && bookings.length > 0 ? bookings.map(booking => (
            <div key={booking._id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 800, color: '#6366f1', fontSize: '0.88rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  ID: {booking.orderId || ('ORD-' + booking._id?.slice(-6).toUpperCase())}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontWeight: 600, 
                    textTransform: 'capitalize',
                    color: booking.status === 'pending' ? 'var(--warning-color)' : booking.status === 'accepted' ? 'var(--accent-color)' : booking.status === 'completed' ? 'var(--primary-color)' : 'var(--text-muted)'
                  }}>{booking.status}</span>
                  
                  {/* Payment Badge */}
                  {booking.paymentStatus === 'paid' ? (
                    <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle size={12} /> Paid (₹{booking.paidAmount || booking.finalPrice})
                    </span>
                  ) : (
                    <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700 }}>
                      Unpaid: ₹{booking.finalPrice || booking.providerId?.providerDetails?.hourlyRate || 25}
                    </span>
                  )}
                </div>
              </div>
              
              <h3 style={{ marginBottom: '0.25rem' }}>{booking.providerId?.name || 'Unknown Provider'}</h3>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={14}/> {booking.providerId?.phone || 'No phone provided'}
              </p>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} /> {booking.date}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> {booking.timePreference}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexDirection: 'column' }}>
                {/* Track Service Button */}
                <button 
                  onClick={() => setActiveTrackerBooking(booking)}
                  className="btn btn-primary btn-sm" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', border: 'none', fontWeight: 700 }}
                >
                  <Navigation size={16} /> Track Service Progress 📍
                </button>

                {/* Pay Now Button (Always available for unpaid bookings) */}
                {booking.paymentStatus !== 'paid' && (
                  <button 
                    onClick={() => setActivePaymentBooking(booking)}
                    className="btn btn-primary btn-sm" 
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', fontWeight: 700 }}
                  >
                    <CreditCard size={16} /> Pay Now (₹{booking.finalPrice || booking.providerId?.providerDetails?.hourlyRate || 25})
                  </button>
                )}

                {/* View Invoice Button if Paid */}
                {booking.paymentStatus === 'paid' && (
                  <button 
                    onClick={() => setActiveInvoiceBooking(booking)}
                    className="btn btn-outline btn-sm" 
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', borderColor: '#10B981', color: '#10B981' }}
                  >
                    <FileText size={16} /> View Tax Invoice
                  </button>
                )}

                {/* Rate & Review Button ONLY when Service is fully completed */}
                {booking.status === 'completed' && !booking.customerReview && (
                  <button 
                    onClick={() => setActiveReviewBooking(booking)}
                    className="btn btn-outline btn-sm" 
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', borderColor: '#f59e0b', color: '#f59e0b', fontWeight: 700 }}
                  >
                    <Star size={16} className="fill-amber-400 text-amber-400" /> Rate & Review Completed Service
                  </button>
                )}

                {booking.status === 'completed' && booking.customerReview && (
                  <div style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.4rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px' }}>
                    <CheckCircle size={14} /> Review Submitted ({booking.customerReview.rating} ★)
                  </div>
                )}

                {booking.status === 'completed' && (
                  <button 
                    onClick={() => setActiveBookingProvider(booking.providerId)}
                    className="btn btn-outline btn-sm" 
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {t('bookAgain')}
                  </button>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setActiveChat(booking)}
                    className="btn btn-outline btn-sm" 
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                  <button 
                    onClick={() => {
                      const msg = formatWhatsAppBookingMessage(booking, false);
                      openWhatsAppChat(booking.providerId?.phone, msg);
                    }}
                    className="btn btn-sm" 
                    style={{ background: '#25D366', color: 'white', border: 'none', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                </div>
              </div>
              <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>"{booking.description}"</p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--surface-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <strong>Service Address:</strong> {booking.serviceAddress}
                </div>
              </div>
            </div>
          )) : (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
              <h3>{t('noBookings')}</h3>
              <p className="text-muted mt-2">You haven't requested any services so far.</p>
              <button className="btn btn-primary mt-4" onClick={() => navigate('/search')}>{t('findPro')}</button>
            </div>
          )}
        </div>
      )}

      {/* ── 2. Profile & Addresses Tab ── */}
      {activeTab === 'profile' && (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Profile & Addresses</h2>
            {!isEditing && (
              <button className="btn btn-outline btn-sm" onClick={() => {
                setFormData({
                  name: user.name || '',
                  phone: user.phone || '',
                  street: user.addressDetails?.street || '',
                  city: user.city || user.addressDetails?.city || '',
                  state: user.addressDetails?.state || '',
                  pincode: user.addressDetails?.pincode || ''
                });
                setIsEditing(true);
              }}>
                <Edit2 size={16} /> Edit Profile Info
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="form-control" />
                </div>
              </div>

              {/* Primary Address Edit */}
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#6366f1', fontSize: '0.95rem', fontWeight: 700 }}>
                  📍 Primary Doorstep Address
                </h4>
                <div className="form-group mb-3">
                  <label>Street / Flat / House Address</label>
                  <input 
                    type="text" 
                    value={formData.street || ''} 
                    onChange={e => setFormData({...formData, street: e.target.value})} 
                    placeholder="e.g. Flat 402, Green Avenue"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>City</label>
                    <input 
                      type="text" 
                      value={formData.city || ''} 
                      onChange={e => setFormData({...formData, city: e.target.value})} 
                      placeholder="e.g. Ludhiana"
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input 
                      type="text" 
                      value={formData.state || ''} 
                      onChange={e => setFormData({...formData, state: e.target.value})} 
                      placeholder="e.g. Punjab"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input 
                      type="text" 
                      value={formData.pincode || ''} 
                      onChange={e => setFormData({...formData, pincode: e.target.value})} 
                      placeholder="e.g. 141001"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary"><Save size={18} /> Save Changes</button>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Full Name</p>
                  <p style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.25rem' }}>{user?.name}</p>
                </div>
                <div>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Email Address</p>
                  <p style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.25rem' }}>{user?.email}</p>
                </div>
                <div>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Phone Number</p>
                  <p style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.25rem' }}>{user?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Current City</p>
                  <p style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.25rem', color: '#6366f1' }}>
                    📍 {user?.city || user?.addressDetails?.city || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* ── Saved Addresses Section ── */}
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🏠 Saved Doorstep Addresses
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Manage delivery & service addresses for instant booking checkout
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setNewAddressData({ label: 'Home', street: '', city: user?.city || '', state: '', pincode: '', isDefault: false });
                      setShowNewAddressModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    + Add New Address
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {/* Active Primary Address Card */}
                  {user?.addressDetails && (user.addressDetails.street || user.addressDetails.city) && (
                    <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '0.75rem', border: '1.5px solid #6366f1', background: 'rgba(99, 102, 241, 0.04)', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', background: '#6366f1', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '0.3rem' }}>
                          Primary / Default
                        </span>
                      </div>
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '0.95rem' }}>
                        {user.addressDetails.street || 'Main Address'}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {user.addressDetails.city}{user.addressDetails.state ? `, ${user.addressDetails.state}` : ''} {user.addressDetails.pincode ? `- ${user.addressDetails.pincode}` : ''}
                      </p>
                    </div>
                  )}

                  {/* Additional Saved Addresses */}
                  {user?.savedAddresses && user.savedAddresses.length > 0 ? (
                    user.savedAddresses.map((addr) => (
                      <div key={addr._id} className="glass-panel" style={{ padding: '1.25rem', borderRadius: '0.75rem', border: addr.isDefault ? '1.5px solid #10b981' : '1px solid var(--surface-border)', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', background: 'var(--bg-secondary)', padding: '0.15rem 0.5rem', borderRadius: '0.3rem' }}>
                              {addr.label === 'Work' ? '💼 Work' : addr.label === 'Other' ? '📍 Other' : '🏠 Home'}
                            </span>
                            {addr.isDefault && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '0.15rem 0.45rem', borderRadius: '0.3rem' }}>
                                Default
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.92rem' }}>
                            {addr.street}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--surface-border)', paddingTop: '0.5rem' }}>
                          {!addr.isDefault && (
                            <button 
                              onClick={() => handleSetDefaultAddress(addr._id)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Set as Default
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteAddress(addr._id)}
                            className="btn btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', border: 'none', marginLeft: 'auto' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    (!user?.addressDetails?.street && !user?.addressDetails?.city) && (
                      <div style={{ gridColumn: '1 / -1', padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--surface-border)' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          No saved addresses found. Add an address to book services seamlessly!
                        </p>
                        <button 
                          onClick={() => setShowNewAddressModal(true)}
                          className="btn btn-outline btn-sm"
                        >
                          + Add Address
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Verification Badges */}
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Security & Verification</p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span className={user?.emailVerified ? 'verified-badge large' : 'unverified-badge'}>
                    ✉ Email {user?.emailVerified ? '✓ Verified' : '✗ Not Verified'}
                  </span>
                  <span className={user?.phoneVerified ? 'verified-badge large' : 'unverified-badge'}>
                    📱 Phone {user?.phoneVerified ? '✓ Verified' : '✗ Not Verified'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add New Address Modal ── */}
      {showNewAddressModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="glass-panel" style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '480px', padding: '2rem', borderRadius: '1.25rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
              📍 Add New Address
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Add a new doorstep address for quick scheduling and booking
            </p>

            <form onSubmit={handleAddNewAddressSubmit}>
              <div className="form-group mb-3">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Address Label</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {['Home', 'Work', 'Other'].map(lbl => (
                    <button 
                      key={lbl}
                      type="button" 
                      onClick={() => setNewAddressData({...newAddressData, label: lbl})}
                      className={`btn btn-sm ${newAddressData.label === lbl ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                    >
                      {lbl === 'Work' ? '💼 Work' : lbl === 'Other' ? '📍 Other' : '🏠 Home'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group mb-3">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>House / Flat / Street Address *</label>
                <input 
                  type="text" 
                  value={newAddressData.street} 
                  onChange={e => setNewAddressData({...newAddressData, street: e.target.value})} 
                  required 
                  placeholder="e.g. House No. 124, Sector 15"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>City *</label>
                  <input 
                    type="text" 
                    value={newAddressData.city} 
                    onChange={e => setNewAddressData({...newAddressData, city: e.target.value})} 
                    required 
                    placeholder="e.g. Ludhiana"
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>State *</label>
                  <input 
                    type="text" 
                    value={newAddressData.state} 
                    onChange={e => setNewAddressData({...newAddressData, state: e.target.value})} 
                    required 
                    placeholder="e.g. Punjab"
                  />
                </div>
              </div>

              <div className="form-group mb-3">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pincode *</label>
                <input 
                  type="text" 
                  value={newAddressData.pincode} 
                  onChange={e => setNewAddressData({...newAddressData, pincode: e.target.value})} 
                  required 
                  placeholder="e.g. 141001"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input 
                  type="checkbox" 
                  id="setAsDefault" 
                  checked={newAddressData.isDefault} 
                  onChange={e => setNewAddressData({...newAddressData, isDefault: e.target.checked})}
                  style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                />
                <label htmlFor="setAsDefault" style={{ fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                  Set as primary / default address
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                  onClick={() => setShowNewAddressModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1.5 }}
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ChatModal 
        isOpen={!!activeChat} 
        booking={activeChat} 
        onClose={() => setActiveChat(null)} 
      />
      {activeBookingProvider && (
        <BookingModal 
          provider={activeBookingProvider} 
          onClose={() => setActiveBookingProvider(null)} 
        />
      )}
      {isAIOpen && (
        <AIDiagnosisModal onClose={() => setIsAIOpen(false)} />
      )}
      {activePaymentBooking && (
        <PaymentModal 
          booking={activePaymentBooking} 
          onClose={() => setActivePaymentBooking(null)} 
          onSuccess={(updatedBooking) => {
            setBookings(prev => prev.map(b => b._id === updatedBooking._id ? { ...b, ...updatedBooking } : b));
          }}
        />
      )}
      {activeInvoiceBooking && (
        <InvoiceModal 
          booking={activeInvoiceBooking} 
          onClose={() => setActiveInvoiceBooking(null)} 
        />
      )}
      {activeTrackerBooking && (
        <ServiceTrackerModal 
          booking={activeTrackerBooking} 
          onClose={() => setActiveTrackerBooking(null)} 
          onUpdateBooking={(updated) => {
            setActiveTrackerBooking(updated);
            setBookings(prev => prev.map(b => b._id === updated._id ? { ...b, ...updated } : b));
          }}
          onOpenPayment={(b) => setActivePaymentBooking(b)}
          onOpenInvoice={(b) => setActiveInvoiceBooking(b)}
        />
      )}
      {activeReviewBooking && (
        <ReviewTipModal
          booking={activeReviewBooking}
          token={token}
          onClose={() => setActiveReviewBooking(null)}
          onReviewSubmitted={(bookingId, reviewData) => {
            setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, customerReview: reviewData } : b));
          }}
        />
      )}
    </div>
  );
};

export default CustomerDashboard;
