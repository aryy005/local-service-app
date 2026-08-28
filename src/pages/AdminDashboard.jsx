import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { 
  Users, 
  UserCheck, 
  CalendarCheck, 
  MapPin, 
  User as UserIcon, 
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
  LayoutDashboard
} from 'lucide-react';

const AdminDashboard = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'customers' | 'providers' | 'orders'
  
  const [stats, setStats] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [orders, setOrders] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [statsRes, paymentsRes, customersRes, providersRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers }),
        fetch(`${API_URL}/payments/admin/summary`, { headers }),
        fetch(`${API_URL}/admin/customers`, { headers }),
        fetch(`${API_URL}/admin/providers`, { headers }),
        fetch(`${API_URL}/admin/orders`, { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (paymentsRes.ok) setPaymentSummary(await paymentsRes.json());
      if (customersRes.ok) setCustomers(await customersRes.json());
      if (providersRes.ok) setProviders(await providersRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());

    } catch (err) {
      setError(err.message || 'Failed to load admin management console');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAdminData();
  }, [token]);

  const handleResetDB = async () => {
    if (!window.confirm("⚠️ ARE YOU SURE? This will permanently delete all customer accounts, provider accounts, bookings, payments, and messages, leaving a fresh clean database.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/reset-database`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(data.message);
      fetchAdminData();
    } catch (err) {
      alert('Error resetting database: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Excel / CSV Export Function for Master Orders
  const exportOrdersToExcel = () => {
    if (!orders || orders.length === 0) {
      alert("No order records available to export.");
      return;
    }

    const headers = [
      "Order ID",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Provider Name",
      "Provider Phone",
      "Service Offered (Type)",
      "Date & Slot",
      "Service Location",
      "Order Status",
      "Service Progress Stage",
      "Amount Paid (INR)",
      "Payment Status",
      "Payment Method",
      "Creation Timestamp"
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
  };

  // Filtered data based on search
  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const filteredProviders = providers.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.providerDetails?.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.providerDetails?.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    (o.orderId && o.orderId.toLowerCase().includes(searchQuery.toLowerCase())) ||
    o.customerId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.providerId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.providerId?.providerDetails?.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !stats) return <div className="p-12 text-center text-gray-500 font-semibold">Initializing Admin Control Console...</div>;
  if (error) return <div className="p-12 text-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="admin-dashboard fade-in container mx-auto px-4 py-6">
      
      {/* Top Console Title & Control Bar */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Super Admin Workspace
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Isolated Control Center • Super Admin <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchAdminData}
            className="btn btn-outline"
            style={{ padding: '0.55rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
          >
            <RefreshCw size={16} /> Refresh Data
          </button>
          
          <button 
            onClick={handleResetDB}
            className="btn btn-outline"
            style={{ borderColor: '#EF4444', color: '#EF4444', fontWeight: 700, padding: '0.55rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', cursor: 'pointer' }}
          >
            <Trash2 size={16} /> Reset Environment
          </button>
        </div>
      </div>

      {/* Workplace Navigation Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => { setActiveTab('overview'); setSearchQuery(''); }}
          className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <LayoutDashboard size={18} /> Dashboard Overview
        </button>

        <button
          onClick={() => { setActiveTab('customers'); setSearchQuery(''); }}
          className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'customers'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Users size={18} /> Customers Directory ({customers.length})
        </button>

        <button
          onClick={() => { setActiveTab('providers'); setSearchQuery(''); }}
          className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'providers'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <UserCheck size={18} /> Service Providers ({providers.length})
        </button>

        <button
          onClick={() => { setActiveTab('orders'); setSearchQuery(''); }}
          className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <CalendarCheck size={18} /> Master Order History ({orders.length})
        </button>
      </div>

      {/* SEARCH / FILTER BAR FOR DIRECTORIES */}
      {activeTab !== 'overview' && (
        <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab === 'customers' ? 'customers by name, email, phone...' : activeTab === 'providers' ? 'providers by service, category, name...' : 'orders by Order ID, customer, provider...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {activeTab === 'orders' && (
            <button 
              onClick={exportOrdersToExcel}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)', border: 'none', fontWeight: 700, padding: '0.65rem 1.25rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <FileSpreadsheet size={18} /> Export Orders to Excel (.csv)
            </button>
          )}
        </div>
      )}

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="glass-panel p-6 flex items-center shadow-md border-l-4 border-indigo-500 rounded-2xl">
              <div className="p-4 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl mr-4">
                <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Customers</p>
                <h3 className="text-3xl font-black dark:text-white mt-1">{customers.length}</h3>
              </div>
            </div>

            <div className="glass-panel p-6 flex items-center shadow-md border-l-4 border-emerald-500 rounded-2xl">
              <div className="p-4 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl mr-4">
                <UserCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Active Providers</p>
                <h3 className="text-3xl font-black dark:text-white mt-1">{providers.length}</h3>
              </div>
            </div>

            <div className="glass-panel p-6 flex items-center shadow-md border-l-4 border-amber-500 rounded-2xl">
              <div className="p-4 bg-amber-100 dark:bg-amber-900/40 rounded-2xl mr-4">
                <CalendarCheck className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Orders</p>
                <h3 className="text-3xl font-black dark:text-white mt-1">{orders.length}</h3>
              </div>
            </div>

            <div className="glass-panel p-6 flex items-center shadow-md border-l-4 border-purple-500 rounded-2xl">
              <div className="p-4 bg-purple-100 dark:bg-purple-900/40 rounded-2xl mr-4">
                <Briefcase className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Platform Revenue</p>
                <h3 className="text-3xl font-black dark:text-white mt-1">₹{paymentSummary?.totalPlatformFee || 0}</h3>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">Vol: ₹{paymentSummary?.totalVolume || 0}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-panel p-6 rounded-2xl shadow-lg">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Users className="text-indigo-600" size={20} /> Quick Customer Directory
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {customers.slice(0, 5).map(c => (
                  <div key={c._id} className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold block dark:text-white">{c.name}</span>
                      <span className="text-xs text-gray-500">{c.email} | {c.phone}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md">Customer</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl shadow-lg">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <UserCheck className="text-emerald-600" size={20} /> Quick Provider Directory
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {providers.slice(0, 5).map(p => (
                  <div key={p._id} className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold block dark:text-white">{p.name}</span>
                      <span className="text-xs text-emerald-600 font-semibold">{p.providerDetails?.category || 'Provider'}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-500">₹{p.providerDetails?.hourlyRate || 25}/hr</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMERS DIRECTORY */}
      {activeTab === 'customers' && (
        <div className="glass-panel overflow-hidden shadow-lg rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Customer Name</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Email Address</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Phone Number</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Verification Badges</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredCustomers.length > 0 ? filteredCustomers.map(u => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 font-bold dark:text-white">{u.name}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{u.phone}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.emailVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          Email {u.emailVerified ? '✓' : '✗'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.phoneVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          Phone {u.phoneVerified ? '✓' : '✗'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500 italic">No customers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICE PROVIDERS DIRECTORY */}
      {activeTab === 'providers' && (
        <div className="glass-panel overflow-hidden shadow-lg rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Provider Name</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Service Offered (Category)</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Hourly Rate</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Operating Location</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Aadhaar Status</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredProviders.length > 0 ? filteredProviders.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold dark:text-white">{p.name}</span>
                        <span className="text-xs text-gray-500">{p.email} | {p.phone}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-lg">
                        <Tag size={12} /> {p.providerDetails?.category || 'General Service'}
                      </span>
                    </td>
                    <td className="p-4 font-black text-emerald-600">
                      ₹{p.providerDetails?.hourlyRate || 25}/hr
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-emerald-500" />
                        <span>{p.providerDetails?.location || 'Not Specified'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {p.providerDetails?.aadhaarVerified ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full text-xs font-bold inline-flex items-center gap-1">
                          <ShieldCheck size={14} /> Verified (****{p.providerDetails?.aadhaarLastFour || ''})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full text-xs font-bold">
                          Not Verified
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500 italic">No service providers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MASTER ORDER HISTORY & EXCEL EXPORT */}
      {activeTab === 'orders' && (
        <div className="glass-panel overflow-hidden shadow-lg rounded-2xl">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold dark:text-white">Master Order History Logs</h2>
              <p className="text-xs text-gray-500">Showing {filteredOrders.length} order records</p>
            </div>
            
            <button 
              onClick={exportOrdersToExcel}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)', border: 'none', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <FileSpreadsheet size={16} /> Export to Excel (.csv)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-800/80">
                <tr>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Order ID</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Customer Name</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Service Provider Name</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Service Type (Category)</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Date & Time Slot</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Service Stage</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Amount Paid</th>
                  <th className="p-4 font-bold text-xs uppercase text-gray-500">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredOrders.length > 0 ? filteredOrders.map(o => (
                  <tr key={o._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4">
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md text-xs border border-indigo-200 dark:border-indigo-800">
                        {o.orderId || ('ORD-' + o._id?.slice(-6).toUpperCase())}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold dark:text-white">{o.customerId?.name || 'Customer'}</span>
                        <span className="text-xs text-gray-500">{o.customerId?.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold dark:text-white">{o.providerId?.name || 'Provider'}</span>
                        <span className="text-xs text-gray-500">{o.providerId?.phone || 'No phone'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 rounded-lg">
                        <Tag size={12} /> {o.providerId?.providerDetails?.category || 'General Repair'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {o.date} ({o.timePreference})
                    </td>
                    <td className="p-4">
                      <span className="capitalize font-semibold text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {o.serviceStage || o.status}
                      </span>
                    </td>
                    <td className="p-4 font-black text-emerald-600">
                      ₹{o.paidAmount || o.finalPrice || 0}
                    </td>
                    <td className="p-4">
                      {o.paymentStatus === 'paid' ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full text-xs font-bold inline-flex items-center gap-1">
                          <CheckCircle size={12} /> Paid
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full text-xs font-bold">
                          Unpaid
                        </span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-500 italic">No master order records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
