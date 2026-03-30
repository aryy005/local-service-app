import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { categories } from '../data/mockData';
import './Home.css';
import ProviderCard from '../components/ProviderCard';

const Home = () => {
  const [providersList, setProvidersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch(`${API_URL}/providers`);
        if (res.ok) {
          const data = await res.json();
          setProvidersList(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  // Get top 3 providers for the highlighted section
  const topProviders = providersList.sort((a, b) => (b.providerDetails?.rating || 0) - (a.providerDetails?.rating || 0)).slice(0, 3);

  const getIcon = (iconName) => {
    const IconComponent = Icons[iconName] || Icons.HelpCircle;
    return <IconComponent size={24} className="category-icon" />;
  };

  return (
    <div className="home-page fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg-glow"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            Find the Best <br />
            <span className="text-gradient">Local Professionals</span>
          </h1>
          <p className="hero-subtitle">
            Connect with top-rated tailors, carpenters, electricians, and more in your neighborhood instantly.
          </p>
          <div className="hero-actions">
            <Link to="/search" className="btn btn-primary btn-lg">Explore Services</Link>
            <button className="btn btn-outline btn-lg">How it works</button>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="categories-section">
        <div className="section-header">
          <h2>Popular Services</h2>
          <Link to="/search" className="view-all-link">View all categories &rarr;</Link>
        </div>
        <div className="categories-grid">
          {categories.map((category) => (
            <Link to={`/search?category=${category.id}`} key={category.id} className="category-card glass-panel">
              <div className="icon-wrapper">
                {getIcon(category.icon)}
              </div>
              <h3 className="category-name">{category.name}</h3>
              <p className="category-desc">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Providers */}
      <section className="top-providers-section mb-8">
        <div className="section-header">
          <h2>Top Rated Professionals</h2>
          <p className="section-subtitle">Highly recommended by your community</p>
        </div>
        <div className="providers-grid">
          {topProviders.map(provider => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
