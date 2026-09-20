import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  MessageSquare, Send, ArrowLeft, Phone, Search, 
  ExternalLink, Navigation, CheckCircle2, Clock, AlertCircle, Wrench
} from 'lucide-react';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { playNotificationSound } from '../utils/soundNotifications';
import { openWhatsAppChat, formatWhatsAppBookingMessage } from '../utils/whatsapp';
import UserMenuPill from '../components/UserMenuPill';
import './Messages.css';

const Messages = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryBookingId = searchParams.get('bookingId');
  const [selectedBookingId, setSelectedBookingId] = useState(queryBookingId || null);

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // 'list' | 'chat' for mobile view toggling
  const [mobileView, setMobileView] = useState(queryBookingId ? 'chat' : 'list');

  const messagesEndRef = useRef(null);
  const myId = String(user?._id || user?.id || '');

  // 1. Fetch all conversations for current user
  const fetchConversations = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoadingConversations(true);

    try {
      const res = await fetch(`${API_URL}/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setConversations(data);

          // If no booking was explicitly selected, auto-select the first conversation on desktop
          if (!selectedBookingId && !queryBookingId && data.length > 0 && window.innerWidth > 768) {
            setSelectedBookingId(data[0].bookingId);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, [token, selectedBookingId, queryBookingId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Sync query parameter with selectedBookingId
  useEffect(() => {
    if (queryBookingId && queryBookingId !== selectedBookingId) {
      setSelectedBookingId(queryBookingId);
      setMobileView('chat');
    }
  }, [queryBookingId, selectedBookingId]);

  // When selectedBookingId changes, update URL search params quietly
  const handleSelectConversation = (bookingId) => {
    setSelectedBookingId(bookingId);
    setSearchParams({ bookingId }, { replace: true });
    setMobileView('chat');
  };

  // Find active conversation object
  const activeConversation = useMemo(() => {
    if (!selectedBookingId) return null;
    return conversations.find(c => String(c.bookingId) === String(selectedBookingId)) || null;
  }, [conversations, selectedBookingId]);

  // If a bookingId is in query params but conversation is not in list yet (e.g. fresh booking), fetch it
  useEffect(() => {
    if (!selectedBookingId || activeConversation || !token) return;

    const fetchSingleBooking = async () => {
      try {
        const res = await fetch(`${API_URL}/bookings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const bookings = await res.json();
          const target = bookings.find(b => String(b._id) === String(selectedBookingId));
          if (target) {
            const isProvider = user?.role === 'provider';
            const otherParty = isProvider ? target.customerId : target.providerId;
            const newConv = {
              bookingId: target._id,
              orderId: target.orderId || `ORD-${target._id.slice(-6).toUpperCase()}`,
              serviceCategory: target.providerId?.providerDetails?.category || 'Service',
              serviceStage: target.serviceStage || target.status,
              status: target.status,
              serviceDate: target.date,
              serviceAddress: target.serviceAddress,
              otherUser: {
                id: otherParty?._id,
                name: otherParty?.name || (isProvider ? 'Customer' : 'Service Specialist'),
                phone: otherParty?.phone,
                avatarUrl: otherParty?.avatarUrl || otherParty?.providerDetails?.avatarUrl,
                role: isProvider ? 'customer' : 'provider'
              },
              lastMessage: null,
              updatedAt: target.updatedAt || new Date()
            };
            setConversations(prev => [newConv, ...prev.filter(c => String(c.bookingId) !== String(target._id))]);
          }
        }
      } catch (err) {
        console.error('Error finding single booking thread:', err);
      }
    };

    fetchSingleBooking();
  }, [selectedBookingId, activeConversation, token, user]);

  // Helper to append message avoiding duplicates
  const appendMessage = useCallback((newMsg) => {
    if (!newMsg) return;
    setMessages((prev) => {
      const exists = prev.some((m) => {
        if (newMsg._id && m._id && String(m._id) === String(newMsg._id)) return true;
        if (!newMsg._id && m.text === newMsg.text && String(m.sender) === String(newMsg.sender)) return true;
        return false;
      });
      if (exists) return prev;
      return [...prev, newMsg];
    });
  }, []);

  // 2. Fetch messages history for active conversation
  const fetchMessagesHistory = useCallback(async (bId, silent = false) => {
    if (!bId || !token) return;
    if (!silent) setLoadingMessages(true);

    try {
      const res = await fetch(`${API_URL}/messages/${bId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMessages(data);
        }
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedBookingId) {
      fetchMessagesHistory(selectedBookingId);
    } else {
      setMessages([]);
    }
  }, [selectedBookingId, fetchMessagesHistory]);

  // 3. Socket.io setup and real-time listeners
  useEffect(() => {
    if (!token) return;

    let socketInstance;
    try {
      socketInstance = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 6
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        if (selectedBookingId) {
          socketInstance.emit('join_chat', String(selectedBookingId));
        }
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
      });

      socketInstance.on('receive_message', (msg) => {
        if (!msg) return;
        const msgBookingId = String(msg.bookingId?._id || msg.bookingId || '');

        // If message is for currently active thread
        if (msgBookingId === String(selectedBookingId)) {
          appendMessage(msg);
          const senderId = String(msg.sender?._id || msg.sender || '');
          if (senderId !== myId) {
            playNotificationSound('stage_update');
          }
        }

        // Update conversation list preview & bring to top
        setConversations(prev => {
          const idx = prev.findIndex(c => String(c.bookingId) === msgBookingId);
          if (idx === -1) {
            fetchConversations(true);
            return prev;
          }
          const updated = [...prev];
          const item = { ...updated[idx] };
          item.lastMessage = {
            text: msg.text,
            createdAt: msg.createdAt || new Date().toISOString(),
            isMine: String(msg.sender?._id || msg.sender) === myId
          };
          item.updatedAt = msg.createdAt || new Date().toISOString();
          updated.splice(idx, 1);
          return [item, ...updated];
        });
      });

      setSocket(socketInstance);
    } catch (err) {
      console.warn('Socket initialization failed:', err);
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [selectedBookingId, myId, token, appendMessage, fetchConversations]);

  // Join room when selectedBookingId updates
  useEffect(() => {
    if (socket && socket.connected && selectedBookingId) {
      socket.emit('join_chat', String(selectedBookingId));
    }
  }, [socket, selectedBookingId]);

  // Polling fallback every 4s for active conversation & 15s for conversation list
  useEffect(() => {
    if (!selectedBookingId) return;
    const interval = setInterval(() => {
      fetchMessagesHistory(selectedBookingId, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedBookingId, fetchMessagesHistory]);

  useEffect(() => {
    const listInterval = setInterval(() => {
      fetchConversations(true);
    }, 15000);
    return () => clearInterval(listInterval);
  }, [fetchConversations]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || !selectedBookingId || sending) return;

    setSending(true);
    setMessageText('');

    const targetReceiverId = activeConversation?.otherUser?.id;

    const payload = {
      bookingId: selectedBookingId,
      senderId: myId,
      receiverId: targetReceiverId,
      text: trimmed
    };

    // Emit via socket immediately
    if (socket && socket.connected) {
      socket.emit('send_message', payload);
    }

    // Persist via REST POST
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: selectedBookingId,
          receiverId: targetReceiverId,
          text: trimmed
        })
      });

      if (res.ok) {
        const savedMsg = await res.json();
        appendMessage(savedMsg);

        // Update local conversations list preview
        setConversations(prev => {
          const idx = prev.findIndex(c => String(c.bookingId) === String(selectedBookingId));
          if (idx === -1) return prev;
          const updated = [...prev];
          const item = { ...updated[idx] };
          item.lastMessage = {
            text: trimmed,
            createdAt: new Date().toISOString(),
            isMine: true
          };
          item.updatedAt = new Date().toISOString();
          updated.splice(idx, 1);
          return [item, ...updated];
        });
      }
    } catch (err) {
      console.error('Failed to send message via REST:', err);
    } finally {
      setSending(false);
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => {
      const name = c.otherUser?.name?.toLowerCase() || '';
      const order = c.orderId?.toLowerCase() || '';
      const cat = c.serviceCategory?.toLowerCase() || '';
      return name.includes(q) || order.includes(q) || cat.includes(q);
    });
  }, [conversations, searchQuery]);

  const dashboardRoute = user?.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard';

  // Format timestamp helper
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="msg-page-container">
      {/* ─── Topbar ─── */}
      <header className="msg-topbar">
        <div className="msg-topbar-left">
          <Link to={dashboardRoute} className="msg-brand-link">
            <span>Localfixr</span>
            <span className="msg-brand-badge">Chat Hub</span>
          </Link>

          <div className="msg-topbar-crumb">
            <span className="msg-topbar-crumb-sep">/</span>
            <span className="msg-topbar-crumb-curr">
              {user?.role === 'provider' ? 'Provider Messages' : 'Customer Messages'}
            </span>
          </div>
        </div>

        <div className="msg-topbar-right">
          <Link to={dashboardRoute} className="msg-back-dash-btn">
            <ArrowLeft size={15} />
            <span>Back to Dashboard</span>
          </Link>
          <UserMenuPill />
        </div>
      </header>

      {/* ─── Main Workspace ─── */}
      <div className="msg-workspace">
        {/* ─── Left Sidebar: Conversations List ─── */}
        <aside className={`msg-sidebar ${mobileView === 'chat' ? 'hide-mobile' : ''}`}>
          <div className="msg-sidebar-header">
            <div className="msg-sidebar-title-row">
              <h2 className="msg-sidebar-title">
                <MessageSquare size={20} />
                <span>Conversations</span>
              </h2>
              <span className="msg-count-pill">{conversations.length}</span>
            </div>

            <div className="msg-search-box">
              <Search size={15} className="msg-search-icon" />
              <input 
                type="text" 
                className="msg-search-input"
                placeholder="Search by name, order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="msg-thread-list">
            {loadingConversations ? (
              <div className="msg-sidebar-empty">
                <Clock size={28} className="animate-spin" />
                <span>Loading your conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="msg-sidebar-empty">
                <MessageSquare size={36} color="#888888" />
                <div style={{ fontWeight: 800, color: '#111111', fontSize: '0.95rem' }}>No conversations found</div>
                <p style={{ fontSize: '0.8rem', color: '#666666', margin: 0 }}>
                  {conversations.length === 0 
                    ? 'Conversations unlock automatically once you schedule or receive an active booking.' 
                    : 'No matches found for your search.'}
                </p>
                {conversations.length === 0 && user?.role === 'customer' && (
                  <Link to="/search" className="btn btn-lime btn-sm" style={{ marginTop: '0.5rem' }}>
                    Explore Services
                  </Link>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = String(conv.bookingId) === String(selectedBookingId);
                const other = conv.otherUser || {};
                const initial = other.name ? other.name[0].toUpperCase() : 'U';

                return (
                  <div
                    key={conv.bookingId}
                    className={`msg-thread-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectConversation(conv.bookingId)}
                  >
                    <div className="msg-thread-avatar-wrap">
                      {other.avatarUrl ? (
                        <img 
                          src={other.avatarUrl} 
                          alt={other.name} 
                          className="msg-thread-avatar" 
                        />
                      ) : (
                        <div className="msg-thread-avatar">
                          {initial}
                        </div>
                      )}
                    </div>

                    <div className="msg-thread-content">
                      <div className="msg-thread-top">
                        <span className="msg-thread-name">{other.name || 'Service Contact'}</span>
                        <span className="msg-thread-time">{formatTime(conv.updatedAt)}</span>
                      </div>

                      <div className="msg-thread-meta-row">
                        <span className="msg-order-tag">{conv.orderId}</span>
                        <span className={`msg-role-tag ${other.role === 'provider' ? 'provider' : 'customer'}`}>
                          {other.role === 'provider' ? 'Specialist' : 'Customer'}
                        </span>
                        {conv.serviceStage && (
                          <span style={{ fontSize: '0.68rem', color: '#666', textTransform: 'capitalize' }}>
                            • {conv.serviceStage.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <div className="msg-thread-snippet">
                        {conv.lastMessage ? (
                          <>
                            {conv.lastMessage.isMine && <strong>You: </strong>}
                            {conv.lastMessage.text}
                          </>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: '#888888' }}>
                            New conversation started
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ─── Right Pane: Active Chat Conversation ─── */}
        <main className={`msg-chat-pane ${mobileView === 'chat' ? 'show-mobile' : ''}`}>
          {!selectedBookingId || !activeConversation ? (
            <div className="msg-chat-placeholder">
              <div className="msg-placeholder-icon-wrap">
                <MessageSquare size={38} color="#111111" />
              </div>
              <h2 className="msg-placeholder-title">Select a Conversation</h2>
              <p className="msg-placeholder-desc">
                Choose a booking from the left sidebar to start real-time coordination with your service specialist or customer.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="msg-chat-header">
                <div className="msg-chat-header-left">
                  <button 
                    type="button" 
                    className="msg-mobile-back-btn"
                    onClick={() => setMobileView('list')}
                    title="Back to conversation list"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="msg-header-avatar-wrap">
                    {activeConversation.otherUser?.avatarUrl ? (
                      <img 
                        src={activeConversation.otherUser.avatarUrl} 
                        alt={activeConversation.otherUser.name} 
                        className="msg-header-avatar"
                      />
                    ) : (
                      <div className="msg-header-avatar">
                        {(activeConversation.otherUser?.name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="msg-header-info">
                    <div className="msg-header-name-row">
                      <h3 className="msg-header-name">{activeConversation.otherUser?.name || 'Service Contact'}</h3>
                      <span className={`msg-role-tag ${activeConversation.otherUser?.role === 'provider' ? 'provider' : 'customer'}`}>
                        {activeConversation.otherUser?.role === 'provider' ? 'Service Specialist' : 'Customer'}
                      </span>
                    </div>

                    <div className="msg-header-meta">
                      <span className="msg-order-tag">{activeConversation.orderId}</span>
                      <span>• {activeConversation.serviceCategory}</span>
                      {activeConversation.serviceDate && (
                        <span>• 📅 {activeConversation.serviceDate}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="msg-chat-header-actions">
                  <span className="msg-live-badge" title={isConnected ? 'Live WebSocket connected' : 'Polling backup'}>
                    <span className={`msg-live-dot ${isConnected ? 'connected' : 'syncing'}`} />
                    <span>{isConnected ? 'Live' : 'Syncing'}</span>
                  </span>

                  {activeConversation.otherUser?.phone && (
                    <>
                      <a 
                        href={`tel:${activeConversation.otherUser.phone}`} 
                        className="msg-action-pill"
                        title="Voice Call"
                      >
                        <Phone size={13} />
                        <span>Call</span>
                      </a>

                      <button 
                        type="button" 
                        className="msg-action-pill whatsapp"
                        onClick={() => {
                          const mockBooking = {
                            orderId: activeConversation.orderId,
                            description: activeConversation.serviceCategory,
                            serviceAddress: activeConversation.serviceAddress,
                            date: activeConversation.serviceDate
                          };
                          const text = formatWhatsAppBookingMessage(mockBooking, user?.role === 'provider');
                          openWhatsAppChat(activeConversation.otherUser.phone, text);
                        }}
                        title="WhatsApp Chat"
                      >
                        <span>WhatsApp</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Message Feed */}
              <div className="msg-feed">
                {loadingMessages ? (
                  <div className="msg-feed-empty">
                    <Clock size={28} className="animate-spin" />
                    <span>Loading conversation history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="msg-feed-empty">
                    <MessageSquare size={44} color="#CBD5E1" />
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111111' }}>
                      Start of conversation
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#666666', maxWidth: '340px' }}>
                      Coordinate appointment timings, clarify service scope, or exchange doorstep instructions securely.
                    </p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const senderObj = m.sender;
                    const senderId = typeof senderObj === 'object' ? (senderObj?._id || senderObj?.id) : senderObj;
                    const isMe = String(senderId) === myId;
                    const senderName = typeof senderObj === 'object' && senderObj?.name 
                      ? senderObj.name 
                      : (isMe ? 'You' : activeConversation.otherUser?.name || 'Contact');

                    const timeStr = m.createdAt ? formatTime(m.createdAt) : '';

                    return (
                      <div 
                        key={m._id || idx} 
                        className={`msg-bubble-wrap ${isMe ? 'me' : 'peer'}`}
                      >
                        {!isMe && (
                          <span className="msg-sender-name">
                            {senderName}
                          </span>
                        )}
                        <div className={`msg-bubble ${isMe ? 'me' : 'peer'}`}>
                          <p className="msg-bubble-text">{m.text}</p>
                          {timeStr && <span className="msg-bubble-time">{timeStr}</span>}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="msg-input-bar">
                <input 
                  type="text" 
                  className="msg-input-field"
                  placeholder={`Message ${activeConversation.otherUser?.name || 'partner'}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sending}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="msg-send-btn"
                  disabled={!messageText.trim() || sending}
                  title="Send message (Enter)"
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Messages;
