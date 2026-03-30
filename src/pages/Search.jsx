import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categories } from '../data/mockData';
import ProviderCard from '../components/ProviderCard';
import { Filter, Star } from 'lucide-react';
import { API_URL } from '../config';
import './Search.css';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get('category');
  
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [activeCategory, setActiveCategory] = useState(categoryId || 'all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch(`${API_URL}/providers`);
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
  }, []);

  useEffect(() => {
    let result = providers;
    if (activeCategory !== 'all') {
      result = providers.filter(p => p.providerDetails?.category === activeCategory);
    }
    setFilteredProviders(result);
  }, [activeCategory, providers]);

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
      <div className="search-header">
        <h1>Find Professionals</h1>
        <p className="subtitle">Browse our top-rated local service providers.</p>
      </div>

      <div className="search-layout">
        {/* Sidebar Filters */}
        <aside className="filters-sidebar glass-panel">
          <div className="filter-header">
            <Filter size={20} />
            <h3>Filters</h3>
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
          
          <div className="filter-group mt-8">
            <h4 className="filter-title">Rating</h4>
            <div className="filter-options rating-filters">
              {[4, 3, 2].map(rating => (
                <button key={rating} className="filter-btn rating-btn">
                  <Star size={16} fill="var(--warning-color)" color="var(--warning-color)" />
                  <span>{rating}+ Stars</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Results Area */}
        <main className="search-results">
          <div className="results-header">
            <p>Showing <strong>{filteredProviders.length}</strong> professionals</p>
            <select className="sort-select glass-panel">
              <option>Recommended</option>
              <option>Highest Rated</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
          
          {filteredProviders.length > 0 ? (
            <div className="providers-grid">
              {filteredProviders.map(provider => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : (
            <div className="empty-state glass-panel">
              <h3>No professionals found</h3>
              <p>Try selecting a different category or adjusting your search criteria.</p>
              <button className="btn btn-outline mt-4" onClick={() => handleCategoryChange('all')}>
                Clear Filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Search;
