import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Check, Trash2, Calendar, CreditCard, MessageSquare, 
  Info, ExternalLink, CheckCheck 
} from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API_URL, SOCKET_URL } from '../config';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id || user._id;
    if (!userId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_user_room', userId);
    });

    socket.on('new_notification', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);

      toast((t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={18} style={{ color: '#10B981' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{newNotif.title}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{newNotif.message}</div>
          </div>
        </div>
      ), { duration: 4500 });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleMarkRead = async (id, link, e) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const target = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (target && !target.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await fetch(`${API_URL}/notifications/clear-all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  if (!user) return null;

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'booking':
        return <Calendar size={15} style={{ color: '#3B82F6' }} />;
      case 'payment':
        return <CreditCard size={15} style={{ color: '#10B981' }} />;
      case 'chat':
        return <MessageSquare size={15} style={{ color: '#8B5CF6' }} />;
      default:
        return <Info size={15} style={{ color: '#F59E0B' }} />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="notif-center-wrapper" ref={dropdownRef}>
      <button 
        type="button"
        className={`notif-bell-btn ${isOpen ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown-tray fade-in">
          <div className="notif-tray-header">
            <div className="notif-header-left">
              <span className="notif-header-title">Notifications</span>
              {unreadCount > 0 && (
                <span className="notif-unread-pill">{unreadCount} new</span>
              )}
            </div>
            {notifications.length > 0 && (
              <button 
                type="button"
                className="notif-mark-all-btn"
                onClick={handleMarkAllRead}
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="notif-filter-tabs">
            <button 
              className={`notif-filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button 
              className={`notif-filter-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="notif-list-container">
            {filteredNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="notif-empty-icon">
                  <Bell size={26} />
                </div>
                <p className="notif-empty-text">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <span className="notif-empty-subtext">
                  Real-time alerts for bookings, jobs, and payments will appear here.
                </span>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div 
                  key={notif._id}
                  className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                  onClick={() => handleMarkRead(notif._id, notif.link)}
                >
                  <div className="notif-item-icon-box">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-top">
                      <span className="notif-item-title">{notif.title}</span>
                      <span className="notif-item-time">{formatTimeAgo(notif.createdAt)}</span>
                    </div>
                    <p className="notif-item-message">{notif.message}</p>
                    {notif.link && (
                      <span className="notif-item-action-hint">
                        View details <ExternalLink size={11} />
                      </span>
                    )}
                  </div>
                  <div className="notif-item-actions">
                    {!notif.isRead && (
                      <button 
                        className="notif-action-btn read-btn"
                        onClick={(e) => handleMarkRead(notif._id, null, e)}
                        title="Mark as read"
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <button 
                      className="notif-action-btn delete-btn"
                      onClick={(e) => handleDeleteNotification(notif._id, e)}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notif-tray-footer">
              <button 
                type="button" 
                className="notif-clear-all-btn"
                onClick={handleClearAll}
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;