import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ChevronDown, LayoutDashboard, User, LogOut, MessageSquare 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './UserMenuPill.css';

const UserMenuPill = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!user) {
    return (
      <Link to="/auth/login" className="lp-user-pill lp-pill-guest">
        <div className="lp-pill-avatar">
          <User size={15} />
        </div>
        <span className="lp-pill-name">Sign In</span>
      </Link>
    );
  }

  const initial = user.name ? user.name.trim().charAt(0).toUpperCase() : 'U';
  const role = user.role || 'customer';

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/');
  };

  const handleNav = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="lp-user-pill-wrapper" ref={dropdownRef}>
      {/* ─── Pill Trigger (Matching Image 3) ─── */}
      <button 
        type="button" 
        className={`lp-user-pill ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="User navigation menu"
      >
        <div className="lp-pill-avatar">
          {initial}
        </div>
        <span className="lp-pill-name">{user.name || 'User'}</span>
        <ChevronDown 
          size={14} 
          strokeWidth={2.5} 
          className={`lp-pill-chevron ${isOpen ? 'open' : ''}`} 
        />
      </button>

      {/* ─── Dropdown Menu ─── */}
      {isOpen && (
        <div className="lp-pill-menu fade-in">
          <div className="lp-pill-menu-header">
            <div className="lp-pill-menu-user-row">
              <div className="lp-pill-avatar-lg">
                {initial}
              </div>
              <div className="lp-pill-user-info">
                <div className="lp-pill-user-name">{user.name || 'User'}</div>
                <div className="lp-pill-user-email">{user.email}</div>
              </div>
            </div>
            <span className="lp-pill-role-badge">
              {role === 'customer' ? 'Verified Customer' : role === 'provider' ? 'Service Provider' : 'Admin'}
            </span>
          </div>

          <div className="lp-pill-divider" />

          <div className="lp-pill-menu-items">
            {role === 'customer' && (
              <>
                <button 
                  type="button" 
                  className="lp-pill-menu-item"
                  onClick={() => handleNav('/customer-dashboard')}
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </button>

                <button 
                  type="button" 
                  className="lp-pill-menu-item"
                  onClick={() => handleNav('/messages')}
                >
                  <MessageSquare size={16} />
                  <span>Messages</span>
                </button>

                <button 
                  type="button" 
                  className="lp-pill-menu-item"
                  onClick={() => handleNav('/customer-dashboard?tab=profile')}
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>
              </>
            )}

            {role === 'provider' && (
              <>
                <button 
                  type="button" 
                  className="lp-pill-menu-item"
                  onClick={() => handleNav('/provider-dashboard')}
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </button>

                <button 
                  type="button" 
                  className="lp-pill-menu-item"
                  onClick={() => handleNav('/messages')}
                >
                  <MessageSquare size={16} />
                  <span>Messages</span>
                </button>

                <button 
                  type="button" 
                  className="lp-pill-menu-item"
                  onClick={() => handleNav('/provider-dashboard')}
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>
              </>
            )}

            {role === 'admin' && (
              <button 
                type="button" 
                className="lp-pill-menu-item"
                onClick={() => handleNav('/admin-dashboard')}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </button>
            )}

            <div className="lp-pill-divider" />

            <button 
              type="button" 
              className="lp-pill-menu-item lp-pill-logout"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenuPill;
