import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Calendar, Clock, Edit2, Save, Phone, MessageSquare, CreditCard, 
  FileText, CheckCircle, Navigation, MessageCircle, Star, Heart, 
  User, Settings, LogOut, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, Plus, Trash2, MapPin, LayoutDashboard, Search
} from 'lucide-react';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';
import ChatModal from '../components/ChatModal';
import BookingModal from '../components/BookingModal';
import AIDiagnosisModal from '../components/AIDiagnosisModal';
import PaymentModal from '../components/PaymentModal';
import InvoiceModal from '../components/InvoiceModal';
import ServiceTrackerModal from '../components/ServiceTrackerModal';
import ReviewTipModal from '../components/ReviewTipModal';
import NotificationCenter from '../components/NotificationCenter';
import UserMenuPill from '../components/UserMenuPill';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getSavedProviders, toggleSaveProvider } from '../utils/savedProviders';
import { isValidPhone, isValidPincode, sanitizeDigits } from '../utils/validation';
import './CustomerDashboard.css';

const CustomerDashboard = () => {
  const { user, token, logout, updateProfile, addAddress, updateAddress, deleteAddress } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard'); // 'dashboard' | 'bookings' | 'messages' | 'saved' | 'profile' | 'settings'
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all' | 'upcoming' | 'past'

  const [savedProviders, setSavedProviders] = useState([]);

  // Modals state
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

  // Add Address Modal State
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

  // Load saved providers
  const refreshSaved = () => {
    setSavedProviders(getSavedProviders(user?.email || 'guest'));
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'bookings', 'messages', 'saved', 'profile', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    refreshSaved();
    window.addEventListener('saved_providers_changed', refreshSaved);
    return () => window.removeEventListener('saved_providers_changed', refreshSaved);
  }, [user?.email]);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (user.role === 'provider') {
      navigate('/provider-dashboard');
      return;
    }

    setFormData({ 
      name: user.name || '', 
      phone: user.phone || '',
      street: user.addressDetails?.street || '',
      city: user.city || user.addressDetails?.city || '',
      state: user.addressDetails?.state || '',
      pincode: user.addressDetails?.pincode || ''
    });
    setPhoneInput(user.phone || '');
  }, [user]);

  const fetchBookings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setBookings(list);

        // Check if there is an unreviewed completed booking to auto-prompt rating
        const unreviewed = list.find(b => b.status === 'completed' && (!b.customerReview || !b.customerReview.rating));
        if (unreviewed) {
          const promptKey = `rating_prompted_${unreviewed._id}`;
          if (!sessionStorage.getItem(promptKey)) {
            sessionStorage.setItem(promptKey, 'true');
            setActiveReviewBooking(unreviewed);
          }
        }
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error(err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    const customerId = user.id || user._id;
    if (customerId) {
      socket.emit('join_user_room', customerId);
    }

    socket.on('payment_completed', (data) => {
      fetchBookings();
      if (data?.bookingId) {
        setActivePaymentBooking(prev => prev?._id === data.bookingId ? null : prev);
        setActiveTrackerBooking(prev => prev?._id === data.bookingId ? { ...prev, paymentStatus: 'paid', status: 'completed', serviceStage: 'paid', paidAt: new Date() } : prev);
      }
    });

    socket.on('booking_stage_updated', (data) => {
      fetchBookings();
      if (data?.bookingId) {
        setActiveTrackerBooking(prev => prev?._id === data.bookingId ? { ...prev, serviceStage: data.stage } : prev);
      }
    });

    socket.on('booking_updated', () => fetchBookings());

    return () => {
      socket.disconnect();
    };
  }, [user, fetchBookings]);

  const handleSendPhoneOtp = async (channel = 'sms') => {
    if (!phoneInput || !isValidPhone(phoneInput)) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)');
      return;
    }
    setPhoneLoading(true);
    setPhoneError('');
    try {
      const res = await fetch(`${API_URL}/verify/phone/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ phone: phoneInput.trim(), channel })
      });
      const data = await res.json();
      if (res.ok) {
        setPhoneOtpSent(true);
        setPhoneDemoOtp(data.demoOtp || '');
      } else {
        setPhoneError(data.error || 'Failed to send OTP');
      }
    } catch {
      setPhoneError('Network error while sending OTP');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.trim().length < 6) {
      setPhoneError('Please enter the 6-digit OTP');
      return;
    }
    setPhoneLoading(true);
    setPhoneError('');
    try {
      const res = await fetch(`${API_URL}/verify/phone/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ phone: phoneInput.trim(), otp: phoneOtp.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setPhoneOtpSent(false);
        setPhoneOtp('');
        setPhoneDemoOtp('');
        if (updateProfile) updateProfile({ phone: phoneInput.trim(), phoneVerified: true });
        alert('Phone verified successfully!');
      } else {
        setPhoneError(data.error || 'Invalid OTP');
      }
    } catch {
      setPhoneError('Network error while verifying OTP');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.name.trim().length < 2) {
      alert('Please enter a valid full name (at least 2 characters)');
      return;
    }
    const targetPhone = phoneInput.trim() || formData.phone.trim();
    if (targetPhone && !isValidPhone(targetPhone)) {
      alert('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)');
      return;
    }
    if (formData.pincode && formData.pincode.trim() !== '' && !isValidPincode(formData.pincode)) {
      alert('Please enter a valid 6-digit Indian PIN code (e.g. 141001)');
      return;
    }
    try {
      await updateProfile({
        name: formData.name.trim(),
        phone: targetPhone,
        addressDetails: {
          street: (formData.street || '').trim(),
          city: (formData.city || '').trim(),
          state: (formData.state || '').trim(),
          pincode: (formData.pincode || '').trim()
        }
      });
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddressData.street.trim() || !newAddressData.city.trim()) {
      alert('Street address and City are required');
      return;
    }
    if (newAddressData.pincode && newAddressData.pincode.trim() !== '' && !isValidPincode(newAddressData.pincode)) {
      alert('Please enter a valid 6-digit Indian PIN code (e.g. 141001)');
      return;
    }
    try {
      await addAddress({
        ...newAddressData,
        street: newAddressData.street.trim(),
        city: newAddressData.city.trim(),
        state: (newAddressData.state || '').trim(),
        pincode: (newAddressData.pincode || '').trim()
      });
      setShowNewAddressModal(false);
      setNewAddressData({ label: 'Home', street: '', city: '', state: '', pincode: '', isDefault: false });
    } catch (err) {
      alert(err.message || 'Failed to add address');
    }
  };

  const handleUnsave = (provider) => {
    toggleSaveProvider(provider, user?.email || 'guest');
    refreshSaved();
  };

  // Derived bookings
  const upcomingList = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed' || b.status === 'accepted' || b.status === 'in_progress');
  const pastList = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  const upcomingCount = upcomingList.length;
  const pastCount = pastList.length;
  const savedCount = savedProviders.length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Real activities generated from user's actual bookings
  const recentActivities = bookings.slice(0, 5).map((b) => {
    const prov = b.providerId || {};
    const dateFormatted = b.createdAt 
      ? new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) 
      : (b.date || 'Recent');
    let title = `Booking placed for ${prov.name || 'Service Provider'}`;
    if (b.status === 'completed') {
      title = `Service completed with ${prov.name || 'Service Provider'}`;
    } else if (b.status === 'confirmed' || b.status === 'accepted') {
      title = `Booking confirmed with ${prov.name || 'Service Provider'}`;
    } else if (b.status === 'cancelled') {
      title = `Booking cancelled for ${prov.name || 'Service Provider'}`;
    } else if (b.status === 'in_progress') {
      title = `Service in progress with ${prov.name || 'Service Provider'}`;
    }
    return {
      id: b._id,
      title,
      time: `${dateFormatted}${b.timePreference ? ` • ${b.timePreference}` : ''}`
    };
  });

  if (loading) return <div className="container mt-8 text-center" style={{ padding: '3rem' }}>{t('loading')}</div>;

  return (
    <div className="lp-dash-container fade-in">
      {/* ═══ Left Sidebar (Screen 5 - Image 1) ═══ */}
      <aside className="lp-dash-sidebar">
        <button 
          type="button" 
          className="lp-sidebar-brand" 
          onClick={() => navigate('/search')}
          style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
        >
          LocalFixr
        </button>

        <nav className="lp-sidebar-nav">
          <button 
            className={`lp-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button 
            type="button"
            className="lp-nav-item"
            onClick={() => navigate('/search')}
          >
            <Search size={18} />
            <span>Explore Services</span>
          </button>

          <button 
            className={`lp-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar size={18} />
            <span>My Bookings</span>
          </button>

          <button 
            className={`lp-nav-item ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => navigate('/messages')}
          >
            <MessageSquare size={18} />
            <span>Messages</span>
          </button>

          <button 
            className={`lp-nav-item ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <Heart size={18} />
            <span>Saved Providers</span>
          </button>

          <button 
            className={`lp-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            <span>Profile</span>
          </button>

          <button 
            className={`lp-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <button className="lp-logout-btn" onClick={() => { logout(); navigate('/'); }}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      {/* ═══ Main Content Area ═══ */}
      <main className="lp-dash-main">
        {/* ─── Topbar with Image 3 User Capsule ─── */}
        <div className="lp-dash-topbar">
          <div className="lp-dash-breadcrumb">
            <span className="lp-dash-brand-tag" onClick={() => navigate('/search')} style={{ cursor: 'pointer' }}>
              LocalFixr
            </span>
            <span className="lp-dash-sep">/</span>
            <span className="lp-dash-curr-tab">
              {activeTab === 'dashboard' ? 'Overview' :
               activeTab === 'bookings' ? 'My Bookings' :
               activeTab === 'messages' ? 'Messages' :
               activeTab === 'saved' ? 'Saved Providers' :
               activeTab === 'profile' ? 'Profile & Addresses' : 'Settings'}
            </span>
          </div>

          <div className="lp-dash-topbar-actions">
            <button 
              type="button" 
              className="lp-dash-browse-btn"
              onClick={() => navigate('/search')}
              title="Explore all services"
            >
              <Search size={15} />
              <span>Browse Services</span>
            </button>
            <NotificationCenter />
            <UserMenuPill />
          </div>
        </div>
        {/* ─── 1. DASHBOARD OVERVIEW (Image 1) ─── */}
        {activeTab === 'dashboard' && (
          <>
            <header className="lp-dash-header">
              <h1>{getGreeting()}, {user?.name || 'User'}!</h1>
              <p>Here's what's happening with your bookings.</p>
            </header>

            {/* 3 Stat Cards */}
            <div className="lp-stats-grid">
              <div className="lp-stat-card" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('bookings'); setBookingFilter('upcoming'); }}>
                <div className="lp-stat-num">{upcomingCount}</div>
                <div className="lp-stat-title">Upcoming Bookings</div>
              </div>

              <div className="lp-stat-card" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('bookings'); setBookingFilter('past'); }}>
                <div className="lp-stat-num">{pastCount}</div>
                <div className="lp-stat-title">Past Bookings</div>
              </div>

              <div className="lp-stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('saved')}>
                <div className="lp-stat-num">{savedCount}</div>
                <div className="lp-stat-title">Saved Providers</div>
              </div>
            </div>

            {/* Upcoming Bookings Section */}
            <section>
              <div className="lp-section-head">
                <h2>Upcoming Bookings</h2>
                {upcomingList.length > 0 && (
                  <button className="lp-view-all" onClick={() => { setActiveTab('bookings'); setBookingFilter('upcoming'); }}>
                    View all <ArrowRight size={15} />
                  </button>
                )}
              </div>

              {upcomingList.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', borderRadius: '12px', background: '#fff', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
                  <Calendar size={36} color="#6b7280" style={{ margin: '0 auto 0.75rem', opacity: 0.7 }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '0.35rem', color: '#111827' }}>No upcoming bookings</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
                    You have no active appointments scheduled. Search verified service professionals in your area to get started.
                  </p>
                  <Link 
                    to="/search" 
                    className="lp-cat-item" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.25rem', background: '#0047FF', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}
                  >
                    <span>Browse Services</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                upcomingList.slice(0, 3).map((b) => {
                  const prov = b.providerId || {};
                  const pDetails = prov.providerDetails || {};
                  const isConfirmed = b.status === 'confirmed' || b.status === 'accepted';
                  return (
                    <div key={b._id} className="lp-booking-card">
                      <div className="lp-booking-info">
                        <img 
                          src={pDetails.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150'} 
                          alt={prov.name || 'Provider'} 
                          className="lp-booking-avatar" 
                        />
                        <div>
                          <div className="lp-booking-name">{prov.name || 'Service Provider'}</div>
                          <div className="lp-booking-meta">
                            {pDetails.categoryName || 'Service'} • {b.date || 'Upcoming'} • {b.timePreference || 'Anytime'}
                          </div>
                        </div>
                      </div>

                      <div className="lp-booking-actions">
                        <span className={`lp-status-pill ${isConfirmed ? 'confirmed' : 'pending'}`}>
                          {isConfirmed ? 'Confirmed' : (b.status === 'in_progress' ? 'In Progress' : 'Pending')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            {/* Recent Activity Section */}
            <section>
              <div className="lp-section-head">
                <h2>Recent Activity</h2>
              </div>

              {recentActivities.length === 0 ? (
                <div className="glass-panel" style={{ padding: '1.75rem', textAlign: 'center', borderRadius: '12px', background: '#fff', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                    No recent activity yet. Your booking confirmations, updates, and payments will appear here.
                  </p>
                </div>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="lp-activity-item">
                    <div className="lp-activity-icon">
                      <CheckCircle size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="lp-activity-title">{act.title}</div>
                      <div className="lp-activity-time">{act.time}</div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {/* ─── 2. SAVED PROVIDERS VIEW ─── */}
        {activeTab === 'saved' && (
          <>
            <header className="lp-dash-header">
              <h1>Saved Providers</h1>
              <p>Service professionals you've bookmarked for fast and easy future bookings.</p>
            </header>

            {savedProviders.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '12px' }}>
                <Heart size={40} color="#999" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>No saved providers yet</h3>
                <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                  Browse services and click the heart icon on any provider profile to save them here for quick booking.
                </p>
                <Link to="/search" className="btn btn-lime">Explore Providers</Link>
              </div>
            ) : (
              <div className="lp-saved-grid">
                {savedProviders.map((p) => {
                  const details = p.providerDetails || {};
                  const catTitle = details.categoryName || 'Service Provider';
                  const locTitle = details.location || p.city || 'Local Area';
                  return (
                    <div key={p._id || p.id} className="lp-saved-card">
                      <div className="lp-saved-top">
                        <img 
                          src={details.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=200'} 
                          alt={p.name} 
                          className="lp-saved-avatar" 
                        />
                        <div>
                          <div className="lp-saved-name">{p.name}</div>
                          <div className="lp-saved-cat">{catTitle} • {locTitle}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Star size={14} fill="#f59e0b" color="#f59e0b" />
                            <span>{details.rating ? Number(details.rating).toFixed(1) : 'New'}</span>
                            {details.reviewsCount ? <span style={{ color: '#888' }}>({details.reviewsCount} reviews)</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="lp-saved-bottom">
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                          {details.hourlyRate ? <>₹{details.hourlyRate}<span style={{ fontSize: '0.75rem', color: '#777', fontWeight: 500 }}>/hr</span></> : <span>Flexible Rate</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button className="lp-unsave-btn" onClick={() => handleUnsave(p)} title="Remove from saved">
                            <Heart size={18} fill="#ef4444" />
                          </button>
                          <Link to={`/provider/${p._id || p.id}`} className="lp-book-btn">
                            Book Now
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── 3. MY BOOKINGS VIEW ─── */}
        {activeTab === 'bookings' && (
          <>
            <header className="lp-dash-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1>My Bookings</h1>
                  <p>Track, manage, and pay for all your scheduled appointments.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className={`btn btn-sm ${bookingFilter === 'all' ? 'btn-lime' : 'btn-outline'}`}
                    onClick={() => setBookingFilter('all')}
                  >
                    All ({bookings.length})
                  </button>
                  <button 
                    className={`btn btn-sm ${bookingFilter === 'upcoming' ? 'btn-lime' : 'btn-outline'}`}
                    onClick={() => setBookingFilter('upcoming')}
                  >
                    Upcoming ({upcomingCount})
                  </button>
                  <button 
                    className={`btn btn-sm ${bookingFilter === 'past' ? 'btn-lime' : 'btn-outline'}`}
                    onClick={() => setBookingFilter('past')}
                  >
                    Past ({pastCount})
                  </button>
                </div>
              </div>
            </header>

            {(() => {
              const displayed = bookingFilter === 'upcoming' ? upcomingList : bookingFilter === 'past' ? pastList : bookings;
              if (displayed.length === 0) {
                return (
                  <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderRadius: '12px' }}>
                    <Calendar size={40} color="#999" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem' }}>No bookings found</h3>
                    <p style={{ color: '#666', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                      {bookingFilter === 'upcoming' 
                        ? "You don't have any upcoming bookings at the moment."
                        : bookingFilter === 'past'
                        ? "You have not completed any past bookings yet."
                        : "You have not scheduled any appointments yet. Explore available services to book your first provider."}
                    </p>
                    <Link to="/search" className="btn btn-lime" style={{ display: 'inline-block' }}>
                      Browse Services
                    </Link>
                  </div>
                );
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {displayed.map(booking => {
                    const prov = booking.providerId || {};
                    const pDetails = prov.providerDetails || {};
                    return (
                      <div key={booking._id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, color: '#111111', fontSize: '0.85rem', background: '#e5e5e0', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                            {booking.orderId || ('ORD-' + booking._id?.slice(-6).toUpperCase())}
                          </span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`lp-status-pill ${booking.status}`}>
                              {booking.status}
                            </span>
                            
                            {booking.paymentStatus === 'paid' ? (
                              <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle size={12} /> Paid (₹{booking.paidAmount || booking.finalPrice})
                              </span>
                            ) : (
                              <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700 }}>
                                Unpaid: ₹{booking.finalPrice || pDetails.hourlyRate || 350}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <h3 style={{ marginBottom: '0.25rem', fontSize: '1.15rem' }}>{prov.name || 'Service Provider'}</h3>
                        {prov.phone && (
                          <p style={{ margin: '0 0 0.85rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Phone size={14}/> {prov.phone}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={16} /> {booking.date}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={16} /> {booking.timePreference}</span>
                        </div>

                    {/* Confirmed Bill Itemized Breakdown for Completed & Unpaid Booking */}
                    {Boolean((booking.status === 'completed' || booking.serviceStage === 'completed') && booking.paymentStatus !== 'paid') && (
                      <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '8px', padding: '0.75rem 0.9rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, color: '#166534' }}>
                          <span>Confirmed Final Bill by Partner:</span>
                          <span style={{ fontSize: '1.15rem', color: '#15803D' }}>₹{booking.finalPrice}</span>
                        </div>
                        {Boolean(booking.billingDetails?.extraExpenses && booking.billingDetails.extraExpenses > 0) && (
                          <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#166534', borderTop: '1px dashed #BBF7D0', paddingTop: '0.4rem' }}>
                            Labor Charge: ₹{booking.billingDetails?.serviceAmount || (booking.finalPrice - booking.billingDetails.extraExpenses)} + Extra Parts: ₹{booking.billingDetails.extraExpenses}
                            {booking.billingDetails?.extraExpenseReason ? ` (${booking.billingDetails.extraExpenseReason})` : ''}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => setActiveTrackerBooking(booking)}
                        className="btn btn-primary btn-sm" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Navigation size={15} /> Track Service
                      </button>

                      {booking.paymentStatus !== 'paid' && (
                        <button 
                          onClick={() => setActivePaymentBooking(booking)}
                          className="btn btn-lime btn-sm" 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <CreditCard size={15} /> Pay Now (₹{booking.finalPrice || pDetails.hourlyRate || 350})
                        </button>
                      )}

                      {booking.paymentStatus === 'paid' && (
                        <button 
                          onClick={() => setActiveInvoiceBooking(booking)}
                          className="btn btn-outline btn-sm" 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <FileText size={15} /> Invoice
                        </button>
                      )}

                      <button 
                        onClick={() => navigate(`/messages?bookingId=${booking._id}`)}
                        className="btn btn-outline btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <MessageCircle size={15} /> Chat
                      </button>

                      {booking.status === 'completed' && (!booking.customerReview || !booking.customerReview.rating) && (
                        <button 
                          onClick={() => setActiveReviewBooking(booking)}
                          className="btn btn-outline btn-sm" 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#f59e0b', color: '#b45309' }}
                        >
                          <Star size={15} fill="#f59e0b" color="#f59e0b" /> Review Service
                        </button>
                      )}

                      {booking.customerReview?.rating && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 800, color: '#111111', background: '#D2FE00', border: '1.5px solid #111111', padding: '0.25rem 0.65rem', borderRadius: '4px', boxShadow: '2px 2px 0 #111111' }}>
                          <Star size={13} fill="#111111" color="#111111" /> Rated {booking.customerReview.rating}★
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
          </>
        )}

        {/* ─── 4. MESSAGES TAB ─── */}
        {activeTab === 'messages' && (
          <>
            <header className="lp-dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1>Messages</h1>
                <p>Direct live chat with your assigned technicians and service specialists.</p>
              </div>
              <button 
                type="button" 
                className="btn btn-lime"
                onClick={() => navigate('/messages')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <MessageSquare size={16} /> Open Fullscreen Chat Hub →
              </button>
            </header>

            {bookings.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderRadius: '12px' }}>
                <MessageSquare size={40} color="#999" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem' }}>No messages yet</h3>
                <p style={{ color: '#666', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                  Direct chat unlocks automatically once you schedule a service appointment with any professional.
                </p>
                <Link to="/search" className="btn btn-lime" style={{ display: 'inline-block' }}>
                  Browse Services
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bookings.slice(0, 5).map((b) => {
                  const prov = b.providerId || {};
                  return (
                    <div 
                      key={b._id} 
                      className="lp-booking-card" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/messages?bookingId=${b._id}`)}
                    >
                      <div className="lp-booking-info">
                        <img 
                          src={prov.providerDetails?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150'} 
                          alt={prov.name || 'Provider'} 
                          className="lp-booking-avatar" 
                        />
                        <div>
                          <div className="lp-booking-name">{prov.name || 'Service Provider'}</div>
                          <div className="lp-booking-meta">Service booking #{b.orderId || b._id?.slice(-6).toUpperCase()} • {b.date || 'Scheduled'}</div>
                        </div>
                      </div>
                      <button 
                        className="btn btn-lime btn-sm" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/messages?bookingId=${b._id}`);
                        }}
                      >
                        <MessageSquare size={15} /> Open Chat
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── 5. PROFILE TAB ─── */}
        {activeTab === 'profile' && (
          <>
            <header className="lp-dash-header">
              <h1>Profile & Addresses</h1>
              <p>Manage your contact details, service locations, and account verification.</p>
            </header>

            <div className="lp-profile-grid">
              {/* Profile Details Card */}
              <div className="lp-profile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Contact Information</h3>
                  {!isEditing ? (
                    <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
                      <Edit2 size={14} /> Edit
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={handleProfileSubmit}>
                      <Save size={14} /> Save
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>Full Name</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      disabled={!isEditing}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>Email Address</label>
                    <input 
                      type="email" 
                      value={user?.email || ''} 
                      disabled
                      style={{ marginTop: '4px', opacity: 0.7 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>Phone Number</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
                      <input 
                        type="tel" 
                        value={phoneInput} 
                        onChange={(e) => {
                          const clean = sanitizeDigits(e.target.value, 10);
                          setPhoneInput(clean);
                          setFormData(prev => ({ ...prev, phone: clean }));
                        }}
                        maxLength={10}
                        placeholder="10-digit mobile number"
                      />
                      {!user?.phoneVerified && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleSendPhoneOtp('sms')} disabled={phoneLoading}>
                          Verify
                        </button>
                      )}
                    </div>
                  </div>

                  {phoneOtpSent && (
                    <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Enter 6-digit verification code:</div>
                      {phoneDemoOtp && (
                        <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, marginBottom: '0.5rem' }}>
                          Test OTP: {phoneDemoOtp}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          value={phoneOtp} 
                          onChange={(e) => setPhoneOtp(sanitizeDigits(e.target.value, 6))}
                          placeholder="6-digit code"
                          maxLength={6}
                        />
                        <button className="btn btn-lime btn-sm" onClick={handleVerifyPhoneOtp} disabled={phoneLoading}>
                          Confirm
                        </button>
                      </div>
                      {phoneError && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.4rem' }}>{phoneError}</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Addresses Card */}
              <div className="lp-profile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Saved Addresses</h3>
                  <button className="btn btn-lime btn-sm" onClick={() => setShowNewAddressModal(true)}>
                    <Plus size={14} /> Add Address
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {user?.addresses && user.addresses.length > 0 ? (
                    user.addresses.map((addr) => (
                      <div key={addr._id} style={{ border: '1px solid #e5e5e0', borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MapPin size={15} /> {addr.label || 'Home'}
                            {addr.isDefault && <span style={{ fontSize: '0.7rem', background: '#D2FE00', padding: '1px 6px', borderRadius: '4px' }}>Default</span>}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                            {addr.street}, {addr.city} {addr.pincode}
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteAddress(addr._id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Delete address"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#777', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      No saved addresses. Click "Add Address" to store your home or office location.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── 6. SETTINGS TAB ─── */}
        {activeTab === 'settings' && (
          <>
            <header className="lp-dash-header">
              <h1>Settings</h1>
              <p>Configure preferences and user controls.</p>
            </header>

            <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '12px', maxWidth: '600px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0', borderBottom: '1px solid #eee' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Appearance</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Switch between dark and light color modes</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={toggleTheme}>
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0', borderBottom: '1px solid #eee' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Language</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Select preferred display language</div>
                </div>
                <select 
                  value={lang} 
                  onChange={(e) => setLang(e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="en">English (EN)</option>
                  <option value="hi">हिंदी (HI)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#ef4444' }}>Sign Out</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>End your session on this device</div>
                </div>
                <button className="btn btn-outline btn-sm" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => { logout(); navigate('/'); }}>
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Modals ── */}
      {activeChat && (
        <ChatModal 
          isOpen={true}
          bookingId={activeChat.bookingId} 
          receiverId={activeChat.receiverId} 
          receiverName={activeChat.receiverName} 
          onClose={() => setActiveChat(null)} 
        />
      )}

      {activeBookingProvider && (
        <BookingModal 
          provider={activeBookingProvider} 
          onClose={() => setActiveBookingProvider(null)} 
          onSuccess={() => {
            alert('Booking requested successfully!');
            setActiveBookingProvider(null);
          }} 
        />
      )}

      {isAIOpen && (
        <AIDiagnosisModal onClose={() => setIsAIOpen(false)} />
      )}

      {activePaymentBooking && (
        <PaymentModal 
          booking={activePaymentBooking} 
          onClose={() => setActivePaymentBooking(null)} 
          onSuccess={() => {
            fetchBookings();
            setActivePaymentBooking(null);
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
            setBookings(prev => prev.map(b => b._id === updated._id ? updated : b));
            setActiveTrackerBooking(updated);
          }}
          onOpenPayment={(b) => { setActiveTrackerBooking(null); setActivePaymentBooking(b); }}
          onOpenInvoice={(b) => { setActiveTrackerBooking(null); setActiveInvoiceBooking(b); }}
          onOpenReview={(b) => { setActiveTrackerBooking(null); setActiveReviewBooking(b); }}
        />
      )}

      {activeReviewBooking && (
        <ReviewTipModal 
          booking={activeReviewBooking} 
          token={token}
          onClose={() => setActiveReviewBooking(null)} 
          onSuccess={(reviewData) => {
            setBookings(prev => prev.map(b => 
              b._id === activeReviewBooking._id 
                ? { ...b, customerReview: reviewData } 
                : b
            ));
            setActiveReviewBooking(null);
          }} 
        />
      )}

      {/* New Address Modal */}
      {showNewAddressModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17, 17, 17, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1.5rem 1rem' }}>
          <div style={{ background: '#FFFFFF', border: '2.5px solid #111111', borderRadius: '8px', boxShadow: '6px 6px 0 #111111', maxWidth: '460px', width: '100%', padding: '2rem', position: 'relative', fontFamily: "'Space Grotesk', sans-serif" }}>
            <button
              type="button"
              onClick={() => setShowNewAddressModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#FFFFFF',
                border: '2px solid #111111',
                boxShadow: '2px 2px 0 #111111',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: '1rem',
                color: '#111111'
              }}
            >
              ✕
            </button>

            <div className="auth-tag">NEW LOCATION</div>
            <h2 className="auth-title" style={{ fontSize: '1.45rem', margin: '0.35rem 0 1.25rem 0' }}>
              ADD SERVICE ADDRESS
            </h2>

            <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#111111', display: 'block', marginBottom: '0.35rem' }}>
                  Label (e.g. Home, Office)
                </label>
                <input 
                  type="text" 
                  value={newAddressData.label} 
                  onChange={(e) => setNewAddressData({ ...newAddressData, label: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #111111', borderRadius: '5px', boxShadow: '2px 2px 0 #111111', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#111111', display: 'block', marginBottom: '0.35rem' }}>
                  Street Address
                </label>
                <input 
                  type="text" 
                  value={newAddressData.street} 
                  onChange={(e) => setNewAddressData({ ...newAddressData, street: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #111111', borderRadius: '5px', boxShadow: '2px 2px 0 #111111', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#111111', display: 'block', marginBottom: '0.35rem' }}>
                    City
                  </label>
                  <input 
                    type="text" 
                    value={newAddressData.city} 
                    onChange={(e) => setNewAddressData({ ...newAddressData, city: e.target.value })} 
                    required 
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #111111', borderRadius: '5px', boxShadow: '2px 2px 0 #111111', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#111111', display: 'block', marginBottom: '0.35rem' }}>
                    Pincode
                  </label>
                  <input 
                    type="text" 
                    value={newAddressData.pincode} 
                    onChange={(e) => setNewAddressData({ ...newAddressData, pincode: sanitizeDigits(e.target.value, 6) })} 
                    required 
                    maxLength={6}
                    placeholder="6 digits (e.g. 141001)"
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #111111', borderRadius: '5px', boxShadow: '2px 2px 0 #111111', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowNewAddressModal(false)}
                  style={{ padding: '0.75rem 1.25rem', fontWeight: 800, background: '#FFFFFF', color: '#111111', border: '2px solid #111111', boxShadow: '2px 2px 0 #111111', borderRadius: '6px', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="auth-submit-btn"
                  style={{ width: 'auto', padding: '0.75rem 1.5rem', margin: 0, fontSize: '0.85rem' }}
                >
                  SAVE ADDRESS →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
