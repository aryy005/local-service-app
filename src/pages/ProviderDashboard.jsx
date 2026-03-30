import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, X, Calendar, Clock, User as UserIcon, Edit2, Save, Navigation, Phone, MapPin } from 'lucide-react';
import { getCurrentLocationName } from '../utils/geolocation';

const ProviderDashboard = () => {
  const { user, token, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'profile'

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    hourlyRate: '',
    location: '',
    description: ''
  });

  const fetchJobs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/bookings', {
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
        location: user.providerDetails?.location || '',
        description: user.providerDetails?.description || ''
      });
    }

    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, navigate]);

  const updateJobStatus = async (id, status) => {
    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchJobs();
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
          location: formData.location,
          description: formData.description
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
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setActiveTab('profile')}
          >
            My Profile
          </button>
        </div>
      </div>

      {activeTab === 'jobs' && (
        <div className="jobs-section">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: 'var(--primary-color)', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem' }}>{newJobs.length}</span>
            New Requests
          </h2>

          <div className="jobs-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
            {newJobs.length > 0 ? newJobs.map(job => (
              <JobCard key={job._id} job={job} updateJobStatus={updateJobStatus} />
            )) : <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No new job requests</div>}
          </div>

          <h2 style={{ marginBottom: '1.5rem' }}>Previous / Accepted Orders</h2>
          <div className="jobs-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {pastJobs.length > 0 ? pastJobs.map(job => (
              <JobCard key={job._id} job={job} updateJobStatus={updateJobStatus} />
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
                <div className="form-group">
                  <label>Hourly Rate (₹)</label>
                  <input type="number" value={formData.hourlyRate} onChange={e => setFormData({...formData, hourlyRate: e.target.value})} required className="form-control" />
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
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Hourly Rate</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>₹{user.providerDetails?.hourlyRate}</p>
              </div>
              <div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Location Area</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{user.providerDetails?.location}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Bio / Description</p>
                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{user.providerDetails?.description}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper component for rendering jobs
const JobCard = ({ job, updateJobStatus }) => (
  <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserIcon size={20} color="var(--primary-color)" />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{job.customerId?.name || 'Customer'}</h3>
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
              onClick={() => updateJobStatus(job._id, 'declined')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              <X size={16} /> Decline
            </button>
          </div>
        )}
        {job.status === 'accepted' && (
          <button 
            onClick={() => updateJobStatus(job._id, 'completed')}
            className="btn btn-outline mt-2"
          >
            Mark as Completed
          </button>
        )}
      </div>
    </div>
  </div>
);

export default ProviderDashboard;
