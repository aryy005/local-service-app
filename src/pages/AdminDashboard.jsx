import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import toast from 'react-hot-toast';
import { 
  MapPin, Search, Bell, Calendar, ChevronRight, ArrowRight,
  User, Users, ShieldCheck, Layers, Briefcase, MessageSquare, 
  AlertCircle, BarChart2, TrendingUp, Settings, LayoutDashboard,
  Zap, PlusSquare, UserPlus, Send, FileText, Check, MoreHorizontal,
  X, CheckCircle, Clock, AlertTriangle, ChevronDown, ExternalLink,
  Wrench, Scissors, Paintbrush, Snowflake, Trash2, Edit2, LogOut,
  IndianRupee, Activity, Star, Eye, RefreshCw
} from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Time filter for bookings overview chart
  const [chartTimeRange, setChartTimeRange] = useState('7 Days');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Global search input
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Admin user menu dropdown
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);

  // Loading & Data State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real Database Synchronized State
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCustomers: 0,
    totalProviders: 0,
    verifiedProvidersCount: 0,
    pendingProvidersCount: 0,
    suspendedProvidersCount: 0,
    totalBookings: 0,
    bookingsToday: 0,
    totalGrossVolume: 0,
    totalPlatformRevenue: 0,
    revenueThisMonth: 0,
    totalPaidBookingsCount: 0,
    attention: { providersAwaiting: 0, reportedReviews: 0, unresolvedComplaints: 0 },
    systemHealth: { status: 'Operational', uptimeSeconds: 0, memoryUsageMB: 0 }
  });

  const [providersList, setProvidersList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [complaintsList, setComplaintsList] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [chartPoints, setChartPoints] = useState([]);

  // Provider Filter & Detail Selection
  const [providerSearch, setProviderSearch] = useState('');
  const [providerStatusFilter, setProviderStatusFilter] = useState('All');
  const [providerCategoryFilter, setProviderCategoryFilter] = useState('All');
  const [selectedDetailProvider, setSelectedDetailProvider] = useState(null);
  const [providerDetailTab, setProviderDetailTab] = useState('profile');

  // Customer filter
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerCityFilter, setCustomerCityFilter] = useState('all');

  // Provider editing state
  const [isEditingProvider, setIsEditingProvider] = useState(false);
  const [editProviderForm, setEditProviderForm] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'Electrician',
    location: 'Chandigarh',
    hourlyRate: 350,
    experienceYears: 3,
    status: 'Verified',
    rating: 5.0
  });

  // Customer editing state
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editCustomerForm, setEditCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: ''
  });

  // Platform settings state
  const [platformSettings, setPlatformSettings] = useState({
    platformName: 'LocalFixr',
    platformCommission: 15,
    adminEmail: 'admin@localfixr.com'
  });

  // Form states
  const [newProviderForm, setNewProviderForm] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'Electrician',
    location: 'Chandigarh',
    hourlyRate: 350,
    experienceYears: 3
  });

  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    category: 'Electrician',
    basePrice: '',
    description: ''
  });

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    audience: 'all'
  });

  // Close admin menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) {
        setIsAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CENTRALIZED REAL DATABASE SYNCHRONIZATION FUNCTION
  // ═══════════════════════════════════════════════════════════════
  const loadAdminData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const [statsRes, provRes, custRes, ordersRes, compRes, revRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers }),
        fetch(`${API_URL}/admin/providers`, { headers }),
        fetch(`${API_URL}/admin/customers`, { headers }),
        fetch(`${API_URL}/admin/orders`, { headers }),
        fetch(`${API_URL}/admin/complaints`, { headers }),
        fetch(`${API_URL}/admin/reviews`, { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        if (statsData.chartPoints && statsData.chartPoints.length > 0) {
          setChartPoints(statsData.chartPoints);
        }
        if (statsData.recentActivities) {
          setRecentActivities(statsData.recentActivities);
        }
        if (statsData.topServices) {
          setTopServices(statsData.topServices);
        }
      }

      if (provRes.ok) {
        const provData = await provRes.json();
        setProvidersList(Array.isArray(provData) ? provData : []);
      }

      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomersList(Array.isArray(custData) ? custData : []);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrdersList(Array.isArray(ordersData) ? ordersData : []);
      }

      if (compRes.ok) {
        const compData = await compRes.json();
        setComplaintsList(Array.isArray(compData) ? compData : []);
      }

      if (revRes.ok) {
        const revData = await revRes.json();
        setReviewsList(Array.isArray(revData) ? revData : []);
      }
    } catch (err) {
      console.error('Failed to load live admin data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial Data Load & Periodic Sync
  useEffect(() => {
    loadAdminData();
    const interval = setInterval(() => {
      loadAdminData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [token]);

  // Derived Providers Awaiting Verification
  const awaitingProviders = useMemo(() => {
    return providersList.filter(p => p.status === 'Pending');
  }, [providersList]);

  // Filtered Providers calculation
  const filteredProviders = useMemo(() => {
    return providersList.filter(p => {
      const q = providerSearch.toLowerCase().trim();
      const matchesSearch = !q || 
                            p.name.toLowerCase().includes(q) ||
                            p.category.toLowerCase().includes(q) ||
                            p.location.toLowerCase().includes(q) ||
                            p.phone.includes(q) ||
                            p.email.toLowerCase().includes(q);
      const matchesStatus = providerStatusFilter === 'All' || p.status === providerStatusFilter;
      const matchesCategory = providerCategoryFilter === 'All' || p.category === providerCategoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [providersList, providerSearch, providerStatusFilter, providerCategoryFilter]);

  // Filtered Customers calculation
  const filteredCustomers = useMemo(() => {
    return customersList.filter(c => {
      const q = customerSearch.toLowerCase().trim();
      const matchesSearch = !q || 
                            c.name.toLowerCase().includes(q) || 
                            c.email.toLowerCase().includes(q) || 
                            (c.phone && c.phone.includes(q));
      const matchesCity = customerCityFilter === 'all' || 
                          (c.city && c.city.toLowerCase() === customerCityFilter.toLowerCase()) ||
                          (c.addressDetails?.city && c.addressDetails.city.toLowerCase() === customerCityFilter.toLowerCase());
      return matchesSearch && matchesCity;
    });
  }, [customersList, customerSearch, customerCityFilter]);

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER ACTIONS (MUTATES REAL MONGODB DATABASE)
  // ═══════════════════════════════════════════════════════════════
  const handleUpdateProviderStatus = async (id, status, successMsg) => {
    try {
      const res = await fetch(`${API_URL}/admin/providers/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Status update failed');
      }

      const resData = await res.json();
      toast.success(successMsg);
      // Update selected detail provider in modal
      if (selectedDetailProvider && (selectedDetailProvider.id === id || selectedDetailProvider._id === id)) {
        setSelectedDetailProvider(prev => ({ 
          ...prev, 
          status, 
          providerId: resData?.provider?.providerId || prev.providerId || `LFX-PRV-${(id || '').slice(-4).toUpperCase()}`,
          idCardIssued: status === 'Verified'
        }));
      }
      // Refetch live records
      await loadAdminData(true);
    } catch (err) {
      toast.error(err.message || 'Failed to update provider status');
    }
  };

  const handleVerifyProvider = (id) => {
    handleUpdateProviderStatus(id, 'Verified', 'Provider verified and activated successfully!');
  };

  const handleRejectProvider = (id) => {
    handleUpdateProviderStatus(id, 'Rejected', 'Provider verification rejected.');
  };

  const handleSuspendProvider = (id) => {
    handleUpdateProviderStatus(id, 'Suspended', 'Provider account suspended. Booking privileges disabled.');
  };

  const handleRestoreProvider = (id) => {
    handleUpdateProviderStatus(id, 'Verified', 'Provider restored and account reactivated successfully!');
  };

  const handleSendWelcomeEmail = async (id) => {
    try {
      toast.loading('Dispatching welcome email with Digital ID Card...', { id: 'email-send' });
      const res = await fetch(`${API_URL}/admin/providers/${id}/send-welcome-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      toast.dismiss('email-send');
      if (!res.ok) throw new Error(data.message || 'Failed to dispatch welcome email');
      
      toast.success(data.message || 'Welcome email with Digital ID Card dispatched successfully!');
      setSelectedDetailProvider(prev => prev ? { ...prev, welcomeEmailSent: true, welcomeEmailSentAt: new Date(), providerId: data.providerId || prev.providerId } : null);
      
      if (data.previewUrl) {
        window.open(data.previewUrl, '_blank');
      }
      await loadAdminData(true);
    } catch (err) {
      toast.dismiss('email-send');
      toast.error(err.message || 'Failed to send welcome email');
    }
  };

  const handleOpenProviderDetail = (provider, initialTab = 'profile', startEditing = false) => {
    setSelectedDetailProvider(provider);
    setProviderDetailTab(initialTab);
    setIsEditingProvider(startEditing);

    const rateNum = typeof provider.hourlyRate === 'string'
      ? parseFloat(provider.hourlyRate.replace(/[^0-9.]/g, '')) || 350
      : provider.hourlyRate || 350;
    const expNum = typeof provider.experience === 'string'
      ? parseInt(provider.experience.replace(/[^0-9]/g, '')) || 3
      : provider.experienceYears || 3;

    setEditProviderForm({
      name: provider.name || '',
      email: provider.email || '',
      phone: provider.phone || '',
      category: provider.category || 'Electrician',
      location: provider.location || 'Chandigarh',
      hourlyRate: rateNum,
      experienceYears: expNum,
      status: provider.status || 'Verified',
      rating: provider.rating || 5.0
    });
  };

  // Save Provider Edited Details
  const handleSaveProviderDetails = async (e) => {
    e.preventDefault();
    if (!selectedDetailProvider) return;
    const pId = selectedDetailProvider.id || selectedDetailProvider._id;

    try {
      const res = await fetch(`${API_URL}/admin/providers/${pId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editProviderForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update provider');

      toast.success('Provider details updated successfully!');
      setIsEditingProvider(false);

      // Update in modal
      setSelectedDetailProvider(prev => ({
        ...prev,
        ...editProviderForm,
        hourlyRate: '₹' + editProviderForm.hourlyRate + '/hr',
        experience: editProviderForm.experienceYears + ' years'
      }));

      // Update in list
      setProvidersList(prev => prev.map(p => {
        if ((p.id || p._id) === pId) {
          return {
            ...p,
            ...editProviderForm,
            hourlyRate: '₹' + editProviderForm.hourlyRate + '/hr',
            experience: editProviderForm.experienceYears + ' years'
          };
        }
        return p;
      }));

      await loadAdminData(true);
    } catch (err) {
      toast.error(err.message || 'Failed to update provider');
    }
  };

  // Open Edit Customer Modal
  const handleOpenEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setEditCustomerForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      city: customer.city || customer.addressDetails?.city || ''
    });
  };

  // Save Customer Edited Details
  const handleSaveCustomerDetails = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    const cId = editingCustomer.id || editingCustomer._id;

    try {
      const res = await fetch(`${API_URL}/admin/customers/${cId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editCustomerForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update customer');

      toast.success('Customer details updated successfully!');
      setEditingCustomer(null);

      // Update in local list
      setCustomersList(prev => prev.map(c => {
        if ((c.id || c._id) === cId) {
          return {
            ...c,
            ...editCustomerForm
          };
        }
        return c;
      }));

      await loadAdminData(true);
    } catch (err) {
      toast.error(err.message || 'Failed to update customer');
    }
  };

  // Live Update Order / Booking Stage
  const handleUpdateOrderStatus = async (id, serviceStage) => {
    try {
      const res = await fetch(`${API_URL}/admin/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ serviceStage })
      });

      if (!res.ok) throw new Error('Failed to update order status');

      toast.success(`Order status updated to ${serviceStage.replace('_', ' ').toUpperCase()}!`);
      setOrdersList(prev => prev.map(o => {
        if ((o._id || o.id) === id) {
          return {
            ...o,
            status: serviceStage,
            statusLabel: serviceStage.replace('_', ' ').toUpperCase()
          };
        }
        return o;
      }));
      await loadAdminData(true);
    } catch (err) {
      toast.error(err.message || 'Failed to update order');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(platformSettings)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      toast.success('Platform configuration saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    }
  };

  // Onboard New Provider into MongoDB
  const handleAddProviderSubmit = async (e) => {
    e.preventDefault();
    if (!newProviderForm.name || !newProviderForm.email) {
      toast.error('Please fill in name and email');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/admin/providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newProviderForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create provider');

      toast.success(`Provider "${newProviderForm.name}" onboarded into database!`);
      setShowAddProviderModal(false);
      setNewProviderForm({
        name: '',
        email: '',
        phone: '',
        category: 'Electrician',
        location: 'Chandigarh',
        hourlyRate: 350,
        experienceYears: 3
      });
      await loadAdminData(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Delete Customer Account
  const handleDeleteCustomer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name} and all linked records?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete customer');
      toast.success(`Customer account "${name}" deleted.`);
      await loadAdminData(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Resolve Customer Complaint
  const handleResolveComplaint = async (id) => {
    try {
      const res = await fetch(`${API_URL}/admin/complaints/${id}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resolutionNotes: 'Resolved by Super Administrator' })
      });
      if (!res.ok) throw new Error('Failed to resolve complaint');
      toast.success('Complaint ticket resolved successfully!');
      await loadAdminData(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Delete / Dismiss Inappropriate Review
  const handleDeleteReview = async (id) => {
    try {
      const res = await fetch(`${API_URL}/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to remove review');
      toast.success('Review removed from public platform.');
      await loadAdminData(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Add Service Offering
  const handleAddServiceSubmit = (e) => {
    e.preventDefault();
    setShowAddServiceModal(false);
    toast.success(`Service "${newServiceForm.name}" registered!`);
    setNewServiceForm({ name: '', category: 'Electrician', basePrice: '', description: '' });
  };

  // Send Broadcast Notification
  const handleSendNotificationSubmit = (e) => {
    e.preventDefault();
    setShowNotificationModal(false);
    toast.success(`Broadcast message sent to ${notificationForm.audience}!`);
    setNotificationForm({ title: '', message: '', audience: 'all' });
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Generates smooth spline path passing strictly through each point
  const getSmoothSpline = (pts) => {
    if (!pts || pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const chartCurveD = useMemo(() => getSmoothSpline(chartPoints), [chartPoints]);
  const chartAreaD = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return `${chartCurveD} L ${chartPoints[chartPoints.length - 1].x} 160 L ${chartPoints[0].x} 160 Z`;
  }, [chartCurveD, chartPoints]);

  return (
    <div className="admin-portal-layout fade-in">
      {/* ═══════════════════════════════════════════════════════════════
         LEFT SIDEBAR (Dark Navy)
      ═══════════════════════════════════════════════════════════════ */}
      <aside className="admin-sidebar">
        {/* Brand Header */}
        <div className="admin-sidebar-header">
          <div className="admin-brand-icon">
            <MapPin size={18} fill="#FFFFFF" color="#2563EB" />
          </div>
          <div className="admin-brand-text">
            <span className="admin-brand-title">LocalFixr</span>
            <span className="admin-brand-sub">Admin Portal</span>
          </div>
        </div>

        {/* Live Synchronized Badge */}
        <div className="admin-live-sync-badge">
          <span className="admin-live-sync-dot"></span>
          <span>Live Synchronized with MongoDB</span>
        </div>

        {/* Navigation Sections */}
        <div className="admin-sidebar-nav-scroll">
          <div className="admin-nav-group">
            <div className="admin-nav-section-title">OVERVIEW</div>
            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>
          </div>

          <div className="admin-nav-group">
            <div className="admin-nav-section-title">MANAGEMENT</div>
            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveTab('customers')}
            >
              <User size={16} />
              <span>Customers</span>
              <span className="admin-nav-badge">{customersList.length}</span>
            </button>

            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'providers' ? 'active' : ''}`}
              onClick={() => setActiveTab('providers')}
            >
              <Users size={16} />
              <span>Providers</span>
              <span className="admin-nav-badge">{providersList.length}</span>
            </button>

            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'verification' ? 'active' : ''}`}
              onClick={() => setActiveTab('verification')}
            >
              <ShieldCheck size={16} />
              <span>Verification</span>
              {awaitingProviders.length > 0 && (
                <span className="admin-nav-badge orange">{awaitingProviders.length}</span>
              )}
            </button>
          </div>

          <div className="admin-nav-group">
            <div className="admin-nav-section-title">SERVICES & OPERATIONS</div>
            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              <Layers size={16} />
              <span>Categories</span>
            </button>

            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              <Briefcase size={16} />
              <span>Services</span>
            </button>

            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookings')}
            >
              <Calendar size={16} />
              <span>Bookings</span>
              <span className="admin-nav-badge blue">{ordersList.length}</span>
            </button>

            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <Star size={16} />
              <span>Reviews</span>
              <span className="admin-nav-badge">{reviewsList.length}</span>
            </button>

            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'complaints' ? 'active' : ''}`}
              onClick={() => setActiveTab('complaints')}
            >
              <AlertCircle size={16} />
              <span>Complaints</span>
              {complaintsList.filter(c => c.status !== 'resolved').length > 0 && (
                <span className="admin-nav-badge red">{complaintsList.filter(c => c.status !== 'resolved').length}</span>
              )}
            </button>
          </div>

          <div className="admin-nav-group">
            <div className="admin-nav-section-title">FINANCE & ANALYTICS</div>
            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <BarChart2 size={16} />
              <span>Reports</span>
            </button>

            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'revenue' ? 'active' : ''}`}
              onClick={() => setActiveTab('revenue')}
            >
              <TrendingUp size={16} />
              <span>Revenue</span>
            </button>
          </div>

          <div className="admin-nav-group">
            <div className="admin-nav-section-title">SYSTEM</div>
            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={16} />
              <span>Notifications</span>
            </button>

            <button 
              type="button" 
              className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-support-box">
            <div className="admin-support-icon">
              <ShieldCheck size={16} color="#2563EB" />
            </div>
            <div>
              <div className="admin-support-title">LocalFixr Database</div>
              <div className="admin-support-sub">MongoDB Atlas / Local</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════
         MAIN CONTENT AREA
      ═══════════════════════════════════════════════════════════════ */}
      <div className="admin-main-wrap">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="admin-search-wrapper">
            <Search size={16} color="#64748B" />
            <input 
              type="text" 
              placeholder="Search providers, customers, bookings..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </div>

          <div className="admin-topbar-right">
            {/* Admin Profile Capsule */}
            <div className="admin-user-menu-wrapper" ref={adminMenuRef} style={{ position: 'relative' }}>
              <div 
                className="admin-user-profile-pill"
                onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              >
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" 
                  alt="Admin" 
                  className="admin-avatar-img"
                />
                <div className="admin-user-details">
                  <div className="admin-user-name">Admin</div>
                  <div className="admin-user-role">Super Admin</div>
                </div>
              </div>

              {isAdminMenuOpen && (
                <div className="lp-pill-menu fade-in" style={{ right: 0, width: '200px' }}>
                  <div className="lp-pill-menu-header">
                    <div className="lp-pill-user-name">Admin</div>
                    <div className="lp-pill-user-email">admin@localfixr.com</div>
                    <span className="lp-pill-role-badge">SUPER ADMIN</span>
                  </div>
                  <div className="lp-pill-divider" />
                  <button 
                    type="button" 
                    className="lp-pill-menu-item" 
                    onClick={() => { setActiveTab('settings'); setIsAdminMenuOpen(false); }}
                  >
                    <Settings size={15} />
                    <span>Portal Settings</span>
                  </button>
                  <button 
                    type="button" 
                    className="lp-pill-menu-item lp-pill-logout" 
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
           MAIN DASHBOARD VIEW (100% Real-Time Synchronized)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <main className="admin-content-inner">
            {/* Greeting Header & Date Widget */}
            <div className="admin-greeting-row">
              <div>
                <h1 className="admin-greeting-title">Good morning, Admin 👋</h1>
                <p className="admin-greeting-sub">Real-time platform overview synchronized with database.</p>
              </div>

              <div className="admin-date-pill-widget">
                <Calendar size={18} color="#2563EB" />
                <div className="admin-date-pill-text">
                  <span className="admin-date-pill-day">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="admin-date-pill-sub">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Top KPI Stat Cards (Real Database Values) */}
            <div className="admin-kpi-grid">
              {/* Card 1: Total Users */}
              <div className="admin-kpi-card">
                <div className="admin-kpi-top">
                  <div className="admin-kpi-icon-wrap blue">
                    <User size={18} />
                  </div>
                  <span className="admin-kpi-title">Total Users</span>
                </div>
                <div className="admin-kpi-body">
                  <span className="admin-kpi-val">{stats.totalUsers || 0}</span>
                  <span className="admin-kpi-trend">Live</span>
                </div>
                <div className="admin-kpi-bottom">
                  <span className="admin-kpi-sub">{stats.totalCustomers || 0} customers • {stats.totalProviders || 0} providers</span>
                  <svg className="admin-kpi-sparkline" viewBox="0 0 90 32" fill="none">
                    <path d="M0 24 Q 25 15, 45 22 T 90 6" stroke="#2563EB" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Service Providers */}
              <div className="admin-kpi-card">
                <div className="admin-kpi-top">
                  <div className="admin-kpi-icon-wrap green">
                    <Users size={18} />
                  </div>
                  <span className="admin-kpi-title">Service Providers</span>
                </div>
                <div className="admin-kpi-body">
                  <span className="admin-kpi-val">{stats.totalProviders || 0}</span>
                  <span className="admin-kpi-trend green">✓ {stats.verifiedProvidersCount || 0}</span>
                </div>
                <div className="admin-kpi-bottom">
                  <span className="admin-kpi-sub">{stats.pendingProvidersCount || 0} pending verification</span>
                  <svg className="admin-kpi-sparkline" viewBox="0 0 90 32" fill="none">
                    <path d="M0 26 Q 30 20, 50 25 T 90 8" stroke="#10B981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Card 3: Bookings Today */}
              <div className="admin-kpi-card">
                <div className="admin-kpi-top">
                  <div className="admin-kpi-icon-wrap purple">
                    <Calendar size={18} />
                  </div>
                  <span className="admin-kpi-title">Bookings Today</span>
                </div>
                <div className="admin-kpi-body">
                  <span className="admin-kpi-val">{stats.bookingsToday || 0}</span>
                  <span className="admin-kpi-trend purple">{stats.totalBookings || 0} total</span>
                </div>
                <div className="admin-kpi-bottom">
                  <span className="admin-kpi-sub">Lifetime orders: {stats.totalBookings || 0}</span>
                  <svg className="admin-kpi-sparkline" viewBox="0 0 90 32" fill="none">
                    <path d="M0 28 Q 30 25, 55 26 T 90 10" stroke="#8B5CF6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Card 4: Revenue This Month */}
              <div className="admin-kpi-card">
                <div className="admin-kpi-top">
                  <div className="admin-kpi-icon-wrap orange">
                    <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>₹</span>
                  </div>
                  <span className="admin-kpi-title">Revenue This Month</span>
                </div>
                <div className="admin-kpi-body">
                  <span className="admin-kpi-val">
                    ₹{stats.revenueThisMonth ? (stats.revenueThisMonth >= 100000 ? (stats.revenueThisMonth / 100000).toFixed(1) + 'L' : stats.revenueThisMonth.toLocaleString('en-IN')) : '0'}
                  </span>
                  <span className="admin-kpi-trend orange">15% fee</span>
                </div>
                <div className="admin-kpi-bottom">
                  <span className="admin-kpi-sub">Total vol: ₹{stats.totalGrossVolume ? stats.totalGrossVolume.toLocaleString('en-IN') : 0}</span>
                  <svg className="admin-kpi-sparkline" viewBox="0 0 90 32" fill="none">
                    <path d="M0 26 Q 30 22, 50 24 T 90 6" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
               ROW 1: BOOKINGS OVERVIEW CHART & RECENT ACTIVITY
            ═══════════════════════════════════════════════════════════════ */}
            <div className="admin-mid-grid">
              {/* Col 1: Bookings Overview Chart */}
              <div className="admin-panel-card admin-chart-panel">
                <div className="admin-card-head">
                  <div className="admin-card-title-group">
                    <TrendingUp size={18} />
                    <span>Bookings Overview</span>
                  </div>

                  <div className="admin-time-pill-group">
                    {['7 Days', '30 Days', 'All Time'].map(r => (
                      <button 
                        key={r} 
                        type="button" 
                        className={`admin-time-pill ${chartTimeRange === r ? 'active' : ''}`}
                        onClick={() => setChartTimeRange(r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Line Chart */}
                <div className="admin-chart-wrapper">
                  {chartPoints.length > 0 ? (
                    <svg className="admin-svg-chart" viewBox="0 0 540 180" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.00" />
                        </linearGradient>
                      </defs>

                      <line x1="45" y1="40" x2="495" y2="40" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="45" y1="80" x2="495" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="45" y1="120" x2="495" y2="120" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="45" y1="160" x2="495" y2="160" stroke="#E2E8F0" strokeWidth="1" />

                      {chartAreaD && <path d={chartAreaD} fill="url(#chartGradient)" />}
                      {chartCurveD && (
                        <path 
                          d={chartCurveD} 
                          fill="none" 
                          stroke="#2563EB" 
                          strokeWidth="3.2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                        />
                      )}

                      {chartPoints.map((pt, idx) => (
                        <g key={idx}>
                          <circle 
                            cx={pt.x} 
                            cy={pt.y} 
                            r={hoveredPoint === idx ? 6 : 4} 
                            fill="#FFFFFF" 
                            stroke="#2563EB" 
                            strokeWidth="2.5"
                            style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                            onMouseEnter={() => setHoveredPoint(idx)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          <text 
                            x={pt.x} 
                            y="175" 
                            textAnchor="middle" 
                            fill="#94A3B8" 
                            fontSize="10.5" 
                            fontFamily="inherit"
                          >
                            {pt.date}
                          </text>
                        </g>
                      ))}
                    </svg>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: '0.85rem' }}>
                      No booking trend data yet. New bookings will automatically draw the chart.
                    </div>
                  )}

                  {hoveredPoint !== null && chartPoints[hoveredPoint] && (
                    <div 
                      className="admin-chart-tooltip"
                      style={{ 
                        left: `${(chartPoints[hoveredPoint].x / 540) * 100}%`, 
                        top: `${(chartPoints[hoveredPoint].y / 180) * 100 - 25}%` 
                      }}
                    >
                      <span>{chartPoints[hoveredPoint].date}: <strong>{chartPoints[hoveredPoint].val} bookings</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Col 2: Recent Activity Feed (Live from DB) */}
              <div className="admin-panel-card">
                <div className="admin-card-head">
                  <div className="admin-card-title-group">
                    <Activity size={18} />
                    <span>Live Platform Activity</span>
                  </div>
                </div>

                <div className="admin-activity-list">
                  {recentActivities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.82rem' }}>
                      No recent activities recorded yet.
                    </div>
                  ) : (
                    recentActivities.map(act => (
                      <div key={act.id} className="admin-activity-item">
                        <div className={`admin-activity-icon-badge ${act.badgeClass}`}>
                          {act.type === 'booking' ? <Zap size={15} /> : act.type === 'complaint' ? <AlertCircle size={15} /> : <User size={15} />}
                        </div>
                        <div className="admin-activity-info">
                          <div className="admin-activity-title">{act.title}</div>
                          <div className="admin-activity-desc">{act.desc}</div>
                        </div>
                        <div className="admin-activity-time">
                          <span>{act.time}</span>
                          <ChevronRight size={13} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
               ROW 2: PROVIDERS AWAITING VERIFICATION, TOP SERVICES, MAP VIEW
            ═══════════════════════════════════════════════════════════════ */}
            <div className="admin-lower-grid">
              {/* Col 1: Providers Awaiting Verification */}
              <div className="admin-panel-card">
                <div className="admin-card-head">
                  <div className="admin-card-title-group">
                    <Users size={18} />
                    <span>Providers Awaiting Verification</span>
                  </div>
                  <span 
                    className="admin-link-arrow" 
                    onClick={() => setActiveTab('verification')}
                  >
                    View All →
                  </span>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th>Category</th>
                        <th>Location</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awaitingProviders.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '0.82rem' }}>
                            ✓ All providers are verified! No pending applications.
                          </td>
                        </tr>
                      ) : (
                        awaitingProviders.slice(0, 4).map(p => (
                          <tr key={p.id || p._id}>
                            <td>
                              <div className="admin-prov-cell">
                                <img src={p.avatar} alt={p.name} className="admin-prov-img" />
                                <div>
                                  <div className="admin-prov-name">{p.name}</div>
                                  <div className="admin-prov-role">{p.category}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`admin-cat-pill ${p.categoryPill}`}>
                                {p.category}
                              </span>
                            </td>
                            <td>
                              <div className="admin-loc-cell">{p.location}</div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="admin-action-btns" style={{ justifyContent: 'flex-end' }}>
                                <button 
                                  type="button" 
                                  className="admin-view-btn"
                                  onClick={() => handleOpenProviderDetail(p, 'profile')}
                                >
                                  Review
                                </button>
                                <button 
                                  type="button" 
                                  className="admin-approve-btn"
                                  onClick={() => handleVerifyProvider(p.id || p._id)}
                                >
                                  Approve
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

              {/* Col 2: Top Services (Dynamic) */}
              <div className="admin-panel-card">
                <div className="admin-card-head">
                  <div className="admin-card-title-group">
                    <Briefcase size={18} />
                    <span>Top Services</span>
                  </div>
                  <span className="admin-link-arrow" onClick={() => setActiveTab('services')}>
                    View All →
                  </span>
                </div>

                <div className="admin-top-services-list">
                  {topServices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.82rem' }}>
                      Services will display here as providers register.
                    </div>
                  ) : (
                    topServices.map(s => (
                      <div key={s.id} className="admin-top-service-item">
                        <div className={`admin-service-icon-wrap ${s.type}`}>
                          <Briefcase size={16} />
                        </div>
                        <div className="admin-top-service-info">
                          <div className="admin-top-service-name">{s.name}</div>
                          <div className="admin-top-service-meta">{s.meta}</div>
                        </div>
                        <div className="admin-top-service-bookings">{s.bookings}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Col 3: Map View (Real Providers in Tricity) */}
              <div className="admin-panel-card">
                <div className="admin-card-head">
                  <div className="admin-card-title-group">
                    <MapPin size={18} />
                    <span>Tricity Coverage Map</span>
                  </div>
                  <span className="admin-link-arrow" onClick={() => setActiveTab('providers')}>
                    View All →
                  </span>
                </div>

                <div className="admin-map-container">
                  <svg width="100%" height="100%" viewBox="0 0 400 180" style={{ background: '#F1F5F9' }}>
                    <path d="M 10 10 Q 150 20, 260 10 T 390 40 L 390 170 Q 200 180, 10 170 Z" fill="#E2E8F0" opacity="0.6" />
                    <text x="250" y="55" fill="#94A3B8" fontSize="12" fontWeight="700">CHANDIGARH</text>
                    <text x="170" y="125" fill="#94A3B8" fontSize="12" fontWeight="700">MOHALI</text>
                    <text x="60" y="90" fill="#94A3B8" fontSize="12" fontWeight="700">KHARAR</text>

                    {/* Plot registered providers */}
                    {providersList.slice(0, 15).map((p, idx) => {
                      const hash = (p.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), idx * 37);
                      const cx = 80 + (hash % 240);
                      const cy = 40 + ((hash * 13) % 100);
                      const color = p.status === 'Verified' ? '#10B981' : p.status === 'Suspended' ? '#EF4444' : '#F59E0B';
                      return (
                        <g key={p.id || idx}>
                          <circle cx={cx} cy={cy} r="6" fill={color} opacity="0.85" />
                          <circle cx={cx} cy={cy} r="10" fill={color} opacity="0.25" />
                        </g>
                      );
                    })}
                  </svg>
                  <div className="admin-map-footer-note">
                    {providersList.length} registered service partners located across Chandigarh, Mohali & Kharar.
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
               ROW 3: NEEDS ATTENTION, QUICK ACTIONS, RECENT BOOKINGS
            ═══════════════════════════════════════════════════════════════ */}
            <div className="admin-bottom-grid">
              {/* Col 1: Needs Attention */}
              <div className="admin-panel-card">
                <div className="admin-card-head">
                  <div className="admin-card-title-group">
                    <AlertTriangle size={18} color="#EF4444" />
                    <span>Needs Attention</span>
                  </div>
                </div>

                <div className="admin-attention-grid">
                  <div className="admin-attention-box" onClick={() => setActiveTab('verification')}>
                    <div className="admin-attention-num orange">{awaitingProviders.length}</div>
                    <div className="admin-attention-label">
                      <span>Providers awaiting verification</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>

                  <div className="admin-attention-box" onClick={() => setActiveTab('reviews')}>
                    <div className="admin-attention-num orange">
                      {reviewsList.filter(r => r.rating <= 2).length}
                    </div>
                    <div className="admin-attention-label">
                      <span>Low rated reviews</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>

                  <div className="admin-attention-box" onClick={() => setActiveTab('complaints')}>
                    <div className="admin-attention-num red">
                      {complaintsList.filter(c => c.status !== 'resolved').length}
                    </div>
                    <div className="admin-attention-label">
                      <span>Unresolved complaints</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 2: Quick Actions */}
              <div className="admin-panel-card">
                <div className="admin-card-head">
                  <div className="admin-card-title-group">
                    <Zap size={18} color="#F59E0B" />
                    <span>Quick Actions</span>
                  </div>
                </div>

                <div className="admin-quick-actions-grid">
                  <button 
                    type="button" 
                    className="admin-quick-action-btn blue"
                    onClick={() => setShowAddProviderModal(true)}
                  >
                    <UserPlus size={20} />
                    <span className="admin-quick-action-label">Add Provider</span>
                  </button>

                  <button 
                    type="button" 
                    className="admin-quick-action-btn green"
                    onClick={() => setShowAddServiceModal(true)}
                  >
                    <PlusSquare size={20} />
                    <span className="admin-quick-action-label">Add Service</span>
                  </button>

                  <button 
                    type="button" 
                    className="admin-quick-action-btn orange"
                    onClick={() => setShowNotificationModal(true)}
                  >
                    <Send size={20} />
                    <span className="admin-quick-action-label">Broadcast</span>
                  </button>

                  <button 
                    type="button" 
                    className="admin-quick-action-btn purple"
                    onClick={() => setActiveTab('reports')}
                  >
                    <FileText size={20} />
                    <span className="admin-quick-action-label">Financials</span>
                  </button>
                </div>
              </div>

              {/* Col 3: Recent Bookings (Live from DB) */}
              <div className="admin-panel-card">
                <div className="admin-card-head">
                  <div className="admin-card-title-group">
                    <Calendar size={18} />
                    <span>Recent Bookings</span>
                  </div>
                  <span className="admin-link-arrow" onClick={() => setActiveTab('bookings')}>
                    View All →
                  </span>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Service</th>
                        <th>Provider</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersList.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '0.82rem' }}>
                            No customer bookings recorded yet.
                          </td>
                        </tr>
                      ) : (
                        ordersList.slice(0, 4).map(b => (
                          <tr key={b.id || b._id}>
                            <td style={{ fontWeight: 600, color: '#2563EB' }}>{b.id}</td>
                            <td style={{ color: '#0F172A', fontWeight: 500 }}>{b.service}</td>
                            <td style={{ color: '#475569' }}>{b.provider}</td>
                            <td>
                              <span className={`admin-status-pill ${b.status}`}>
                                {b.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ═══════════════════════════════════════════════════════════════
           SUB-VIEW: CUSTOMERS MANAGEMENT (Live from MongoDB)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'customers' && (
          <main className="admin-content-inner">
            <div className="admin-subview-card">
              <div className="admin-subview-header">
                <div>
                  <h2 className="admin-subview-title">Customer Accounts ({customersList.length})</h2>
                  <p style={{ color: '#64748B', fontSize: '0.82rem' }}>Live customer accounts registered in the database.</p>
                </div>
                <div className="admin-subview-actions">
                  <input 
                    type="text" 
                    placeholder="Filter customers..." 
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="admin-search-input" 
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.4rem 0.75rem', borderRadius: 6 }}
                  />
                  <select 
                    className="admin-filter-select"
                    value={customerCityFilter}
                    onChange={(e) => setCustomerCityFilter(e.target.value)}
                  >
                    <option value="all">All Cities</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Mohali">Mohali</option>
                    <option value="Kharar">Kharar</option>
                  </select>
                </div>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Total Bookings</th>
                    <th>Total Spent</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                        No customer accounts found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(c => (
                      <tr key={c.id || c._id}>
                        <td style={{ fontWeight: 700 }}>{c.name}</td>
                        <td style={{ color: '#64748B' }}>{c.email}</td>
                        <td>{c.phone || 'N/A'}</td>
                        <td>{c.city || c.addressDetails?.city || 'Tricity'}</td>
                        <td style={{ fontWeight: 600 }}>{c.totalBookings || 0}</td>
                        <td style={{ fontWeight: 700, color: '#10B981' }}>₹{c.totalSpent || 0}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <button 
                              className="admin-view-btn" 
                              style={{ color: '#2563EB', borderColor: '#BFDBFE' }}
                              onClick={() => handleOpenEditCustomer(c)}
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                            <button 
                              className="admin-view-btn" 
                              style={{ color: '#EF4444', borderColor: '#FECACA' }}
                              onClick={() => handleDeleteCustomer(c.id || c._id, c.name)}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {/* ═══════════════════════════════════════════════════════════════
           SUB-VIEW: 4. PROVIDER MANAGEMENT (Live Synchronized with MongoDB)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'providers' && (
          <main className="admin-content-inner">
            <div className="admin-subview-card admin-provider-mgmt-card">
              {/* Heading & Subtitle matching image */}
              <div className="admin-provider-top-header">
                <div>
                  <div className="admin-provider-tag-label">PROVIDERS</div>
                  <h2 className="admin-provider-main-title">4. Provider Management</h2>
                  <p className="admin-provider-main-sub">This should be one of the most important admin screens.</p>
                </div>
                <button 
                  type="button" 
                  className="admin-approve-btn"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.78rem' }}
                  onClick={() => setShowAddProviderModal(true)}
                >
                  + Add Provider
                </button>
              </div>

              {/* Status Counters Bar (Live DB Counts) */}
              <div className="admin-prov-stat-pills-row">
                <button 
                  type="button" 
                  className={`admin-prov-stat-pill ${providerStatusFilter === 'All' ? 'active' : ''}`}
                  onClick={() => setProviderStatusFilter('All')}
                >
                  <span className="admin-stat-count">{providersList.length}</span>
                  <span>All Providers</span>
                </button>
                <button 
                  type="button" 
                  className={`admin-prov-stat-pill ${providerStatusFilter === 'Verified' ? 'active' : ''}`}
                  onClick={() => setProviderStatusFilter('Verified')}
                >
                  <span className="admin-stat-count green">{providersList.filter(p => p.status === 'Verified').length}</span>
                  <span>Verified</span>
                </button>
                <button 
                  type="button" 
                  className={`admin-prov-stat-pill ${providerStatusFilter === 'Pending' ? 'active' : ''}`}
                  onClick={() => setProviderStatusFilter('Pending')}
                >
                  <span className="admin-stat-count orange">{providersList.filter(p => p.status === 'Pending').length}</span>
                  <span>Pending</span>
                </button>
                <button 
                  type="button" 
                  className={`admin-prov-stat-pill ${providerStatusFilter === 'Suspended' ? 'active' : ''}`}
                  onClick={() => setProviderStatusFilter('Suspended')}
                >
                  <span className="admin-stat-count red">{providersList.filter(p => p.status === 'Suspended').length}</span>
                  <span>Suspended</span>
                </button>
              </div>

              {/* Search and Filter Row: "Search providers...   Filter ▼" */}
              <div className="admin-provider-filter-toolbar">
                <div className="admin-search-wrapper" style={{ maxWidth: '320px', background: '#FFFFFF' }}>
                  <Search size={15} color="#64748B" />
                  <input 
                    type="text" 
                    placeholder="Search providers..." 
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    className="admin-search-input"
                  />
                </div>

                <div className="admin-provider-filter-controls">
                  <div className="admin-filter-select-wrap">
                    <span className="admin-filter-prefix-label">Filter ▼</span>
                    <select 
                      className="admin-filter-select"
                      value={providerStatusFilter}
                      onChange={(e) => setProviderStatusFilter(e.target.value)}
                    >
                      <option value="All">All Status</option>
                      <option value="Verified">Verified</option>
                      <option value="Pending">Pending</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  <div className="admin-filter-select-wrap">
                    <select 
                      className="admin-filter-select"
                      value={providerCategoryFilter}
                      onChange={(e) => setProviderCategoryFilter(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Plumber">Plumber</option>
                      <option value="Carpenter">Carpenter</option>
                      <option value="AC Repair">AC Repair</option>
                      <option value="Cleaning">Cleaning</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Providers Table Matching Mockup EXACTLY */}
              <div className="admin-table-wrap" style={{ marginTop: '0.65rem' }}>
                <table className="admin-table admin-provider-table">
                  <thead>
                    <tr>
                      <th style={{ width: '42px' }}></th>
                      <th>Provider</th>
                      <th>Category</th>
                      <th>Rating</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProviders.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                          No providers registered or matching "{providerSearch}".
                          <div style={{ marginTop: '0.5rem' }}>
                            <button className="admin-approve-btn" onClick={() => setShowAddProviderModal(true)}>
                              + Onboard First Provider
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredProviders.map(p => (
                        <tr key={p.id || p._id}>
                          <td style={{ width: '42px' }}>
                            <div className="admin-prov-avatar-badge">
                              <User size={16} color="#64748B" />
                            </div>
                          </td>
                          <td>
                            <div className="admin-prov-cell">
                              <img src={p.avatar} alt={p.name} className="admin-prov-img" />
                              <div>
                                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.84rem' }}>{p.name}</div>
                                <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{p.phone} • {p.location}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`admin-cat-pill ${p.categoryPill}`}>
                              {p.category}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#0F172A', fontSize: '0.82rem' }}>
                              <span>{p.rating}</span>
                              <Star size={13} fill="#F59E0B" color="#F59E0B" />
                            </div>
                          </td>
                          <td>
                            <span className={`admin-status-pill ${p.status.toLowerCase()}`}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="admin-action-btns" style={{ justifyContent: 'flex-end' }}>
                              <button 
                                type="button" 
                                className="admin-view-arrow-btn"
                                style={{ background: '#2563EB', color: '#FFFFFF', marginRight: '0.35rem' }}
                                onClick={() => handleOpenProviderDetail(p, 'profile', true)}
                                title="Edit Provider Details"
                              >
                                <Edit2 size={12} style={{ marginRight: '3px' }} />
                                <span>Edit</span>
                              </button>
                              <button 
                                type="button" 
                                className={`admin-view-arrow-btn ${p.status === 'Pending' ? 'review' : ''}`}
                                onClick={() => handleOpenProviderDetail(p, 'profile', false)}
                              >
                                <span>{p.status === 'Pending' ? 'Review →' : 'View →'}</span>
                              </button>
                              <button 
                                type="button" 
                                className="admin-more-btn"
                                onClick={() => handleOpenProviderDetail(p, 'profile')}
                                title="Provider Management Options"
                              >
                                <MoreHorizontal size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Admin Capabilities List (Directly from Mockup) */}
              <div className="admin-provider-capabilities-box">
                <div className="admin-capabilities-title">Admin can:</div>
                <div className="admin-capabilities-grid">
                  <div className="admin-cap-badge" onClick={() => filteredProviders[0] && handleOpenProviderDetail(filteredProviders[0], 'profile')}>
                    <User size={15} color="#2563EB" />
                    <span>View profile</span>
                  </div>
                  <div className="admin-cap-badge" onClick={() => {
                    const p = filteredProviders.find(prov => prov.status === 'Pending');
                    if (p) handleVerifyProvider(p.id || p._id);
                    else toast('No pending providers to verify');
                  }}>
                    <CheckCircle size={15} color="#10B981" />
                    <span>Verify provider</span>
                  </div>
                  <div className="admin-cap-badge" onClick={() => {
                    const p = filteredProviders.find(prov => prov.status === 'Pending');
                    if (p) handleRejectProvider(p.id || p._id);
                    else toast('No pending providers to reject');
                  }}>
                    <X size={15} color="#EF4444" />
                    <span>Reject verification</span>
                  </div>
                  <div className="admin-cap-badge" onClick={() => {
                    const p = filteredProviders.find(prov => prov.status === 'Verified');
                    if (p) handleSuspendProvider(p.id || p._id);
                    else toast('No verified providers to suspend');
                  }}>
                    <AlertTriangle size={15} color="#F59E0B" />
                    <span>Suspend provider</span>
                  </div>
                  <div className="admin-cap-badge" onClick={() => {
                    const p = filteredProviders.find(prov => prov.status === 'Suspended');
                    if (p) handleRestoreProvider(p.id || p._id);
                    else toast('No suspended providers to restore');
                  }}>
                    <Zap size={15} color="#10B981" />
                    <span>Restore provider</span>
                  </div>
                  <div className="admin-cap-badge" onClick={() => filteredProviders[0] && handleOpenProviderDetail(filteredProviders[0], 'bookings')}>
                    <Calendar size={15} color="#8B5CF6" />
                    <span>View bookings</span>
                  </div>
                  <div className="admin-cap-badge" onClick={() => filteredProviders[0] && handleOpenProviderDetail(filteredProviders[0], 'reviews')}>
                    <Star size={15} color="#F59E0B" />
                    <span>View reviews</span>
                  </div>
                  <div className="admin-cap-badge" onClick={() => filteredProviders[0] && handleOpenProviderDetail(filteredProviders[0], 'complaints')}>
                    <AlertCircle size={15} color="#EF4444" />
                    <span>View complaints</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ═══════════════════════════════════════════════════════════════
           SUB-VIEW: VERIFICATION DESK (Live from MongoDB)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'verification' && (
          <main className="admin-content-inner">
            <div className="admin-subview-card">
              <div className="admin-subview-header">
                <div>
                  <h2 className="admin-subview-title">Provider Verification Queue ({awaitingProviders.length} Pending)</h2>
                  <p style={{ color: '#64748B', fontSize: '0.85rem' }}>Review identity, trade licenses, and background checks before onboarding.</p>
                </div>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Profession</th>
                    <th>Location</th>
                    <th>Documents</th>
                    <th style={{ textAlign: 'right' }}>Review & Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {awaitingProviders.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#10B981', fontWeight: 600 }}>
                        ✓ All provider applications have been reviewed and decided!
                      </td>
                    </tr>
                  ) : (
                    awaitingProviders.map(p => (
                      <tr key={p.id || p._id}>
                        <td>
                          <div className="admin-prov-cell">
                            <img src={p.avatar} alt={p.name} className="admin-prov-img" />
                            <div>
                              <div style={{ fontWeight: 700 }}>{p.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{p.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className={`admin-cat-pill ${p.categoryPill}`}>{p.category}</span></td>
                        <td>{p.location}</td>
                        <td>
                          <div className="admin-doc-badge orange">
                            <span>{p.docs?.length || 2} Documents Uploaded</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="admin-action-btns" style={{ justifyContent: 'flex-end' }}>
                            <button className="admin-view-btn" onClick={() => handleOpenProviderDetail(p, 'profile')}>
                              Inspect Docs
                            </button>
                            <button className="admin-approve-btn" onClick={() => handleVerifyProvider(p.id || p._id)}>
                              Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {/* ═══════════════════════════════════════════════════════════════
           SUB-VIEW: CATEGORIES & SERVICES
        ═══════════════════════════════════════════════════════════════ */}
        {(activeTab === 'categories' || activeTab === 'services') && (
          <main className="admin-content-inner">
            <div className="admin-subview-card">
              <div className="admin-subview-header">
                <div>
                  <h2 className="admin-subview-title">Service Offerings & Categories</h2>
                  <p style={{ color: '#64748B', fontSize: '0.82rem' }}>Configured trades and services available across LocalFixr.</p>
                </div>
                <button className="admin-approve-btn" onClick={() => setShowAddServiceModal(true)}>
                  + Add New Service
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {topServices.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                    No service categories active yet. Add your first service or register providers.
                  </div>
                ) : (
                  topServices.map(s => (
                    <div key={s.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '1rem', background: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div className={`admin-service-icon-wrap ${s.type}`}><Briefcase size={16} /></div>
                        <div>
                          <div style={{ fontWeight: 800 }}>{s.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{s.meta}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2563EB', marginTop: '0.5rem' }}>
                        {s.bookings}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        )}

        {/* ═══════════════════════════════════════════════════════════════
           SUB-VIEW: BOOKINGS OPERATIONS (Live from MongoDB)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'bookings' && (
          <main className="admin-content-inner">
            <div className="admin-subview-card">
              <div className="admin-subview-header">
                <div>
                  <h2 className="admin-subview-title">Master Orders & Bookings ({ordersList.length})</h2>
                  <p style={{ color: '#64748B', fontSize: '0.82rem' }}>All customer bookings dispatched across the platform.</p>
                </div>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking Ref</th>
                    <th>Service</th>
                    <th>Assigned Provider</th>
                    <th>Customer</th>
                    <th>Stage / Status</th>
                    <th>Scheduled Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersList.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                        No bookings found in database.
                      </td>
                    </tr>
                  ) : (
                    ordersList.map(b => (
                      <tr key={b.id || b._id}>
                        <td style={{ fontWeight: 700, color: '#2563EB' }}>{b.id}</td>
                        <td>{b.service}</td>
                        <td>{b.provider}</td>
                        <td>{b.customer}</td>
                        <td>
                          <select 
                            value={b.status} 
                            className="admin-order-status-select"
                            onChange={(e) => handleUpdateOrderStatus(b._id || b.id, e.target.value)}
                          >
                            <option value="requested">Requested</option>
                            <option value="accepted">Accepted</option>
                            <option value="in_transit">In Transit</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td style={{ color: '#64748B' }}>{b.dateTime}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {/* ═══════════════════════════════════════════════════════════════
           SUB-VIEW: REVIEWS MODERATION (Live from DB)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'reviews' && (
          <main className="admin-content-inner">
            <div className="admin-subview-card">
              <div className="admin-subview-header">
                <h2 className="admin-subview-title">Customer Reviews & Moderation ({reviewsList.length})</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {reviewsList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                    No reviews submitted by customers yet.
                  </div>
                ) : (
                  reviewsList.map(r => (
                    <div key={r._id} style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', padding: '1rem', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800 }}>{r.customer?.name || 'Customer'}</span>
                          <span style={{ color: '#F59E0B', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <Star size={13} fill="#F59E0B" /> {r.rating} ★
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>for {r.provider?.name || 'Provider'}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '4px' }}>"{r.comment}"</div>
                      </div>
                      <button 
                        className="admin-view-btn" 
                        style={{ color: '#EF4444', borderColor: '#FECACA' }}
                        onClick={() => handleDeleteReview(r._id)}
                      >
                        Remove Review
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        )}

        {/* ═══════════════════════════════════════════════════════════════
           SUB-VIEW: COMPLAINTS DESK (Live from DB)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'complaints' && (
          <main className="admin-content-inner">
            <div className="admin-subview-card">
              <div className="admin-subview-header">
                <h2 className="admin-subview-title">Customer Complaints Desk ({complaintsList.length})</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {complaintsList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#10B981', fontWeight: 600 }}>
                    ✓ Zero active complaints filed! Service partners are performing excellently.
                  </div>
                ) : (
                  complaintsList.map(c => (
                    <div 
                      key={c._id} 
                      style={{ 
                        border: c.status === 'resolved' ? '1px solid #BBF7D0' : '1px solid #FECACA', 
                        background: c.status === 'resolved' ? '#F0FDF4' : '#FEF2F2', 
                        padding: '1rem', 
                        borderRadius: 8, 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: c.status === 'resolved' ? '#166534' : '#991B1B' }}>
                          Ticket: {c.subject || 'Service Complaint'} ({c.status.toUpperCase()})
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                          {c.description} • Customer: {c.customerId?.name || 'Customer'} • Assigned: {c.providerId?.name || 'Provider'}
                        </div>
                      </div>
                      {c.status !== 'resolved' ? (
                        <button className="admin-approve-btn" onClick={() => handleResolveComplaint(c._id)}>
                          Resolve Ticket
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 700 }}>RESOLVED</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        )}

        {/* ═══════════════════════════════════════════════════════════════
           SUB-VIEW: REPORTS & REVENUE (Real Financials)
        ═══════════════════════════════════════════════════════════════ */}
        {(activeTab === 'reports' || activeTab === 'revenue') && (
          <main className="admin-content-inner">
            <div className="admin-subview-card">
              <div className="admin-subview-header">
                <div>
                  <h2 className="admin-subview-title">Financial Performance & Commission Analytics</h2>
                  <p style={{ color: '#64748B', fontSize: '0.82rem' }}>Calculated from actual transactions and paid orders in MongoDB.</p>
                </div>
                <button className="admin-view-btn" onClick={() => toast.success('Financial Report Exported!')}>
                  Export Financials CSV
                </button>
              </div>

              <div className="admin-kpi-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-title">Gross Booking Volume</div>
                  <div className="admin-kpi-val" style={{ marginTop: '0.5rem' }}>
                    ₹{stats.totalGrossVolume ? stats.totalGrossVolume.toLocaleString('en-IN') : 0}
                  </div>
                  <div className="admin-kpi-sub">Total billed customer volume</div>
                </div>

                <div className="admin-kpi-card">
                  <div className="admin-kpi-title">Platform Net Commission</div>
                  <div className="admin-kpi-val" style={{ marginTop: '0.5rem', color: '#10B981' }}>
                    ₹{stats.totalPlatformRevenue ? stats.totalPlatformRevenue.toLocaleString('en-IN') : 0}
                  </div>
                  <div className="admin-kpi-sub">15% platform take-rate</div>
                </div>

                <div className="admin-kpi-card">
                  <div className="admin-kpi-title">Provider Disbursements</div>
                  <div className="admin-kpi-val" style={{ marginTop: '0.5rem' }}>
                    ₹{((stats.totalGrossVolume || 0) - (stats.totalPlatformRevenue || 0)).toLocaleString('en-IN')}
                  </div>
                  <div className="admin-kpi-sub">Disbursed to verified partners</div>
                </div>

                <div className="admin-kpi-card">
                  <div className="admin-kpi-title">Average Order Value</div>
                  <div className="admin-kpi-val" style={{ marginTop: '0.5rem' }}>
                    ₹{stats.totalBookings > 0 ? Math.round((stats.totalGrossVolume || 0) / stats.totalBookings) : 0}
                  </div>
                  <div className="admin-kpi-sub">Per completed booking</div>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ═══════════════════════════════════════════════════════════════
           SUB-VIEW: NOTIFICATIONS
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'notifications' && (
          <main className="admin-content-inner">
            <div className="admin-subview-card">
              <div className="admin-subview-header">
                <h2 className="admin-subview-title">Broadcast Notifications</h2>
                <button className="admin-approve-btn" onClick={() => setShowNotificationModal(true)}>
                  + Compose Broadcast
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 8, background: '#F8FAFC' }}>
                  <div style={{ fontWeight: 800 }}>⚡ Monsoon Service Safety Advisory</div>
                  <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '4px' }}>Sent to all verified Electricians regarding safety protocols during heavy rainfall.</p>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Broadcast channel: Active</span>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ═══════════════════════════════════════════════════════════════
           SUB-VIEW: SETTINGS
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <main className="admin-content-inner">
            <div className="admin-subview-card">
              <div className="admin-subview-header">
                <div>
                  <h2 className="admin-subview-title">Platform Configuration Settings</h2>
                  <p style={{ color: '#64748B', fontSize: '0.82rem' }}>Manage platform parameters and system preferences.</p>
                </div>
              </div>

              <div style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Platform Name</label>
                  <input type="text" defaultValue="LocalFixr" className="admin-form-input" />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Platform Commission (%)</label>
                  <input type="number" defaultValue="15" className="admin-form-input" />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Admin Notification Email</label>
                  <input type="email" defaultValue="admin@localfixr.com" className="admin-form-input" />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="admin-approve-btn" style={{ padding: '0.6rem 1.5rem' }} onClick={() => toast.success('Settings updated!')}>
                    Save Changes
                  </button>
                  <button 
                    className="admin-view-btn" 
                    style={{ padding: '0.6rem 1.5rem' }} 
                    onClick={() => loadAdminData(true)}
                  >
                    Sync DB Now
                  </button>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
         MODALS & DIALOGS
      ═══════════════════════════════════════════════════════════════ */}
      
      {/* 1. Add Provider Modal (Creates real record in MongoDB) */}
      {showAddProviderModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Onboard New Service Provider</h3>
              <button className="admin-loc-close-btn" onClick={() => setShowAddProviderModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddProviderSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Ramesh Kumar"
                    value={newProviderForm.name}
                    onChange={(e) => setNewProviderForm({ ...newProviderForm, name: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Email Address *</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="e.g. ramesh@example.com"
                    value={newProviderForm.email}
                    onChange={(e) => setNewProviderForm({ ...newProviderForm, email: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Category *</label>
                  <select 
                    value={newProviderForm.category}
                    onChange={(e) => setNewProviderForm({ ...newProviderForm, category: e.target.value })}
                    className="admin-form-input"
                  >
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Painter">Painter</option>
                    <option value="AC Repair">AC Repair</option>
                    <option value="Cleaning">Cleaning</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Phone Number *</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="+91 98765 43210"
                    value={newProviderForm.phone}
                    onChange={(e) => setNewProviderForm({ ...newProviderForm, phone: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Location / City *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Chandigarh, Mohali"
                    value={newProviderForm.location}
                    onChange={(e) => setNewProviderForm({ ...newProviderForm, location: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Hourly Rate (₹) *</label>
                  <input 
                    type="number" 
                    required
                    placeholder="350"
                    value={newProviderForm.hourlyRate}
                    onChange={(e) => setNewProviderForm({ ...newProviderForm, hourlyRate: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-view-btn" onClick={() => setShowAddProviderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-approve-btn">
                  Onboard Provider to DB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Service Modal */}
      {showAddServiceModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Create New Service Offering</h3>
              <button className="admin-loc-close-btn" onClick={() => setShowAddServiceModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddServiceSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Service Title *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Fan Installation & Repair"
                    value={newServiceForm.name}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Category</label>
                  <select 
                    value={newServiceForm.category}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, category: e.target.value })}
                    className="admin-form-input"
                  >
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="AC Repair">AC Repair</option>
                    <option value="Cleaning">Cleaning</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Standard Base Rate (₹)</label>
                  <input 
                    type="number" 
                    placeholder="299"
                    value={newServiceForm.basePrice}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, basePrice: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-view-btn" onClick={() => setShowAddServiceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-approve-btn">
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Send Notification Modal */}
      {showNotificationModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Broadcast Push Notification</h3>
              <button className="admin-loc-close-btn" onClick={() => setShowNotificationModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSendNotificationSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Notification Title</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Service Update for Tricity"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Audience</label>
                  <select 
                    value={notificationForm.audience}
                    onChange={(e) => setNotificationForm({ ...notificationForm, audience: e.target.value })}
                    className="admin-form-input"
                  >
                    <option value="all">All Users & Providers</option>
                    <option value="providers">Providers Only</option>
                    <option value="customers">Customers Only</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Message Content</label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Type broadcast message..."
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                    className="admin-form-input"
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-view-btn" onClick={() => setShowNotificationModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-approve-btn">
                  Send Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Comprehensive Provider Detail & Management Modal (Supports all 8 admin actions on real DB) */}
      {selectedDetailProvider && (
        <div className="admin-modal-overlay fade-in" onClick={() => setSelectedDetailProvider(null)}>
          <div className="admin-provider-detail-modal-box" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="admin-provider-detail-modal-header">
              <div className="admin-prov-modal-top-left">
                <img 
                  src={selectedDetailProvider.avatar} 
                  alt={selectedDetailProvider.name} 
                  className="admin-prov-modal-avatar" 
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 className="admin-prov-modal-name">{selectedDetailProvider.name}</h3>
                    <span className={`admin-cat-pill ${selectedDetailProvider.categoryPill}`}>
                      {selectedDetailProvider.category}
                    </span>
                    <span className={`admin-status-pill ${selectedDetailProvider.status.toLowerCase()}`}>
                      {selectedDetailProvider.status}
                    </span>
                    {selectedDetailProvider.providerId && (
                      <span className="admin-status-pill verified" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                        {selectedDetailProvider.providerId}
                      </span>
                    )}
                  </div>
                  <div className="admin-prov-modal-submeta">
                    <span>{selectedDetailProvider.phone}</span>
                    <span>•</span>
                    <span>{selectedDetailProvider.email}</span>
                    <span>•</span>
                    <span>{selectedDetailProvider.location}</span>
                    <span>•</span>
                    <span style={{ color: '#F59E0B', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <Star size={13} fill="#F59E0B" /> {selectedDetailProvider.rating} ({selectedDetailProvider.reviews?.length || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Modal Header */}
              <div className="admin-prov-modal-top-actions">
                {selectedDetailProvider.status !== 'Verified' && (
                  <button 
                    type="button" 
                    className="admin-modal-action-btn verify"
                    onClick={() => handleVerifyProvider(selectedDetailProvider.id || selectedDetailProvider._id)}
                  >
                    <CheckCircle size={15} />
                    <span>Approve & Issue ID Card</span>
                  </button>
                )}

                {selectedDetailProvider.status === 'Verified' && (
                  <button 
                    type="button" 
                    className="admin-modal-action-btn"
                    style={{ background: '#111111', color: '#D2FE00', border: '1.5px solid #111111' }}
                    onClick={() => handleSendWelcomeEmail(selectedDetailProvider.id || selectedDetailProvider._id)}
                    title="Send welcome email with official Digital ID Card"
                  >
                    <Send size={14} />
                    <span>{selectedDetailProvider.welcomeEmailSent ? 'Resend Welcome & ID Card' : 'Send Welcome Mail & ID Card'}</span>
                  </button>
                )}

                {selectedDetailProvider.status === 'Pending' && (
                  <button 
                    type="button" 
                    className="admin-modal-action-btn reject"
                    onClick={() => handleRejectProvider(selectedDetailProvider.id || selectedDetailProvider._id)}
                  >
                    <X size={15} />
                    <span>Reject Verification</span>
                  </button>
                )}

                {selectedDetailProvider.status === 'Verified' && (
                  <button 
                    type="button" 
                    className="admin-modal-action-btn suspend"
                    onClick={() => handleSuspendProvider(selectedDetailProvider.id || selectedDetailProvider._id)}
                  >
                    <AlertTriangle size={15} />
                    <span>Suspend Provider</span>
                  </button>
                )}

                {selectedDetailProvider.status === 'Suspended' && (
                  <button 
                    type="button" 
                    className="admin-modal-action-btn restore"
                    onClick={() => handleRestoreProvider(selectedDetailProvider.id || selectedDetailProvider._id)}
                  >
                    <Zap size={15} />
                    <span>Restore Provider</span>
                  </button>
                )}

                <button 
                  type="button" 
                  className="admin-loc-close-btn"
                  onClick={() => setSelectedDetailProvider(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Tabs Bar */}
            <div className="admin-prov-modal-nav-bar">
              <button 
                type="button" 
                className={`admin-prov-modal-tab ${providerDetailTab === 'profile' ? 'active' : ''}`}
                onClick={() => setProviderDetailTab('profile')}
              >
                <User size={15} />
                <span>1. View Profile</span>
              </button>
              <button 
                type="button" 
                className={`admin-prov-modal-tab ${providerDetailTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setProviderDetailTab('bookings')}
              >
                <Calendar size={15} />
                <span>6. View Bookings ({selectedDetailProvider.bookings?.length || 0})</span>
              </button>
              <button 
                type="button" 
                className={`admin-prov-modal-tab ${providerDetailTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setProviderDetailTab('reviews')}
              >
                <Star size={15} />
                <span>7. View Reviews ({selectedDetailProvider.reviews?.length || 0})</span>
              </button>
              <button 
                type="button" 
                className={`admin-prov-modal-tab ${providerDetailTab === 'complaints' ? 'active' : ''}`}
                onClick={() => setProviderDetailTab('complaints')}
              >
                <AlertCircle size={15} />
                <span>8. View Complaints ({selectedDetailProvider.complaints?.length || 0})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="admin-prov-modal-content-area">
              {/* TAB 1: VIEW PROFILE */}
              {providerDetailTab === 'profile' && (
                <div className="admin-modal-profile-tab fade-in">
                  {isEditingProvider ? (
                    <form onSubmit={handleSaveProviderDetails} className="admin-edit-provider-form">
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', color: '#0F172A' }}>
                        ✏️ Edit Service Provider Details
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Full Name *</label>
                          <input 
                            type="text" 
                            required
                            value={editProviderForm.name} 
                            onChange={e => setEditProviderForm({...editProviderForm, name: e.target.value})}
                            className="admin-form-input" 
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Category</label>
                          <select 
                            value={editProviderForm.category}
                            onChange={e => setEditProviderForm({...editProviderForm, category: e.target.value})}
                            className="admin-form-select"
                          >
                            <option value="Electrician">Electrician</option>
                            <option value="Plumber">Plumber</option>
                            <option value="Carpenter">Carpenter</option>
                            <option value="Painter">Painter</option>
                            <option value="AC Repair">AC Repair</option>
                            <option value="Cleaning">Cleaning</option>
                            <option value="Pest Control">Pest Control</option>
                            <option value="Tailor">Tailor</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Hourly Rate (₹)</label>
                          <input 
                            type="number" 
                            value={editProviderForm.hourlyRate} 
                            onChange={e => setEditProviderForm({...editProviderForm, hourlyRate: e.target.value})}
                            className="admin-form-input" 
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Experience (Years)</label>
                          <input 
                            type="number" 
                            value={editProviderForm.experienceYears} 
                            onChange={e => setEditProviderForm({...editProviderForm, experienceYears: e.target.value})}
                            className="admin-form-input" 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Phone</label>
                          <input 
                            type="text" 
                            value={editProviderForm.phone} 
                            onChange={e => setEditProviderForm({...editProviderForm, phone: e.target.value})}
                            className="admin-form-input" 
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Email</label>
                          <input 
                            type="email" 
                            value={editProviderForm.email} 
                            onChange={e => setEditProviderForm({...editProviderForm, email: e.target.value})}
                            className="admin-form-input" 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Operating Zone / Location</label>
                          <input 
                            type="text" 
                            value={editProviderForm.location} 
                            onChange={e => setEditProviderForm({...editProviderForm, location: e.target.value})}
                            className="admin-form-input" 
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Account Status</label>
                          <select 
                            value={editProviderForm.status}
                            onChange={e => setEditProviderForm({...editProviderForm, status: e.target.value})}
                            className="admin-form-select"
                          >
                            <option value="Verified">Verified</option>
                            <option value="Pending">Pending</option>
                            <option value="Suspended">Suspended</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                        <button 
                          type="button" 
                          className="admin-view-btn"
                          onClick={() => setIsEditingProvider(false)}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="admin-approve-btn"
                          style={{ padding: '0.6rem 1.5rem' }}
                        >
                          <Check size={16} /> Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                  <>
                  <div className="admin-prov-profile-grid">
                    <div className="admin-prov-info-card">
                      <div className="admin-info-card-label">PROFESSIONAL DETAILS</div>
                      <div className="admin-info-row">
                        <span className="admin-info-k">Category:</span>
                        <span className="admin-info-v">{selectedDetailProvider.category}</span>
                      </div>
                      <div className="admin-info-row">
                        <span className="admin-info-k">Experience:</span>
                        <span className="admin-info-v">{selectedDetailProvider.experience}</span>
                      </div>
                      <div className="admin-info-row">
                        <span className="admin-info-k">Hourly Rate:</span>
                        <span className="admin-info-v">{selectedDetailProvider.hourlyRate}</span>
                      </div>
                      <div className="admin-info-row">
                        <span className="admin-info-k">Completed Jobs:</span>
                        <span className="admin-info-v">{selectedDetailProvider.completedJobs} completed jobs</span>
                      </div>
                    </div>

                    <div className="admin-prov-info-card">
                      <div className="admin-info-card-label">CONTACT & LOCATION</div>
                      <div className="admin-info-row">
                        <span className="admin-info-k">Phone:</span>
                        <span className="admin-info-v">
                          {selectedDetailProvider.phone} {selectedDetailProvider.phoneVerified ? <span style={{ color: '#10B981', fontWeight: 800, fontSize: '0.72rem' }}>✓ OTP Verified</span> : <span style={{ color: '#F59E0B', fontSize: '0.72rem' }}>Pending</span>}
                        </span>
                      </div>
                      <div className="admin-info-row">
                        <span className="admin-info-k">Email:</span>
                        <span className="admin-info-v">{selectedDetailProvider.email}</span>
                      </div>
                      <div className="admin-info-row">
                        <span className="admin-info-k">Operating Zone:</span>
                        <span className="admin-info-v">{selectedDetailProvider.location}</span>
                      </div>
                      <div className="admin-info-row">
                        <span className="admin-info-k">Aadhaar KYC:</span>
                        <span className="admin-info-v">
                          {selectedDetailProvider.aadhaarVerified ? <span style={{ color: '#10B981', fontWeight: 800 }}>✓ UIDAI Verified (•••• {selectedDetailProvider.aadhaarLastFour || 'XXXX'})</span> : <span style={{ color: '#EF4444', fontWeight: 700 }}>Pending Verification</span>}
                        </span>
                      </div>
                      <div className="admin-info-row">
                        <span className="admin-info-k">Provider ID:</span>
                        <span className="admin-info-v" style={{ fontFamily: 'monospace', fontWeight: 800, color: selectedDetailProvider.providerId ? '#10B981' : '#888' }}>
                          {selectedDetailProvider.providerId || 'Assigned upon approval'}
                        </span>
                      </div>
                      <div className="admin-info-row">
                        <span className="admin-info-k">Welcome Mail:</span>
                        <span className="admin-info-v">
                          {selectedDetailProvider.welcomeEmailSent ? <span style={{ color: '#10B981', fontWeight: 700 }}>✓ Sent with Digital ID</span> : <span style={{ color: '#888' }}>Not Dispatched</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedDetailProvider.description && (
                    <div style={{ background: '#FAF9F6', border: '1.5px solid #DCDBCF', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                      <div className="admin-info-card-label" style={{ marginBottom: '4px' }}>PROVIDER BIO / DESCRIPTION</div>
                      <p style={{ fontSize: '0.84rem', color: '#333', margin: 0, lineHeight: 1.4 }}>
                        {selectedDetailProvider.description}
                      </p>
                    </div>
                  )}

                  {selectedDetailProvider.portfolioImages && selectedDetailProvider.portfolioImages.length > 0 && (
                    <div style={{ background: '#FAF9F6', border: '1.5px solid #DCDBCF', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                      <div className="admin-info-card-label" style={{ marginBottom: '8px' }}>
                        WORK PORTFOLIO PHOTOS ({selectedDetailProvider.portfolioImages.length} IMAGES)
                      </div>
                      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                        {selectedDetailProvider.portfolioImages.map((img, idx) => (
                          <a key={idx} href={img} target="_blank" rel="noreferrer">
                            <img src={img} alt="Work" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '2px solid #111' }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="admin-prov-docs-section">
                    <div className="admin-info-card-label" style={{ marginBottom: '0.65rem' }}>
                      VERIFICATION DOCUMENTS & ID PROOFS
                    </div>
                    <div className="admin-prov-docs-list">
                      {selectedDetailProvider.docs?.map((doc, idx) => (
                        <div key={idx} className="admin-prov-doc-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <FileText size={18} color="#2563EB" />
                            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0F172A' }}>{doc}</span>
                          </div>
                          <span className="admin-prov-doc-tag">VERIFIED</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  </>
                  )}
                </div>
              )}

              {/* TAB 2: VIEW BOOKINGS */}
              {providerDetailTab === 'bookings' && (
                <div className="admin-modal-bookings-tab fade-in">
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Booking ID</th>
                          <th>Customer</th>
                          <th>Service</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!selectedDetailProvider.bookings || selectedDetailProvider.bookings.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                              No booking records yet for this provider.
                            </td>
                          </tr>
                        ) : (
                          selectedDetailProvider.bookings.map(b => (
                            <tr key={b.id || b._id}>
                              <td style={{ fontWeight: 700, color: '#2563EB' }}>{b.id}</td>
                              <td style={{ fontWeight: 600 }}>{b.customer}</td>
                              <td>{b.service}</td>
                              <td style={{ color: '#64748B' }}>{b.date}</td>
                              <td style={{ fontWeight: 700, color: '#10B981' }}>{b.amount}</td>
                              <td>
                                <span className={`admin-status-pill ${(b.status || '').toLowerCase()}`}>
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: VIEW REVIEWS */}
              {providerDetailTab === 'reviews' && (
                <div className="admin-modal-reviews-tab fade-in">
                  {!selectedDetailProvider.reviews || selectedDetailProvider.reviews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
                      No reviews submitted for this provider yet.
                    </div>
                  ) : (
                    <div className="admin-modal-reviews-list">
                      {selectedDetailProvider.reviews.map((rev, idx) => (
                        <div key={idx} className="admin-modal-review-card">
                          <div className="admin-modal-review-top">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.86rem' }}>{rev.customer}</span>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#F59E0B', fontWeight: 700, fontSize: '0.8rem' }}>
                                <Star size={13} fill="#F59E0B" /> {rev.rating} ★
                              </div>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{rev.date}</span>
                          </div>
                          <p className="admin-modal-review-text">"{rev.comment}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: VIEW COMPLAINTS */}
              {providerDetailTab === 'complaints' && (
                <div className="admin-modal-complaints-tab fade-in">
                  {!selectedDetailProvider.complaints || selectedDetailProvider.complaints.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', color: '#10B981', fontWeight: 600 }}>
                      ✓ No active complaints or disputes logged against this provider!
                    </div>
                  ) : (
                    <div className="admin-modal-complaints-list">
                      {selectedDetailProvider.complaints.map((comp, idx) => (
                        <div key={idx} className="admin-modal-complaint-card">
                          <div className="admin-modal-complaint-top">
                            <div>
                              <span style={{ fontWeight: 800, color: '#991B1B' }}>{comp.id}: </span>
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>Filed by {comp.customer}</span>
                            </div>
                            <span className="admin-status-pill pending">{comp.status}</span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '4px' }}>
                            {comp.reason}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '6px' }}>Date: {comp.date}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="admin-prov-modal-footer">
              <button 
                type="button" 
                className="admin-view-btn"
                onClick={() => setSelectedDetailProvider(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Edit Customer Modal */}
      {editingCustomer && (
        <div className="admin-modal-overlay fade-in" onClick={() => setEditingCustomer(null)}>
          <div className="admin-modal-box" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Edit Customer Account</h3>
              <button className="admin-loc-close-btn" onClick={() => setEditingCustomer(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCustomerDetails}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    value={editCustomerForm.name} 
                    onChange={e => setEditCustomerForm({...editCustomerForm, name: e.target.value})}
                    className="admin-form-input" 
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    value={editCustomerForm.email} 
                    onChange={e => setEditCustomerForm({...editCustomerForm, email: e.target.value})}
                    className="admin-form-input" 
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Phone Number</label>
                  <input 
                    type="text" 
                    value={editCustomerForm.phone} 
                    onChange={e => setEditCustomerForm({...editCustomerForm, phone: e.target.value})}
                    className="admin-form-input" 
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">City</label>
                  <input 
                    type="text" 
                    value={editCustomerForm.city} 
                    onChange={e => setEditCustomerForm({...editCustomerForm, city: e.target.value})}
                    className="admin-form-input" 
                  />
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-view-btn" onClick={() => setEditingCustomer(null)}>
                  Cancel
                </button>
                <button type="submit" className="admin-approve-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
