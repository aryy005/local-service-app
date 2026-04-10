import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, X, Calendar, Clock, User as UserIcon, Edit2, Save, Navigation, Phone, MapPin } from 'lucide-react';
import { getCurrentLocationName } from '../utils/geolocation';
import { API_URL } from '../config';
import ChatModal from '../components/ChatModal';
import { MessageSquare } from 'lucide-react';

const ProviderDashboard = () => {
  const { user, token, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'profile'
  const [activeChat, setActiveChat] = useState(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    hourlyRate: '',
    experienceYears: '',
    location: '',
    description: '',
    upiId: ''
  });

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
        hourlyRate: user.providerDetails?.hourlyRate || '',
        experienceYears: user.providerDetails?.experienceYears || '',
        location: user.providerDetails?.location || '',
        description: user.providerDetails?.description || '',
        upiId: user.providerDetails?.upiId || ''
      });
    }

    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, navigate]);

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
      if (res.ok) fetchJobs();
    } catch (err) {
      console.error(err);
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
      setFormData(prev => ({ ...prev, location }));
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLocating(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
        providerDetails: {
          hourlyRate: Number(formData.hourlyRate),
          experienceYears: Number(formData.experienceYears) || 0,
          location: formData.location,
          description: formData.description,
          upiId: formData.upiId
        }
      });
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container mt-8 text-center">Loading your requests...</div>;

  const newJobs = jobs.filter(j => j.status === 'pending');
  const pastJobs = jobs.filter(j => j.status !== 'pending');

  return (
    <div className="container fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="section-header" style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1>Provider Dashboard</h1>
        <p className="subtitle" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Manage your incoming jobs and profile.</p>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button 
            className={`btn ${activeTab === 'jobs' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setActiveTab('jobs')}
          >
            My Jobs
          </button>
          <button 
            className={`btn ${activeTab === 'earnings' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setActiveTab('earnings')}
          >
            Earnings
          </button>
          <button 
            className={`btn ${activeTab === 'wallet' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setActiveTab('wallet')}
          >
            Wallet
          </button>
          <button 
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setActiveTab('profile')}
          >
            My Profile
          </button>
        </div>
      </div>

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
              <JobCard key={job._id} job={job} updateJobStatus={updateJobStatus} rateCustomer={rateCustomer} openChat={() => setActiveChat(job)} />
            )) : <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No new job requests</div>}
          </div>

          <h2 style={{ marginBottom: '1.5rem' }}>Previous / Accepted Orders</h2>
          <div className="jobs-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {pastJobs.length > 0 ? pastJobs.map(job => (
              <JobCard key={job._id} job={job} updateJobStatus={updateJobStatus} rateCustomer={rateCustomer} openChat={() => setActiveChat(job)} />
            )) : <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No previous orders found</div>}
          </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Hourly Rate (₹)</label>
                    <input type="number" value={formData.hourlyRate} onChange={e => setFormData({...formData, hourlyRate: e.target.value})} required className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Years of Exp.</label>
                    <input type="number" value={formData.experienceYears} onChange={e => setFormData({...formData, experienceYears: e.target.value})} required className="form-control" min="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Location Area</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required className="form-control" style={{ width: '100%', paddingRight: '2.5rem' }} />
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
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Bio / Description</label>
                  <textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required className="form-control" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'var(--text-main)' }}></textarea>
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
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Phone Number</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{user.phone}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Hourly Rate</p>
                  <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>₹{user.providerDetails?.hourlyRate}</p>
                </div>
                <div>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Years of Experience</p>
                  <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{user.providerDetails?.experienceYears} Years</p>
                </div>
              </div>
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Location Area</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{user.providerDetails?.location}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Bio / Description</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{user.providerDetails?.description}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Verification Status</p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
const JobCard = ({ job, updateJobStatus, openChat, rateCustomer }) => (
  <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
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
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{job.customerId?.email} | <Phone size={12}/> {job.customerId?.phone}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}><Calendar size={18} color="var(--primary-color)" /> {job.date}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}><Clock size={18} color="var(--primary-color)"/> {job.timePreference}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}><MapPin size={18} color="var(--primary-color)"/> {job.serviceAddress}</span>
        </div>
        
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '3px solid var(--primary-color)' }}>
          <p style={{ margin: 0 }}>"{job.description}"</p>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ marginBottom: '1rem', fontWeight: 600, color: job.status === 'pending' ? 'var(--warning-color)' : job.status === 'accepted' ? 'var(--accent-color)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
          {job.status}
        </div>
        
        {job.status === 'pending' && (
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
            <button 
              onClick={() => updateJobStatus(job._id, 'accepted')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              <Check size={16} /> Accept Job
            </button>
            <button 
              onClick={openChat}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--primary-color)', border: '1px solid var(--primary-color)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              <MessageSquare size={16} /> Message
            </button>
            <button 
              onClick={() => updateJobStatus(job._id, 'declined')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              <X size={16} /> Decline
            </button>
          </div>
        )}
        {job.status === 'accepted' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={() => {
                const amt = window.prompt("Enter final amount earned (₹):");
                if (amt !== null) updateJobStatus(job._id, 'completed', { finalPrice: amt || 0 });
              }}
              className="btn btn-outline"
            >
              Mark as Completed
            </button>
            <button 
              onClick={openChat}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--primary-color)', border: '1px solid var(--primary-color)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              <MessageSquare size={16} /> Message
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

export default ProviderDashboard;
