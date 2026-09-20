import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { io } from 'socket.io-client';

const SOCKET_URL = API_URL.replace('/api', '');

const ChatModal = ({ 
  isOpen = true, 
  onClose, 
  booking, 
  bookingId, 
  receiverId, 
  receiverName 
}) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef();

  // Resolve booking ID safely from either bookingId or booking object
  const resolvedBookingId = bookingId || (typeof booking === 'object' ? booking?._id : booking);

  // Normalize current user ID
  const myId = String(user?._id || user?.id || '');

  // Resolve recipient ID
  let resolvedReceiverId = receiverId;
  if (!resolvedReceiverId && booking && typeof booking === 'object') {
    const cid = String(booking.customerId?._id || booking.customerId || '');
    const pid = String(booking.providerId?._id || booking.providerId || '');
    resolvedReceiverId = (myId === pid) ? cid : pid;
  }

  // Resolve recipient name
  let resolvedReceiverName = receiverName;
  if (!resolvedReceiverName && booking && typeof booking === 'object') {
    if (myId === String(booking.providerId?._id || booking.providerId || '')) {
      resolvedReceiverName = booking.customerId?.name || 'Customer';
    } else {
      resolvedReceiverName = booking.providerId?.name || 'Service Partner';
    }
  }

  // Helper to deduplicate messages by _id
  const appendMessage = (newMsg) => {
    if (!newMsg) return;
    setMessages((prev) => {
      const exists = prev.some((m) => {
        if (newMsg._id && m._id && String(m._id) === String(newMsg._id)) return true;
        const newSender = String(newMsg.sender?._id || newMsg.sender || '');
        const existingSender = String(m.sender?._id || m.sender || '');
        if (newSender && existingSender && newSender === existingSender && m.text?.trim() === newMsg.text?.trim()) {
          const timeA = new Date(m.createdAt || Date.now()).getTime();
          const timeB = new Date(newMsg.createdAt || Date.now()).getTime();
          if (Math.abs(timeA - timeB) < 4000) {
            return true;
          }
        }
        return false;
      });
      if (exists) return prev;
      return [...prev, newMsg];
    });
  };

  useEffect(() => {
    if (isOpen === false || !resolvedBookingId || !user) return;

    // Fetch initial chat history
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/messages/${resolvedBookingId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setMessages(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch messages history:', err);
      }
    };

    fetchHistory();

    // Establish Socket.IO connection
    let newSocket;
    try {
      newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        newSocket.emit('join_chat', String(resolvedBookingId));
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      newSocket.on('receive_message', (msg) => {
        if (msg) {
          appendMessage(msg);
        }
      });

      setSocket(newSocket);
    } catch (socketErr) {
      console.warn('Socket connection error, using HTTP sync:', socketErr);
    }

    // Polling fallback every 3.5 seconds to guarantee 100% reliable sync
    const pollInterval = setInterval(() => {
      fetchHistory();
    }, 3500);

    // Keyboard listener for Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('keydown', handleKeyDown);
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isOpen, resolvedBookingId, user, token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !resolvedBookingId) return;

    const payload = {
      bookingId: resolvedBookingId,
      senderId: myId,
      receiverId: resolvedReceiverId,
      text: trimmed
    };

    setText('');

    // Persist via REST POST endpoint (which automatically broadcasts to the room)
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: resolvedBookingId,
          receiverId: resolvedReceiverId,
          text: trimmed
        })
      });

      if (res.ok) {
        const savedMsg = await res.json();
        appendMessage(savedMsg);
      }
    } catch (err) {
      console.error('Error sending message via REST fallback:', err);
    }
  };

  if (isOpen === false) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col h-[580px] border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center bg-[#111111] text-white border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#D2FE00] text-black font-black flex items-center justify-center text-sm">
                {(resolvedReceiverName || 'P')[0].toUpperCase()}
              </div>
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#111] ${isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight text-white">
                {resolvedReceiverName || 'Chat'}
              </h3>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <span>Direct Live Chat</span>
                <span>•</span>
                <span className={isConnected ? 'text-emerald-400' : 'text-amber-400'}>
                  {isConnected ? 'Connected' : 'Syncing'}
                </span>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
            title="Close chat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
          {messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-500 dark:text-gray-400 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2 text-gray-400">
                💬
              </div>
              <p className="font-semibold text-sm">No messages yet.</p>
              <p className="text-xs text-gray-400 mt-1">Send a message to begin coordination.</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const mSenderId = typeof m.sender === 'object' ? (m.sender?._id || m.sender?.id) : m.sender;
              const isMe = String(mSenderId) === myId;
              
              const timeStr = m.createdAt 
                ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div key={m._id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${
                    isMe 
                      ? 'bg-[#111111] text-white rounded-tr-none' 
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-tl-none text-gray-900 dark:text-white'
                  }`}>
                    {!isMe && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-300 font-bold block mb-1 uppercase tracking-wider">
                        {m.sender?.name || resolvedReceiverName || 'Partner'}
                      </span>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                    {timeStr && (
                      <span className={`text-[9px] block text-right mt-1 ${isMe ? 'text-gray-400' : 'text-gray-400'}`}>
                        {timeStr}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2 items-center">
          <input
            type="text"
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-full text-sm focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            className="p-2.5 bg-[#111111] text-[#D2FE00] rounded-full hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md flex items-center justify-center"
            title="Send"
          >
            <Send size={16} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default ChatModal;
