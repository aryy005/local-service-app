import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, User, Menu, Moon, Sun, LogOut, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getCurrentLocationName } from '../utils/geolocation';
import './Header.css';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [locationValue, setLocationValue] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const location = await getCurrentLocationName();
      setLocationValue(location);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <header className="header glass-panel">
      <div className="container header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">✨</span>
          <span className="logo-text">LocalPro</span>
        </Link>
        
        <div className="search-bar">
          <div className="search-input-group">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="What service do you need?" 
              className="search-input"
            />
          </div>
          <div className="location-input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MapPin size={18} className="location-icon" />
            <input 
              type="text" 
              placeholder="Your Location" 
              className="location-input"
              value={locationValue}
              onChange={(e) => setLocationValue(e.target.value)}
              style={{ paddingRight: '2rem' }}
            />
            <button 
              type="button" 
              onClick={handleLocateMe}
              className={`locate-btn ${isLocating ? 'locating' : ''}`}
              title="Locate Me"
              disabled={isLocating}
            >
              <Navigation size={16} />
            </button>
          </div>
          <button className="btn btn-primary search-btn">Search</button>
        </div>

        <nav className="desktop-nav">
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          
          <Link to="/search" className="nav-link">Browse Services</Link>
          
          {user ? (
            <>
              <Link to={user.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard'} className="nav-link">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="btn btn-outline login-btn" style={{ padding: '0.5rem 1rem' }}>
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/auth/login" className="btn btn-outline login-btn">
                <User size={18} />
                <span>Sign In</span>
              </Link>
              <Link to="/auth/signup" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </nav>
        
        <button className="mobile-menu-btn">
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
};

export default Header;
