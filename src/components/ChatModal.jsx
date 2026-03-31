import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { io } from 'socket.io-client';

const SOCKET_URL = API_URL.replace('/api', '');

const ChatModal = ({ isOpen, onClose, booking }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState(null);
  const scrollRef = useRef();

  useEffect(() => {
    if (!isOpen || !booking || !user) return;

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit('join_chat', booking._id);

    newSocket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/messages/${booking._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };
    fetchHistory();

    return () => {
      newSocket.disconnect();
    };
  }, [isOpen, booking, user, token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !socket) return;

    // Determine who is receiving based on booking structure. 
    // booking.customerId / booking.providerId can be objects when populated, or strings if not.
    const cid = typeof booking.customerId === 'object' ? booking.customerId._id : booking.customerId;
    const pid = typeof booking.providerId === 'object' ? booking.providerId._id : booking.providerId;
    
    // Fallback ID checking
    const myId = user._id || user.id;
    const receiverId = myId === pid ? cid : pid;

    const msgData = {
      bookingId: booking._id,
      senderId: myId,
      receiverId: receiverId,
      text
    };

    socket.emit('send_message', msgData);
    setText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col h-[600px] border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-indigo-600 text-white">
          <h3 className="font-bold">Chat Workspace</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 border-x border-gray-200 dark:border-gray-700">
          {messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-500">
              <p>No messages yet.</p>
              <p className="text-sm">Say hello!</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const mSenderId = typeof m.sender === 'object' ? m.sender._id : m.sender;
              const isMe = String(mSenderId) === String(user._id || user.id);
              
              return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-tl-none dark:text-white'
                  }`}>
                    {!isMe && <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold block mb-1 uppercase">{m.sender?.name || 'Partner'}</span>}
                    <p className="text-sm leading-relaxed">{m.text}</p>
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
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 dark:text-white border-0 rounded-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            <Send size={18} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default ChatModal;
