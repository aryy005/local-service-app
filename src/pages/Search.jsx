import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { categories } from '../data/mockData';
import ProviderCard from '../components/ProviderCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { Filter, Star, MapPin, MapPinOff, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './Search.css';

const Search = () => {
  const { user, userLocation } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get('category');
  
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [activeCategory, setActiveCategory] = useState(categoryId || 'all');
  const [selectedCity, setSelectedCity] = useState(user?.city || user?.addressDetails?.city || '');
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(30000); // 30km default

  useEffect(() => {
    if (user?.role === 'provider') {
      navigate('/provider-dashboard', { replace: true });
      return;
    }

    const fetchProviders = async () => {
      try {
        setLoading(true);
        let url = `${API_URL}/providers`;
        const queryParams = [];
        if (selectedCity && selectedCity.trim()) {
          queryParams.push(`city=${encodeURIComponent(selectedCity.trim())}`);
        } else if (userLocation?.lng && userLocation?.lat) {
          queryParams.push(`lng=${userLocation.lng}&lat=${userLocation.lat}&radius=${radius}`);
        }
        
        if (queryParams.length > 0) {
          url += `?${queryParams.join('&')}`;
        }
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setProviders(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, [userLocation, radius, selectedCity]);

  useEffect(() => {
    let result = providers;
    if (activeCategory !== 'all') {
      result = result.filter(p => p.providerDetails?.category === activeCategory);
    }
    if (selectedCity && selectedCity.trim()) {
      const targetCity = selectedCity.trim().toLowerCase();
      result = result.filter(p => {
        const pCity = (p.city || p.addressDetails?.city || p.providerDetails?.location || '').toLowerCase();
        return pCity.includes(targetCity);
      });
    }
    setFilteredProviders(result);
  }, [activeCategory, selectedCity, providers]);

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    if (catId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="search-page fade-in">
      <div className="search-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1>Find Professionals</h1>
          <p className="subtitle">Browse verified service providers in your city.</p>
        </div>

        {/* City Filter Selection Header Input */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
          <Building className="text-indigo-600" size={18} />
          <span className="text-xs font-bold uppercase text-gray-500">Your City:</span>
          <input 
            type="text" 
            placeholder="e.g. Ludhiana, Delhi, Mumbai" 
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:border-indigo-500"
          />
          {selectedCity && (
            <button 
              onClick={() => setSelectedCity('')}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 px-1"
              title="Clear City Filter"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="search-layout">
        {/* Sidebar Filters */}
        <aside className="filters-sidebar glass-panel">
          <div className="filter-header">
            <Filter size={20} />
            <h3>Filters</h3>
          </div>

          <div className="filter-group">
            <h4 className="filter-title">City Location</h4>
            <div className="relative mb-4">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-500" size={16} />
              <input 
                type="text" 
                placeholder="Filter by city..." 
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <h4 className="filter-title">Categories</h4>
            <div className="filter-options">
              <button 
                className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('all')}
              >
                All Services
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  className={`filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Results Area */}
        <main className="search-results">
          <div className="results-header">
            <p>Showing <strong>{filteredProviders.length}</strong> professionals {selectedCity ? `in ${selectedCity}` : ''}</p>
          </div>
          
          {loading ? (
            <div className="providers-grid">
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
            </div>
          ) : filteredProviders.length > 0 ? (
            <div className="providers-grid">
              {filteredProviders.map(provider => (
                <ProviderCard key={provider.id || provider._id} provider={provider} />
              ))}
            </div>
          ) : (
            <div className="empty-state glass-panel p-8 text-center" style={{ borderLeft: '4px solid #f59e0b', borderRadius: '1rem' }}>
              <div style={{ width: '60px', height: '60px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <MapPinOff size={32} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Service is not available in your city, it will be active soon
              </h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
                Currently, no verified service professionals are active in <strong>{selectedCity || user?.city || 'your city'}</strong>. We are actively expanding to your location!
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setSelectedCity('')}>
                  View All Cities
                </button>
                <button className="btn btn-primary" onClick={() => handleCategoryChange('all')}>
                  View All Categories
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Search;
