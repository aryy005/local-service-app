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
