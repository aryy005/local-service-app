import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search as SearchIcon, MapPin, User, ArrowRight, ArrowLeft, Star, 
  Heart, Check, ShieldCheck, ChevronDown, Zap, Wrench, Hammer, 
  Paintbrush, Scissors, Snowflake, Home, Ban, CheckSquare, Grid, Sparkles,
  Navigation, Loader2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { isProviderSaved, toggleSaveProvider } from '../utils/savedProviders';
import { getCurrentLocationName } from '../utils/geolocation';
import UserMenuPill from '../components/UserMenuPill';
import './Search.css';

// 9 Categories matching Image 3 with custom icons & editorial imagery
const browseCategories = [
  {
    id: 'cat-all',
    catId: 'all',
    name: 'All Services',
    icon: <Grid size={18} />,
    isAll: true,
    keywords: ['all', 'services']
  },
  {
    id: 'cat-5',
    catId: 'cat-5',
    name: 'Electrician',
    icon: <Zap size={18} />,
    subtitle: 'Wiring, Switches, Fan, etc.',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=600',
    keywords: ['electrician', 'electric', 'wiring', 'switches', 'fan', 'light', 'circuit', 'fuse', 'socket', 'inverter', 'voltage', 'repair']
  },
  {
    id: 'cat-6',
    catId: 'cat-6',
    name: 'Plumber',
    icon: <Wrench size={18} />,
    subtitle: 'Leak Repair, Pipe Fitting, etc.',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600',
    keywords: ['plumber', 'plumbing', 'leak', 'pipe', 'fitting', 'tap', 'drain', 'water', 'faucet', 'toilet', 'bathroom', 'sink', 'tank']
  },
  {
    id: 'cat-2',
    catId: 'cat-2',
    name: 'Carpenter',
    icon: <Hammer size={18} />,
    subtitle: 'Furniture, Doors, Woodwork, etc.',
    image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=600',
    keywords: ['carpenter', 'carpentry', 'furniture', 'door', 'wood', 'woodwork', 'window', 'lock', 'bed', 'sofa', 'cabinet', 'wardrobe', 'table']
  },
  {
    id: 'cat-3',
    catId: 'cat-3',
    name: 'Painter',
    icon: <Paintbrush size={18} />,
    subtitle: 'Interior & Exterior Painting',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=600',
    keywords: ['painter', 'painting', 'paint', 'wall', 'interior', 'exterior', 'waterproofing', 'whitewash', 'color', 'texture', 'stencil']
  },
  {
    id: 'cat-1',
    catId: 'cat-1',
    name: 'Tailor',
    icon: <Scissors size={18} />,
    subtitle: 'Stitching, Alterations, etc.',
    image: 'https://images.unsplash.com/photo-1528458908811-9359266e3e72?auto=format&fit=crop&q=80&w=600',
    keywords: ['tailor', 'stitching', 'alteration', 'suit', 'dress', 'pant', 'shirt', 'clothes', 'sewing', 'cloth', 'zipper', 'fitting']
  },
  {
    id: 'cat-7',
    catId: 'cat-7',
    name: 'AC Repair',
    icon: <Snowflake size={18} />,
    subtitle: 'Installation, Repair, Service',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=600',
    keywords: ['ac', 'air conditioner', 'repair', 'cooling', 'installation', 'gas', 'hvac', 'servicing', 'cooler', 'filter', 'leak']
  },
  {
    id: 'cat-8',
    catId: 'cat-8',
    name: 'House Cleaning',
    icon: <Home size={18} />,
    subtitle: 'Deep Cleaning, Sanitization, etc.',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=600',
    keywords: ['cleaning', 'house', 'home', 'deep cleaning', 'sanitization', 'floor', 'kitchen', 'washroom', 'maid', 'dusting', 'mop']
  },
  {
    id: 'cat-9',
    catId: 'cat-9',
    name: 'Pest Control',
    icon: <Ban size={18} />,
    subtitle: 'Termite, Cockroach, Bedbugs',
    image: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&q=80&w=600',
    keywords: ['pest', 'termite', 'cockroach', 'bedbugs', 'insects', 'mosquito', 'rodent', 'rat', 'control', 'spray', 'fumigation']
  },
  {
    id: 'cat-10',
    catId: 'cat-10',
    name: 'Other',
    icon: <CheckSquare size={18} />,
    subtitle: 'Appliance, Gardening, Moving',
    image: 'https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&q=80&w=600',
    keywords: ['other', 'appliance', 'gardening', 'moving', 'mechanic', 'handyman', 'general', 'refrigerator', 'washing machine']
  }
];

