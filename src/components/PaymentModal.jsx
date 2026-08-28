import { useState, useEffect } from 'react';
import { ShieldCheck, CreditCard, QrCode, Building, Wallet, Banknote, CheckCircle, Loader2, Lock, ArrowRight, ExternalLink } from 'lucide-react';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { playNotificationSound } from '../utils/soundNotifications';
import './PaymentModal.css';

const PaymentModal = ({ booking, onClose, onSuccess }) => {
  const { token } = useAuth();
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [order, setOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('upi'); // 'upi' | 'card' | 'netbanking' | 'wallet' | 'cash'
  
  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // UPI Form State
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [upiId, setUpiId] = useState('');

  // Netbanking State
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Wallet State
  const [selectedWallet, setSelectedWallet] = useState('Paytm Wallet');

  // Processing & Error State
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoadingOrder(true);
        const res = await fetch(`${API_URL}/payments/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ bookingId: booking._id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to initialize order');
        setOrder(data);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoadingOrder(false);
      }
    };

    if (booking) fetchOrderDetails();
  }, [booking, token]);

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = val.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    setCardExpiry(val);
  };

  const handlePayNow = async () => {
    setErrorMsg('');
    setIsProcessing(true);

    try {
      if (activeTab === 'card') {
        if (cardNumber.replace(/\s/g, '').length < 16) throw new Error('Enter a valid 16-digit card number');
        if (cardExpiry.length < 5) throw new Error('Enter a valid expiry date (MM/YY)');
        if (cardCvv.length < 3) throw new Error('Enter a valid 3-digit CVV');
        if (!cardName.trim()) throw new Error('Enter cardholder name');
      } else if (activeTab === 'upi') {
        if (!selectedUpiApp && !upiId) throw new Error('Please select a UPI App or enter UPI ID');
      }

      await new Promise((resolve) => setTimeout(resolve, 1400));

      const transactionId = 'TXN_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);

      const res = await fetch(`${API_URL}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: booking._id,
          paymentMethod: activeTab,
          transactionId,
          gateway: 'mock'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment verification failed');

      // Play payment success chime
      playNotificationSound('payment_success');

      setPaymentSuccess({
        transactionId: data.booking.paymentId,
        amount: data.booking.paidAmount,
        paidAt: data.booking.paidAt,
        paymentMethod: activeTab
      });

      if (onSuccess) onSuccess(data.booking);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!booking) return null;

  const totalPayable = order?.breakdown?.totalAmount || booking.paidAmount || booking.finalPrice || 25;
  const orderRefId = booking.orderId || ('ORD-' + booking._id?.slice(-6).toUpperCase());
  const upiIntentUrl = `upi://pay?pa=localfixr@upi&pn=LocalFixr%20Technologies&am=${totalPayable}&tn=Order%20${orderRefId}&cu=INR`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiIntentUrl)}`;

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal-container">
        
        {/* Header */}
        <div className="payment-modal-header">
          <h2>
            <ShieldCheck style={{ color: '#10B981' }} size={24} />
            Secure Payment Gateway
          </h2>
          <button className="payment-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="payment-modal-body">
          {loadingOrder ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Loader2 className="animate-spin" size={36} style={{ color: '#6366F1', margin: '0 auto 1rem auto' }} />
              <p style={{ color: 'var(--text-muted)' }}>Calculating service billing & tax details...</p>
            </div>
          ) : paymentSuccess ? (
            /* Success Screen */
            <div className="payment-success-box">
              <div className="success-icon">
                <CheckCircle size={40} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                Payment Successful!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Your payment of <strong>₹{paymentSuccess.amount}</strong> for {booking.providerId?.name || 'Service Professional'} has been processed.
              </p>

              <div style={{ background: 'var(--surface-bg, #f8fafc)', border: '1px solid var(--surface-border)', borderRadius: '0.75rem', padding: '1rem', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{paymentSuccess.transactionId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment Method:</span>
                  <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{paymentSuccess.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                  <span>{new Date(paymentSuccess.paidAt).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Done <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Main Checkout View */
            <>
              {/* Price Breakdown Box */}
              {order?.breakdown && (
                <div className="order-summary-box">
                  <div className="summary-row">
                    <span>Service Charge ({order.providerName}):</span>
                    <span>₹{order.breakdown.serviceAmount}</span>
                  </div>
                  <div className="summary-row">
                    <span>Platform Service Fee (5%):</span>
                    <span>₹{order.breakdown.platformFee}</span>
                  </div>
                  <div className="summary-row">
                    <span>GST / Taxes (18%):</span>
                    <span>₹{order.breakdown.tax}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total Amount Payable:</span>
                    <span>₹{order.breakdown.totalAmount}</span>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Payment Method Selector Tabs */}
              <div className="payment-tabs">
                <button 
                  className={`payment-tab-btn ${activeTab === 'upi' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upi')}
                >
                  <QrCode size={16} /> UPI / QR Code
                </button>
                <button 
                  className={`payment-tab-btn ${activeTab === 'card' ? 'active' : ''}`}
                  onClick={() => setActiveTab('card')}
                >
                  <CreditCard size={16} /> Card
                </button>
                <button 
                  className={`payment-tab-btn ${activeTab === 'netbanking' ? 'active' : ''}`}
                  onClick={() => setActiveTab('netbanking')}
                >
                  <Building size={16} /> Net Banking
                </button>
                <button 
                  className={`payment-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
                  onClick={() => setActiveTab('wallet')}
                >
                  <Wallet size={16} /> Wallets
                </button>
                <button 
                  className={`payment-tab-btn ${activeTab === 'cash' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cash')}
                >
                  <Banknote size={16} /> Cash on Service
                </button>
              </div>

              {/* Tab 1: Dynamic Scannable UPI & QR Code */}
              {activeTab === 'upi' && (
                <div>
                  <div className="qr-container" style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'inline-block', padding: '0.75rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <img 
                        src={qrImageSrc} 
                        alt="Dynamic UPI QR Code" 
                        style={{ width: '160px', height: '160px', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginTop: '0.65rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', display: 'block' }}>
                        Scan & Pay ₹{totalPayable} with Any UPI App
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        VPA: localfixr@upi • Ref: #{orderRefId}
                      </span>
                    </div>

                    <a 
                      href={upiIntentUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', background: 'rgba(79, 70, 229, 0.1)', padding: '0.4rem 0.85rem', borderRadius: '2rem', textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} /> Open UPI App Directly
                    </a>
                  </div>

                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Or Enter Virtual Payment Address (VPA / UPI ID)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. mobileNumber@upi or name@okicici"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                  </div>

                  <div className="upi-apps-grid">
                    {[
                      { id: 'gpay', label: 'Google Pay' },
                      { id: 'phonepe', label: 'PhonePe' },
                      { id: 'paytm', label: 'Paytm UPI' },
                      { id: 'bhim', label: 'BHIM UPI' }
                    ].map((app) => (
                      <div 
                        key={app.id}
                        className={`upi-app-card ${selectedUpiApp === app.id ? 'selected' : ''}`}
                        onClick={() => setSelectedUpiApp(app.id)}
                      >
                        {app.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Credit / Debit Card */}
              {activeTab === 'card' && (
                <div>
                  <div className="form-group">
                    <label>Card Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="4532 XXXX XXXX 8901"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>CVV / CVC</label>
                      <input 
                        type="password" 
                        className="form-input" 
                        placeholder="123"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Cardholder Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Name on card"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Net Banking */}
              {activeTab === 'netbanking' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                    Select Popular Bank
                  </label>
                  <div className="bank-grid">
                    {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Punjab National Bank'].map((bank) => (
                      <div 
                        key={bank} 
                        className={`bank-card ${selectedBank === bank ? 'selected' : ''}`}
                        onClick={() => setSelectedBank(bank)}
                      >
                        {bank}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Digital Wallets */}
              {activeTab === 'wallet' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                    Select Digital Wallet
                  </label>
                  <div className="bank-grid">
                    {['Paytm Wallet', 'PhonePe Wallet', 'Mobikwik', 'Amazon Pay', 'Airtel Money', 'LazyPay'].map((wallet) => (
                      <div 
                        key={wallet} 
                        className={`bank-card ${selectedWallet === wallet ? 'selected' : ''}`}
                        onClick={() => setSelectedWallet(wallet)}
                      >
                        {wallet}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: Cash on Service */}
              {activeTab === 'cash' && (
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(234, 179, 8, 0.08)', borderRadius: '0.75rem', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <Banknote size={48} style={{ color: '#D97706', margin: '0 auto 0.75rem auto' }} />
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Pay Cash Directly to Service Provider</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                    You can pay <strong>₹{order?.breakdown?.totalAmount || 0}</strong> in cash directly to {booking.providerId?.name || 'the provider'} after service completion.
                  </p>
                </div>
              )}

              {/* Pay Action Button */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, background: 'linear-gradient(135deg, #6366F1, #4F46E5)', border: 'none', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                  onClick={handlePayNow}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing Payment securely...
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Pay ₹{order?.breakdown?.totalAmount || 0} Now
                    </>
                  )}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={14} style={{ color: '#10B981' }} /> 256-bit Encrypted SSL Payment Protocol
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;
