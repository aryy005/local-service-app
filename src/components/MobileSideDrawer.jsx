import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home as HomeIcon, 
  Calendar, 
  MessageSquare, 
  Heart, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './MobileSideDrawer.css';

const MobileSideDrawer = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPath = location.pathname;
  const currentSearch = location.search;

  const isHome = currentPath === '/';
  const isBookings = currentSearch.includes('tab=bookings');
  const isMessages = currentPath.startsWith('/messages');
  const isSaved = currentSearch.includes('tab=saved') || currentSearch.includes('tab=favorites');
  const isSettings = currentSearch.includes('tab=profile') || currentSearch.includes('tab=settings');

  const handleNav = (path) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/');
  };

  const getDashboardPath = (tab = '') => {
    const base = user?.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard';
    return tab ? `${base}?tab=${tab}` : base;
  };

  // Dynamic user initials fallback
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="side-drawer-backdrop" onClick={onClose}>
      <div 
        className="side-drawer-panel" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header Row */}
        <div className="side-drawer-header">
          <div className="side-drawer-brand">Localfixr</div>
          <button 
            type="button" 
            className="side-drawer-close-btn" 
            onClick={onClose}
            aria-label="Close menu"
          >
            <Menu size={22} />
          </button>
        </div>

        {/* Dynamic User Profile Card (Fresh & Real User Data) */}
        {user ? (
          <div className="side-drawer-user-card" onClick={() => handleNav(getDashboardPath('profile'))}>
            <div className="side-drawer-avatar">
              {user.avatarUrl || user.providerDetails?.avatarUrl ? (
                <img 
                  src={user.avatarUrl || user.providerDetails?.avatarUrl} 
                  alt={user.name} 
                  className="side-drawer-avatar-img"
                />
              ) : (
                <div className="side-drawer-avatar-fallback">
                  {initials}
                </div>
              )}
            </div>
            <div className="side-drawer-user-info">
              <div className="side-drawer-username">{user.name || 'Account Member'}</div>
              <div className="side-drawer-useremail">{user.email || 'user@localfixr.site'}</div>
            </div>
          </div>
        ) : (
          <div className="side-drawer-guest-card">
            <div className="side-drawer-guest-text">Welcome to Localfixr</div>
            <div className="side-drawer-guest-btns">
              <button 
                className="side-drawer-btn-login"
                onClick={() => handleNav('/auth/login')}
              >
                Sign In
              </button>
              <button 
                className="side-drawer-btn-signup"
                onClick={() => handleNav('/auth/signup')}
              >
                Register
              </button>
            </div>
          </div>
        )}

        {/* Navigation Menu Items matching Image 1 */}
        <div className="side-drawer-menu">
          <button 
            type="button"
            className={`side-drawer-item ${isHome ? 'active' : ''}`}
            onClick={() => handleNav('/')}
          >
            <HomeIcon size={20} />
            <span>Home</span>
          </button>

          {user && (
            <>
              <button 
                type="button"
                className={`side-drawer-item ${isBookings ? 'active' : ''}`}
                onClick={() => handleNav(getDashboardPath('bookings'))}
              >
                <Calendar size={20} />
                <span>My Bookings</span>
              </button>

              <button 
                type="button"
                className={`side-drawer-item ${isMessages ? 'active' : ''}`}
                onClick={() => handleNav('/messages')}
              >
                <div className="side-drawer-item-content">
                  <MessageSquare size={20} />
                  <span>Messages</span>
                </div>
                <span className="side-drawer-badge">2</span>
              </button>

              <button 
                type="button"
                className={`side-drawer-item ${isSaved ? 'active' : ''}`}
                onClick={() => handleNav(getDashboardPath('saved'))}
              >
                <Heart size={20} />
                <span>Saved Providers</span>
              </button>

              <button 
                type="button"
                className={`side-drawer-item ${isSettings ? 'active' : ''}`}
                onClick={() => handleNav(getDashboardPath('profile'))}
              >
                <Settings size={20} />
                <span>Settings</span>
              </button>
            </>
          )}

          {!user && (
            <>
              <button 
                type="button"
                className="side-drawer-item"
                onClick={() => handleNav('/search')}
              >
                <UserIcon size={20} />
                <span>Browse Services</span>
              </button>
              <button 
                type="button"
                className="side-drawer-item"
                onClick={() => handleNav('/about')}
              >
                <Settings size={20} />
                <span>About Localfixr</span>
              </button>
            </>
          )}
        </div>

        {/* Bottom Logout Row */}
        {user && (
          <div className="side-drawer-footer">
            <button 
              type="button"
              className="side-drawer-logout-btn"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default MobileSideDrawer;
