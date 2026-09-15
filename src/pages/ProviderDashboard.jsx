import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, Star, IndianRupee, Bell, CheckCircle2, ChevronRight,
  Briefcase, User as UserIcon, Wallet, MessageSquare, Headphones, 
  MapPin, Check, X, AlertCircle, Eye, Wrench, Plus, Upload, Trash2, 
  Lock, ArrowRight, ShieldCheck, Zap, Scissors, Paintbrush, Snowflake,
  Edit2, ExternalLink, Navigation, Phone, Shield
} from 'lucide-react';
import { API_URL } from '../config';
import { categories } from '../data/mockData';
import ChatModal from '../components/ChatModal';
import ServiceTrackerModal from '../components/ServiceTrackerModal';
import InvoiceModal from '../components/InvoiceModal';
import { openWhatsAppChat, formatWhatsAppBookingMessage } from '../utils/whatsapp';
import './ProviderDashboard.css';

// Preset sample photos to make testing and demonstration instant for service partners
const SAMPLE_PORTFOLIO_PRESETS = [
  { label: 'Deep Cleaning Work', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80' },
  { label: 'AC & Appliance Repair', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80' },
  { label: 'Plumbing & Pipe Fitting', url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80' },
  { label: 'Electrical Installation', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80' },
  { label: 'Wall Painting & Finish', url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80' }
];

// Helper to validate complete provider profile
export const checkProviderProfile = (user) => {
  const p = user?.providerDetails || {};
  const addr = user?.addressDetails || {};
  
  const checks = [
    { key: 'name', label: 'Full Name', valid: !!(user?.name && user.name.trim().length > 0), value: user?.name },
    { key: 'phone', label: 'Phone Number', valid: !!(user?.phone && user.phone.trim().length >= 10), value: user?.phone },
    { key: 'street', label: 'Doorstep / Street Address', valid: !!(addr.street && addr.street.trim().length > 0), value: addr.street },
    { key: 'city', label: 'Operating City & Area', valid: !!((user?.city || addr.city || p.location) && (user?.city || addr.city || p.location).trim().length > 0), value: user?.city || addr.city || p.location },
    { key: 'category', label: 'Service Category', valid: !!(p.category && p.category.trim().length > 0), value: p.category },
    { key: 'hourlyRate', label: 'Starting / Base Price (₹)', valid: !!(p.hourlyRate && Number(p.hourlyRate) > 0), value: p.hourlyRate ? `Starts from ₹${p.hourlyRate}` : null },
    { key: 'experienceYears', label: 'Experience (Years)', valid: (p.experienceYears !== undefined && p.experienceYears !== null && Number(p.experienceYears) >= 0), value: p.experienceYears !== undefined ? `${p.experienceYears} yrs` : null },
    { key: 'description', label: 'Bio / Description (min 10 chars)', valid: !!(p.description && p.description.trim().length >= 10), value: p.description },
    { key: 'upiId', label: 'Payout UPI ID', valid: !!(p.upiId && p.upiId.trim().length > 0), value: p.upiId },
    { key: 'portfolio', label: 'Work Portfolio (Min 1 Image)', valid: !!(p.portfolioImages && Array.isArray(p.portfolioImages) && p.portfolioImages.length > 0), value: p.portfolioImages?.length ? `${p.portfolioImages.length} photos` : null },
    { key: 'verification', label: 'Identity Verified (Phone / Aadhaar)', valid: !!(user?.phoneVerified || p.aadhaarVerified), value: user?.phoneVerified ? 'Phone Verified' : (p.aadhaarVerified ? 'Aadhaar Verified' : null) }
  ];

  const missing = checks.filter(c => !c.valid);
  const isComplete = missing.length === 0;
  const progress = Math.round(((checks.length - missing.length) / checks.length) * 100);

  return { checks, missing, isComplete, progress };
};

const ProviderDashboard = () => {
  const { user, token, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Navigation tabs: 'dashboard' | 'bookings' | 'services' | 'profile' | 'earnings' | 'reviews' | 'availability' | 'messages' | 'support'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobDetail, setSelectedJobDetail] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [activeTrackerBooking, setActiveTrackerBooking] = useState(null);
  const [activeInvoiceBooking, setActiveInvoiceBooking] = useState(null);

  // Booking filters in bookings tab
  const [bookingFilter, setBookingFilter] = useState('all');

  // Profile Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    category: '',
    hourlyRate: '',
    experienceYears: '',
    location: '',
    description: '',
    upiId: '',
    portfolioImages: []
  });

  // Inline Verification States
  const [phoneInput, setPhoneInput] = useState(user?.phone || '');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const [aadhaarInput, setAadhaarInput] = useState('');
  const [aadhaarStep, setAadhaarStep] = useState('input');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [aadhaarClientId, setAadhaarClientId] = useState('');
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');

  // Weekly availability schedule
  const [workingDays, setWorkingDays] = useState({
    Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: true, Sunday: false
  });
  const [shiftHours, setShiftHours] = useState({ start: '09:00', end: '19:00' });
  const [instantAvailable, setInstantAvailable] = useState(true);

  // Profile completion status
  const profileStatus = checkProviderProfile(user);

  // Fetch real jobs from backend
  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading provider jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (user.role !== 'provider') {
      navigate('/customer-dashboard');
      return;
    }

    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      street: user.addressDetails?.street || '',
      city: user.city || user.addressDetails?.city || user.providerDetails?.location || '',
      state: user.addressDetails?.state || '',
      pincode: user.addressDetails?.pincode || '',
      category: user.providerDetails?.category || 'Electrician',
      hourlyRate: user.providerDetails?.hourlyRate || '350',
      experienceYears: user.providerDetails?.experienceYears !== undefined ? user.providerDetails.experienceYears : '5',
      location: user.providerDetails?.location || user.city || 'Chandigarh',
      description: user.providerDetails?.description || '',
      upiId: user.providerDetails?.upiId || '',
      portfolioImages: user.providerDetails?.portfolioImages || []
    });
    setPhoneInput(user.phone || '');

    fetchJobs();
  }, [user, token, navigate]);

  // Update Booking Status
  const updateJobStatus = async (id, status, extraData = {}) => {
    try {
      const res = await fetch(`${API_URL}/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status, ...extraData })
      });
      if (res.ok) {
        await fetchJobs();
        if (selectedJobDetail && selectedJobDetail._id === id) {
          setSelectedJobDetail(prev => ({ ...prev, status }));
        }
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to update job status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    }
  };

  // Advance Booking Service Stage
  const advanceJobStage = async (id, stage, extraData = {}) => {
    try {
      const res = await fetch(`${API_URL}/bookings/${id}/stage`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ stage, ...extraData })
      });
      if (res.ok) {
        const updated = await res.json();
        setJobs(prev => prev.map(j => j._id === updated._id ? updated : j));
        if (selectedJobDetail && selectedJobDetail._id === id) {
          setSelectedJobDetail(updated);
        }
        if (activeTrackerBooking && activeTrackerBooking._id === updated._id) {
          setActiveTrackerBooking(updated);
        }
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to advance service stage');
      }
    } catch (err) {
      console.error(err);
      alert('Error advancing stage');
    }
  };

  // Verification Handlers
  const handleSendPhoneOtp = async () => {
    if (!phoneInput) { setPhoneError('Enter mobile number'); return; }
    setPhoneLoading(true); setPhoneError('');
    try {
      const res = await fetch(`${API_URL}/verify/phone/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, channel: 'sms' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPhoneOtpSent(true);
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
      alert('Phone verified successfully!');
    } catch (err) { setPhoneError(err.message); }
    finally { setPhoneLoading(false); }
  };

  const handleSendAadhaarOtp = async () => {
    if (aadhaarInput.length !== 12) { setAadhaarError('Enter 12-digit Aadhaar number'); return; }
    setAadhaarLoading(true); setAadhaarError('');
    try {
      const res = await fetch(`${API_URL}/verify/aadhaar/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaarNumber: aadhaarInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAadhaarClientId(data.client_id);
      setAadhaarStep('otp');
    } catch (err) { setAadhaarError(err.message); }
    finally { setAadhaarLoading(false); }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (aadhaarOtp.length < 6) { setAadhaarError('Enter 6-digit OTP'); return; }
    setAadhaarLoading(true); setAadhaarError('');
    try {
      const res = await fetch(`${API_URL}/verify/aadhaar/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: aadhaarClientId, otp: aadhaarOtp, aadhaarNumber: aadhaarInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await updateProfile({
        providerDetails: {
          ...user.providerDetails,
          aadhaarVerified: true,
          aadhaarLastFour: aadhaarInput.slice(-4),
          aadhaarVerifiedAt: new Date()
        }
      });
      setAadhaarStep('verified');
      alert('Aadhaar verified successfully!');
    } catch (err) { setAadhaarError(err.message); }
    finally { setAadhaarLoading(false); }
  };

  // Profile Save
  const handleSaveProfile = async (e) => {
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
        },
        providerDetails: {
          ...user.providerDetails,
          category: formData.category,
          categoryName: formData.category,
          hourlyRate: Number(formData.hourlyRate) || 350,
          experienceYears: Number(formData.experienceYears) || 3,
          location: formData.location || formData.city,
          description: formData.description,
          upiId: formData.upiId,
          portfolioImages: formData.portfolioImages
        }
      });
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    }
  };

  // Dynamic Greeting based on time of day
  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Today's date formatted
  const todayDateStr = useMemo(() => {
    const d = new Date();
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      day: d.toLocaleDateString('en-US', { weekday: 'long' })
    };
  }, []);

  // Metric KPI Computations
  const pendingJobs = useMemo(() => jobs.filter(j => j.status === 'pending' || j.serviceStage === 'requested'), [jobs]);
  const activeJobs = useMemo(() => jobs.filter(j => j.status === 'accepted' || j.serviceStage === 'in_progress' || j.serviceStage === 'in_transit'), [jobs]);
  const completedJobs = useMemo(() => jobs.filter(j => j.status === 'completed' || j.serviceStage === 'completed'), [jobs]);
  const cancelledJobs = useMemo(() => jobs.filter(j => j.status === 'declined' || j.status === 'cancelled'), [jobs]);

  const totalEarnings = useMemo(() => {
    return completedJobs.reduce((sum, j) => sum + (j.finalPrice || j.paidAmount || 650), 0);
  }, [completedJobs]);

  // Display upcoming bookings list (real jobs if available, or clean placeholders matching screenshot)
  const displayUpcomingBookings = useMemo(() => {
    if (jobs.length > 0) {
      return jobs.slice(0, 5).map(j => ({
        id: j.orderId || `#LP${j._id.slice(-4).toUpperCase()}`,
        _id: j._id,
        rawJob: j,
        customerName: j.customerId?.name || 'Customer',
        customerAvatar: j.customerId?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
        serviceName: j.description || j.serviceCategory || 'Electrical Repair',
        category: user?.providerDetails?.category || 'Electrical Repair',
        location: j.serviceAddress || j.customerId?.city || 'Sector 15, Chandigarh',
        dateTime: j.date ? `${j.date} ${j.timePreference || '10:30 AM'}` : 'Today, 10:30 AM',
        price: j.finalPrice || 500,
        status: j.status === 'pending' ? 'PENDING' : j.serviceStage === 'in_progress' ? 'IN PROGRESS' : 'ACCEPTED',
        statusKey: j.status === 'pending' ? 'pending' : j.serviceStage === 'in_progress' ? 'in_progress' : 'accepted'
      }));
    }

    // Default reference mockup dataset for Raj Kumar matching image
    return [
      {
        id: '#LP8291',
        customerName: 'Aman Sharma',
        customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        serviceName: 'Electrical Repair',
        category: 'Electrical Repair',
        location: 'Sector 15, Chandigarh',
        dateTime: 'Apr 26, 2025 10:30 AM',
        price: 500,
        status: 'PENDING',
        statusKey: 'pending'
      },
      {
        id: '#LP8287',
        customerName: 'Neha Verma',
        customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
        serviceName: 'Plumbing',
        category: 'Plumbing',
        location: 'Phase 5, Mohali',
        dateTime: 'Apr 26, 2025 12:00 PM',
        price: 700,
        status: 'ACCEPTED',
        statusKey: 'accepted'
      },
      {
        id: '#LP8280',
        customerName: 'Rohit Singh',
        customerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
        serviceName: 'AC Repair',
        category: 'AC Repair',
        location: 'Sector 22, Chandigarh',
        dateTime: 'Apr 26, 2025 03:30 PM',
        price: 600,
        status: 'IN PROGRESS',
        statusKey: 'in_progress'
      },
      {
        id: '#LP8276',
        customerName: 'Pooja Taneja',
        customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150',
        serviceName: 'Carpentry',
        category: 'Carpentry',
        location: 'Kharar',
        dateTime: 'Apr 26, 2025 05:00 PM',
        price: 1200,
        status: 'PENDING',
        statusKey: 'pending'
      },
      {
        id: '#LP8269',
        customerName: 'Sahil Mehta',
        customerAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150',
        serviceName: 'Electrical Repair',
        category: 'Electrical Repair',
        location: 'Sector 17, Chandigarh',
        dateTime: 'Apr 27, 2025 09:00 AM',
        price: 450,
        status: 'PENDING',
        statusKey: 'pending'
      }
    ];
  }, [jobs, user]);

  return (
    <div className="lp-provider-portal">
      {/* ═══════════════════════════════════════════════════════════════
         1. LEFT SIDEBAR (Pitch Black #141414)
      ═══════════════════════════════════════════════════════════════ */}
      <aside className="lp-sidebar">
        <div>
          <div className="lp-sidebar-brand">
            <h1 className="lp-brand-title">LocalPro</h1>
            <div className="lp-brand-sub">PROVIDERS PORTAL</div>
          </div>

          <nav className="lp-nav-list">
            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              {activeTab === 'dashboard' && <span className="lp-nav-active-pill"></span>}
              <Calendar size={18} />
              <span>Dashboard</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookings')}
            >
              {activeTab === 'bookings' && <span className="lp-nav-active-pill"></span>}
              <Calendar size={18} />
              <span>Bookings</span>
              <span className="lp-nav-badge">{pendingJobs.length || 5}</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              {activeTab === 'services' && <span className="lp-nav-active-pill"></span>}
              <Wrench size={18} />
              <span>My Services</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              {activeTab === 'profile' && <span className="lp-nav-active-pill"></span>}
              <UserIcon size={18} />
              <span>Profile</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'earnings' ? 'active' : ''}`}
              onClick={() => setActiveTab('earnings')}
            >
              {activeTab === 'earnings' && <span className="lp-nav-active-pill"></span>}
              <Wallet size={18} />
              <span>Earnings</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              {activeTab === 'reviews' && <span className="lp-nav-active-pill"></span>}
              <Star size={18} />
              <span>Reviews</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'availability' ? 'active' : ''}`}
              onClick={() => setActiveTab('availability')}
            >
              {activeTab === 'availability' && <span className="lp-nav-active-pill"></span>}
              <Clock size={18} />
              <span>Availability</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              {activeTab === 'messages' && <span className="lp-nav-active-pill"></span>}
              <MessageSquare size={18} />
              <span>Messages</span>
              <span className="lp-nav-badge">3</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'support' ? 'active' : ''}`}
              onClick={() => setActiveTab('support')}
            >
              {activeTab === 'support' && <span className="lp-nav-active-pill"></span>}
              <Headphones size={18} />
              <span>Support</span>
            </button>
          </nav>
        </div>

        <div className="lp-sidebar-bottom">
          <button 
            type="button" 
            className="lp-go-customer-btn"
            onClick={() => navigate('/search')}
          >
            <span>Go to Customer App</span>
            <ArrowRight size={16} />
          </button>

          <div className="lp-sidebar-community-card">
            <span className="lp-community-text">
              BETTER SERVICES<br />STRONGER COMMUNITIES
            </span>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════
         2. MAIN CONTENT VIEW
      ═══════════════════════════════════════════════════════════════ */}
      <main className="lp-main">
        {/* Top Header */}
        <header className="lp-topbar">
          <div>
            <h2 className="lp-greeting-title">
              {greeting}, {user?.name || 'Raj Kumar'}
            </h2>
            <div className="lp-greeting-sub">
              Here's what's happening with your services today.
            </div>
          </div>

          <div className="lp-topbar-right">
            <button type="button" className="lp-notif-bell-btn" title="Notifications">
              <Bell size={20} />
              <span className="lp-notif-dot">3</span>
            </button>

            <div className="lp-provider-profile-pill" onClick={() => setActiveTab('profile')}>
              <img 
                src={user?.providerDetails?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'} 
                alt={user?.name || 'Provider'} 
                className="lp-provider-avatar" 
              />
              <div>
                <div className="lp-provider-pill-name">{user?.name || 'Raj Kumar'}</div>
                <div className="lp-provider-pill-role">{user?.providerDetails?.category || 'Electrician'}</div>
              </div>
            </div>

            <div className="lp-date-card">
              <Calendar size={18} className="lp-date-card-icon" />
              <div>
                <div className="lp-date-card-val">{todayDateStr.date}</div>
                <div className="lp-date-card-day">{todayDateStr.day}</div>
              </div>
            </div>
          </div>
        </header>

        {/* TAB 1: EXECUTIVE DASHBOARD (Matches Mockup 100%) */}
        {activeTab === 'dashboard' && (
          <>
            {/* Top 4 Metric KPI Cards */}
            <div className="lp-kpi-grid">
              <div className="lp-kpi-card c-lime">
                <div className="lp-kpi-card-header">
                  <div className="lp-kpi-icon-wrap"><Calendar size={18} /></div>
                  <span className="lp-kpi-label">TODAY'S BOOKINGS</span>
                </div>
                <div className="lp-kpi-val">{activeJobs.length || 3}</div>
                <div className="lp-kpi-sub green">▲ +2 from yesterday</div>
              </div>

              <div className="lp-kpi-card c-orange">
                <div className="lp-kpi-card-header">
                  <div className="lp-kpi-icon-wrap"><Clock size={18} /></div>
                  <span className="lp-kpi-label">PENDING REQUESTS</span>
                </div>
                <div className="lp-kpi-val">{pendingJobs.length || 5}</div>
                <div className="lp-kpi-sub orange">Needs your action</div>
              </div>

              <div className="lp-kpi-card c-blue">
                <div className="lp-kpi-card-header">
                  <div className="lp-kpi-icon-wrap"><Star size={18} /></div>
                  <span className="lp-kpi-label">AVERAGE RATING</span>
                </div>
                <div className="lp-kpi-val">{user?.providerDetails?.rating || 4.8} ★</div>
                <div className="lp-kpi-sub">Based on 124 reviews</div>
              </div>

              <div className="lp-kpi-card c-cyan">
                <div className="lp-kpi-card-header">
                  <div className="lp-kpi-icon-wrap"><IndianRupee size={18} /></div>
                  <span className="lp-kpi-label">TOTAL EARNINGS</span>
                </div>
                <div className="lp-kpi-val">₹{totalEarnings.toLocaleString('en-IN') || '12,480'}</div>
                <div className="lp-kpi-sub">This month</div>
              </div>
            </div>

            {/* 3-Column Content Layout */}
            <div className="lp-dashboard-columns">
              
              {/* COLUMN 1: Upcoming Bookings & Recent Reviews */}
              <div className="lp-col-left">
                <div className="lp-card">
                  <div className="lp-card-header">
                    <h3 className="lp-card-title">UPCOMING BOOKINGS</h3>
                    <button type="button" className="lp-card-link" onClick={() => setActiveTab('bookings')}>
                      View All →
                    </button>
                  </div>

                  <div className="lp-upcoming-bookings-list">
                    {displayUpcomingBookings.map((b, idx) => (
                      <div key={b.id || idx} className="lp-booking-row">
                        <div className="lp-bk-cust">
                          <img src={b.customerAvatar} alt={b.customerName} className="lp-bk-avatar" />
                          <div>
                            <div className="lp-bk-name">{b.customerName}</div>
                            <div className="lp-bk-id">{b.id}</div>
                          </div>
                        </div>

                        <div className="lp-bk-service">
                          <Zap size={15} color="#111111" />
                          <div>
                            <div className="lp-bk-srv-title">{b.serviceName}</div>
                            <div className="lp-bk-srv-loc">{b.location}</div>
                          </div>
                        </div>

                        <div className="lp-bk-time">
                          <div>{b.dateTime}</div>
                        </div>

                        <div className="lp-bk-price">₹{b.price}</div>

                        <div>
                          <span className={`lp-status-pill ${b.statusKey}`}>
                            {b.status}
                          </span>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <button 
                            type="button" 
                            className="lp-btn-view"
                            onClick={() => {
                              if (b.rawJob) setSelectedJobDetail(b.rawJob);
                              else setSelectedJobDetail({
                                _id: 'sample-' + idx,
                                orderId: b.id,
                                description: b.serviceName,
                                date: b.dateTime,
                                finalPrice: b.price,
                                status: b.statusKey,
                                serviceStage: b.statusKey,
                                serviceAddress: b.location,
                                customerId: { name: b.customerName, phone: '+91 98140 00000', city: b.location }
                              });
                            }}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Reviews Card */}
                <div className="lp-card">
                  <div className="lp-card-header">
                    <h3 className="lp-card-title">RECENT REVIEWS</h3>
                    <button type="button" className="lp-card-link" onClick={() => setActiveTab('reviews')}>
                      View All →
                    </button>
                  </div>

                  <div className="lp-reviews-grid">
                    <div className="lp-rev-card">
                      <div>
                        <div className="lp-rev-user">
                          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" alt="Neha" className="lp-rev-avatar" />
                          <div>
                            <div className="lp-rev-name">Neha Verma</div>
                            <div className="lp-stars-row">★★★★★</div>
                          </div>
                        </div>
                        <p className="lp-rev-comment">"Very professional and on time. Highly recommended!"</p>
                      </div>
                      <span className="lp-rev-date">Apr 24, 2025</span>
                    </div>

                    <div className="lp-rev-card">
                      <div>
                        <div className="lp-rev-user">
                          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" alt="Rahul" className="lp-rev-avatar" />
                          <div>
                            <div className="lp-rev-name">Rahul Mehta</div>
                            <div className="lp-stars-row">★★★★☆</div>
                          </div>
                        </div>
                        <p className="lp-rev-comment">"Good work, but took a little longer than expected."</p>
                      </div>
                      <span className="lp-rev-date">Apr 22, 2025</span>
                    </div>

                    <div className="lp-rev-card">
                      <div>
                        <div className="lp-rev-user">
                          <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150" alt="Simran" className="lp-rev-avatar" />
                          <div>
                            <div className="lp-rev-name">Simran Kaur</div>
                            <div className="lp-stars-row">★★★★★</div>
                          </div>
                        </div>
                        <p className="lp-rev-comment">"Excellent service! Will book again."</p>
                      </div>
                      <span className="lp-rev-date">Apr 20, 2025</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: Today's Schedule, Quick Actions, Service Area */}
              <div className="lp-col-center">
                
                {/* Today's Schedule Timeline */}
                <div className="lp-card">
                  <div className="lp-card-header">
                    <h3 className="lp-card-title">TODAY'S SCHEDULE</h3>
                    <button type="button" className="lp-card-link" onClick={() => setActiveTab('bookings')}>
                      View Calendar →
                    </button>
                  </div>

                  <div className="lp-timeline-list">
                    <div className="lp-timeline-item">
                      <span className="lp-timeline-time">10:30 AM</span>
                      <span className="lp-timeline-node green"></span>
                      <div className="lp-timeline-info">
                        <div className="lp-timeline-title">Aman Sharma</div>
                        <div className="lp-timeline-sub">Electrical Repair</div>
                      </div>
                      <span className="lp-status-pill pending">PENDING</span>
                    </div>

                    <div className="lp-timeline-item">
                      <span className="lp-timeline-time">12:00 PM</span>
                      <span className="lp-timeline-node blue"></span>
                      <div className="lp-timeline-info">
                        <div className="lp-timeline-title">Neha Verma</div>
                        <div className="lp-timeline-sub">Plumbing</div>
                      </div>
                      <span className="lp-status-pill accepted">ACCEPTED</span>
                    </div>

                    <div className="lp-timeline-item">
                      <span className="lp-timeline-time">03:30 PM</span>
                      <span className="lp-timeline-node blue"></span>
                      <div className="lp-timeline-info">
                        <div className="lp-timeline-title">Rohit Singh</div>
                        <div className="lp-timeline-sub">AC Repair</div>
                      </div>
                      <span className="lp-status-pill in_progress">IN PROGRESS</span>
                    </div>

                    <div className="lp-timeline-item">
                      <span className="lp-timeline-time">05:00 PM</span>
                      <span className="lp-timeline-node amber"></span>
                      <div className="lp-timeline-info">
                        <div className="lp-timeline-title">Pooja Taneja</div>
                        <div className="lp-timeline-sub">Carpentry</div>
                      </div>
                      <span className="lp-status-pill pending">PENDING</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions 2x2 */}
                <div className="lp-card">
                  <div className="lp-card-header">
                    <h3 className="lp-card-title">QUICK ACTIONS</h3>
                  </div>

                  <div className="lp-quick-actions-grid">
                    <button 
                      type="button" 
                      className="lp-quick-action-btn"
                      onClick={() => setActiveTab('availability')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Calendar size={18} className="lp-qa-icon" />
                        <span>Update Availability</span>
                      </div>
                      <ArrowRight size={14} />
                    </button>

                    <button 
                      type="button" 
                      className="lp-quick-action-btn"
                      onClick={() => setActiveTab('services')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Plus size={18} className="lp-qa-icon" />
                        <span>Add New Service</span>
                      </div>
                      <ArrowRight size={14} />
                    </button>

                    <button 
                      type="button" 
                      className="lp-quick-action-btn"
                      onClick={() => setActiveTab('profile')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <UserIcon size={18} className="lp-qa-icon" />
                        <span>Update Profile</span>
                      </div>
                      <ArrowRight size={14} />
                    </button>

                    <button 
                      type="button" 
                      className="lp-quick-action-btn"
                      onClick={() => setActiveTab('messages')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <MessageSquare size={18} className="lp-qa-icon" />
                        <span>View Messages</span>
                      </div>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Service Area Radar Map */}
                <div className="lp-card">
                  <div className="lp-card-header">
                    <h3 className="lp-card-title">SERVICE AREA</h3>
                  </div>

                  <div className="lp-radar-wrapper">
                    <div className="lp-radar-svg-box">
                      <svg width="220" height="130" viewBox="0 0 220 130">
                        {/* Concentric radar rings */}
                        <circle cx="110" cy="65" r="55" fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
                        <circle cx="110" cy="65" r="35" fill="none" stroke="#94A3B8" strokeWidth="1" />
                        <circle cx="110" cy="65" r="18" fill="rgba(210, 254, 0, 0.15)" stroke="#D2FE00" strokeWidth="1.5" />
                        
                        {/* Center location pin */}
                        <circle cx="110" cy="65" r="5" fill="#111111" />
                        <text x="120" y="69" fontSize="9" fontWeight="800" fill="#111111">Chandigarh</text>
                        
                        {/* Active booking markers */}
                        <circle cx="85" cy="50" r="3" fill="#10B981" />
                        <circle cx="140" cy="45" r="3" fill="#2563EB" />
                        <circle cx="130" cy="85" r="3" fill="#2563EB" />
                        <circle cx="75" cy="80" r="3" fill="#2563EB" />
                      </svg>
                    </div>

                    <div className="lp-radar-legend">
                      <div className="lp-legend-item">
                        <span className="lp-legend-dot loc"></span>
                        <span>Your Location (Chandigarh)</span>
                      </div>
                      <div className="lp-legend-item">
                        <span className="lp-legend-dot active"></span>
                        <span>Active Bookings</span>
                      </div>
                      <div className="lp-legend-item">
                        <span className="lp-legend-dot ring"></span>
                        <span>Service Area (10 km radius)</span>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      className="lp-btn-manage-area"
                      onClick={() => setActiveTab('profile')}
                    >
                      Manage Area →
                    </button>
                  </div>
                </div>
              </div>

              {/* COLUMN 3: Right Rail (Quote, Verified, Earnings Bar, Quick Stats) */}
              <div className="lp-col-right">
                
                {/* Quote photo card */}
                <div className="lp-quote-card">
                  <div className="lp-quote-text">
                    WORK<br />HARD<br />STAY<br />CONSISTENT
                  </div>
                </div>

                {/* Verified Provider Banner */}
                <div className="lp-verified-banner">
                  <div className="lp-vb-check">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div>
                    <div className="lp-vb-title">VERIFIED PROVIDER</div>
                    <div className="lp-vb-sub">Build trust. Get more bookings.</div>
                  </div>
                </div>

                {/* Earnings Overview Chart */}
                <div className="lp-card">
                  <div className="lp-card-header">
                    <h3 className="lp-card-title">EARNINGS OVERVIEW</h3>
                    <button type="button" className="lp-card-link" onClick={() => setActiveTab('earnings')}>
                      This Month →
                    </button>
                  </div>

                  <div className="lp-earnings-total">
                    <span>₹12,480</span>
                    <span className="lp-pill-pct">+18%</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>vs. last month</div>

                  {/* 4 weekly bar columns matching mockup */}
                  <div className="lp-chart-bars-wrap">
                    <div className="lp-bar-col">
                      <div className="lp-bar-fill" style={{ height: '35%' }}></div>
                      <span className="lp-bar-label">W1</span>
                    </div>
                    <div className="lp-bar-col">
                      <div className="lp-bar-fill" style={{ height: '55%' }}></div>
                      <span className="lp-bar-label">W2</span>
                    </div>
                    <div className="lp-bar-col">
                      <div className="lp-bar-fill" style={{ height: '75%' }}></div>
                      <span className="lp-bar-label">W3</span>
                    </div>
                    <div className="lp-bar-col">
                      <div className="lp-bar-fill active" style={{ height: '90%' }}></div>
                      <span className="lp-bar-label">W4</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="lp-card">
                  <div className="lp-card-header">
                    <h3 className="lp-card-title">QUICK STATS</h3>
                  </div>

                  <div className="lp-quick-stats-list">
                    <div className="lp-qs-row">
                      <div className="lp-qs-left">
                        <Calendar size={15} />
                        <span>Total Bookings</span>
                      </div>
                      <div className="lp-qs-right">
                        <span className="lp-qs-val">124</span>
                        <span className="lp-qs-badge pos">+12%</span>
                      </div>
                    </div>

                    <div className="lp-qs-row">
                      <div className="lp-qs-left">
                        <CheckCircle2 size={15} />
                        <span>Completed Services</span>
                      </div>
                      <div className="lp-qs-right">
                        <span className="lp-qs-val">118</span>
                        <span className="lp-qs-badge pos">+10%</span>
                      </div>
                    </div>

                    <div className="lp-qs-row">
                      <div className="lp-qs-left">
                        <X size={15} />
                        <span>Cancelled Bookings</span>
                      </div>
                      <div className="lp-qs-right">
                        <span className="lp-qs-val">6</span>
                        <span className="lp-qs-badge neg">-2%</span>
                      </div>
                    </div>

                    <div className="lp-qs-row">
                      <div className="lp-qs-left">
                        <Star size={15} />
                        <span>Total Reviews</span>
                      </div>
                      <div className="lp-qs-right">
                        <span className="lp-qs-val">98</span>
                        <span className="lp-qs-badge pos">+8%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lp-watermark">
                  LocalPro v1.0
                </div>

              </div>

            </div>
          </>
        )}

        {/* TAB 2: BOOKINGS LIST & STAGE MANAGEMENT */}
        {activeTab === 'bookings' && (
          <div className="lp-subview-card fade-in">
            <div className="lp-subview-header">
              <div>
                <h3 className="lp-subview-title">Bookings & Service Jobs ({jobs.length})</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0' }}>Manage all dispatched service requests, advance stages, and generate invoices.</p>
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['all', 'pending', 'accepted', 'in_progress', 'completed', 'declined'].map(st => (
                  <button
                    key={st}
                    type="button"
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: 6,
                      border: '1.5px solid #111111',
                      background: bookingFilter === st ? '#111111' : '#FFFFFF',
                      color: bookingFilter === st ? '#D2FE00' : '#111111',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                    onClick={() => setBookingFilter(st)}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #111111', color: '#666' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Booking ID</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Customer</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Service Description</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Schedule</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Stage / Status</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Price</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                        No bookings found in database. New customer bookings will appear here in real time.
                      </td>
                    </tr>
                  ) : (
                    jobs
                      .filter(j => bookingFilter === 'all' || j.status === bookingFilter || j.serviceStage === bookingFilter)
                      .map(job => (
                        <tr key={job._id} style={{ borderBottom: '1px solid #EAEAE4' }}>
                          <td style={{ padding: '0.85rem 0.5rem', fontWeight: 800 }}>
                            {job.orderId || `#${job._id.slice(-6).toUpperCase()}`}
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem' }}>
                            <div style={{ fontWeight: 700 }}>{job.customerId?.name || 'Customer'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#666' }}>{job.customerId?.phone || job.serviceAddress}</div>
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem' }}>{job.description}</td>
                          <td style={{ padding: '0.85rem 0.5rem' }}>
                            <div>{job.date}</div>
                            <div style={{ fontSize: '0.72rem', color: '#888' }}>{job.timePreference}</div>
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem' }}>
                            <span className={`lp-status-pill ${job.serviceStage || job.status}`}>
                              {(job.serviceStage || job.status).replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', fontWeight: 800 }}>₹{job.finalPrice || 500}</td>
                          <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                              {job.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    style={{ background: '#111111', color: '#D2FE00', border: 'none', borderRadius: 4, padding: '0.35rem 0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                    onClick={() => updateJobStatus(job._id, 'accepted')}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 4, padding: '0.35rem 0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                    onClick={() => updateJobStatus(job._id, 'declined')}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}

                              {job.status === 'accepted' && job.serviceStage !== 'completed' && (
                                <button
                                  type="button"
                                  style={{ background: '#111111', color: '#FFFFFF', border: 'none', borderRadius: 4, padding: '0.35rem 0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                  onClick={() => setActiveTrackerBooking(job)}
                                >
                                  Track Live
                                </button>
                              )}

                              <button
                                type="button"
                                style={{ background: '#EAEAE4', color: '#111111', border: 'none', borderRadius: 4, padding: '0.35rem 0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                onClick={() => setSelectedJobDetail(job)}
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MY SERVICES */}
        {activeTab === 'services' && (
          <div className="lp-subview-card fade-in">
            <div className="lp-subview-header">
              <div>
                <h3 className="lp-subview-title">My Service Offerings</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0' }}>Configure trades, hourly labor rates, and emergency service availability.</p>
              </div>
            </div>

            <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: '#FAF9F6', border: '1.5px solid #DCDBCF', borderRadius: 8, padding: '1.25rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.35rem' }}>
                  {formData.category || 'Electrician'} Services
                </div>
                <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '1rem' }}>
                  Base price starts from ₹{formData.hourlyRate || 350}/hr in {formData.location || 'Chandigarh'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Base Hourly Rate (₹)</label>
                    <input 
                      type="number" 
                      value={formData.hourlyRate}
                      onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 6, border: '2px solid #111', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Experience (Years)</label>
                    <input 
                      type="number" 
                      value={formData.experienceYears}
                      onChange={e => setFormData({ ...formData, experienceYears: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 6, border: '2px solid #111', fontWeight: 700 }}
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleSaveProfile}
                  style={{ marginTop: '1.25rem', background: '#111111', color: '#FFFFFF', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
                >
                  Save Service Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE & VERIFICATION */}
        {activeTab === 'profile' && (
          <div className="lp-subview-card fade-in">
            <div className="lp-subview-header">
              <div>
                <h3 className="lp-subview-title">Provider Profile & UIDAI Verification</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0' }}>Update contact information, portfolio photos, and verify government identity.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>Profile Completeness: {profileStatus.progress}%</span>
                <span style={{ width: '60px', height: '8px', background: '#EAEAE4', borderRadius: 4, overflow: 'hidden', display: 'inline-block' }}>
                  <span style={{ display: 'block', width: `${profileStatus.progress}%`, height: '100%', background: '#10B981' }}></span>
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '2px solid #111', fontWeight: 600, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Phone Number *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '2px solid #111', fontWeight: 600, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Operating City *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.city} 
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '2px solid #111', fontWeight: 600, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Service Category</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '2px solid #111', fontWeight: 600, boxSizing: 'border-box' }}
                  >
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Painter">Painter</option>
                    <option value="AC Repair">AC Repair</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Pest Control">Pest Control</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Bio / Description</label>
                <textarea 
                  rows="3" 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your trade expertise, certifications, and service guarantee..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '2px solid #111', fontWeight: 500, boxSizing: 'border-box' }}
                />
              </div>

              {/* Portfolio Presets */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Work Portfolio Images</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  {SAMPLE_PORTFOLIO_PRESETS.map((preset, pIdx) => {
                    const isAdded = formData.portfolioImages.includes(preset.url);
                    return (
                      <div 
                        key={pIdx} 
                        style={{ border: isAdded ? '2.5px solid #111' : '1.5px solid #CBD5E1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#FFF' }}
                        onClick={() => {
                          if (isAdded) {
                            setFormData({ ...formData, portfolioImages: formData.portfolioImages.filter(img => img !== preset.url) });
                          } else {
                            setFormData({ ...formData, portfolioImages: [...formData.portfolioImages, preset.url] });
                          }
                        }}
                      >
                        <img src={preset.url} alt={preset.label} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                        <div style={{ padding: '0.4rem', fontSize: '0.68rem', fontWeight: 700, color: isAdded ? '#111' : '#666' }}>
                          {isAdded ? '✔ Added' : '+ Add Photo'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Verification Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                {/* Phone verification */}
                <div style={{ border: '1.5px solid #DCDBCF', borderRadius: 8, padding: '1rem', background: user?.phoneVerified ? '#DCFCE7' : '#FAF9F6' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={16} /> Mobile Verification
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '4px' }}>
                    {user?.phoneVerified ? '✔ Verified Phone Number' : 'Verify your phone via OTP to receive live job dispatch alerts.'}
                  </div>
                  {!user?.phoneVerified && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {!phoneOtpSent ? (
                        <button type="button" onClick={handleSendPhoneOtp} style={{ background: '#111', color: '#FFF', border: 'none', padding: '0.5rem 1rem', borderRadius: 4, fontWeight: 800, fontSize: '0.75rem' }}>
                          Send SMS OTP
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="text" placeholder="6-digit OTP" value={phoneOtp} onChange={e => setPhoneOtp(e.target.value)} style={{ width: '100px', padding: '0.4rem', border: '1.5px solid #111', borderRadius: 4 }} />
                          <button type="button" onClick={handleVerifyPhoneOtp} style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 4, fontWeight: 800, fontSize: '0.75rem' }}>
                            Verify
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Aadhaar UIDAI verification */}
                <div style={{ border: '1.5px solid #DCDBCF', borderRadius: 8, padding: '1rem', background: user?.providerDetails?.aadhaarVerified ? '#DCFCE7' : '#FAF9F6' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={16} /> Aadhaar Government Verification
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '4px' }}>
                    {user?.providerDetails?.aadhaarVerified ? '✔ UIDAI Verified Partner' : 'Instant UIDAI Aadhaar verification to receive trusted badge.'}
                  </div>
                  {!user?.providerDetails?.aadhaarVerified && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {aadhaarStep === 'input' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="text" maxLength={12} placeholder="12-digit Aadhaar" value={aadhaarInput} onChange={e => setAadhaarInput(e.target.value)} style={{ width: '130px', padding: '0.4rem', border: '1.5px solid #111', borderRadius: 4 }} />
                          <button type="button" onClick={handleSendAadhaarOtp} style={{ background: '#111', color: '#FFF', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 4, fontWeight: 800, fontSize: '0.75rem' }}>
                            Get OTP
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="text" placeholder="6-digit UIDAI OTP" value={aadhaarOtp} onChange={e => setAadhaarOtp(e.target.value)} style={{ width: '120px', padding: '0.4rem', border: '1.5px solid #111', borderRadius: 4 }} />
                          <button type="button" onClick={handleVerifyAadhaarOtp} style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 4, fontWeight: 800, fontSize: '0.75rem' }}>
                            Verify
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button type="submit" style={{ background: '#111111', color: '#FFFFFF', border: 'none', padding: '0.85rem 2rem', borderRadius: 6, fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer' }}>
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: EARNINGS & PAYOUTS */}
        {activeTab === 'earnings' && (
          <div className="lp-subview-card fade-in">
            <div className="lp-subview-header">
              <div>
                <h3 className="lp-subview-title">Earnings & Payout Dashboard</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0' }}>Track net earnings, platform commission deductions, and configure bank UPI transfer.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#111111', color: '#FFFFFF', padding: '1.25rem', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 800, textTransform: 'uppercase' }}>Gross Volume</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#D2FE00', marginTop: '4px' }}>₹{totalEarnings.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ background: '#FAF9F6', border: '1.5px solid #DCDBCF', padding: '1.25rem', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>Platform Fee (15%)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#111', marginTop: '4px' }}>₹{(totalEarnings * 0.15).toFixed(0)}</div>
              </div>
              <div style={{ background: '#DCFCE7', border: '1.5px solid #86EFAC', padding: '1.25rem', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: 800, textTransform: 'uppercase' }}>Net Disbursable</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803D', marginTop: '4px' }}>₹{(totalEarnings * 0.85).toFixed(0)}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="lp-subview-card fade-in">
            <div className="lp-subview-header">
              <div>
                <h3 className="lp-subview-title">Customer Feedback & Ratings</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0' }}>Verified customer ratings submitted after completed doorstep jobs.</p>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#F59E0B' }}>
                {user?.providerDetails?.rating || 4.8} ★
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ border: '1.5px solid #EAEAE4', padding: '1rem', borderRadius: 8, background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800 }}>Neha Verma</span>
                  <span style={{ color: '#F59E0B', fontWeight: 800 }}>★★★★★</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#444', margin: '6px 0' }}>"Very professional and on time. Highly recommended for electrical repair!"</p>
                <span style={{ fontSize: '0.72rem', color: '#888' }}>Apr 24, 2025</span>
              </div>
              <div style={{ border: '1.5px solid #EAEAE4', padding: '1rem', borderRadius: 8, background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800 }}>Rahul Mehta</span>
                  <span style={{ color: '#F59E0B', fontWeight: 800 }}>★★★★☆</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#444', margin: '6px 0' }}>"Good work, fixed the switchboard without hassle."</p>
                <span style={{ fontSize: '0.72rem', color: '#888' }}>Apr 22, 2025</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: AVAILABILITY SCHEDULER */}
        {activeTab === 'availability' && (
          <div className="lp-subview-card fade-in">
            <div className="lp-subview-header">
              <div>
                <h3 className="lp-subview-title">Work Hours & Weekly Shift Schedule</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0' }}>Set your active booking window and instant dispatch availability.</p>
              </div>
            </div>

            <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#FAF9F6', borderRadius: 8, border: '1.5px solid #DCDBCF' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>Instant Dispatch Mode</div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>Receive immediate emergency job requests</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={instantAvailable} 
                  onChange={e => setInstantAvailable(e.target.checked)} 
                  style={{ width: '20px', height: '20px', accentColor: '#111' }} 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Active Working Days</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Object.keys(workingDays).map(day => (
                    <button
                      key={day}
                      type="button"
                      style={{
                        padding: '0.5rem 0.85rem',
                        borderRadius: 6,
                        border: '2px solid #111',
                        background: workingDays[day] ? '#D2FE00' : '#FFF',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => setWorkingDays({ ...workingDays, [day]: !workingDays[day] })}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Shift Start</label>
                  <input type="time" value={shiftHours.start} onChange={e => setShiftHours({ ...shiftHours, start: e.target.value })} style={{ width: '100%', padding: '0.65rem', borderRadius: 6, border: '2px solid #111', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Shift End</label>
                  <input type="time" value={shiftHours.end} onChange={e => setShiftHours({ ...shiftHours, end: e.target.value })} style={{ width: '100%', padding: '0.65rem', borderRadius: 6, border: '2px solid #111', fontWeight: 700 }} />
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => alert('Availability schedule saved!')} 
                style={{ background: '#111', color: '#FFF', padding: '0.75rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer', border: 'none', marginTop: '0.5rem' }}
              >
                Save Schedule
              </button>
            </div>
          </div>
        )}

        {/* TAB 8: MESSAGES */}
        {activeTab === 'messages' && (
          <div className="lp-subview-card fade-in">
            <div className="lp-subview-header">
              <div>
                <h3 className="lp-subview-title">Customer Messages & Chat</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0' }}>Real-time coordination and chat with customers who booked services.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {jobs.filter(j => j.customerId).slice(0, 4).map((j, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1.5px solid #EAEAE4', borderRadius: 8, background: '#FFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#111', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      {j.customerId?.name ? j.customerId.name[0] : 'C'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800 }}>{j.customerId?.name || 'Customer'}</div>
                      <div style={{ fontSize: '0.78rem', color: '#666' }}>{j.description} • {j.serviceAddress}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setActiveChat(j)}
                      style={{ background: '#111', color: '#FFF', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Open Chat
                    </button>
                    {j.customerId?.phone && (
                      <button 
                        type="button" 
                        onClick={() => openWhatsAppChat(j.customerId.phone, formatWhatsAppBookingMessage(j))}
                        style={{ background: '#25D366', color: '#FFF', border: 'none', padding: '0.5rem 0.75rem', borderRadius: 6, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: SUPPORT */}
        {activeTab === 'support' && (
          <div className="lp-subview-card fade-in">
            <div className="lp-subview-header">
              <div>
                <h3 className="lp-subview-title">Provider Support & Help Desk</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0' }}>24/7 dedicated partner assistance, dispute resolution, and platform guidance.</p>
              </div>
            </div>

            <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ border: '1.5px solid #DCDBCF', borderRadius: 8, padding: '1.25rem', background: '#FAF9F6' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>📞 Priority Partner Hotline</div>
                <div style={{ fontSize: '0.85rem', color: '#555' }}>Call our dedicated service partner manager directly:</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#111', marginTop: '4px' }}>+91 1800-419-FIXR</div>
              </div>

              <div style={{ border: '1.5px solid #DCDBCF', borderRadius: 8, padding: '1.25rem', background: '#FAF9F6' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>✉️ Partner Escalations</div>
                <div style={{ fontSize: '0.85rem', color: '#555' }}>Send tickets for payment discrepancies, cancellations, or dispute reviews:</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>partners@localfixr.com</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════
         3. MODALS & SLIDEOUT DRAWERS
      ═══════════════════════════════════════════════════════════════ */}
      {/* Booking View Detail Modal */}
      {selectedJobDetail && (
        <div className="admin-modal-overlay fade-in" onClick={() => setSelectedJobDetail(null)}>
          <div className="admin-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                Booking #{selectedJobDetail.orderId || selectedJobDetail._id}
              </h3>
              <button className="admin-loc-close-btn" onClick={() => setSelectedJobDetail(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F4F0', padding: '0.75rem', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{selectedJobDetail.customerId?.name || 'Customer'}</div>
                  <div style={{ fontSize: '0.78rem', color: '#666' }}>{selectedJobDetail.customerId?.phone || 'No phone provided'}</div>
                </div>
                <span className={`lp-status-pill ${selectedJobDetail.status?.toLowerCase()}`}>
                  {selectedJobDetail.status}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>Service Request</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '2px' }}>{selectedJobDetail.description}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>Service Location / Address</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginTop: '2px' }}>{selectedJobDetail.serviceAddress || 'Customer Location'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>Scheduled Time</div>
                  <div style={{ fontWeight: 700 }}>{selectedJobDetail.date} ({selectedJobDetail.timePreference || 'Anytime'})</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>Service Value</div>
                  <div style={{ fontWeight: 900, color: '#16A34A', fontSize: '1.1rem' }}>₹{selectedJobDetail.finalPrice || 500}</div>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem', borderTop: '1px solid #EEE', paddingTop: '1rem' }}>
                {selectedJobDetail.status === 'pending' && (
                  <>
                    <button 
                      type="button" 
                      style={{ background: '#111', color: '#D2FE00', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
                      onClick={() => updateJobStatus(selectedJobDetail._id, 'accepted')}
                    >
                      Accept Booking
                    </button>
                    <button 
                      type="button" 
                      style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
                      onClick={() => updateJobStatus(selectedJobDetail._id, 'declined')}
                    >
                      Decline
                    </button>
                  </>
                )}

                {selectedJobDetail.status === 'accepted' && (
                  <>
                    <button 
                      type="button" 
                      style={{ background: '#2563EB', color: '#FFF', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedJobDetail(null);
                        setActiveTrackerBooking(selectedJobDetail);
                      }}
                    >
                      Open Live GPS Tracker
                    </button>
                    <button 
                      type="button" 
                      style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
                      onClick={() => advanceJobStage(selectedJobDetail._id, 'completed')}
                    >
                      Mark Completed
                    </button>
                  </>
                )}

                {selectedJobDetail.customerId?.phone && (
                  <button 
                    type="button" 
                    style={{ background: '#25D366', color: '#FFF', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
                    onClick={() => openWhatsAppChat(selectedJobDetail.customerId.phone, formatWhatsAppBookingMessage(selectedJobDetail))}
                  >
                    WhatsApp Customer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live GPS Tracker Modal */}
      {activeTrackerBooking && (
        <ServiceTrackerModal
          booking={activeTrackerBooking}
          userRole="provider"
          onClose={() => setActiveTrackerBooking(null)}
          onAdvanceStage={(stage) => advanceJobStage(activeTrackerBooking._id, stage)}
          onUpdateStatus={(status) => updateJobStatus(activeTrackerBooking._id, status)}
        />
      )}

      {/* Chat Modal */}
      {activeChat && (
        <ChatModal
          bookingId={activeChat._id}
          receiverId={activeChat.customerId?._id || activeChat.customerId}
          receiverName={activeChat.customerId?.name || 'Customer'}
          onClose={() => setActiveChat(null)}
        />
      )}

      {/* Invoice Modal */}
      {activeInvoiceBooking && (
        <InvoiceModal
          booking={activeInvoiceBooking}
          onClose={() => setActiveInvoiceBooking(null)}
        />
      )}
    </div>
  );
};

export default ProviderDashboard;
