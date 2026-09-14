import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Star, MapPin, CheckCircle, ArrowLeft, ShieldCheck, Heart, 
  Search, Bell, User, Calendar, Clock, Award, Shield, Check
} from 'lucide-react';
import BookingModal from '../components/BookingModal';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { isProviderSaved, toggleSaveProvider } from '../utils/savedProviders';
import UserMenuPill from '../components/UserMenuPill';
import './ProviderProfile.css';

// Default service checklist per category
const categoryServiceChecklist = {
  'cat-5': ['Wiring & Rewiring', 'Switchboard Installation', 'Fan Installation', 'AC Installation & Repair'],
  'cat-6': ['Pipe Fitting & Replacement', 'Leak Fixes & Drain Cleaning', 'Bathroom Fittings', 'Water Tank Repair'],
  'cat-2': ['Custom Furniture Making', 'Door & Window Lock Repair', 'Cabinetry & Wardrobe Work', 'Wood Polishing'],
  'cat-3': ['Interior Wall Painting', 'Exterior Waterproofing', 'Texture & Stencil Design', 'Wood & Metal Enamel'],
  'cat-1': ['Custom Suit Stitching', 'Pant & Shirt Alterations', 'Traditional & Designer Wear', 'Zip & Button Repairs'],
  'cat-7': ['AC Deep Servicing & Cleaning', 'Gas Refilling & Leak Check', 'Cooling Coil Replacement', 'AC Uninstallation & Fitting']
};

const defaultServices = [
  'Wiring & Rewiring',
  'Switchboard Installation',
  'Fan Installation',
  'AC Installation & Repair'
];

// Helper to generate the next 5 days
const getUpcomingDays = () => {
  const days = [];
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    days.push({
      dateStr: `${monthNames[d.getMonth()]} ${d.getDate()}`,
      month: monthNames[d.getMonth()],
      dayNum: d.getDate(),
      dayName: dayNames[d.getDay()],
      fullDate: d.toISOString().split('T')[0]
    });
  }
  return days;
};

const timeSlots = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM'
];

const categoryLabels = {
  'cat-1': 'Tailor',
  'cat-2': 'Carpenter',
  'cat-3': 'Painter',
  'cat-4': 'Cobbler',
  'cat-5': 'Electrician',
  'cat-6': 'Plumber',
  'cat-7': 'AC Repair',
  'cat-8': 'House Cleaning',
  'cat-9': 'Pest Control',
  'cat-10': 'Other Services'
};

const ProviderProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('about'); // 'about' | 'reviews' | 'photos'
  const [saved, setSaved] = useState(false);

  // Date & Time Picker State
  const daysList = getUpcomingDays();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:00 AM');
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    if (user?.role === 'provider') {
      navigate('/provider-dashboard', { replace: true });
      return;
    }

    const fetchProviderData = async () => {
      try {
        const [provRes, revRes, portRes] = await Promise.all([
          fetch(`${API_URL}/providers/${id}`),
          fetch(`${API_URL}/providers/${id}/reviews`),
          fetch(`${API_URL}/providers/${id}/portfolio`)
        ]);
        
        if (provRes.ok) {
          const provData = await provRes.json();
          setProvider(provData);
          setSaved(isProviderSaved(provData._id || id, user?.email));
        } else {
          setProvider(null);
          setSaved(false);
        }

        if (revRes.ok) setReviews(await revRes.json());
        if (portRes.ok) setPortfolio(await portRes.json());
      } catch (err) {
        console.error(err);
        setProvider(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProviderData();
  }, [id, user, navigate]);

  const handleToggleSave = () => {
    if (!provider) return;
    const newState = toggleSaveProvider(provider, user?.email || 'guest');
    setSaved(newState);
  };

  const handleBookNow = () => {
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setIsBookingOpen(true);
  };

  if (loading) return <div className="container mt-8 text-center" style={{ padding: '3rem' }}>Loading provider profile...</div>;

  if (!provider) {
    return (
      <div className="container mt-8 text-center" style={{ padding: '4rem 1rem' }}>
        <User size={48} color="#999" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
        <h2>Provider Not Found</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>The requested service provider profile is not available.</p>
        <button className="btn btn-outline" onClick={() => navigate('/search')}>Back to Services</button>
      </div>
    );
  }

  const pDetails = provider.providerDetails || {};
  const categoryTitle = pDetails.categoryName || categoryLabels[pDetails.category] || 'Service Professional';
  const locationTitle = pDetails.location || provider.city || provider.addressDetails?.city || 'Local';
  const servicesList = (pDetails.skills && pDetails.skills.length > 0) 
    ? pDetails.skills 
    : (categoryServiceChecklist[pDetails.category] || defaultServices);
  const selectedDateObj = daysList[selectedDayIndex];

  return (
    <div className="lp-profile-page fade-in">
      {/* ─── Top Sub-Nav (Matching Image 2 header) ─── */}
      <div className="lp-profile-topbar">
        <div className="lp-topbar-inner">
          <button 
            type="button"
            className="lp-topbar-brand"
            onClick={() => navigate('/search')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            LocalFixr
          </button>

          <div className="lp-topbar-actions">
            <button className="lp-icon-btn" onClick={() => navigate('/search')} title="Search Services">
              <Search size={18} />
            </button>
            <UserMenuPill />
          </div>
        </div>
      </div>

      <div className="lp-profile-container">
        {/* Back button */}
        <button className="lp-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {/* ═══ Provider Hero Card (Image 2) ═══ */}
        <div className="lp-profile-hero-card">
          <div className="lp-hero-photo-wrap">
            <img 
              src={pDetails.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300&h=300'} 
              alt={provider.name} 
              className="lp-hero-photo"
            />
          </div>

          <div className="lp-hero-details">
            <div className="lp-hero-title-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <h1 className="lp-provider-name">{provider.name}</h1>
                <div className="lp-verified-check" title="Verified Professional">
                  <Check size={12} strokeWidth={3} />
                </div>
              </div>

              <button 
                className={`lp-save-pill-btn ${saved ? 'saved' : ''}`} 
                onClick={handleToggleSave}
                title={saved ? 'Remove from Saved' : 'Save Provider for Future'}
              >
                <Heart size={16} fill={saved ? '#ef4444' : 'none'} color={saved ? '#ef4444' : '#111111'} />
                <span>{saved ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            {/* Rating, Reviews & Distance */}
            <div className="lp-meta-row">
              <div className="lp-rating-tag">
                <Star size={16} fill="#f59e0b" color="#f59e0b" />
                <strong>{pDetails.rating ? Number(pDetails.rating).toFixed(1) : 'New'}</strong>
                {pDetails.reviewsCount ? <span>({pDetails.reviewsCount} reviews)</span> : <span style={{ color: '#6b7280' }}>(New Partner)</span>}
              </div>
              <span className="lp-dot">•</span>
              <div className="lp-distance-tag">
                <MapPin size={15} />
                <span>{pDetails.distance || locationTitle}</span>
              </div>
            </div>

            {/* Profession Title */}
            <h2 className="lp-profession-title">{categoryTitle}</h2>

            {/* Badges Row */}
            <div className="lp-badges-row">
              <span className="lp-badge-dark">
                <Check size={13} strokeWidth={3} /> Verified
              </span>
              <span className="lp-badge-blue">
                <Shield size={13} /> Background Checked
              </span>
              <span className="lp-badge-purple">
                <Award size={13} /> Local Professional
              </span>
            </div>

            {/* Tagline / Experience statement */}
            <div className="lp-tagline-block">
              <div>{pDetails.description ? pDetails.description.slice(0, 90) : `Professional ${categoryTitle} Services`}</div>
              <div>Safe, Verified, and Background Checked.</div>
            </div>
          </div>
        </div>

        {/* ═══ 3-Item Stats Bar (Image 2) ═══ */}
        <div className="lp-profile-stats-bar">
          <div className="lp-stat-col">
            <div className="lp-stat-val">{(pDetails.experienceYears !== undefined && pDetails.experienceYears !== null && Number(pDetails.experienceYears) > 0) ? `${pDetails.experienceYears}+` : '1+'}</div>
            <div className="lp-stat-lbl">Years Experience</div>
          </div>
          <div className="lp-stat-col">
            <div className="lp-stat-val">{(pDetails.totalJobsCompleted !== undefined && pDetails.totalJobsCompleted !== null && Number(pDetails.totalJobsCompleted) > 0) ? `${pDetails.totalJobsCompleted}+` : '0+'}</div>
            <div className="lp-stat-lbl">Jobs Completed</div>
          </div>
          <div className="lp-stat-col">
            <div className="lp-stat-val">{locationTitle}</div>
            <div className="lp-stat-lbl">Service Location</div>
          </div>
        </div>

        {/* ═══ 2-Column Split: Details Left & Date/Time Booking Right ═══ */}
        <div className="lp-profile-grid">
          {/* Left Column */}
          <div className="lp-grid-left">
            {/* Tabs Row */}
            <div className="lp-profile-tabs">
              <button 
                className={`lp-tab-link ${activeTab === 'about' ? 'active' : ''}`}
                onClick={() => setActiveTab('about')}
              >
                About
              </button>
              <button 
                className={`lp-tab-link ${activeTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                Reviews
              </button>
              <button 
                className={`lp-tab-link ${activeTab === 'photos' ? 'active' : ''}`}
                onClick={() => setActiveTab('photos')}
              >
                Photos
              </button>
            </div>

            {/* About Tab Content */}
            {activeTab === 'about' && (
              <div className="lp-tab-pane">
                <p className="lp-about-bio">
                  {pDetails.description || `${provider.name} is a verified ${categoryTitle} based in ${locationTitle}. Dedicated to high quality work, safety, and customer satisfaction.`}
                </p>

                <div className="lp-services-subhead">Services Offered</div>
                <div className="lp-services-list">
                  {servicesList.map((svc, idx) => (
                    <div key={idx} className="lp-service-bullet">
                      <span className="lp-bullet-dot"></span>
                      <span>{svc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Tab Content */}
            {activeTab === 'reviews' && (
              <div className="lp-tab-pane">
                {reviews.length === 0 ? (
                  <div style={{ padding: '2rem 0', color: '#666', fontSize: '0.92rem' }}>
                    No reviews yet. Completed bookings and customer testimonials will be listed here.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {reviews.map(r => (
                      <div key={r._id} style={{ background: '#ffffff', border: '1px solid #e5e5e0', padding: '1rem 1.25rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{r.customer?.name || 'Verified Customer'}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700 }}>
                            <Star size={14} fill="#f59e0b" /> {r.rating}
                          </div>
                        </div>
                        <p style={{ margin: 0, color: '#555', fontSize: '0.88rem', lineHeight: 1.5 }}>{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Photos Tab Content */}
            {activeTab === 'photos' && (
              <div className="lp-tab-pane">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                  {(portfolio && portfolio.length > 0 ? portfolio : [
                    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=300&h=300',
                    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=300&h=300',
                    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=300&h=300'
                  ]).map((img, i) => (
                    <img key={i} src={img} alt="Job sample" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: "Select Date & Time" Card (Image 2) */}
          <div className="lp-grid-right">
            <div className="lp-datetime-card">
              <h3 className="lp-datetime-title">Select Date &amp; Time</h3>

              {/* Day carousel */}
              <div className="lp-days-carousel">
                {daysList.map((day, idx) => {
                  const isSelected = idx === selectedDayIndex;
                  return (
                    <button
                      key={day.fullDate}
                      type="button"
                      className={`lp-day-pill ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedDayIndex(idx)}
                    >
                      <div className="lp-day-month">{day.month}</div>
                      <div className="lp-day-num">{day.dayNum}</div>
                      <div className="lp-day-name">{day.dayName}</div>
                    </button>
                  );
                })}
              </div>

              {/* Time slots grid */}
              <div className="lp-time-slots-grid">
                {timeSlots.map(slot => {
                  const isSelected = slot === selectedTimeSlot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`lp-slot-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedTimeSlot(slot)}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>

              {/* Book Now Button */}
              <button className="lp-book-now-cta" onClick={handleBookNow}>
                Book Now
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.8rem', color: '#777' }}>
                Base rate: ₹{pDetails.hourlyRate || 25}/hr • Pay after inspection
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Booking Confirmation Modal ── */}
      {isBookingOpen && (
        <BookingModal 
          provider={provider} 
          initialDate={selectedDateObj.fullDate}
          initialTime={selectedTimeSlot}
          onClose={() => setIsBookingOpen(false)} 
          onSuccess={() => {
            alert('Booking requested successfully!');
            setIsBookingOpen(false);
            navigate('/customer-dashboard');
          }} 
        />
      )}
    </div>
  );
};

export default ProviderProfile;
