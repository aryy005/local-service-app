import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Calendar, MessageSquare, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './MobileBottomNav.css';

const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // STRICT REQUIREMENT: Do NOT show navigation before signing in
  if (!user) {
    return null;
  }

  // Determine active tab
  const path = location.pathname;
  const search = location.search;

  const isHome = path === '/';
  const isBookings = path.includes('-dashboard') && search.includes('tab=bookings');
  const isMessages = path.startsWith('/messages');
  const isProfile = (path.includes('-dashboard') && !search.includes('tab=bookings')) || path.includes('profile');

  const getDashboardPath = (tab = '') => {
    const base = user.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard';
    return tab ? `${base}?tab=${tab}` : base;
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Bottom Mobile Navigation">
      <button 
        type="button" 
        className={`mob-nav-item ${isHome ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <HomeIcon size={22} strokeWidth={isHome ? 2.5 : 2} />
        <span>Home</span>
      </button>

      <button 
        type="button" 
        className={`mob-nav-item ${isBookings ? 'active' : ''}`}
        onClick={() => navigate(getDashboardPath('bookings'))}
      >
        <Calendar size={22} strokeWidth={isBookings ? 2.5 : 2} />
        <span>Bookings</span>
      </button>

      <button 
        type="button" 
        className={`mob-nav-item ${isMessages ? 'active' : ''}`}
        onClick={() => navigate('/messages')}
      >
        <MessageSquare size={22} strokeWidth={isMessages ? 2.5 : 2} />
        <span>Messages</span>
      </button>

      <button 
        type="button" 
        className={`mob-nav-item ${isProfile ? 'active' : ''}`}
        onClick={() => navigate(getDashboardPath('profile'))}
      >
        <UserIcon size={22} strokeWidth={isProfile ? 2.5 : 2} />
        <span>Profile</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
