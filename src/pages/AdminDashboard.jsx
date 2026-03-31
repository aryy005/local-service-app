import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { Users, UserCheck, CalendarCheck, MapPin, User as UserIcon, Briefcase } from 'lucide-react';

const AdminDashboard = () => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch admin statistics');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchStats();
  }, [token]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Admin Panel...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const customers = stats?.recentUsers?.filter(u => u.role === 'customer') || [];
  const providers = stats?.recentUsers?.filter(u => u.role === 'provider') || [];

  return (
    <div className="admin-dashboard fade-in container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          Admin Control Center
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back, Super Admin {user?.name}</p>
      </div>

      {/* Top Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-panel p-6 flex items-center shadow-md border-l-4 border-indigo-500 rounded-xl">
          <div className="p-4 bg-indigo-100 dark:bg-indigo-900/40 rounded-full mr-4">
            <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Customers</p>
            <h3 className="text-3xl font-black dark:text-white mt-1">{stats?.totalUsers - stats?.totalProviders - 1 || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center shadow-md border-l-4 border-emerald-500 rounded-xl">
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/40 rounded-full mr-4">
            <UserCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Providers</p>
            <h3 className="text-3xl font-black dark:text-white mt-1">{stats?.totalProviders || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center shadow-md border-l-4 border-amber-500 rounded-xl">
          <div className="p-4 bg-amber-100 dark:bg-amber-900/40 rounded-full mr-4">
            <CalendarCheck className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Bookings</p>
            <h3 className="text-3xl font-black dark:text-white mt-1">{stats?.totalBookings || 0}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Customers Table Column */}
        <div className="glass-panel overflow-hidden shadow-lg rounded-2xl flex flex-col max-h-[600px]">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center space-x-3">
             <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg"><UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
            <h2 className="text-xl font-bold dark:text-white">Registered Customers</h2>
          </div>
          <div className="overflow-y-auto flex-1 p-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-gray-900 shadow-sm z-10">
                <tr>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Customer Info</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Location/City</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {customers.length > 0 ? customers.map(u => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold dark:text-white">{u.name}</span>
                        <span className="text-xs text-gray-500">{u.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                        <MapPin size={14} className="text-indigo-400" />
                        <span className="text-sm">Not Specified</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm font-medium">
                      {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-gray-500 italic">No customers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Providers Table Column */}
        <div className="glass-panel overflow-hidden shadow-lg rounded-2xl flex flex-col max-h-[600px]">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg"><Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
            <h2 className="text-xl font-bold dark:text-white">Active Providers</h2>
          </div>
          <div className="overflow-y-auto flex-1 p-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-gray-900 shadow-sm z-10">
                <tr>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Provider Info</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">City / Operating Area</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {providers.length > 0 ? providers.map(u => {
                  // Extract city from location string by grabbing the first segment before a comma if it exists, or the whole thing
                  const extractedCity = u.providerDetails?.location?.split(',')[0] || 'Unknown City';
                  
                  return (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold dark:text-white">{u.name}</span>
                        <span className="text-xs text-gray-500">{u.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                        <MapPin size={14} className="text-emerald-500" />
                        <span className="text-sm font-medium">{extractedCity}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm font-medium">
                      {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                )}) : (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-gray-500 italic">No providers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
