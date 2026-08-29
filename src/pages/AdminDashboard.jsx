import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import toast from 'react-hot-toast';
import { 
  Users, 
  UserCheck, 
  CalendarCheck, 
  MapPin, 
  Briefcase, 
  ShieldCheck, 
  Mail, 
  Phone,
  FileSpreadsheet,
  Search,
  CheckCircle,
  Clock,
  Tag,
  DollarSign,
  Trash2,
  RefreshCw,
  LayoutDashboard,
  AlertTriangle,
  Server,
  Activity,
  ArrowUpRight,
  TrendingUp,
  X,
  Eye,
  Sliders,
  ExternalLink,
  ChevronRight,
  Star,
  Check,
  XCircle,
  CreditCard,
  Building,
  RotateCcw
} from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { token: contextToken, user } = useAuth();
  const token = contextToken || (typeof window !== 'undefined' ? sessionStorage.getItem('token') : null);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'orders' | 'customers' | 'providers' | 'system'
  
  // Data States
  const [stats, setStats] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // UI & Filter States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [providerCategoryFilter, setProviderCategoryFilter] = useState('all');
  
  // Modals & Drawers
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Fetch all admin data with robust error handling per request
  const fetchAdminData = useCallback(async (isSilent = false) => {
    if (!token) {
      setError('Admin authorization token is missing. Please sign in to the Admin Console.');
      setLoading(false);
      return;
    }

    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setError('');

    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      // Execute fetches in parallel with individual error resilience
      const [statsRes, paymentsRes, customersRes, providersRes, ordersRes] = await Promise.allSettled([
        fetch(`${API_URL}/admin/stats`, { headers }),
        fetch(`${API_URL}/payments/admin/summary`, { headers }),
        fetch(`${API_URL}/admin/customers`, { headers }),
        fetch(`${API_URL}/admin/providers`, { headers }),
        fetch(`${API_URL}/admin/orders`, { headers })
      ]);

      let hasFatalAuthError = false;

      // 1. Process Stats
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const statsData = await statsRes.value.json();
        setStats(statsData);
      } else if (statsRes.status === 'fulfilled' && (statsRes.value.status === 401 || statsRes.value.status === 403)) {
        hasFatalAuthError = true;
      }

      // 2. Process Payments Summary
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.ok) {
        const paymentsData = await paymentsRes.value.json();
        setPaymentSummary(paymentsData);
      }

      // 3. Process Customers
      if (customersRes.status === 'fulfilled' && customersRes.value.ok) {
        const customersData = await customersRes.value.json();
        setCustomers(Array.isArray(customersData) ? customersData : []);
      }

      // 4. Process Providers
      if (providersRes.status === 'fulfilled' && providersRes.value.ok) {
        const providersData = await providersRes.value.json();
        setProviders(Array.isArray(providersData) ? providersData : []);
      }

      // 5. Process Orders
      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const ordersData = await ordersRes.value.json();
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      }

      if (hasFatalAuthError) {
        setError('Access denied: Your session has expired or is not authorized for Administrator access.');
      }

    } catch (err) {
      console.error('Fetch Admin Data Error:', err);
      setError('Unable to reach the backend API server. Please ensure the server is active.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Update Order Stage or Payment Status directly from Inspector Modal
  const handleUpdateOrder = async (orderId, updatePayload) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`${API_URL}/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update order');
      
      toast.success(data.message || 'Order status updated successfully');
      
      // Update local orders list & selectedOrder
      if (data.order) {
        setOrders(prev => prev.map(o => o._id === orderId ? data.order : o));
        setSelectedOrder(data.order);
      }
      fetchAdminData(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Toggle User Verification (Aadhaar / Email / Phone)
  const handleToggleVerification = async (userId, field, currentValue) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ field, value: !currentValue })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification update failed');
      
      toast.success(`Verification status updated`);
      fetchAdminData(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Delete Individual Order
  const handleDeleteOrder = async (orderId, orderCode) => {
    if (!window.confirm(`Are you sure you want to permanently delete order "${orderCode}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Order deleted');
      if (selectedOrder?._id === orderId) setSelectedOrder(null);
      fetchAdminData(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Delete User (Customer or Provider)
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`⚠️ Permanently delete user "${userName}"? All their bookings and records will be deleted.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      fetchAdminData(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Safe Database Reset
  const handleResetDB = async () => {
    setIsResetModalOpen(false);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/reset-database`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      fetchAdminData();
    } catch (err) {
      toast.error('Error resetting database: ' + err.message);
      setLoading(false);
    }
  };

  // Excel / CSV Export
  const exportOrdersToExcel = () => {
    if (!orders || orders.length === 0) {
      toast.error("No order records available to export.");
      return;
    }

    const headers = [
      "Order ID",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Provider Name",
      "Provider Phone",
      "Category",
      "Date & Slot",
      "Service Location",
      "Status",
      "Service Stage",
      "Paid Amount (INR)",
      "Payment Status",
      "Payment Method",
      "Created At"
    ];

    const rows = orders.map(o => [
      `"${o.orderId || ('ORD-' + o._id.slice(-6).toUpperCase())}"`,
      `"${o.customerId?.name || 'N/A'}"`,
      `"${o.customerId?.email || 'N/A'}"`,
      `"${o.customerId?.phone || 'N/A'}"`,
      `"${o.providerId?.name || 'N/A'}"`,
      `"${o.providerId?.phone || 'N/A'}"`,
      `"${o.providerId?.providerDetails?.category || 'General Repair'}"`,
      `"${o.date || ''} (${o.timePreference || ''})"`,
      `"${(o.serviceAddress || '').replace(/"/g, '""')}"`,
      `"${o.status || 'pending'}"`,
      `"${o.serviceStage || 'requested'}"`,
      `"${o.paidAmount || o.finalPrice || 0}"`,
      `"${o.paymentStatus || 'unpaid'}"`,
      `"${o.paymentMethod || 'none'}"`,
      `"${new Date(o.createdAt).toLocaleString()}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LocalFixr_Master_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Orders exported successfully!');
  };

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery ||
        (o.orderId && o.orderId.toLowerCase().includes(q)) ||
        o.customerId?.name?.toLowerCase().includes(q) ||
        o.customerId?.email?.toLowerCase().includes(q) ||
        o.providerId?.name?.toLowerCase().includes(q) ||
        o.providerId?.providerDetails?.category?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (orderStatusFilter === 'all') return true;
      if (orderStatusFilter === 'paid') return o.paymentStatus === 'paid';
      if (orderStatusFilter === 'unpaid') return o.paymentStatus !== 'paid';
      if (orderStatusFilter === 'completed') return o.serviceStage === 'completed' || o.status === 'completed';
      if (orderStatusFilter === 'in_progress') return o.serviceStage === 'in_progress' || o.serviceStage === 'in_transit';
      if (orderStatusFilter === 'requested') return o.serviceStage === 'requested' || o.status === 'pending';
      if (orderStatusFilter === 'cancelled') return o.serviceStage === 'cancelled' || o.status === 'declined';
      return true;
    });
  }, [orders, searchQuery, orderStatusFilter]);

  // Filtered Customers List
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.toLowerCase();
      return !searchQuery ||
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.city?.toLowerCase().includes(q);
    });
  }, [customers, searchQuery]);

  // Filtered Providers List
  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesCategory = providerCategoryFilter === 'all' || 
        p.providerDetails?.category?.toLowerCase() === providerCategoryFilter.toLowerCase();

      const matchesSearch = !searchQuery ||
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.providerDetails?.category?.toLowerCase().includes(q) ||
        p.providerDetails?.location?.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [providers, searchQuery, providerCategoryFilter]);

  // Provider Categories for Filter Pills
  const providerCategories = useMemo(() => {
    const set = new Set();
    providers.forEach(p => {
      if (p.providerDetails?.category) set.add(p.providerDetails.category);
    });
    return Array.from(set);
  }, [providers]);

  // Calculated Metrics
  const grossVolume = paymentSummary?.totalVolume || stats?.totalGrossVolume || 0;
  const platformRevenue = paymentSummary?.totalPlatformFee || stats?.totalPlatformRevenue || Number((grossVolume * 0.05).toFixed(2));
  const completedOrdersCount = orders.filter(o => o.serviceStage === 'completed' || o.status === 'completed').length;
  const inProgressOrdersCount = orders.filter(o => ['in_progress', 'in_transit', 'accepted'].includes(o.serviceStage)).length;
  const fulfillmentRate = orders.length > 0 ? Math.round((completedOrdersCount / orders.length) * 100) : 100;
  const verifiedProvidersCount = providers.filter(p => p.providerDetails?.aadhaarVerified).length;

  if (loading && !stats && !orders.length && !customers.length) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Connecting to Executive Command Console...</h2>
          <p className="text-sm text-slate-500 mt-1">Synchronizing platform analytics and database registries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-console-root container mx-auto px-4 py-4">
      
      {/* 1. TOP EXECUTIVE HEADER BAR */}
      <div className="admin-header-bar">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <ShieldCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-white">
                Super Admin Console
              </h1>
              <span className="admin-title-badge">
                <span className="live-pulse-dot"></span> Live Controller
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Logged in as <strong className="text-indigo-400">{user?.name || 'Administrator'}</strong> ({user?.email || 'admin@localfixr.com'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => fetchAdminData(false)}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Data'}
          </button>

          <button 
            onClick={exportOrdersToExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet size={14} />
            Export (.CSV)
          </button>

          <button 
            onClick={() => setIsResetModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-all flex items-center gap-2"
          >
            <Trash2 size={14} />
            Reset DB
          </button>
        </div>
      </div>

      {/* ERROR BANNER IF PRESENT */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-400 shrink-0" size={20} />
            <div className="text-sm font-semibold">{error}</div>
          </div>
          <button 
            onClick={() => fetchAdminData(false)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 2. TOP KPI CARDS GRID */}
      <div className="kpi-grid">
        {/* Metric 1: Platform Revenue */}
        <div className="kpi-card" style={{ '--kpi-accent': 'linear-gradient(90deg, #6366f1, #8b5cf6)', '--kpi-color': '#6366f1', '--kpi-bg': 'rgba(99, 102, 241, 0.12)' }}>
          <div className="kpi-header">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Platform Revenue (5%)</p>
              <h3 className="kpi-value text-indigo-600 dark:text-indigo-400 mt-1">₹{platformRevenue.toLocaleString()}</h3>
            </div>
            <div className="kpi-icon-wrap">
              <DollarSign size={24} />
            </div>
          </div>
          <div className="kpi-subtext text-slate-500 dark:text-slate-400">
            <span className="text-emerald-500 font-bold flex items-center gap-0.5">
              <TrendingUp size={14} /> Gross GMV:
            </span>
            <strong>₹{grossVolume.toLocaleString()}</strong>
          </div>
        </div>

        {/* Metric 2: Customer Base */}
        <div className="kpi-card" style={{ '--kpi-accent': 'linear-gradient(90deg, #3b82f6, #06b6d4)', '--kpi-color': '#3b82f6', '--kpi-bg': 'rgba(59, 130, 246, 0.12)' }}>
          <div className="kpi-header">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Registered Customers</p>
              <h3 className="kpi-value text-blue-600 dark:text-blue-400 mt-1">{customers.length}</h3>
            </div>
            <div className="kpi-icon-wrap">
              <Users size={24} />
            </div>
          </div>
          <div className="kpi-subtext text-slate-500 dark:text-slate-400">
            <span className="text-blue-500 font-bold">Verified Emails:</span>
            <strong>{customers.filter(c => c.emailVerified).length} / {customers.length}</strong>
          </div>
        </div>

        {/* Metric 3: Service Providers */}
        <div className="kpi-card" style={{ '--kpi-accent': 'linear-gradient(90deg, #10b981, #14b8a6)', '--kpi-color': '#10b981', '--kpi-bg': 'rgba(16, 185, 129, 0.12)' }}>
          <div className="kpi-header">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Service Pros</p>
              <h3 className="kpi-value text-emerald-600 dark:text-emerald-400 mt-1">{providers.length}</h3>
            </div>
            <div className="kpi-icon-wrap">
              <UserCheck size={24} />
            </div>
          </div>
          <div className="kpi-subtext text-slate-500 dark:text-slate-400">
            <span className="text-emerald-500 font-bold">Aadhaar Verified:</span>
            <strong>{verifiedProvidersCount} ({providers.length ? Math.round((verifiedProvidersCount/providers.length)*100) : 0}%)</strong>
          </div>
        </div>

        {/* Metric 4: Orders & Fulfillment */}
        <div className="kpi-card" style={{ '--kpi-accent': 'linear-gradient(90deg, #f59e0b, #f97316)', '--kpi-color': '#f59e0b', '--kpi-bg': 'rgba(245, 158, 11, 0.12)' }}>
          <div className="kpi-header">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Master Orders</p>
              <h3 className="kpi-value text-amber-500 mt-1">{orders.length}</h3>
            </div>
            <div className="kpi-icon-wrap">
              <CalendarCheck size={24} />
            </div>
          </div>
          <div className="kpi-subtext text-slate-500 dark:text-slate-400">
            <span className="text-amber-500 font-bold">Fulfillment Rate:</span>
            <strong>{fulfillmentRate}% ({completedOrdersCount} done)</strong>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div className="admin-tab-nav">
        <button 
          onClick={() => { setActiveTab('overview'); setSearchQuery(''); }}
          className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <LayoutDashboard size={16} />
          <span>Executive Overview</span>
        </button>

        <button 
          onClick={() => { setActiveTab('orders'); setSearchQuery(''); }}
          className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
        >
          <CalendarCheck size={16} />
          <span>Master Orders</span>
          <span className="admin-badge-count">{orders.length}</span>
        </button>

        <button 
          onClick={() => { setActiveTab('customers'); setSearchQuery(''); }}
          className={`admin-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
        >
          <Users size={16} />
          <span>Customers</span>
          <span className="admin-badge-count">{customers.length}</span>
        </button>

        <button 
          onClick={() => { setActiveTab('providers'); setSearchQuery(''); }}
          className={`admin-tab-btn ${activeTab === 'providers' ? 'active' : ''}`}
        >
          <UserCheck size={16} />
          <span>Service Fleet</span>
          <span className="admin-badge-count">{providers.length}</span>
        </button>

        <button 
          onClick={() => { setActiveTab('system'); setSearchQuery(''); }}
          className={`admin-tab-btn ${activeTab === 'system' ? 'active' : ''}`}
        >
          <Server size={16} />
          <span>System & Health</span>
        </button>
      </div>

      {/* 4. TAB CONTENT PANELS */}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 fade-in">
          
          {/* Order Stages Visual Progress Flow */}
          <div className="admin-table-card p-6">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Activity className="text-indigo-500" size={18} />
                  Service Pipeline & Fulfillment Funnel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time status breakdown across all marketplace bookings</p>
              </div>
              <div className="text-xs font-bold text-slate-400">
                Total Orders: <span className="text-indigo-500 font-extrabold">{orders.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Requested / Pending</span>
                <div className="text-2xl font-black mt-1 text-indigo-700 dark:text-indigo-300">
                  {orders.filter(o => ['requested', 'pending'].includes(o.serviceStage || o.status)).length}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">In Progress / Transit</span>
                <div className="text-2xl font-black mt-1 text-blue-700 dark:text-blue-300">
                  {inProgressOrdersCount}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Completed</span>
                <div className="text-2xl font-black mt-1 text-emerald-700 dark:text-emerald-300">
                  {completedOrdersCount}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Paid Transactions</span>
                <div className="text-2xl font-black mt-1 text-slate-800 dark:text-white">
                  {orders.filter(o => o.paymentStatus === 'paid').length}
                </div>
              </div>
            </div>

            {/* Visual Funnel Bar */}
            <div className="admin-progress-track flex overflow-hidden h-3">
              <div 
                className="bg-indigo-500 h-full" 
                style={{ width: `${orders.length ? (orders.filter(o => ['requested', 'pending'].includes(o.serviceStage || o.status)).length / orders.length) * 100 : 0}%` }}
                title="Requested"
              ></div>
              <div 
                className="bg-blue-500 h-full" 
                style={{ width: `${orders.length ? (inProgressOrdersCount / orders.length) * 100 : 0}%` }}
                title="In Progress"
              ></div>
              <div 
                className="bg-emerald-500 h-full" 
                style={{ width: `${orders.length ? (completedOrdersCount / orders.length) * 100 : 0}%` }}
                title="Completed"
              ></div>
              <div 
                className="bg-red-400 h-full" 
                style={{ width: `${orders.length ? (orders.filter(o => ['cancelled', 'declined'].includes(o.serviceStage || o.status)).length / orders.length) * 100 : 0}%` }}
                title="Cancelled"
              ></div>
            </div>
            <div className="flex gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2.5 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Requested</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> In Progress</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Completed</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span> Cancelled</span>
            </div>
          </div>

          {/* Quick Dual Tables: Recent Orders & Top Providers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Orders Card */}
            <div className="admin-table-card p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <CalendarCheck className="text-indigo-500" size={16} /> Recent Orders
                </h3>
                <button 
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1"
                >
                  View All ({orders.length}) <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {orders.slice(0, 6).map(o => (
                  <div 
                    key={o._id}
                    onClick={() => setSelectedOrder(o)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center cursor-pointer transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                          {o.orderId || ('ORD-' + o._id.slice(-6).toUpperCase())}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {o.customerId?.name || 'Customer'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {o.providerId?.name || 'Assigned Pro'} • {o.date || 'Scheduled'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-600 block">₹{o.paidAmount || o.finalPrice || 0}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        o.serviceStage === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        o.serviceStage === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {o.serviceStage || o.status}
                      </span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm">No orders recorded yet.</div>
                )}
              </div>
            </div>

            {/* Top Verified Service Fleet */}
            <div className="admin-table-card p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <UserCheck className="text-emerald-500" size={16} /> Service Provider Fleet
                </h3>
                <button 
                  onClick={() => setActiveTab('providers')}
                  className="text-xs font-bold text-emerald-500 hover:underline flex items-center gap-1"
                >
                  View All ({providers.length}) <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {providers.slice(0, 6).map(p => (
                  <div 
                    key={p._id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{p.name}</span>
                          {p.providerDetails?.aadhaarVerified && (
                            <span title="Aadhaar Verified"><CheckCircle size={12} className="text-emerald-500" /></span>
                          )}
                        </div>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block">
                          {p.providerDetails?.category || 'General Service'} • {p.providerDetails?.location || 'Local Area'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">₹{p.providerDetails?.hourlyRate || 25}/hr</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{p.jobsCount || 0} jobs completed</span>
                    </div>
                  </div>
                ))}
                {providers.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm">No service providers registered.</div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: MASTER ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="admin-table-card fade-in">
          
          {/* Toolbar */}
          <div className="admin-table-toolbar">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search orders by ID, customer, provider, service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Quick Status Filter Pills */}
            <div className="filter-pills-row">
              {['all', 'requested', 'in_progress', 'completed', 'paid', 'unpaid', 'cancelled'].map(f => (
                <button
                  key={f}
                  onClick={() => setOrderStatusFilter(f)}
                  className={`filter-pill ${orderStatusFilter === f ? 'active' : ''}`}
                >
                  {f.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Assigned Pro</th>
                  <th className="p-3.5">Date & Slot</th>
                  <th className="p-3.5">Stage</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium">
                {filteredOrders.length > 0 ? filteredOrders.map(o => (
                  <tr key={o._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                        {o.orderId || ('ORD-' + o._id.slice(-6).toUpperCase())}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 dark:text-white">{o.customerId?.name || 'Customer'}</div>
                      <div className="text-[11px] text-slate-400">{o.customerId?.phone || o.customerId?.email}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 dark:text-white">{o.providerId?.name || 'Provider'}</div>
                      <div className="text-[11px] text-indigo-500 font-semibold">{o.providerId?.providerDetails?.category || 'Repair'}</div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <div>{o.date || 'TBD'}</div>
                      <div className="text-[11px] text-slate-400">{o.timePreference}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize inline-flex items-center gap-1 ${
                        o.serviceStage === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        o.serviceStage === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                        o.serviceStage === 'in_transit' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                        o.serviceStage === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {o.serviceStage || o.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 dark:text-white">₹{o.paidAmount || o.finalPrice || 0}</div>
                      <span className={`text-[10px] font-extrabold uppercase ${o.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {o.paymentStatus === 'paid' ? '✓ Paid' : '• Unpaid'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          title="Inspect Order"
                        >
                          <Eye size={13} /> Inspect
                        </button>

                        <button
                          onClick={() => handleDeleteOrder(o._id, o.orderId)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-all"
                          title="Delete Order"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-slate-400 font-medium italic">
                      No orders matched the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMERS DIRECTORY */}
      {activeTab === 'customers' && (
        <div className="admin-table-card fade-in">
          <div className="admin-table-toolbar">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search customers by name, email, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              Total Customers: <strong>{filteredCustomers.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Contact Info</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Verification Badges</th>
                  <th className="p-3.5">Order Activity</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium">
                {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                  <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 font-bold flex items-center justify-center text-xs">
                          {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        {c.name}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-slate-600 dark:text-slate-300">{c.email}</div>
                      <div className="text-[11px] text-slate-400">{c.phone || 'No phone'}</div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        <span>{c.city || c.addressDetails?.city || 'Default City'}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleToggleVerification(c._id, 'email', c.emailVerified)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            c.emailVerified ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="Click to toggle Email verification"
                        >
                          Email {c.emailVerified ? '✓' : '✗'}
                        </button>
                        <button
                          onClick={() => handleToggleVerification(c._id, 'phone', c.phoneVerified)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            c.phoneVerified ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="Click to toggle Phone verification"
                        >
                          Phone {c.phoneVerified ? '✓' : '✗'}
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 dark:text-white">{c.totalBookings || 0} bookings</div>
                      <div className="text-[11px] text-emerald-600 font-semibold">₹{(c.totalSpent || 0).toLocaleString()} spent</div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteUser(c._id, c.name)}
                        className="px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-slate-400 italic">No customers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SERVICE PROVIDERS FLEET */}
      {activeTab === 'providers' && (
        <div className="admin-table-card fade-in">
          <div className="admin-table-toolbar">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search providers by name, category, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="filter-pills-row">
              <button
                onClick={() => setProviderCategoryFilter('all')}
                className={`filter-pill ${providerCategoryFilter === 'all' ? 'active' : ''}`}
              >
                ALL CATEGORIES
              </button>
              {providerCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setProviderCategoryFilter(cat)}
                  className={`filter-pill ${providerCategoryFilter === cat ? 'active' : ''}`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5">Provider Profile</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Rate & Earnings</th>
                  <th className="p-3.5">Operating Area</th>
                  <th className="p-3.5">Aadhaar Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium">
                {filteredProviders.length > 0 ? filteredProviders.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-xs">
                          {p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.email} | {p.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-lg inline-flex items-center gap-1">
                        <Tag size={12} /> {p.providerDetails?.category || 'General Repair'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-emerald-600">₹{p.providerDetails?.hourlyRate || 25}/hr</div>
                      <div className="text-[11px] text-slate-400 font-semibold">{p.jobsCount || 0} jobs ({p.completedJobs || 0} done)</div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="text-emerald-500" />
                        <span>{p.providerDetails?.location || 'Central City'}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleVerification(p._id, 'aadhaar', p.providerDetails?.aadhaarVerified)}
                        className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                          p.providerDetails?.aadhaarVerified 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                        }`}
                        title="Click to toggle Aadhaar verification"
                      >
                        <ShieldCheck size={13} />
                        {p.providerDetails?.aadhaarVerified ? `Verified (****${p.providerDetails?.aadhaarLastFour || '9999'})` : 'Unverified • Toggle'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteUser(p._id, p.name)}
                        className="px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-slate-400 italic">No providers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM HEALTH & ENVIRONMENT CONTROL */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in">
          
          <div className="admin-table-card p-6">
            <h3 className="text-base font-extrabold flex items-center gap-2 mb-4">
              <Server className="text-indigo-500" size={18} /> Backend Server Status
            </h3>
            
            <div className="space-y-4 text-xs font-semibold">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                <span className="text-slate-500">Service Status</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Operational (200 OK)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                <span className="text-slate-500">Node Process Uptime</span>
                <span className="font-mono font-bold text-slate-800 dark:text-white">
                  {stats?.systemHealth?.uptimeSeconds ? `${Math.floor(stats.systemHealth.uptimeSeconds / 60)} mins` : 'Live Running'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                <span className="text-slate-500">Node Memory Usage</span>
                <span className="font-mono font-bold text-slate-800 dark:text-white">
                  {stats?.systemHealth?.memoryUsageMB ? `${stats.systemHealth.memoryUsageMB} MB` : 'Optimal (< 120 MB)'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                <span className="text-slate-500">API Endpoint Host</span>
                <span className="font-mono text-indigo-500 font-bold">{API_URL}</span>
              </div>
            </div>
          </div>

          <div className="admin-table-card p-6 border-red-500/30">
            <h3 className="text-base font-extrabold flex items-center gap-2 mb-2 text-red-500">
              <AlertTriangle size={18} /> Danger Zone: Maintenance & Reset
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Clear demonstration records, test orders, chat messages, and wipe test users while keeping the primary System Admin account safe.
            </p>

            <div className="p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">Reset Environment Database</h4>
              <p className="text-[11px] text-slate-500 mb-4">
                Removes all customer records, provider records, bookings, and payments. Primary admin <strong>admin@localfixr.com</strong> will be preserved.
              </p>
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md"
              >
                <Trash2 size={14} /> Wipe Test Database
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 5. ORDER INSPECTION & MANAGEMENT MODAL */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="admin-modal-panel p-6" onClick={(e) => e.stopPropagation()}>
            
            <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    {selectedOrder.orderId || ('ORD-' + selectedOrder._id.slice(-6).toUpperCase())}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                    selectedOrder.serviceStage === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedOrder.serviceStage || selectedOrder.status}
                  </span>
                </div>
                <h3 className="text-lg font-black mt-2 text-slate-900 dark:text-white">Order Control & Inspector</h3>
              </div>
              
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-5 space-y-5 text-xs">
              {/* Customer & Provider Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="font-extrabold uppercase text-slate-400 text-[10px] block mb-1">Customer Details</span>
                  <div className="font-bold text-sm text-slate-800 dark:text-white">{selectedOrder.customerId?.name || 'Customer'}</div>
                  <div className="text-slate-500">{selectedOrder.customerId?.email}</div>
                  <div className="text-slate-500">{selectedOrder.customerId?.phone || 'No phone'}</div>
                  <div className="text-slate-500 mt-1">📍 {selectedOrder.serviceAddress || 'Customer Address'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="font-extrabold uppercase text-slate-400 text-[10px] block mb-1">Assigned Provider</span>
                  <div className="font-bold text-sm text-slate-800 dark:text-white">{selectedOrder.providerId?.name || 'Provider'}</div>
                  <div className="text-slate-500">{selectedOrder.providerId?.email}</div>
                  <div className="text-slate-500">{selectedOrder.providerId?.phone || 'No phone'}</div>
                  <div className="text-indigo-500 font-semibold mt-1">🛠️ {selectedOrder.providerId?.providerDetails?.category || 'Repair Service'}</div>
                </div>
              </div>

              {/* Order Description & Booking Info */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="font-extrabold uppercase text-slate-400 text-[10px] block mb-1">Job Description & Slot</span>
                <p className="font-medium text-slate-700 dark:text-slate-200">{selectedOrder.description || 'No description provided.'}</p>
                <div className="mt-2 text-slate-500">📅 Date: <strong>{selectedOrder.date}</strong> | Slot: <strong>{selectedOrder.timePreference}</strong></div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/40 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Order Amount</span>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">₹{selectedOrder.paidAmount || selectedOrder.finalPrice || 0}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment Status</span>
                  <div className={`font-bold capitalize ${selectedOrder.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {selectedOrder.paymentStatus || 'unpaid'}
                  </div>
                </div>
              </div>

              {/* Live Override Actions */}
              <div className="pt-2">
                <label className="font-extrabold uppercase text-slate-400 text-[10px] block mb-2">Override Service Stage (Admin Action)</label>
                <div className="flex flex-wrap gap-2">
                  {['requested', 'accepted', 'in_transit', 'in_progress', 'completed', 'cancelled'].map(stage => (
                    <button
                      key={stage}
                      disabled={updatingOrderId === selectedOrder._id || selectedOrder.serviceStage === stage}
                      onClick={() => handleUpdateOrder(selectedOrder._id, { serviceStage: stage })}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all capitalize ${
                        selectedOrder.serviceStage === stage
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {stage.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-extrabold uppercase text-slate-400 text-[10px] block mb-2">Override Payment Status</label>
                <div className="flex gap-2">
                  {['paid', 'unpaid', 'refunded'].map(pStatus => (
                    <button
                      key={pStatus}
                      disabled={updatingOrderId === selectedOrder._id || selectedOrder.paymentStatus === pStatus}
                      onClick={() => handleUpdateOrder(selectedOrder._id, { paymentStatus: pStatus })}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all capitalize ${
                        selectedOrder.paymentStatus === pStatus
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Mark {pStatus}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => handleDeleteOrder(selectedOrder._id, selectedOrder.orderId)}
                className="px-3.5 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Delete Order
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. DANGER ZONE CONFIRMATION MODAL */}
      {isResetModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsResetModalOpen(false)}>
          <div className="admin-modal-panel p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Confirm Full Database Reset</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you absolutely sure? This will delete all registered customer accounts, service provider listings, active & past bookings, chat messages, and payment records.
            </p>
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-xs text-red-600 dark:text-red-400 font-semibold mt-3">
              ⚠️ The primary admin <strong>admin@localfixr.com</strong> will NOT be deleted.
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleResetDB}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30"
              >
                Yes, Wipe Database
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
