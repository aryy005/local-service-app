import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, User, Menu, Moon, Sun, LogOut, Navigation, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentLocationName } from '../utils/geolocation';
import './Header.css';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, userLocation, saveLocation } = useAuth();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();

  const [locationValue, setLocationValue] = useState(userLocation?.name || "");
  const [isLocating, setIsLocating] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const locationObj = await getCurrentLocationName();
      saveLocation(locationObj);
      setLocationValue(locationObj.name);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLocating(false);
    }
  };

  const getDashboardLink = () => {
    if (!user) return '/auth/login';
    if (user.role === 'admin') return '/admin-dashboard';
    if (user.role === 'provider') return '/provider-dashboard';
    return '/customer-dashboard';
  };

  return (
    <header className="header">
      <div className="container header-content">
        {/* Logo */}
        <Link to="/" className="logo">
          <div className="logo-mark">LP</div>
          <span className="logo-text">LocalPro</span>
        </Link>
        
        {/* Location selector (UC-style) */}
        <div className="location-selector" onClick={handleLocateMe}>
          <MapPin size={16} className="loc-icon" />
          <span className="loc-text">{locationValue || 'Select City'}</span>
          <ChevronDown size={14} />
        </div>

        {/* Search bar */}
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search for services" 
            className="search-input"
          />
        </div>

        {/* Navigation */}
        <nav className="desktop-nav">
          <Link to="/search" className="nav-link">Services</Link>
          
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)}
            style={{ background: 'transparent', color: 'inherit', border: '1px solid var(--surface-border)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', outline: 'none' }}
          >
            <option value="en" style={{color: 'black'}}>EN</option>
            <option value="hi" style={{color: 'black'}}>HI</option>
          </select>
          
          {user ? (
            <>
              <Link to={getDashboardLink()} className="nav-link">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/auth/login" className="nav-link">Login</Link>
              <Link to="/auth/signup" className="btn btn-primary btn-sm">
                Register
              </Link>
            </>
          )}
        </nav>
        
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-search">
          <Search size={18} />
          <input type="text" placeholder="Search for services" />
        </div>
        <Link to="/search" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Services</Link>
        <button className="mobile-nav-link" onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
          style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
        
        <div className="mobile-nav-actions">
          {user ? (
            <>
              <Link to={getDashboardLink()} className="btn btn-outline w-full" onClick={() => setIsMobileMenuOpen(false)}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className="btn btn-primary w-full">
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/auth/login" className="btn btn-outline w-full" onClick={() => setIsMobileMenuOpen(false)}>
                Login
              </Link>
              <Link to="/auth/signup" className="btn btn-primary w-full" onClick={() => setIsMobileMenuOpen(false)}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
