import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, Star, IndianRupee, Bell, CheckCircle2, ChevronRight,
  Briefcase, User as UserIcon, Wallet, MessageSquare, Headphones, 
  MapPin, Check, X, AlertCircle, Eye, Wrench, Plus, Upload, Trash2, 
  Lock, ArrowRight, ShieldCheck, Zap, Scissors, Paintbrush, Snowflake,
  Edit2, ExternalLink, Navigation, Phone, Shield, QrCode
} from 'lucide-react';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';
import { categories } from '../data/mockData';
import ChatModal from '../components/ChatModal';
import ServiceTrackerModal from '../components/ServiceTrackerModal';
import InvoiceModal from '../components/InvoiceModal';
import ConfirmFinalBillModal from '../components/ConfirmFinalBillModal';
import NotificationCenter from '../components/NotificationCenter';
import ProviderCollectPaymentModal from '../components/ProviderCollectPaymentModal';
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

// Curated avatar presets for service partners
const SAMPLE_AVATAR_PRESETS = [
  { label: 'Technician 1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80' },
  { label: 'Technician 2', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80' },
  { label: 'Technician 3', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
  { label: 'Technician 4', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80' }
];

// Helper to validate complete provider profile
const checkProviderProfile = (user) => {
  const p = user?.providerDetails || {};
  const addr = user?.addressDetails || {};
  
  const checks = [
    { key: 'avatarUrl', label: 'Profile Photo', valid: !!(p.avatarUrl && p.avatarUrl.trim().length > 0), value: p.avatarUrl ? 'Uploaded' : null },
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
  const [confirmBillBooking, setConfirmBillBooking] = useState(null);
  const [isAdjustingBill, setIsAdjustingBill] = useState(false);
  const [collectPaymentBooking, setCollectPaymentBooking] = useState(null);
  const [reviews, setReviews] = useState([]);

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
    avatarUrl: '',
    portfolioImages: []
  });

  // Acceptance blocked modal state
  const [acceptBlockedModal, setAcceptBlockedModal] = useState({ isOpen: false, missing: [] });

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
      avatarUrl: user.providerDetails?.avatarUrl || '',
      portfolioImages: user.providerDetails?.portfolioImages || []
    });
    setPhoneInput(user.phone || '');

    fetchJobs();

    // Socket.IO real-time listener for provider updates & payment confirmations
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    const providerId = user.id || user._id;
    if (providerId) {
      socket.emit('join_user_room', providerId);
    }

    socket.on('payment_completed', (data) => {
      fetchJobs();
      if (data?.bookingId) {
        setSelectedJobDetail(prev => prev?._id === data.bookingId ? { ...prev, paymentStatus: 'paid', status: 'completed', serviceStage: 'paid', paidAt: new Date() } : prev);
        setCollectPaymentBooking(prev => prev?._id === data.bookingId ? null : prev);
      }
    });

    socket.on('booking_updated', () => fetchJobs());
    socket.on('new_booking_request', () => fetchJobs());

    return () => {
      socket.disconnect();
    };
  }, [user, token, navigate]);

  // Handle avatar image file upload (converts to base64 Data URL)
  const handleAvatarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB. Please choose a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormData(prev => ({ ...prev, avatarUrl: uploadEvent.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Update Booking Status
  const updateJobStatus = async (id, status, extraData = {}) => {
    // Gate: Providers cannot accept jobs without Profile Photo and Payout UPI ID
    if (status === 'accepted') {
      const p = user?.providerDetails || {};
      const hasAvatar = !!(p.avatarUrl && p.avatarUrl.trim().length > 0);
      const hasUpi = !!(p.upiId && p.upiId.trim().length > 0);

      if (!hasAvatar || !hasUpi) {
        const missing = [];
        if (!hasAvatar) missing.push('Profile Picture');
        if (!hasUpi) missing.push('Payout UPI ID');

        setAcceptBlockedModal({
          isOpen: true,
          missing
        });
        return;
      }
    }

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

  // Confirm or adjust final bill with extra expenses
  const handleConfirmFinalBill = async ({ serviceAmount, extraExpenses, extraExpenseReason, finalPrice }) => {
    if (!confirmBillBooking) return;
    const id = confirmBillBooking._id;
    try {
      const endpoint = isAdjustingBill 
        ? `${API_URL}/bookings/${id}/final-bill` 
        : `${API_URL}/bookings/${id}/stage`;

      const payload = isAdjustingBill 
        ? { serviceAmount, extraExpenses, extraExpenseReason, finalPrice }
        : {
            stage: 'completed',
            serviceAmount,
            extraExpenses,
            extraExpenseReason,
            finalPrice,
            note: `Service completed. Final bill confirmed: ₹${finalPrice}`
          };

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(updated.message || 'Failed to confirm final bill');

      setJobs(prev => prev.map(j => j._id === updated._id ? updated : j));
      if (selectedJobDetail && selectedJobDetail._id === id) {
        setSelectedJobDetail(updated);
      }
      if (activeTrackerBooking && activeTrackerBooking._id === id) {
        setActiveTrackerBooking(updated);
      }
      setConfirmBillBooking(null);
    } catch (err) {
      console.error('Final bill confirmation error:', err);
      alert(err.message || 'Failed to confirm final bill');
      throw err;
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
          avatarUrl: formData.avatarUrl,
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
    return completedJobs.reduce((sum, j) => sum + (Number(j.finalPrice) || Number(j.paidAmount) || 0), 0);
  }, [completedJobs]);

  // Display upcoming bookings list from real database bookings
  const displayUpcomingBookings = useMemo(() => {
    return jobs.slice(0, 5).map(j => ({
      id: j.orderId || `#LP${j._id.slice(-4).toUpperCase()}`,
      _id: j._id,
      rawJob: j,
      customerName: j.customerId?.name || 'Customer',
      customerAvatar: j.customerId?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      serviceName: j.description || j.serviceCategory || user?.providerDetails?.category || 'Service Request',
      category: user?.providerDetails?.category || 'Service',
      location: j.serviceAddress || j.customerId?.city || user?.providerDetails?.location || 'Local Area',
      dateTime: j.date ? `${j.date} ${j.timePreference || ''}` : 'Schedule Pending',
      price: Number(j.finalPrice) || 0,
      status: j.status === 'pending' ? 'PENDING' : j.serviceStage === 'in_progress' ? 'IN PROGRESS' : (j.status ? j.status.toUpperCase() : 'PENDING'),
      statusKey: j.status === 'pending' ? 'pending' : j.serviceStage === 'in_progress' ? 'in_progress' : (j.status ? j.status.toLowerCase() : 'pending')
    }));
  }, [jobs, user]);

  // Real today's jobs for Today's Schedule timeline
  const todayJobs = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return jobs.filter(j => {
      if (!j.date) return false;
      return j.date === todayStr || j.date.startsWith(todayStr);
    });
  }, [jobs]);

  // Weekly earnings breakdown for the bar chart
  const weeklyBars = useMemo(() => {
    const weeks = [0, 0, 0, 0];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    completedJobs.forEach(j => {
      const d = new Date(j.date || j.createdAt || now);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate();
        const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
        weeks[weekIdx] += (Number(j.finalPrice) || Number(j.paidAmount) || 0);
      }
    });
    const max = Math.max(...weeks, 1);
    return weeks.map(w => ({
      amount: w,
      heightPct: totalEarnings > 0 ? Math.max(12, Math.round((w / max) * 100)) : 8
    }));
  }, [completedJobs, totalEarnings]);

  const isVerified = Boolean(user?.phoneVerified || user?.providerDetails?.aadhaarVerified);

  return (
    <div className="lp-provider-portal">
      {/* ═══════════════════════════════════════════════════════════════
         1. LEFT SIDEBAR (Pitch Black #141414)
      ═══════════════════════════════════════════════════════════════ */}
      <aside className="lp-sidebar">
        <div>
          <div className="lp-sidebar-brand">
            <h1 className="lp-brand-title">Localfixr</h1>
            <div className="lp-brand-sub">PROVIDERS PORTAL</div>
          </div>

          <nav className="lp-nav-list">
            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              {activeTab === 'dashboard' && <span className="lp-nav-active-pill"></span>}
              <Calendar size={16} />
              <span>Dashboard</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookings')}
            >
              {activeTab === 'bookings' && <span className="lp-nav-active-pill"></span>}
              <Calendar size={16} />
              <span>Bookings</span>
              {pendingJobs.length > 0 && <span className="lp-nav-badge">{pendingJobs.length}</span>}
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              {activeTab === 'services' && <span className="lp-nav-active-pill"></span>}
              <Wrench size={16} />
              <span>My Services</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              {activeTab === 'profile' && <span className="lp-nav-active-pill"></span>}
              <UserIcon size={16} />
              <span>Profile</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'earnings' ? 'active' : ''}`}
              onClick={() => setActiveTab('earnings')}
            >
              {activeTab === 'earnings' && <span className="lp-nav-active-pill"></span>}
              <Wallet size={16} />
              <span>Earnings</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              {activeTab === 'reviews' && <span className="lp-nav-active-pill"></span>}
              <Star size={16} />
              <span>Reviews</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'availability' ? 'active' : ''}`}
              onClick={() => setActiveTab('availability')}
            >
              {activeTab === 'availability' && <span className="lp-nav-active-pill"></span>}
              <Clock size={16} />
              <span>Availability</span>
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              {activeTab === 'messages' && <span className="lp-nav-active-pill"></span>}
              <MessageSquare size={16} />
              <span>Messages</span>
              {jobs.filter(j => j.customerId).length > 0 && <span className="lp-nav-badge">{jobs.filter(j => j.customerId).length}</span>}
            </button>

            <button 
              type="button"
              className={`lp-nav-item ${activeTab === 'support' ? 'active' : ''}`}
              onClick={() => setActiveTab('support')}
            >
              {activeTab === 'support' && <span className="lp-nav-active-pill"></span>}
              <Headphones size={16} />
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
            <ArrowRight size={14} />
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
            <NotificationCenter />

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

        {/* Security & Verification Gate Status Banner */}
        {user?.providerDetails?.status !== 'Verified' ? (
          <div style={{ background: '#FEF3C7', border: '1.5px solid #F59E0B', borderRadius: 8, padding: '0.85rem 1.25rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={22} color="#B45309" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#92400E' }}>
                  Profile Awaiting Admin Confirmation &amp; ID Card Issuance
                </div>
                <div style={{ fontSize: '0.74rem', color: '#B45309', marginTop: '2px', lineHeight: 1.35 }}>
                  Your profile details (Aadhaar KYC, contact number, work portfolio) have been transmitted to the Admin Portal. To protect trust and security, your profile is <strong>not public for work</strong> until confirmed by the administrator. Upon approval, you will receive your welcome email and official ID card.
                </div>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setActiveTab('profile')} 
              style={{ background: '#111111', color: '#D2FE00', border: 'none', padding: '0.45rem 0.85rem', borderRadius: 6, fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Review Profile &amp; KYC
            </button>
          </div>
        ) : (
          <div style={{ background: '#DCFCE7', border: '1.5px solid #86EFAC', borderRadius: 8, padding: '0.65rem 1.25rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <ShieldCheck size={20} color="#15803D" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#15803D' }}>
                Verified Partner &bull; Active &amp; Public for Customer Orders
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, background: '#111111', color: '#D2FE00', padding: '2px 8px', borderRadius: 4, fontSize: '0.74rem' }}>
                {user?.providerDetails?.providerId || `LFX-PRV-${user?._id?.slice(-4).toUpperCase()}`}
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => setActiveTab('profile')} 
              style={{ background: '#15803D', color: '#FFFFFF', border: 'none', padding: '0.35rem 0.75rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
            >
              View Official ID Card &rarr;
            </button>
          </div>
        )}

        {/* TAB 1: EXECUTIVE DASHBOARD (Matches Mockup 100%) */}
        {activeTab === 'dashboard' && (
          <>
            {/* Top 4 Metric KPI Cards */}
            <div className="lp-kpi-grid">
              <div className="lp-kpi-card c-lime">
                <div className="lp-kpi-card-header">
                  <div className="lp-kpi-icon-wrap"><Calendar size={16} /></div>
                  <span className="lp-kpi-label">TODAY'S BOOKINGS</span>
                </div>
                <div className="lp-kpi-val">{todayJobs.length}</div>
                <div className="lp-kpi-sub green">{todayJobs.length > 0 ? `${todayJobs.length} scheduled today` : 'No bookings today'}</div>
              </div>

              <div className="lp-kpi-card c-orange">
                <div className="lp-kpi-card-header">
                  <div className="lp-kpi-icon-wrap"><Clock size={16} /></div>
                  <span className="lp-kpi-label">PENDING REQUESTS</span>
                </div>
                <div className="lp-kpi-val">{pendingJobs.length}</div>
                <div className="lp-kpi-sub orange">{pendingJobs.length > 0 ? 'Needs your action' : 'All caught up'}</div>
              </div>

              <div className="lp-kpi-card c-blue">
                <div className="lp-kpi-card-header">
                  <div className="lp-kpi-icon-wrap"><Star size={16} /></div>
                  <span className="lp-kpi-label">AVERAGE RATING</span>
                </div>
                <div className="lp-kpi-val">{user?.providerDetails?.rating ? Number(user.providerDetails.rating).toFixed(1) : (reviews.length > 0 ? (reviews.reduce((a, c) => a + (c.rating || 5), 0) / reviews.length).toFixed(1) : 'New')} ★</div>
                <div className="lp-kpi-sub">Based on {user?.providerDetails?.reviewsCount || reviews.length} reviews</div>
              </div>

              <div className="lp-kpi-card c-cyan">
                <div className="lp-kpi-card-header">
                  <div className="lp-kpi-icon-wrap"><IndianRupee size={16} /></div>
                  <span className="lp-kpi-label">TOTAL EARNINGS</span>
                </div>
                <div className="lp-kpi-val">₹{totalEarnings.toLocaleString('en-IN')}</div>
                <div className="lp-kpi-sub">{completedJobs.length} completed {completedJobs.length === 1 ? 'job' : 'jobs'}</div>
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
                    {displayUpcomingBookings.length === 0 ? (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#666' }}>
                        <Calendar size={28} style={{ color: '#999', margin: '0 auto 0.5rem', display: 'block' }} />
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#111' }}>No Upcoming Bookings</div>
                        <p style={{ fontSize: '0.72rem', margin: '4px 0 0', color: '#777' }}>
                          When customers request your services, new live bookings will appear here.
                        </p>
                      </div>
                    ) : (
                      displayUpcomingBookings.map((b, idx) => (
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
                              }}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))
                    )}
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
                    {reviews.length === 0 ? (
                      <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                        <Star size={24} style={{ color: '#CBD5E1', margin: '0 auto 0.4rem', display: 'block' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#111' }}>No customer reviews yet</div>
                        <div style={{ fontSize: '0.68rem', color: '#777', marginTop: '2px' }}>Verified customer ratings will appear here as you complete jobs.</div>
                      </div>
                    ) : (
                      reviews.slice(0, 3).map((r, idx) => (
                        <div key={r._id || idx} className="lp-rev-card">
                          <div>
                            <div className="lp-rev-user">
                              <img 
                                src={r.customer?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'} 
                                alt={r.customer?.name || 'Customer'} 
                                className="lp-rev-avatar" 
                              />
                              <div>
                                <div className="lp-rev-name">{r.customer?.name || 'Verified Customer'}</div>
                                <div className="lp-stars-row">
                                  {'★'.repeat(Math.min(5, Math.max(1, r.rating || 5)))}
                                  {'☆'.repeat(Math.max(0, 5 - (r.rating || 5)))}
                                </div>
                              </div>
                            </div>
                            <p className="lp-rev-comment">"{r.comment || 'Great service!'}"</p>
                          </div>
                          <span className="lp-rev-date">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                          </span>
                        </div>
                      ))
                    )}
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
                    {todayJobs.length === 0 ? (
                      <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center' }}>
                        <Clock size={24} style={{ color: '#999', margin: '0 auto 0.4rem', display: 'block' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#111' }}>No bookings scheduled today</div>
                        <div style={{ fontSize: '0.68rem', color: '#777', marginTop: '2px' }}>Your daily service schedule is clear.</div>
                      </div>
                    ) : (
                      todayJobs.slice(0, 5).map((j, idx) => (
                        <div key={j._id || idx} className="lp-timeline-item">
                          <span className="lp-timeline-time">{j.timePreference || '10:00 AM'}</span>
                          <span className={`lp-timeline-node ${j.status === 'accepted' ? 'green' : j.serviceStage === 'in_progress' ? 'blue' : 'amber'}`}></span>
                          <div className="lp-timeline-info">
                            <div className="lp-timeline-title">{j.customerId?.name || 'Customer'}</div>
                            <div className="lp-timeline-sub">{j.description || j.serviceCategory || 'Service Job'}</div>
                          </div>
                          <span className={`lp-status-pill ${j.serviceStage || j.status}`}>
                            {(j.serviceStage || j.status || 'PENDING').replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      ))
                    )}
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
                        <text x="120" y="69" fontSize="9" fontWeight="800" fill="#111111">{user?.addressDetails?.city || user?.providerDetails?.location || user?.city || "Chandigarh"}</text>
                        
                        {/* Real active booking markers */}
                        {activeJobs.map((_, i) => {
                          const pts = [{ cx: 85, cy: 50 }, { cx: 140, cy: 45 }, { cx: 130, cy: 85 }, { cx: 75, cy: 80 }];
                          const pt = pts[i % pts.length];
                          return <circle key={i} cx={pt.cx} cy={pt.cy} r="3" fill="#2563EB" />;
                        })}
                      </svg>
                    </div>

                    <div className="lp-radar-legend">
                      <div className="lp-legend-item">
                        <span className="lp-legend-dot loc"></span>
                        <span>Your Location ({user?.addressDetails?.city || user?.providerDetails?.location || user?.city || "Chandigarh"})</span>
                      </div>
                      <div className="lp-legend-item">
                        <span className="lp-legend-dot active"></span>
                        <span>{activeJobs.length} Active {activeJobs.length === 1 ? "Booking" : "Bookings"}</span>
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
                {isVerified ? (
                  <div className="lp-verified-banner">
                    <div className="lp-vb-check">
                      <Check size={16} strokeWidth={3} />
                    </div>
                    <div>
                      <div className="lp-vb-title">VERIFIED PROVIDER</div>
                      <div className="lp-vb-sub">{user?.phoneVerified && user?.providerDetails?.aadhaarVerified ? 'Phone & UIDAI Aadhaar Verified' : (user?.phoneVerified ? 'Phone OTP Verified' : 'Aadhaar Verified')}</div>
                    </div>
                  </div>
                ) : (
                  <div className="lp-verified-banner" style={{ background: '#FEF3C7', cursor: 'pointer' }} onClick={() => setActiveTab('profile')}>
                    <div className="lp-vb-check" style={{ background: '#B45309', color: '#FFF' }}>
                      <AlertCircle size={16} />
                    </div>
                    <div>
                      <div className="lp-vb-title" style={{ color: '#B45309' }}>GET VERIFIED</div>
                      <div className="lp-vb-sub" style={{ color: '#92400E' }}>Complete Phone or Aadhaar to build trust</div>
                    </div>
                  </div>
                )}

                {/* Earnings Overview Chart */}
                <div className="lp-card">
                  <div className="lp-card-header">
                    <h3 className="lp-card-title">EARNINGS OVERVIEW</h3>
                    <button type="button" className="lp-card-link" onClick={() => setActiveTab('earnings')}>
                      This Month →
                    </button>
                  </div>

                  <div className="lp-earnings-total">
                    <span>₹{totalEarnings.toLocaleString('en-IN')}</span>
                    {totalEarnings > 0 && <span className="lp-pill-pct">Active</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>
                    {completedJobs.length > 0 ? `From ${completedJobs.length} completed ${completedJobs.length === 1 ? 'service' : 'services'}` : 'No earnings recorded yet'}
                  </div>

                  {/* 4 weekly bar columns calculated from real completed jobs */}
                  <div className="lp-chart-bars-wrap">
                    {weeklyBars.map((bar, i) => (
                      <div key={i} className="lp-bar-col">
                        <div 
                          className={`lp-bar-fill ${i === 3 ? 'active' : ''}`} 
                          style={{ height: `${bar.heightPct}%` }}
                          title={`₹${bar.amount}`}
                        ></div>
                        <span className="lp-bar-label">W{i + 1}</span>
                      </div>
                    ))}
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
                        <span className="lp-qs-val">{jobs.length}</span>
                        {jobs.length > 0 && <span className="lp-qs-badge pos">Live</span>}
                      </div>
                    </div>

                    <div className="lp-qs-row">
                      <div className="lp-qs-left">
                        <CheckCircle2 size={15} />
                        <span>Completed Services</span>
                      </div>
                      <div className="lp-qs-right">
                        <span className="lp-qs-val">{completedJobs.length}</span>
                        {completedJobs.length > 0 && <span className="lp-qs-badge pos">{Math.round((completedJobs.length / (jobs.length || 1)) * 100)}%</span>}
                      </div>
                    </div>

                    <div className="lp-qs-row">
                      <div className="lp-qs-left">
                        <X size={15} />
                        <span>Cancelled / Declined</span>
                      </div>
                      <div className="lp-qs-right">
                        <span className="lp-qs-val">{jobs.filter(j => j.status === 'declined' || j.status === 'cancelled' || j.status === 'rejected').length}</span>
                      </div>
                    </div>

                    <div className="lp-qs-row">
                      <div className="lp-qs-left">
                        <Star size={15} />
                        <span>Customer Reviews</span>
                      </div>
                      <div className="lp-qs-right">
                        <span className="lp-qs-val">{user?.providerDetails?.reviewsCount || reviews.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lp-watermark">
                  Localfixr v1.0
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
                                <>
                                  <button
                                    type="button"
                                    style={{ background: '#111111', color: '#FFFFFF', border: 'none', borderRadius: 4, padding: '0.35rem 0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                    onClick={() => setActiveTrackerBooking(job)}
                                  >
                                    Track Live
                                  </button>
                                  <button
                                    type="button"
                                    style={{ background: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: 4, padding: '0.35rem 0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                    onClick={() => {
                                      setConfirmBillBooking(job);
                                      setIsAdjustingBill(false);
                                    }}
                                  >
                                    Complete &amp; Bill
                                  </button>
                                </>
                              )}

                              {(job.status === 'completed' || job.serviceStage === 'completed') && job.paymentStatus !== 'paid' && (
                                <>
                                  <button
                                    type="button"
                                    style={{ background: '#0F172A', color: '#D2FE00', border: 'none', borderRadius: 4, padding: '0.35rem 0.65rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    onClick={() => setCollectPaymentBooking(job)}
                                    title="Show QR Code to Customer"
                                  >
                                    <QrCode size={13} /> QR / Collect
                                  </button>
                                  <button
                                    type="button"
                                    style={{ background: '#FFFBEB', color: '#B45309', border: '1.5px solid #FDE68A', borderRadius: 4, padding: '0.35rem 0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                    onClick={() => {
                                      setConfirmBillBooking(job);
                                      setIsAdjustingBill(true);
                                    }}
                                    title="Adjust Bill or Add Extra Expenses"
                                  >
                                    ₹{job.finalPrice || '—'} ✏️
                                  </button>
                                </>
                              )}

                              {job.customerId && (
                                <button
                                  type="button"
                                  style={{ background: '#111111', color: '#D2FE00', border: 'none', borderRadius: 4, padding: '0.35rem 0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                  onClick={() => setActiveChat(job)}
                                  title="Chat with Customer"
                                >
                                  Chat
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
              {/* Profile Photo Upload Section */}
              <div style={{ border: '1.5px solid #111', borderRadius: 8, padding: '1.25rem', background: '#FAFAFA' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', display: 'block', marginBottom: '8px', color: '#111' }}>
                  Profile Picture * (Required to accept orders)
                </label>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={formData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'} 
                      alt="Profile preview" 
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #111', background: '#FFF' }}
                    />
                    {formData.avatarUrl && (
                      <span style={{ position: 'absolute', bottom: 0, right: 0, background: '#10B981', color: '#FFF', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                        ✔
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input 
                        type="file" 
                        id="provider-avatar-upload" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleAvatarFileUpload}
                      />
                      <label 
                        htmlFor="provider-avatar-upload" 
                        style={{ background: '#111', color: '#D2FE00', padding: '0.55rem 1rem', borderRadius: 6, fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Upload size={14} /> Choose Photo from Device
                      </label>
                      {formData.avatarUrl && (
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, avatarUrl: '' })}
                          style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', padding: '0.55rem 0.85rem', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        placeholder="Or paste an image URL (https://...)" 
                        value={formData.avatarUrl} 
                        onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
                        style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 6, border: '1.5px solid #CBD5E1', fontSize: '0.78rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#666', marginBottom: '4px' }}>
                        Or choose from curated professional presets:
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {SAMPLE_AVATAR_PRESETS.map((av, idx) => (
                          <img 
                            key={idx} 
                            src={av.url} 
                            alt={av.label} 
                            title={av.label} 
                            onClick={() => setFormData({ ...formData, avatarUrl: av.url })}
                            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: formData.avatarUrl === av.url ? '2.5px solid #111' : '1.5px solid #CBD5E1' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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

              {/* Payout UPI ID (Crucial for receiving payouts and accepting orders) */}
              <div style={{ border: '1.5px solid #111', borderRadius: 8, padding: '1rem', background: '#F8FAFC' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px', color: '#111' }}>
                  Payout UPI ID * (Required to accept service requests)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. mobile@upi, name@okhdfcbank, or 9876543210@paytm" 
                    value={formData.upiId} 
                    onChange={e => setFormData({ ...formData, upiId: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '2px solid #111', fontWeight: 600, boxSizing: 'border-box' }}
                  />
                </div>
                <p style={{ fontSize: '0.72rem', color: '#666', margin: '4px 0 0' }}>
                  Customer payments are deposited directly into this UPI ID upon job completion. You cannot accept orders without this.
                </p>
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

            {/* Official Localfixr Digital Partner ID Card Section */}
            <div style={{ marginTop: '2rem', borderTop: '2px solid #EAEAE4', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#111111' }}>
                    🪪 Official Localfixr Partner Identity Card
                  </h4>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#666666' }}>
                    {user?.providerDetails?.status === 'Verified'
                      ? 'Your certified digital identity credential issued and verified by Localfixr Administration.'
                      : 'Pending final admin verification. Your official credential will become active upon approval.'}
                  </p>
                </div>

                {user?.providerDetails?.status === 'Verified' && (
                  <button 
                    type="button" 
                    onClick={() => window.print()}
                    style={{ background: '#111111', color: '#D2FE00', border: 'none', padding: '0.55rem 1.1rem', borderRadius: 6, fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    Print / Save ID Card
                  </button>
                )}
              </div>

              {/* ID Card Graphic Container */}
              <div style={{ maxWidth: '440px', background: '#FFFFFF', border: '2px solid #141414', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', opacity: user?.providerDetails?.status === 'Verified' ? 1 : 0.85 }}>
                {/* ID Card Top Bar */}
                <div style={{ background: '#141414', padding: '12px 18px', borderBottom: '3.5px solid #D2FE00', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.03em' }}>Localfixr</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#141414', background: '#D2FE00', padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {user?.providerDetails?.status === 'Verified' ? 'CERTIFIED PARTNER' : 'PENDING REVIEW'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#D2FE00', fontFamily: 'monospace' }}>
                    {user?.providerDetails?.providerId || (user?.providerDetails?.status === 'Verified' ? `LFX-PRV-${user?._id?.slice(-4).toUpperCase()}` : 'LFX-PRV-PENDING')}
                  </div>
                </div>

                {/* ID Card Content */}
                <div style={{ padding: '18px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <img 
                    src={user?.providerDetails?.avatarUrl || user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
                    alt={user?.name} 
                    style={{ width: 88, height: 88, borderRadius: 8, objectFit: 'cover', border: '2.5px solid #141414', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#111111', lineHeight: 1.15, textTransform: 'uppercase' }}>
                      {user?.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', marginTop: '3px' }}>
                      {user?.providerDetails?.category || 'Professional Technician'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#444444', marginTop: '6px' }}>
                      <strong>Provider ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#111111' }}>{user?.providerDetails?.providerId || (user?.providerDetails?.status === 'Verified' ? `LFX-PRV-${user?._id?.slice(-4).toUpperCase()}` : 'Pending Approval')}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#444444', marginTop: '2px' }}>
                      <strong>Operating Area:</strong> {user?.addressDetails?.city || user?.providerDetails?.location || user?.city || 'Local Area'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#444444', marginTop: '2px' }}>
                      <strong>Contact:</strong> {user?.phone || 'Verified on Record'}
                    </div>
                  </div>
                </div>

                {/* ID Card Security Seal */}
                <div style={{ padding: '10px 18px', background: '#FAF9F6', borderTop: '1px dashed #CBD5E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: user?.providerDetails?.status === 'Verified' ? '#047857' : '#B45309', background: user?.providerDetails?.status === 'Verified' ? '#DCFCE7' : '#FEF3C7', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                    {user?.providerDetails?.status === 'Verified' ? '✓ UIDAI Aadhaar & Phone KYC Verified' : '⏳ Awaiting Admin Approval'}
                  </span>
                  <span style={{ fontSize: '0.64rem', color: '#888888', fontWeight: 700 }}>
                    Issued: {user?.providerDetails?.idCardIssueDate ? new Date(user.providerDetails.idCardIssueDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
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

            {/* Payout Disbursement Account Card */}
            <div style={{ background: '#FFF', border: '1.5px solid #EAEAE4', borderRadius: 8, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Payout UPI Disbursement Account
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#111', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span>{user?.providerDetails?.upiId || 'Not Configured Yet'}</span>
                    {user?.providerDetails?.upiId ? (
                      <span style={{ fontSize: '0.72rem', background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>✔ Active</span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>⚠ Mandatory for Order Acceptance</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#666', margin: '4px 0 0' }}>
                    Your net earnings from completed jobs are disbursed directly to this UPI address.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  style={{ background: '#111', color: '#D2FE00', border: 'none', padding: '0.6rem 1.15rem', borderRadius: 6, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {user?.providerDetails?.upiId ? 'Update UPI ID' : 'Configure UPI ID Now →'}
                </button>
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
              {reviews.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#888' }}>
                  <Star size={36} style={{ color: '#CBD5E1', margin: '0 auto 0.75rem', display: 'block' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111' }}>No Customer Reviews Yet</div>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                    When customers complete and rate your bookings, their feedback and ratings will appear here.
                  </p>
                </div>
              ) : (
                reviews.map((r, idx) => (
                  <div key={r._id || idx} style={{ border: '1.5px solid #EAEAE4', padding: '1rem', borderRadius: 8, background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800 }}>{r.customer?.name || 'Verified Customer'}</span>
                      <span style={{ color: '#F59E0B', fontWeight: 800 }}>
                        {'★'.repeat(Math.min(5, Math.max(1, r.rating || 5)))}
                        {'☆'.repeat(Math.max(0, 5 - (r.rating || 5)))}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#444', margin: '6px 0' }}>"{r.comment || 'Great service!'}"</p>
                    <span style={{ fontSize: '0.72rem', color: '#888' }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </span>
                  </div>
                ))
              )}
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
              {jobs.filter(j => j.customerId).length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#888' }}>
                  <MessageSquare size={36} style={{ color: '#CBD5E1', margin: '0 auto 0.75rem', display: 'block' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111' }}>No Customer Messages</div>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                    Active bookings allow you to coordinate in-app and on WhatsApp with customers.
                  </p>
                </div>
              ) : (
                jobs.filter(j => j.customerId).slice(0, 4).map((j, idx) => (
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
              ))
              )}
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
                    {selectedJobDetail.serviceStage !== 'completed' ? (
                      <button 
                        type="button" 
                        style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
                        onClick={() => {
                          setConfirmBillBooking(selectedJobDetail);
                          setIsAdjustingBill(false);
                        }}
                      >
                        Complete &amp; Generate Bill
                      </button>
                    ) : selectedJobDetail.paymentStatus !== 'paid' ? (
                      <>
                        <button 
                          type="button" 
                          style={{ background: '#0F172A', color: '#D2FE00', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }}
                          onClick={() => setCollectPaymentBooking(selectedJobDetail)}
                        >
                          <QrCode size={18} /> Show QR &amp; Collect Payment
                        </button>
                        <button 
                          type="button" 
                          style={{ background: '#F59E0B', color: '#FFF', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
                          onClick={() => {
                            setConfirmBillBooking(selectedJobDetail);
                            setIsAdjustingBill(true);
                          }}
                        >
                          Adjust Final Bill (₹{selectedJobDetail.finalPrice})
                        </button>
                      </>
                    ) : null}
                  </>
                )}

                {selectedJobDetail.status === 'completed' && selectedJobDetail.paymentStatus !== 'paid' && selectedJobDetail.status !== 'accepted' && (
                  <>
                    <button 
                      type="button" 
                      style={{ background: '#0F172A', color: '#D2FE00', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }}
                      onClick={() => setCollectPaymentBooking(selectedJobDetail)}
                    >
                      <QrCode size={18} /> Show QR &amp; Collect Payment
                    </button>
                    <button 
                      type="button" 
                      style={{ background: '#F59E0B', color: '#FFF', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}
                      onClick={() => {
                        setConfirmBillBooking(selectedJobDetail);
                        setIsAdjustingBill(true);
                      }}
                    >
                      Adjust Final Bill (₹{selectedJobDetail.finalPrice})
                    </button>
                  </>
                )}

                {selectedJobDetail.customerId && (
                  <button 
                    type="button" 
                    style={{ background: '#111', color: '#D2FE00', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={() => setActiveChat(selectedJobDetail)}
                  >
                    <MessageSquare size={16} /> In-App Chat
                  </button>
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
          onUpdateBooking={(updated) => {
            setJobs(prev => prev.map(j => j._id === updated._id ? updated : j));
            setActiveTrackerBooking(updated);
            if (selectedJobDetail && selectedJobDetail._id === updated._id) {
              setSelectedJobDetail(updated);
            }
          }}
          onAdvanceStage={(stage) => advanceJobStage(activeTrackerBooking._id, stage)}
          onUpdateStatus={(status) => updateJobStatus(activeTrackerBooking._id, status)}
        />
      )}

      {/* Confirm Final Bill Modal */}
      {confirmBillBooking && (
        <ConfirmFinalBillModal 
          booking={confirmBillBooking}
          isOpen={Boolean(confirmBillBooking)}
          onClose={() => setConfirmBillBooking(null)}
          onConfirm={handleConfirmFinalBill}
          isAdjusting={isAdjustingBill}
        />
      )}

      {/* Chat Modal */}
      {activeChat && (
        <ChatModal
          isOpen={true}
          bookingId={activeChat._id || activeChat.bookingId}
          receiverId={activeChat.customerId?._id || activeChat.customerId || activeChat.receiverId}
          receiverName={activeChat.customerId?.name || activeChat.receiverName || 'Customer'}
          onClose={() => setActiveChat(null)}
        />
      )}

      {/* Acceptance Blocked Requirements Modal */}
      {acceptBlockedModal.isOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setAcceptBlockedModal({ isOpen: false, missing: [] }); }}
        >
          <div style={{ background: '#FFF', maxWidth: '480px', width: '100%', borderRadius: 12, padding: '1.75rem', border: '2px solid #111', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#DC2626', marginBottom: '0.75rem' }}>
              <AlertCircle size={30} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#111' }}>Cannot Accept Order Yet</h3>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>Profile Requirements Incomplete</span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: '#444', lineHeight: 1.5, margin: '0 0 1rem' }}>
              To ensure customer trust and receive payouts for completed work, you must upload your <strong>Profile Picture</strong> and set your <strong>Payout UPI ID</strong> before accepting service requests.
            </p>
            
            <div style={{ background: '#FEF2F2', border: '1.5px solid #F87171', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#991B1B', textTransform: 'uppercase', marginBottom: '6px' }}>Missing Mandatory Information:</div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#7F1D1D', fontWeight: 700 }}>
                {acceptBlockedModal.missing.map((item, idx) => (
                  <li key={idx} style={{ marginTop: '3px' }}>{item}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setAcceptBlockedModal({ isOpen: false, missing: [] })}
                style={{ background: '#F1F5F9', color: '#475569', border: 'none', padding: '0.65rem 1.15rem', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setAcceptBlockedModal({ isOpen: false, missing: [] });
                  setSelectedJobDetail(null);
                  setActiveTab('profile');
                }}
                style={{ background: '#111111', color: '#D2FE00', border: 'none', padding: '0.65rem 1.35rem', borderRadius: 6, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Configure in Profile →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provider Collect Payment / Dynamic QR Modal */}
      {collectPaymentBooking && (
        <ProviderCollectPaymentModal
          booking={collectPaymentBooking}
          onClose={() => setCollectPaymentBooking(null)}
          onPaymentConfirmed={(updatedBooking) => {
            setCollectPaymentBooking(null);
            setJobs(prev => prev.map(j => j._id === updatedBooking._id ? updatedBooking : j));
            if (selectedJobDetail && selectedJobDetail._id === updatedBooking._id) {
              setSelectedJobDetail(updatedBooking);
            }
          }}
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
