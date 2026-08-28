import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, User, Menu, Moon, Sun, LogOut, Navigation, X, ChevronDown, LayoutDashboard } from 'lucide-react';
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
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

  const getHomeLink = () => {
    if (user?.role === 'provider') return '/provider-dashboard';
    if (user?.role === 'admin') return '/admin-dashboard';
    return '/';
  };

  return (
    <header className="header">
      <div className="container header-content">
        {/* Logo */}
        <Link to={getHomeLink()} className="logo">
          <div className="logo-mark">LF</div>
          <span className="logo-text">LocalFixr</span>
        </Link>
        
        {user?.role === 'provider' ? (
          /* Provider Workstation Header Badge */
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '0.4rem 0.85rem', borderRadius: '2rem', color: '#6366f1', fontSize: '0.85rem', fontWeight: 700 }}>
            💼 Provider Workstation
          </div>
        ) : (
          <>
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
          </>
        )}

        {/* Navigation */}
        <nav className="desktop-nav">
          {user?.role === 'provider' ? (
            <Link to="/provider-dashboard" className="nav-link" style={{ fontWeight: 700, color: '#6366f1' }}>My Jobs & Orders</Link>
          ) : (
            <Link to="/search" className="nav-link">Services</Link>
          )}
          
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
            <div className="profile-dropdown-container" ref={profileRef}>
              <button 
                type="button" 
                className="profile-trigger-btn"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="profile-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                </div>
                <span className="profile-trigger-name">{user.name || 'Profile'}</span>
                <ChevronDown size={14} className={`dropdown-chevron ${isProfileOpen ? 'open' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="profile-dropdown-menu">
                  <div className="profile-dropdown-header">
                    <div className="profile-user-name">{user.name}</div>
                    <div className="profile-user-email">{user.email}</div>
                    <span className="profile-role-badge">{user.role}</span>
                  </div>

                  <div className="profile-dropdown-divider"></div>

                  <Link 
                    to={getDashboardLink()} 
                    className="profile-dropdown-item"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <LayoutDashboard size={16} />
                    <span>{user.role === 'provider' ? 'My Jobs & Dashboard' : 'Profile & Dashboard'}</span>
                  </Link>

                  <button 
                    type="button"
                    className="profile-dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
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
            <div className="mobile-profile-card">
              <div className="mobile-profile-info">
                <div className="profile-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                </div>
                <div>
                  <div className="profile-user-name">{user.name}</div>
                  <div className="profile-user-email">{user.email}</div>
                </div>
              </div>
              <Link to={getDashboardLink()} className="btn btn-outline w-full mt-2" onClick={() => setIsMobileMenuOpen(false)}>
                <LayoutDashboard size={16} /> Profile & Dashboard
              </Link>
              <button onClick={handleLogout} className="btn btn-primary w-full mt-2">
                <LogOut size={16} /> Logout
              </button>
            </div>
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