const Search = () => {
  const { user, userLocation, saveLocation } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlCategory = searchParams.get('category');
  const urlQuery = searchParams.get('q');

  const [activeCategory, setActiveCategory] = useState(urlCategory || 'all');
  const [searchQuery, setSearchQuery] = useState(urlQuery || '');
  const [sortBy, setSortBy] = useState('recommended');

  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Location selector state
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [manualCityInput, setManualCityInput] = useState('');
  const locationRef = useRef(null);

  // Close location popup on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setIsLocationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await getCurrentLocationName();
      saveLocation(loc);
      toast.success(`Location set to ${loc.name}!`);
      setIsLocationOpen(false);
    } catch (err) {
      toast.error(err.message || 'Could not detect location');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectCity = (cityName) => {
    saveLocation({ name: cityName, lat: null, lng: null });
    toast.success(`Location set to ${cityName}!`);
    setIsLocationOpen(false);
  };

  const handleManualCitySubmit = (e) => {
    e.preventDefault();
    if (!manualCityInput.trim()) return;
    handleSelectCity(manualCityInput.trim());
    setManualCityInput('');
  };

  // Saved providers tracking
  const [savedMap, setSavedMap] = useState({});

  const syncSaved = (list = providers) => {
    const map = {};
    list.forEach(p => {
      map[p._id] = isProviderSaved(p._id, user?.email);
    });
    setSavedMap(map);
  };

  useEffect(() => {
    syncSaved();
    window.addEventListener('saved_providers_changed', () => syncSaved());
    return () => window.removeEventListener('saved_providers_changed', () => syncSaved());
  }, [user?.email, providers]);

  useEffect(() => {
    if (user?.role === 'provider') {
      navigate('/provider-dashboard', { replace: true });
      return;
    }

    const fetchProviders = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/providers`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setProviders(list);
          syncSaved(list);
        } else {
          setProviders([]);
        }
      } catch (err) {
        console.error(err);
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, [user, navigate]);

  useEffect(() => {
    let result = [...providers];

    // Filter by Category
    if (activeCategory && activeCategory !== 'all') {
      result = result.filter(p => p.providerDetails?.category === activeCategory);
    }

    // Filter by search query within provider view
    if (searchQuery.trim() && activeCategory !== 'all') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.providerDetails?.categoryName || '').toLowerCase().includes(q) ||
        (p.providerDetails?.description || '').toLowerCase().includes(q) ||
        (p.providerDetails?.location || p.city || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'rating') {
      result.sort((a, b) => (b.providerDetails?.rating || 0) - (a.providerDetails?.rating || 0));
    } else if (sortBy === 'price_low') {
      result.sort((a, b) => (a.providerDetails?.hourlyRate || 0) - (b.providerDetails?.hourlyRate || 0));
    } else if (sortBy === 'experience') {
      result.sort((a, b) => (b.providerDetails?.experienceYears || 0) - (a.providerDetails?.experienceYears || 0));
    }

    setFilteredProviders(result);
  }, [activeCategory, searchQuery, sortBy, providers]);

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    if (catId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
    }
    setSearchParams(searchParams);
  };

  const handleToggleSave = (e, provider) => {
    e.stopPropagation();
    toggleSaveProvider(provider, user?.email || 'guest');
    syncSaved();
  };

  const currentCategoryObj = browseCategories.find(c => c.catId === activeCategory);
  const isViewingCategoryGrid = activeCategory === 'all';

  // Filter service categories based on search input
  const filteredServices = browseCategories
    .filter(c => !c.isAll)
    .filter(cat => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (cat.name || '').toLowerCase().includes(q);
      const subMatch = (cat.subtitle || '').toLowerCase().includes(q);
      const keyMatch = (cat.keywords || []).some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
      return nameMatch || subMatch || keyMatch;
    });

  return (
    <div className="lp-browse-container fade-in">
      {/* ═══ Left Category Sidebar ═══ */}
      <aside className="lp-browse-sidebar">
        <button 
          type="button"
          className="lp-browse-brand"
          onClick={() => { setActiveCategory('all'); setSearchQuery(''); navigate('/search'); }}
          style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
        >
          LocalFixr
        </button>

        <nav className="lp-browse-nav">
          {browseCategories.map(cat => {
            const isActive = activeCategory === cat.catId;
            return (
              <button
                key={cat.id}
                className={`lp-cat-item ${isActive ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.catId)}
              >
                <span className="lp-cat-icon">{cat.icon}</span>
                <span className="lp-cat-name">{cat.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ═══ Main Browsing Area ═══ */}
      <main className="lp-browse-main">
        {/* Top Search & Profile Bar */}
        <div className="lp-browse-topbar">
          <div className="lp-search-box">
            <SearchIcon size={18} className="lp-search-ico" />
            <input 
              type="text" 
              placeholder="Search for a service (e.g. Electrician, Plumber, AC Repair)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="lp-search-field"
            />
          </div>

          <div className="lp-topbar-right">
            {/* Interactive Location Tab */}
            <div className="lp-loc-dropdown-container" ref={locationRef}>
              <button 
                type="button"
                className={`lp-location-indicator ${isLocationOpen ? 'active' : ''}`} 
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                title={`Location: ${userLocation?.name || user?.city || 'Click to change location'}`}
                aria-label="Location selector"
              >
                {isLocating ? (
                  <Loader2 size={18} className="animate-spin" color="#111111" />
                ) : (
                  <MapPin size={18} color="#111111" />
                )}
                <span className="lp-location-text">
                  {userLocation?.name || user?.city || 'Detect'}
                </span>
              </button>

              {isLocationOpen && (
                <div className="lp-location-popover fade-in">
                  <div className="lp-loc-popover-header">
                    <div className="lp-loc-popover-title">
                      <MapPin size={16} color="#111111" />
                      <span>Choose Location</span>
                    </div>
                    <button 
                      type="button" 
                      className="lp-loc-close-btn"
                      onClick={() => setIsLocationOpen(false)}
                      title="Close"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <button 
                    type="button" 
                    className="lp-loc-live-btn"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Detecting GPS Location...</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={16} />
                        <span>Use Live GPS Location</span>
                      </>
                    )}
                  </button>

                  <div className="lp-loc-or-divider">
                    <span>OR ENTER CITY</span>
                  </div>

                  <form onSubmit={handleManualCitySubmit} className="lp-loc-form">
                    <input 
                      type="text" 
                      placeholder="Type city or area..." 
                      value={manualCityInput}
                      onChange={(e) => setManualCityInput(e.target.value)}
                      className="lp-loc-input"
                    />
                    <button type="submit" className="lp-loc-submit-btn">
                      Set
                    </button>
                  </form>

                  <div className="lp-loc-popular-label">Popular Cities</div>
                  <div className="lp-loc-chips">
                    {['Chandigarh', 'Mohali', 'Panchkula', 'Delhi', 'Mumbai', 'Bangalore'].map(city => (
                      <button 
                        key={city}
                        type="button" 
                        className={`lp-loc-chip ${(userLocation?.name === city || user?.city === city) ? 'active' : ''}`}
                        onClick={() => handleSelectCity(city)}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <UserMenuPill />
          </div>
        </div>

        {/* ─── Header & Sort Row ─── */}
        <div className="lp-browse-header">
          <div>
            <h1 className="lp-browse-title">
              {isViewingCategoryGrid ? 'All Services' : currentCategoryObj?.name || 'Search Results'}
            </h1>
            <p className="lp-browse-sub">
              {isViewingCategoryGrid 
                ? (searchQuery.trim() ? `Showing services matching "${searchQuery}"` : 'Find the right professional for your needs.')
                : `Showing available verified professionals in ${userLocation?.name || user?.city || 'your area'}.`}
            </p>
          </div>

          <div className="lp-sort-wrapper">
            <label className="lp-sort-label">Sort by</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="lp-sort-select"
            >
              <option value="recommended">Recommended</option>
              <option value="rating">Highest Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="experience">Most Experienced</option>
            </select>
          </div>
        </div>

        {/* ─── Mode A: All Services 3-Column Card Grid (Searching Services) ─── */}
        {isViewingCategoryGrid ? (
          filteredServices.length > 0 ? (
            <div className="lp-category-cards-grid">
              {filteredServices.map(cat => (
                <div key={cat.id} className="lp-service-card-item">
                  <div className="lp-card-img-wrap">
                    <img src={cat.image} alt={cat.name} className="lp-card-img" />
                  </div>

                  <div className="lp-card-body">
                    <h3 className="lp-card-title">{cat.name}</h3>
                    <p className="lp-card-sub">{cat.subtitle}</p>

                    <button 
                      className="lp-view-providers-btn" 
                      onClick={() => handleCategoryClick(cat.catId)}
                    >
                      <span>View Providers</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', borderRadius: '12px', background: '#ffffff', border: '1.5px solid #E3E2DD' }}>
              <SearchIcon size={38} color="#9ca3af" style={{ margin: '0 auto 0.75rem', opacity: 0.7 }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', marginBottom: '0.4rem' }}>
                No services found for "{searchQuery}"
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Try searching for Electrician, Plumber, Carpenter, Painter, AC Repair, Cleaning, etc.
              </p>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setSearchQuery('')}
                style={{ background: '#111111', color: '#ffffff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Show All Services
              </button>
            </div>
          )
        ) : (
          <div className="lp-provider-results-wrap">
            {/* Mode B: Filtered Provider Cards List (Image 2 trigger) */}
            <button 
              className="lp-back-to-all" 
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
            >
              <ArrowLeft size={16} />
              <span>Back to All Services</span>
            </button>

            {filteredProviders.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '12px' }}>
                <h3>No service providers found</h3>
                <p style={{ color: '#666', marginTop: '0.5rem' }}>
                  Try selecting another service category or clear your search keyword.
                </p>
                <button className="btn btn-lime mt-4" onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}>
                  View All Services
                </button>
              </div>
            ) : (
              <div className="lp-providers-list-grid">
                {filteredProviders.map(p => {
                  const details = p.providerDetails || {};
                  const isSaved = savedMap[p._id] || false;
                    const catTitle = details.categoryName || ({
                      'cat-1': 'Tailor',
                      'cat-2': 'Carpenter',
                      'cat-3': 'Painter',
                      'cat-4': 'Cobbler',
                      'cat-5': 'Electrician',
                      'cat-6': 'Plumber',
                      'cat-7': 'AC Repair',
                      'cat-8': 'House Cleaning',
                      'cat-9': 'Pest Control',
                      'cat-10': 'Other'
                    }[details.category]) || 'Service Specialist';

                    return (
                      <div 
                        key={p._id} 
                        className="lp-provider-item-card"
                        onClick={() => navigate(`/provider/${p._id}`)}
                      >
                        <div className="lp-prov-top">
                          <img 
                            src={details.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=200'} 
                            alt={p.name} 
                            className="lp-prov-avatar" 
                          />
                          <div className="lp-prov-main-meta">
                            <div className="lp-prov-name-row">
                              <h3 className="lp-prov-name">{p.name}</h3>
                              <div className="lp-prov-check">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            </div>

                            <div className="lp-prov-category">{catTitle}</div>

                            <div className="lp-prov-rating-line">
                              <Star size={14} fill="#f59e0b" color="#f59e0b" />
                              <strong>{details.rating ? Number(details.rating).toFixed(1) : 'New'}</strong>
                              {details.reviewsCount ? <span style={{ color: '#777' }}>({details.reviewsCount})</span> : null}
                              <span className="lp-prov-dot">•</span>
                              <MapPin size={13} />
                              <span>{details.distance || details.location || p.city || 'Local'}</span>
                            </div>
                          </div>

                          {/* Save Heart Button */}
                          <button 
                            className={`lp-prov-heart-btn ${isSaved ? 'active' : ''}`} 
                            onClick={(e) => handleToggleSave(e, p)}
                            title={isSaved ? 'Saved' : 'Save Provider for Future'}
                          >
                            <Heart size={18} fill={isSaved ? '#ef4444' : 'none'} color={isSaved ? '#ef4444' : '#666'} />
                          </button>
                        </div>

                        <p className="lp-prov-desc">
                          {details.description || `Verified ${catTitle} ready for appointments.`}
                        </p>

                        <div className="lp-prov-footer">
                          <div className="lp-prov-rate">
                            {details.hourlyRate ? <>₹{details.hourlyRate}<span>/hr</span></> : <span>Flexible Rate</span>}
                          </div>
                          <button 
                            className="lp-prov-view-btn"
                            onClick={(e) => { e.stopPropagation(); navigate(`/provider/${p._id}`); }}
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                    );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
