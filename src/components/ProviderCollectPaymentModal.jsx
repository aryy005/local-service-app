import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Banknote, ShieldCheck, CheckCircle2, 
  ExternalLink, Copy, Check, AlertCircle, RefreshCw, Smartphone
} from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API_URL, SOCKET_URL } from '../config';
import './ProviderCollectPaymentModal.css';

const ProviderCollectPaymentModal = ({ booking, onClose, onPaymentConfirmed }) => {
  const { token } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState('upi'); // 'upi' | 'cash'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const socketRef = useRef(null);

  if (!booking) return null;

  const totalPayable = booking?.billingDetails?.totalAmount || booking?.paidAmount || booking?.finalPrice || 350;
  const orderRefId = booking?.orderId || ('ORD-' + booking?._id?.slice(-6).toUpperCase());
  const customerName = booking?.customerId?.name || 'Customer';
  const customerPhone = booking?.customerId?.phone || '';
  
  // Exact same UPI URL and QR code as Customer window
  const upiIntentUrl = `upi://pay?pa=localfixr@upi&pn=LocalFixr%20Technologies&am=${totalPayable}&tn=Order%20${orderRefId}&cu=INR`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiIntentUrl)}`;

  // Listen for real-time payment completion from customer's device
  useEffect(() => {
    if (!booking?._id) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_booking_room', booking._id);
    });

    socket.on('payment_completed', (data) => {
      if (data.bookingId === booking._id) {
        setPaymentSuccess(true);
        toast.success(`Payment of ₹${totalPayable} received successfully! 🎉`);
        setTimeout(() => {
          if (onPaymentConfirmed) onPaymentConfirmed(data);
          onClose();
        }, 2200);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [booking?._id]);

  const handleCopyVpa = () => {
    navigator.clipboard.writeText('localfixr@upi');
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: booking._id,
          paymentMethod: selectedMethod === 'cash' ? 'cash' : 'upi',
          transactionId: `COLLECT_${selectedMethod.toUpperCase()}_${Date.now()}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to record payment');
      }

      setPaymentSuccess(true);
      toast.success(`Payment of ₹${totalPayable} confirmed successfully!`);
      setTimeout(() => {
        if (onPaymentConfirmed) onPaymentConfirmed(data.booking || booking);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Payment confirmation error:', err);
      toast.error(err.message || 'Error recording payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="collect-pay-overlay" onClick={onClose}>
      <div className="collect-pay-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="collect-pay-header">
          <div className="collect-pay-header-left">
            <div className="collect-pay-header-icon">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="collect-pay-title">Collect Customer Payment</h2>
              <span className="collect-pay-subtitle">Order #{orderRefId} • {customerName}</span>
            </div>
          </div>
          <button className="collect-pay-close-btn" onClick={onClose}>&times;</button>
        </div>

        {paymentSuccess ? (
          /* Success Animation State */
          <div className="collect-pay-success-state fade-in">
            <div className="collect-pay-success-icon">
              <CheckCircle2 size={56} style={{ color: '#10B981' }} />
            </div>
            <h3>Payment Received!</h3>
            <p className="collect-pay-success-amt">₹{totalPayable}</p>
            <span className="collect-pay-success-desc">
              Payment confirmed via {selectedMethod === 'cash' ? 'Cash' : 'UPI QR'}. Booking #{orderRefId} is now officially closed.
            </span>
          </div>
        ) : (
          /* Main Payment Collection View */
          <div className="collect-pay-body">
            
            {/* Amount Banner */}
            <div className="collect-pay-amount-card">
              <div className="collect-pay-amt-label">Total Amount Due</div>
              <div className="collect-pay-amt-value">₹{totalPayable}</div>
              <div className="collect-pay-amt-breakdown">
                {booking?.billingDetails?.extraExpenses > 0 && (
                  <span>Base: ₹{booking.billingDetails.serviceAmount} + Parts: ₹{booking.billingDetails.extraExpenses} + Taxes/Fees</span>
                )}
              </div>
            </div>

            {/* Method Tabs */}
            <div className="collect-pay-tabs">
              <button 
                type="button"
                className={`collect-pay-tab ${selectedMethod === 'upi' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('upi')}
              >
                <QrCode size={16} />
                <span>Scan UPI QR Code</span>
              </button>
              <button 
                type="button"
                className={`collect-pay-tab ${selectedMethod === 'cash' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('cash')}
              >
                <Banknote size={16} />
                <span>Received in Cash</span>
              </button>
            </div>

            {/* Tab 1: UPI QR Code Screen */}
            {selectedMethod === 'upi' && (
              <div className="collect-pay-qr-section fade-in">
                <div className="collect-pay-qr-instruction">
                  <Smartphone size={16} style={{ color: '#10B981' }} />
                  <span>Show this screen to customer to scan with any UPI app:</span>
                </div>

                <div className="collect-pay-qr-box">
                  <img 
                    src={qrImageSrc} 
                    alt="Scannable UPI QR Code"
                    className="collect-pay-qr-image" 
                  />
                  <div className="collect-pay-qr-badge">
                    Scan to Pay ₹{totalPayable}
                  </div>
                </div>

                {/* VPA and details */}
                <div className="collect-pay-vpa-pill">
                  <span className="collect-pay-vpa-text">UPI ID: <strong>localfixr@upi</strong></span>
                  <button type="button" className="collect-pay-copy-btn" onClick={handleCopyVpa}>
                    {copiedVpa ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedVpa ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="collect-pay-apps-supported">
                  <span>Accepts Google Pay, PhonePe, Paytm, BHIM & all UPI apps</span>
                </div>
              </div>
            )}

            {/* Tab 2: Cash Payment Screen */}
            {selectedMethod === 'cash' && (
              <div className="collect-pay-cash-section fade-in">
                <div className="collect-pay-cash-box">
                  <div className="collect-pay-cash-icon">
                    <Banknote size={36} style={{ color: '#047857' }} />
                  </div>
                  <h4>Cash Payment Collection</h4>
                  <p>Please collect physical cash of exactly <strong>₹{totalPayable}</strong> directly from {customerName}.</p>
                  <div className="collect-pay-cash-verify-badge">
                    <CheckCircle2 size={15} /> Handover verified on customer premises
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="collect-pay-actions">
              <button 
                type="button" 
                className="collect-pay-confirm-btn"
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Verifying Receipt...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    <span>Confirm Payment Received (₹{totalPayable})</span>
                  </>
                )}
              </button>
            </div>

            <div className="collect-pay-footer-note">
              <ShieldCheck size={13} />
              <span>Customer's app window will automatically synchronize and issue receipt upon confirmation.</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default ProviderCollectPaymentModal;