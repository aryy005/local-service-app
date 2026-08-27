import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Edit2, Save, Phone, MessageSquare } from 'lucide-react';
import { API_URL } from '../config';
import ChatModal from '../components/ChatModal';
import BookingModal from '../components/BookingModal';
import AIDiagnosisModal from '../components/AIDiagnosisModal';
import { useLanguage } from '../context/LanguageContext';

const CustomerDashboard = () => {
  const { user, token, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'profile'
  const [activeChat, setActiveChat] = useState(null);
  const [activeBookingProvider, setActiveBookingProvider] = useState(null);
  const [isAIOpen, setIsAIOpen] = useState(false);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });

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
      setFormData({ name: user.name || '', phone: user.phone || '' });
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
      await updateProfile({ name: formData.name, phone: formData.phone });
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container mt-8 text-center">{t('loading')}</div>;

  return (
    <div className="container fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="section-header" style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>{t('dashboardTitle')}</h1>
            <p className="subtitle" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>{t('welcome')}, {user.name}</p>
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

      {activeTab === 'orders' && (
        <div className="bookings-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {bookings && bookings.length > 0 ? bookings.map(booking => (
            <div key={booking._id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ 
                  fontWeight: 600, 
                  textTransform: 'capitalize',
                  color: booking.status === 'pending' ? 'var(--warning-color)' : booking.status === 'accepted' ? 'var(--accent-color)' : booking.status === 'completed' ? 'var(--primary-color)' : 'var(--text-muted)'
                }}>{booking.status}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('recentOrdersStr')}</span>
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
                {booking.status === 'completed' && (
                  <button 
                    onClick={() => setActiveBookingProvider(booking.providerId)}
                    className="btn btn-primary btn-sm" 
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {t('bookAgain')}
                  </button>
                )}
                <button 
                  onClick={() => setActiveChat(booking)}
                  className="btn btn-outline btn-sm" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <MessageSquare size={16} /> {t('messageProvider')}
                </button>
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

      {activeTab === 'profile' && (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Profile Details</h2>
            {!isEditing && (
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className="form-control" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary"><Save size={18} /> Save Changes</button>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Full Name</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{user.name}</p>
              </div>
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Email Address</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{user.email}</p>
              </div>
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Phone Number</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{user.phone || 'Not provided'}</p>
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Verification Status</p>
                
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  <span className={user.emailVerified ? 'verified-badge large' : 'unverified-badge'}>
                    ✉ Email {user.emailVerified ? '✓ Verified' : '✗ Not Verified'}
                  </span>
                  <span className={user.phoneVerified ? 'verified-badge large' : 'unverified-badge'}>
                    📱 Phone {user.phoneVerified ? '✓ Verified' : '✗ Not Verified'}
                  </span>
                </div>

                {!user.phoneVerified && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--surface-border)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>📱 Verify Mobile Number (+91)</h4>
                    {phoneError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{phoneError}</div>}
                    
                    {!phoneOtpSent ? (
                      <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '480px', flexWrap: 'wrap' }}>
                        <input 
                          type="tel" 
                          value={phoneInput} 
                          onChange={(e) => setPhoneInput(e.target.value)} 
                          placeholder="+91 98765 43210"
                          style={{ flex: 1, minWidth: '180px', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
                        />
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => handleSendPhoneOtp('sms')} disabled={phoneLoading}>
                          📱 SMS OTP
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSendPhoneOtp('whatsapp')} disabled={phoneLoading} style={{ background: '#25D366', borderColor: '#25D366' }}>
                          💬 WhatsApp OTP
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px', flexDirection: 'column' }}>
                        {phoneDemoOtp && <span style={{ fontSize: '0.82rem', color: '#10b981' }}>Demo OTP: <b>{phoneDemoOtp}</b></span>}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            value={phoneOtp} 
                            onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                            placeholder="Enter 6-digit OTP"
                            maxLength="6"
                            style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
                          />
                          <button type="button" className="btn btn-primary btn-sm" onClick={handleVerifyPhoneOtp} disabled={phoneLoading}>
                            {phoneLoading ? 'Verifying...' : 'Verify OTP'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
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
    </div>
  );
};

export default CustomerDashboard;
