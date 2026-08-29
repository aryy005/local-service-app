import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Check, X, Calendar, Clock, User as UserIcon, Edit2, Save, Navigation, 
  Phone, MapPin, Shield, CheckCircle, AlertCircle, Loader, ShieldCheck, 
  FileText, MessageSquare, MessageCircle, Image, Upload, Plus, Trash2, 
  AlertTriangle, Lock, CheckCircle2, Eye, Sparkles, Briefcase, TrendingUp, Wallet
} from 'lucide-react';
import { getCurrentLocationName } from '../utils/geolocation';
import { API_URL } from '../config';
import { categories } from '../data/mockData';
import ChatModal from '../components/ChatModal';
import ServiceTrackerModal from '../components/ServiceTrackerModal';
import InvoiceModal from '../components/InvoiceModal';
import { openWhatsAppChat, formatWhatsAppBookingMessage } from '../utils/whatsapp';

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
    { key: 'hourlyRate', label: 'Base / Hourly Rate (₹)', valid: !!(p.hourlyRate && Number(p.hourlyRate) > 0), value: p.hourlyRate ? `₹${p.hourlyRate}` : null },
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
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'profile' | 'earnings' | 'wallet'
  const [activeChat, setActiveChat] = useState(null);
  const [activeTrackerBooking, setActiveTrackerBooking] = useState(null);
  const [activeInvoiceBooking, setActiveInvoiceBooking] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  
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

  // ─── Dashboard Inline Verification Handlers ───
  const [phoneInput, setPhoneInput] = useState(user?.phone || '');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneDemoOtp, setPhoneDemoOtp] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const [aadhaarInput, setAadhaarInput] = useState('');
  const [aadhaarStep, setAadhaarStep] = useState('input');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [aadhaarClientId, setAadhaarClientId] = useState('');
  const [aadhaarDemoOtp, setAadhaarDemoOtp] = useState('');
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');

  const profileStatus = checkProviderProfile(user);

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
    if (phoneOtp.length < 6) { setPhoneError('Enter the 6-digit OTP'); return; }
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
      alert('Mobile number verified successfully!');
    } catch (err) { setPhoneError(err.message); }
    finally { setPhoneLoading(false); }
  };

  const handleSendAadhaarOtp = async () => {
    if (aadhaarInput.length !== 12) { setAadhaarError('Enter a valid 12-digit Aadhaar number'); return; }
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
      if (data.demo_otp) setAadhaarDemoOtp(data.demo_otp);
    } catch (err) { setAadhaarError(err.message); }
    finally { setAadhaarLoading(false); }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (aadhaarOtp.length < 6) { setAadhaarError('Enter the 6-digit UIDAI OTP'); return; }
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
      alert('Aadhaar verified successfully via UIDAI!');
    } catch (err) { setAadhaarError(err.message); }
    finally { setAadhaarLoading(false); }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error(err);
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

    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        street: user.addressDetails?.street || '',
        city: user.city || user.addressDetails?.city || user.providerDetails?.location || '',
        state: user.addressDetails?.state || '',
        pincode: user.addressDetails?.pincode || '',
        category: user.providerDetails?.category || 'cat-5',
        hourlyRate: user.providerDetails?.hourlyRate || '',
        experienceYears: user.providerDetails?.experienceYears !== undefined ? user.providerDetails.experienceYears : '',
        location: user.providerDetails?.location || user.city || '',
        description: user.providerDetails?.description || '',
        upiId: user.providerDetails?.upiId || '',
        portfolioImages: user.providerDetails?.portfolioImages || []
      });
      setPhoneInput(user.phone || '');
    }

    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, navigate]);

  const updateJobStatus = async (id, status, extraData = {}) => {
    if (status === 'accepted' && !profileStatus.isComplete) {
      alert(`⚠️ Service Locked!\n\nYou must complete 100% of your provider profile before accepting jobs.\n\nMissing items:\n• ` + profileStatus.missing.map(m => m.label).join('\n• '));
      setActiveTab('profile');
      setIsEditing(true);
      return;
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
        fetchJobs();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to update job status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    }
  };

  const advanceJobStage = async (id, stage, extraData = {}) => {
    if ((stage === 'accepted' || stage === 'in_transit' || stage === 'in_progress') && !profileStatus.isComplete) {
      alert(`⚠️ Service Locked!\n\nYou must complete 100% of your provider profile before servicing jobs.\n\nMissing items:\n• ` + profileStatus.missing.map(m => m.label).join('\n• '));
      setActiveTab('profile');
      setIsEditing(true);
      return;
    }

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

  const rateCustomer = async (id, rating, comment) => {
    try {
      const res = await fetch(`${API_URL}/bookings/${id}/rate-customer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        alert('Customer rated successfully!');
        fetchJobs();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to rate customer');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const location = await getCurrentLocationName();
      setFormData(prev => ({ 
        ...prev, 
        location: location.name || location,
        city: location.name || location
      }));
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLocating(false);
    }
  };

  // Compress image to lightweight JPEG before saving to prevent payload limit errors
  const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG format data URL
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Portfolio Image Upload Handler (Compressed Base64)
  const handlePortfolioFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, JPEG, WEBP).');
        continue;
      }
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({
          ...prev,
          portfolioImages: [...(prev.portfolioImages || []), compressedBase64]
        }));
      } catch (err) {
        console.error('Image compression error:', err);
      }
    }
  };

  // Add Portfolio Image by URL
  const handleAddImageUrl = () => {
    if (!customImageUrl || !customImageUrl.trim()) return;
    setFormData(prev => ({
      ...prev,
      portfolioImages: [...(prev.portfolioImages || []), customImageUrl.trim()]
    }));
    setCustomImageUrl('');
  };

  // Add Preset Image
  const handleAddPresetImage = (url) => {
    if (formData.portfolioImages?.includes(url)) return;
    setFormData(prev => ({
      ...prev,
      portfolioImages: [...(prev.portfolioImages || []), url]
    }));
  };

  // Remove Portfolio Image
  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      portfolioImages: prev.portfolioImages.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) return alert('Full Name is required.');
    if (!formData.phone.trim()) return alert('Phone Number is required.');
    if (!formData.street.trim()) return alert('Doorstep / Street Address is required.');
    if (!formData.city.trim()) return alert('Operating City is required.');
    if (!formData.category.trim()) return alert('Service Category is required.');
    if (!formData.hourlyRate || Number(formData.hourlyRate) <= 0) return alert('Hourly Rate must be greater than 0.');
    if (!formData.description || formData.description.trim().length < 10) return alert('Bio / Description must be at least 10 characters.');
    if (!formData.upiId.trim()) return alert('UPI ID is required for receiving customer payments.');
    if (!formData.portfolioImages || formData.portfolioImages.length === 0) return alert('You must upload at least 1 Work Portfolio image.');

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
          category: formData.category,
          hourlyRate: Number(formData.hourlyRate),
          experienceYears: Number(formData.experienceYears) || 0,
          location: formData.location || formData.city,
          description: formData.description,
          upiId: formData.upiId,
          portfolioImages: formData.portfolioImages
        }
      });
      setIsEditing(false);
      alert('✅ Profile & Work Portfolio successfully updated and verified!');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container mt-8 text-center">Loading your requests...</div>;

  const newJobs = jobs.filter(j => j.status === 'pending');
  const pastJobs = jobs.filter(j => j.status !== 'pending');

  return (
    <div className="provider-dashboard-container fade-in" style={{ width: '100%', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ─── Top Partner Workstation Header ─── */}
      <div className="partner-header-card" style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--surface-border)',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        marginBottom: '1.75rem',
        boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                Partner Dashboard
              </h1>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#6366f1',
                border: '1px solid rgba(99, 102, 241, 0.25)'
              }}>
                Pro Workstation
              </span>
            </div>
            <p className="subtitle" style={{ fontSize: '0.92rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
              Manage bookings, live tracking, work portfolio, and payout eligibility.
            </p>
          </div>

          {/* Profile Completeness Pill */}
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.55rem', 
            background: profileStatus.isComplete ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
            border: `1px solid ${profileStatus.isComplete ? '#10b981' : '#ef4444'}`,
            padding: '0.45rem 1rem', borderRadius: '2rem',
            flexShrink: 0
          }}>
            {profileStatus.isComplete ? (
              <>
                <CheckCircle2 size={18} color="#10b981" />
                <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>Profile 100% Complete & Active</span>
              </>
            ) : (
              <>
                <Lock size={18} color="#ef4444" />
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>
                  Profile {profileStatus.progress}% Complete (Service Locked)
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* ─── Sleek Navigation Tab Strip ─── */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginTop: '1.5rem', 
          padding: '0.35rem',
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--surface-border)', 
          borderRadius: '0.85rem',
          overflowX: 'auto'
        }}>
          <button 
            type="button"
            onClick={() => setActiveTab('jobs')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.65rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              transition: 'all 0.2s ease',
              background: activeTab === 'jobs' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'jobs' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'jobs' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <Briefcase size={16} />
            <span>My Jobs</span>
            {newJobs.length > 0 && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                background: activeTab === 'jobs' ? '#ffffff' : '#6366f1',
                color: activeTab === 'jobs' ? '#6366f1' : '#ffffff'
              }}>
                {newJobs.length} New
              </span>
            )}
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.65rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              transition: 'all 0.2s ease',
              background: activeTab === 'profile' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'profile' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'profile' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <UserIcon size={16} />
            <span>My Profile & Portfolio</span>
            {!profileStatus.isComplete && (
              <span style={{ 
                width: '8px', height: '8px', 
                background: '#ef4444', 
                borderRadius: '50%',
                display: 'inline-block'
              }}></span>
            )}
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('earnings')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.65rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              transition: 'all 0.2s ease',
              background: activeTab === 'earnings' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'earnings' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'earnings' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <TrendingUp size={16} />
            <span>Earnings & Metrics</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('wallet')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.65rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              transition: 'all 0.2s ease',
              background: activeTab === 'wallet' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'wallet' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'wallet' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <Wallet size={16} />
            <span>Wallet & Payout</span>
          </button>
        </div>
      </div>

      {/* ─── Mandatory Profile Requirement Gate Banner ─── */}
      {!profileStatus.isComplete && (
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(245, 158, 11, 0.08))', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          borderRadius: '1rem', 
          padding: '1.25rem 1.5rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={22} color="#ef4444" />
            <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.05rem', fontWeight: 800 }}>
              ⚠️ Service Provider Account Incomplete — Service Locked
            </h3>
          </div>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>
            To protect customer trust and ensure service quality, <b>all provider profile fields and at least one photo of previous work are strictly mandatory</b>. You cannot accept service requests or appear in search results until your profile is 100% complete.
          </p>

          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
              <span>Completion Progress</span>
              <span>{profileStatus.progress}% Completed</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${profileStatus.progress}%`, height: '100%', background: 'linear-gradient(90deg, #ef4444, #f59e0b)', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Missing:</span>
            {profileStatus.missing.map(m => (
              <span key={m.key} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.2rem 0.6rem', borderRadius: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
                ✗ {m.label}
              </span>
            ))}
            <button 
              className="btn btn-primary btn-sm" 
              style={{ marginLeft: 'auto', background: '#ef4444', borderColor: '#ef4444' }}
              onClick={() => {
                setActiveTab('profile');
                setIsEditing(true);
              }}
            >
              Complete Profile Now →
            </button>
          </div>
        </div>
      )}

      {activeTab === 'earnings' && (
        <EarningsDashboard bookings={jobs.filter(j => j.status === 'completed')} />
      )}

      {activeTab === 'wallet' && (
        <div className="glass-panel fade-in" style={{ padding: '2rem', borderRadius: '1rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Wallet & Payouts</h2>
          
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '2rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1rem' }}>Available Balance</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2.5rem', fontWeight: 700, color: '#38bdf8' }}>
              ₹{jobs.filter(j => j.status === 'completed').reduce((sum, b) => sum + (Number(b.finalPrice) || 0), 0)}
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} style={{ maxWidth: '400px' }}>
            <div className="form-group">
              <label>Mapping UPI ID</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={formData.upiId} 
                  onChange={e => setFormData({...formData, upiId: e.target.value})} 
                  placeholder="e.g., yourname@okhdfcbank" 
                  className="form-control" 
                />
                <button type="submit" className="btn btn-outline" disabled={!isEditing && formData.upiId === user.providerDetails?.upiId}>
                  Save
                </button>
              </div>
              <small className="text-muted mt-1" style={{ display: 'block' }}>We will instantly process withdrawals to this UPI handle.</small>
            </div>
          </form>

          <button 
            onClick={() => {
              if (!formData.upiId) return alert('Please save a valid UPI ID first!');
              alert(`Success! Simulated instant payout initiated to ${formData.upiId}. Funds usually arrive in 1-2 minutes.`);
            }}
            className="btn btn-primary btn-lg mt-6"
            style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
          >
             Withdraw instantly via UPI
          </button>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="jobs-section">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: 'var(--primary-color)', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem' }}>{newJobs.length}</span>
            New Requests
          </h2>

          <div className="jobs-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
            {newJobs.length > 0 ? newJobs.map(job => (
              <JobCard 
                key={job._id} 
                job={job} 
                updateJobStatus={updateJobStatus} 
                advanceJobStage={advanceJobStage}
                rateCustomer={rateCustomer} 
                openChat={() => setActiveChat(job)} 
                openTracker={() => setActiveTrackerBooking(job)} 
                openInvoice={() => setActiveInvoiceBooking(job)} 
                isProfileComplete={profileStatus.isComplete}
              />
            )) : <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No new job requests</div>}
          </div>

          <h2 style={{ marginBottom: '1.5rem' }}>Previous / Accepted Orders</h2>
          <div className="jobs-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {pastJobs.length > 0 ? pastJobs.map(job => (
              <JobCard 
                key={job._id} 
                job={job} 
                updateJobStatus={updateJobStatus} 
                advanceJobStage={advanceJobStage}
                rateCustomer={rateCustomer} 
                openChat={() => setActiveChat(job)} 
                openTracker={() => setActiveTrackerBooking(job)} 
                openInvoice={() => setActiveInvoiceBooking(job)} 
                isProfileComplete={profileStatus.isComplete}
              />
            )) : <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No previous orders found</div>}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0 }}>Service Partner Profile & Work Portfolio</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                All fields marked with <b style={{ color: '#ef4444' }}>*</b> and work photos are mandatory to provide services.
              </p>
            </div>
            {!isEditing ? (
              <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Edit Profile & Work Photos
              </button>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(false)}>
                Cancel Editing
              </button>
            )}
          </div>

          {/* Checklist of Mandatory Requirements */}
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--surface-border)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="#6366f1" /> Mandatory Profile Checklist ({profileStatus.progress}% Complete)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {profileStatus.checks.map(c => (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  {c.valid ? (
                    <CheckCircle size={16} color="#10b981" />
                  ) : (
                    <AlertCircle size={16} color="#ef4444" />
                  )}
                  <span style={{ color: c.valid ? 'var(--text-main)' : '#ef4444', fontWeight: c.valid ? 500 : 700 }}>
                    {c.label} {c.valid && c.value && typeof c.value === 'string' ? `(${c.value.slice(0, 15)}...)` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Mobile Number <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className="form-control" />
                </div>

                <div className="form-group">
                  <label>Doorstep / Street Address <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" 
                    value={formData.street} 
                    onChange={e => setFormData({...formData, street: e.target.value})} 
                    placeholder="e.g. Flat 302, Green Avenue, Sector 62"
                    required 
                    className="form-control" 
                  />
                </div>

                <div className="form-group">
                  <label>Operating City / Area <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={formData.city} 
                      onChange={e => setFormData({...formData, city: e.target.value, location: e.target.value})} 
                      required 
                      className="form-control" 
                      style={{ width: '100%', paddingRight: '2.5rem' }} 
                    />
                    <button 
                      type="button" 
                      onClick={handleLocateMe}
                      className={isLocating ? 'locating' : ''}
                      title="Use Current Location"
                      disabled={isLocating}
                      style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex' }}
                    >
                      <Navigation size={18} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Base Hourly Rate (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="number" value={formData.hourlyRate} onChange={e => setFormData({...formData, hourlyRate: e.target.value})} required min="1" className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Years of Exp. <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="number" value={formData.experienceYears} onChange={e => setFormData({...formData, experienceYears: e.target.value})} required className="form-control" min="0" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Payout UPI ID <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" 
                    value={formData.upiId} 
                    onChange={e => setFormData({...formData, upiId: e.target.value})} 
                    placeholder="e.g. partner@upi" 
                    required 
                    className="form-control" 
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontWeight: 700, color: '#6366f1' }}>🛠️ Service Category <span style={{ color: '#ef4444' }}>*</span></label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="form-control"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--text-main)', fontWeight: 600 }}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id} style={{ background: '#1e293b', color: '#fff' }}>
                        {c.name} — {c.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Bio / Description (Tell customers about your skills) <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea 
                    rows="3" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Describe your expertise, experience, and tools..."
                    required 
                    className="form-control" 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'var(--text-main)' }}
                  />
                </div>

                {/* ─── Work Portfolio Images Section (Mandatory) ─── */}
                <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--surface-color)', border: '1px solid var(--surface-border)', padding: '1.25rem', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label style={{ margin: 0, fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Image size={18} color="#6366f1" /> Photos of Previous Work / Portfolio <span style={{ color: '#ef4444' }}>* (Min 1 image required)</span>
                    </label>
                    <span style={{ fontSize: '0.85rem', color: formData.portfolioImages?.length > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {formData.portfolioImages?.length || 0} Photos Added
                    </span>
                  </div>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Upload real photos of your completed repairs, cleaning, installations, or tools to verify your work for customers.
                  </p>

                  {/* Image Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    {/* File Upload */}
                    <div style={{ border: '2px dashed var(--surface-border)', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                      <Upload size={22} color="var(--primary-color)" style={{ margin: '0 auto 0.35rem auto' }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Upload from Device</div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handlePortfolioFileUpload}
                        style={{ display: 'none' }}
                        id="portfolio-file-input"
                      />
                      <label htmlFor="portfolio-file-input" className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                        Browse Photos
                      </label>
                    </div>

                    {/* Image URL Input */}
                    <div style={{ border: '1px solid var(--surface-border)', borderRadius: '0.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Or Add via Image URL</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="url" 
                          value={customImageUrl} 
                          onChange={(e) => setCustomImageUrl(e.target.value)} 
                          placeholder="https://example.com/photo.jpg"
                          className="form-control"
                          style={{ fontSize: '0.85rem' }}
                        />
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleAddImageUrl}>
                          <Plus size={16} /> Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preset Sample Photos */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Quick Add Verified Sample Work Photos:
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {SAMPLE_PORTFOLIO_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddPresetImage(preset.url)}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Uploaded Portfolio Gallery Grid */}
                  {formData.portfolioImages && formData.portfolioImages.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                      {formData.portfolioImages.map((imgUrl, idx) => (
                        <div key={idx} style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', height: '110px', border: '1px solid var(--surface-border)', background: '#000' }}>
                          <img 
                            src={imgUrl} 
                            alt={`Portfolio work ${idx + 1}`} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            style={{ 
                              position: 'absolute', top: '4px', right: '4px', 
                              background: 'rgba(239, 68, 68, 0.9)', color: 'white', 
                              border: 'none', borderRadius: '50%', width: '22px', height: '22px', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              cursor: 'pointer' 
                            }}
                            title="Remove Photo"
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewImage(imgUrl)}
                            style={{ 
                              position: 'absolute', bottom: '4px', right: '4px', 
                              background: 'rgba(0,0,0,0.7)', color: 'white', 
                              border: 'none', borderRadius: '4px', padding: '2px 5px',
                              cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px'
                            }}
                          >
                            <Eye size={12} /> View
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(239,68,68,0.05)', border: '1px dashed #ef4444', borderRadius: '0.5rem', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                      ⚠️ No work photos added yet. Upload at least 1 image to complete your profile and unlock services.
                    </div>
                  )}
                </div>

              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Save size={18} /> Save & Verify Profile Requirements
                </button>
                <button type="button" className="btn btn-outline btn-lg" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Full Name</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem', fontWeight: 600 }}>{user.name}</p>
              </div>
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Phone Number</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem', fontWeight: 600 }}>{user.phone || <span style={{ color: '#ef4444' }}>Not provided</span>}</p>
              </div>
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>🛠️ Service Category</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem', fontWeight: 700, color: '#6366f1' }}>
                  {categories.find(c => c.id === user.providerDetails?.category || c.name.toLowerCase() === user.providerDetails?.category?.toLowerCase())?.name || user.providerDetails?.category || 'General Services'}
                </p>
              </div>
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>📍 Operating City & Address</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem', fontWeight: 600, color: '#6366f1' }}>
                  {user.addressDetails?.street ? `${user.addressDetails.street}, ` : ''}{user.city || user.providerDetails?.location || <span style={{ color: '#ef4444' }}>Not set</span>}
                  {user.addressDetails?.pincode ? ` (${user.addressDetails.pincode})` : ''}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Base Hourly Rate</p>
                  <p style={{ fontSize: '1.1rem', marginTop: '0.25rem', fontWeight: 600 }}>₹{user.providerDetails?.hourlyRate || '0'}</p>
                </div>
                <div>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Years of Experience</p>
                  <p style={{ fontSize: '1.1rem', marginTop: '0.25rem', fontWeight: 600 }}>{user.providerDetails?.experienceYears || '0'} Years</p>
                </div>
              </div>
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Payout UPI ID</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem', fontWeight: 600, color: '#38bdf8' }}>{user.providerDetails?.upiId || <span style={{ color: '#ef4444' }}>Not set</span>}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Bio / Description</p>
                <p style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>{user.providerDetails?.description || <span style={{ color: '#ef4444' }}>No description added yet.</span>}</p>
              </div>

              {/* ─── Display Work Portfolio Photos ─── */}
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Image size={18} color="#6366f1" /> Work Portfolio & Photos ({user.providerDetails?.portfolioImages?.length || 0})
                  </h4>
                  <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
                    + Manage Photos
                  </button>
                </div>

                {user.providerDetails?.portfolioImages && user.providerDetails.portfolioImages.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                    {user.providerDetails.portfolioImages.map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setPreviewImage(imgUrl)}
                        style={{ position: 'relative', borderRadius: '0.75rem', overflow: 'hidden', height: '130px', border: '1px solid var(--surface-border)', cursor: 'pointer' }}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Work sample ${idx + 1}`} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        />
                        <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px' }}>
                          Photo #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed #ef4444', borderRadius: '0.75rem', textAlign: 'center', color: '#ef4444' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>⚠️ No portfolio work photos uploaded yet.</p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Upload pictures of your previous work to unlock service availability.</p>
                    <button className="btn btn-primary btn-sm mt-3" onClick={() => setIsEditing(true)}>
                      Upload Work Photos Now
                    </button>
                  </div>
                )}
              </div>

              {/* ── Verification Badges & Actions ── */}
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Identity Verification Status</p>
                
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  <span className={user.emailVerified ? 'verified-badge large' : 'unverified-badge'}>
                    ✉ Email {user.emailVerified ? '✓ Verified' : '✗ Not Verified'}
                  </span>
                  <span className={user.phoneVerified ? 'verified-badge large' : 'unverified-badge'}>
                    📱 Phone {user.phoneVerified ? '✓ Verified' : '✗ Not Verified'}
                  </span>
                  {user.providerDetails?.aadhaarVerified ? (
                    <span className="verified-badge large">
                      🛡 Aadhaar Verified (XXXX-XXXX-{user.providerDetails?.aadhaarLastFour || '****'})
                    </span>
                  ) : (
                    <span className="unverified-badge">
                      ⚠ Aadhaar Not Verified
                    </span>
                  )}
                </div>

                {/* ── Interactive Phone Verification Card ── */}
                {!user.phoneVerified && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '1.25rem', border: '1px solid var(--surface-border)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>📱 Verify Phone Number (+91)</h4>
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

                {/* ── Interactive Aadhaar Verification Card ── */}
                {!user.providerDetails?.aadhaarVerified && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--surface-border)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>🛡 Verify Aadhaar via UIDAI e-KYC</h4>
                    {aadhaarError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{aadhaarError}</div>}

                    {aadhaarStep === 'input' && (
                      <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '420px' }}>
                        <input 
                          type="text" 
                          value={aadhaarInput} 
                          onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, '').slice(0, 12))} 
                          placeholder="12-digit Aadhaar Number"
                          maxLength="12"
                          style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
                        />
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleSendAadhaarOtp} disabled={aadhaarLoading}>
                          {aadhaarLoading ? 'Requesting UIDAI...' : 'Send UIDAI OTP'}
                        </button>
                      </div>
                    )}

                    {aadhaarStep === 'otp' && (
                      <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '420px', flexDirection: 'column' }}>
                        {aadhaarDemoOtp && <span style={{ fontSize: '0.82rem', color: '#10b981' }}>Demo OTP: <b>{aadhaarDemoOtp}</b></span>}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            value={aadhaarOtp} 
                            onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                            placeholder="Enter 6-digit UIDAI OTP"
                            maxLength="6"
                            style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
                          />
                          <button type="button" className="btn btn-primary btn-sm" onClick={handleVerifyAadhaarOtp} disabled={aadhaarLoading}>
                            {aadhaarLoading ? 'Verifying UIDAI...' : 'Verify OTP'}
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

      {/* Root Mounted Service Tracker Modal */}
      {activeTrackerBooking && (
        <ServiceTrackerModal 
          booking={activeTrackerBooking}
          onClose={() => setActiveTrackerBooking(null)}
          onUpdateBooking={(updated) => {
            setActiveTrackerBooking(updated);
            setJobs(prev => prev.map(j => j._id === updated._id ? updated : j));
          }}
          onOpenInvoice={(b) => setActiveInvoiceBooking(b)}
        />
      )}

      {/* Root Mounted Invoice Modal */}
      {activeInvoiceBooking && (
        <InvoiceModal 
          booking={activeInvoiceBooking}
          onClose={() => setActiveInvoiceBooking(null)}
        />
      )}

      {/* Full-Screen Image Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <div style={{ position: 'relative', maxWidth: '800px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Work preview" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '0.75rem', border: '2px solid rgba(255,255,255,0.2)' }} />
            <button 
              onClick={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const EarningsDashboard = ({ bookings }) => {
  const totalEarned = bookings.reduce((sum, b) => sum + (Number(b.finalPrice) || 0), 0);
  const thisMonth = new Date().getMonth();
  const earnedThisMonth = bookings.filter(b => new Date(b.createdAt).getMonth() === thisMonth)
                                  .reduce((sum, b) => sum + (Number(b.finalPrice) || 0), 0);

  return (
    <div className="glass-panel fade-in" style={{ padding: '2rem', borderRadius: '1rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Earnings Overview</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1rem' }}>Total Earnings</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>₹{totalEarned}</p>
        </div>
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1rem' }}>Earned This Month</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: '#38bdf8' }}>₹{earnedThisMonth}</p>
        </div>
      </div>

      <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Recent Transactions</h3>
      {bookings.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Job Details</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem 0.75rem' }}>{b.date}</td>
                  <td style={{ padding: '1rem 0.75rem' }}>{b.description.substring(0,40)}...</td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>+ ₹{b.finalPrice || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>No completed jobs to show earnings for yet.</p>
      )}
    </div>
  );
};

// Helper component for rendering jobs
const JobCard = ({ job, updateJobStatus, advanceJobStage, openChat, rateCustomer, openTracker, openInvoice, isProfileComplete }) => {
  const currentStage = job.serviceStage || (job.status === 'completed' ? 'completed' : job.status === 'accepted' ? 'accepted' : 'requested');

  return (
    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontWeight: 800, color: '#6366f1', fontSize: '0.85rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          Order ID: {job.orderId || ('ORD-' + job._id?.slice(-6).toUpperCase())}
        </span>

        {/* Live Stage Pill */}
        <span style={{ 
          fontSize: '0.8rem', 
          fontWeight: 700, 
          padding: '0.2rem 0.6rem', 
          borderRadius: '1rem',
          background: currentStage === 'in_transit' ? '#EFF6FF' : currentStage === 'in_progress' ? '#FFFBEB' : currentStage === 'completed' ? '#ECFDF5' : 'rgba(99, 102, 241, 0.08)',
          color: currentStage === 'in_transit' ? '#2563EB' : currentStage === 'in_progress' ? '#D97706' : currentStage === 'completed' ? '#059669' : '#6366F1',
          border: `1px solid ${currentStage === 'in_transit' ? '#BFDBFE' : currentStage === 'in_progress' ? '#FDE68A' : currentStage === 'completed' ? '#A7F3D0' : '#C7D2FE'}`
        }}>
          {currentStage === 'in_transit' ? '🚗 On The Way' : currentStage === 'in_progress' ? '🔧 Work In Progress' : currentStage === 'completed' ? '✅ Completed' : currentStage === 'accepted' ? '👍 Booking Accepted' : '📌 Requested'}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserIcon size={20} color="var(--primary-color)" />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>
                {job.customerId?.name || 'Customer'}
                {job.customerId?.customerDetails?.reviewsCount > 0 && (
                  <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem', background: '#ffc107', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    ⭐ {job.customerId?.customerDetails?.rating} 
                  </span>
                )}
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{job.customerId?.email} | <Phone size={12}/> {job.customerId?.phone || 'No phone'}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}><Calendar size={18} color="var(--primary-color)" /> {job.date}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}><Clock size={18} color="var(--primary-color)"/> {job.timePreference}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}><MapPin size={18} color="var(--primary-color)"/> {job.serviceAddress}</span>
          </div>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '3px solid var(--primary-color)' }}>
            <p style={{ margin: 0 }}>"{job.description}"</p>
          </div>
        </div>

        <div style={{ textAlign: 'right', minWidth: '220px' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <div style={{ fontWeight: 600, color: job.status === 'pending' ? 'var(--warning-color)' : job.status === 'accepted' ? 'var(--accent-color)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
              Status: {job.status}
            </div>
            {job.paymentStatus === 'paid' ? (
              <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700 }}>
                ✓ Paid (₹{job.paidAmount || job.finalPrice})
              </span>
            ) : job.status === 'completed' || (job.finalPrice && job.finalPrice > 0) ? (
              <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 700 }}>
                ⚠️ Payment Pending (₹{job.finalPrice})
              </span>
            ) : null}
          </div>
          
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', marginBottom: '0.5rem' }}>
            {/* Live GPS Tracker Button */}
            <button 
              onClick={openTracker}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: 'white', border: 'none', padding: '0.65rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' }}
            >
              <Navigation size={16} /> Manage Live Status & GPS 📍
            </button>

            {/* 1-Click Status Advancement */}
            {job.status === 'accepted' && (
              <>
                {(!job.serviceStage || job.serviceStage === 'accepted') && (
                  <button 
                    onClick={() => advanceJobStage(job._id, 'in_transit')}
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', fontWeight: 700 }}
                  >
                    🚗 Mark "I'm On The Way"
                  </button>
                )}

                {job.serviceStage === 'in_transit' && (
                  <button 
                    onClick={() => advanceJobStage(job._id, 'in_progress')}
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', fontWeight: 700 }}
                  >
                    🔧 Mark "Work Started"
                  </button>
                )}

                {job.serviceStage === 'in_progress' && (
                  <button 
                    onClick={() => {
                      const amt = window.prompt("Enter final bill amount earned (₹):", job.finalPrice || job.providerId?.providerDetails?.hourlyRate || 25);
                      if (amt !== null) advanceJobStage(job._id, 'completed', { finalPrice: Number(amt) || 0 });
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', fontWeight: 700 }}
                  >
                    ✅ Complete Service & Bill
                  </button>
                )}
              </>
            )}

            {(job.paymentStatus === 'paid' || job.status === 'completed') && (
              <button 
                onClick={openInvoice}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', color: '#10B981', border: '1px solid #10B981', padding: '0.55rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                <FileText size={15} /> View Receipt & Invoice 📄
              </button>
            )}
          </div>
          
          {job.status === 'pending' && (
            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
              <button 
                onClick={() => updateJobStatus(job._id, 'accepted')}
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                  background: isProfileComplete ? 'var(--accent-color)' : '#9ca3af', 
                  color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', 
                  cursor: 'pointer', fontWeight: 600 
                }}
              >
                {isProfileComplete ? <Check size={16} /> : <Lock size={16} />} 
                {isProfileComplete ? 'Accept Job' : 'Complete Profile to Accept'}
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  onClick={openChat}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', background: 'transparent', color: 'var(--primary-color)', border: '1px solid var(--primary-color)', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  <MessageSquare size={14} /> Message
                </button>
                <button 
                  onClick={() => {
                    const msg = formatWhatsAppBookingMessage(job, true);
                    openWhatsAppChat(job.customerId?.phone, msg);
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', background: '#25D366', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>
              <button 
                onClick={() => updateJobStatus(job._id, 'declined')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', marginTop: '0.5rem' }}
              >
                <X size={16} /> Decline
              </button>
            </div>
          )}

          {job.status === 'accepted' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                onClick={openChat}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--primary-color)', border: '1px solid var(--primary-color)', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                <MessageSquare size={16} /> Message
              </button>
              <button 
                onClick={() => {
                  const msg = formatWhatsAppBookingMessage(job, true);
                  openWhatsAppChat(job.customerId?.phone, msg);
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', background: '#25D366', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
            </div>
          )}

          {job.status === 'completed' && !job.customerReview?.rating && (
            <div style={{ marginTop: '0.5rem' }}>
              <button 
                onClick={() => {
                  const rt = window.prompt("Rate customer from 1 to 5 stars:");
                  const num = Number(rt);
                  if (num >= 1 && num <= 5) {
                     const comment = window.prompt("Any comment (optional)?");
                     rateCustomer(job._id, num, comment || '');
                  } else if (rt) {
                     alert("Please enter a valid rating between 1 and 5.");
                  }
                }}
                className="btn btn-outline btn-sm"
                style={{ width: '100%', borderColor: 'var(--warning-color)', color: 'var(--warning-color)' }}
              >
                ⭐ Rate Customer
              </button>
            </div>
          )}
          {job.status === 'completed' && job.customerReview?.rating && (
            <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              You rated ⭐ {job.customerReview.rating}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
