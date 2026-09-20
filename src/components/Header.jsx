import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, User, Menu, Moon, Sun, LogOut, Navigation, X, ChevronDown, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentLocationName } from '../utils/geolocation';
import MobileSideDrawer from './MobileSideDrawer';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // When logged in, top navigation heading is completely hidden
  if (user) {
    return null;
  }

  return (
    <header className="header">
      <div className="header-content">
        {user?.role === 'provider' ? (
          /* Provider Brand Group */
          <div className="provider-brand-group">
            <Link to={getHomeLink()} className="logo">
              <img src="/logo.png" alt="Localfixr" className="logo-img" />
              <span className="logo-text">Localfixr</span>
            </Link>
            <div className="provider-header-badge">
              💼 Provider Workstation
            </div>
          </div>
        ) : (
          <>
            {/* Logo — restored to official /logo.png */}
            <Link to={getHomeLink()} className="logo">
              <img src="/logo.png" alt="Localfixr" className="logo-img" />
              <span className="logo-text">Localfixr</span>
            </Link>

            {/* Center Navigation Links */}
            <nav className="desktop-center-nav">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/search" className="nav-link">Services</Link>
              <Link to="/how-it-works" className="nav-link">How It Works</Link>
              <Link to="/about" className="nav-link">About</Link>
              <Link to="/support" className="nav-link">Support</Link>
            </nav>

            {/* Navigation / Actions */}
            <nav className="desktop-nav">
              <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle Dark/Light Mode">
                {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              </button>

              <div className="auth-header-buttons">
                <Link to="/auth/login" className="nav-link nav-login-link">Login</Link>
                <Link to="/auth/signup" className="get-started-btn-lime">
                  Get Started
                </Link>
              </div>
            </nav>
            
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
              <Menu size={24} strokeWidth={2.2} />
            </button>
          </>
        )}
      </div>

      {/* Right Slide-Over Navigation Drawer matching Image 1 */}
      <MobileSideDrawer isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </header>
  );
};

export default Header;
