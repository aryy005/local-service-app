import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, Clock, MapPin, Phone, MessageSquare, 
  CreditCard, FileText, CheckCircle, Navigation, ShieldCheck, 
  Loader2, AlertCircle, Sparkles, X, ChevronRight, Camera, MessageCircle, QrCode
} from 'lucide-react';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { playNotificationSound } from '../utils/soundNotifications';
import { openWhatsAppChat, formatWhatsAppBookingMessage } from '../utils/whatsapp';
import LiveTrackingMap from './LiveTrackingMap';
import ConfirmFinalBillModal from './ConfirmFinalBillModal';
import ProviderCollectPaymentModal from './ProviderCollectPaymentModal';
import './ServiceTrackerModal.css';

const STAGES = [
  { key: 'requested', label: 'Requested', icon: '📌', desc: 'Booking submitted. Waiting for provider acceptance.' },
  { key: 'accepted', label: 'Accepted', icon: '✅', desc: 'Provider accepted your booking & confirmed slot.' },
  { key: 'in_transit', label: 'On The Way', icon: '🚗', desc: 'Provider is dispatched and heading to your location.' },
  { key: 'in_progress', label: 'In Progress', icon: '🔧', desc: 'Provider arrived on-site and started the service.' },
  { key: 'completed', label: 'Completed', icon: '📸', desc: 'Service completed. Final bill generated.' },
  { key: 'paid', label: 'Paid & Closed', icon: '💳', desc: 'Payment received. Service closed with tax invoice.' }
];

const ServiceTrackerModal = ({ booking, onClose, onUpdateBooking, onOpenPayment, onOpenInvoice, onOpenReview }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showBillModal, setShowBillModal] = useState(false);
  const [isAdjustingBill, setIsAdjustingBill] = useState(false);
  const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);

  if (!booking) return null;

  const isProvider = user?.role === 'provider' || booking.providerId?._id === user?.id;
  const currentStageKey = booking.serviceStage || (booking.status === 'completed' ? (booking.paymentStatus === 'paid' ? 'paid' : 'completed') : booking.status === 'accepted' ? 'accepted' : 'requested');

  // Find index of current stage (0 to 5)
  const getStageIndex = (key) => {
    if (key === 'declined' || key === 'cancelled') return -1;
    const idx = STAGES.findIndex(s => s.key === key);
    return idx >= 0 ? idx : 0;
  };

  const currentIndex = getStageIndex(currentStageKey);
  const progressPercent = currentIndex >= 0 ? (currentIndex / (STAGES.length - 1)) * 100 : 0;

  const currentStageMeta = STAGES[currentIndex] || {
    label: booking.status.toUpperCase(),
    icon: 'ℹ️',
    desc: `Booking is currently ${booking.status}`
  };

  const handleAdvanceStage = async (nextStageKey) => {
    setErrorMsg('');

    if (nextStageKey === 'completed') {
      setIsAdjustingBill(false);
      setShowBillModal(true);
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/bookings/${booking._id}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stage: nextStageKey,
          workPhotos: booking.workPhotos || [],
          note: `Stage updated to ${nextStageKey.replace('_', ' ')}`
        })
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(updated.message || 'Failed to update stage');

      // Play sound chime on stage progression
      playNotificationSound('stage_update');

      if (onUpdateBooking) onUpdateBooking(updated);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmFinalBill = async ({ serviceAmount, extraExpenses, extraExpenseReason, finalPrice }) => {
    setErrorMsg('');
    setUpdating(true);
    try {
      const endpoint = isAdjustingBill 
        ? `${API_URL}/bookings/${booking._id}/final-bill` 
        : `${API_URL}/bookings/${booking._id}/stage`;

      const payload = isAdjustingBill 
        ? { serviceAmount, extraExpenses, extraExpenseReason, finalPrice }
        : {
            stage: 'completed',
            serviceAmount,
            extraExpenses,
            extraExpenseReason,
            finalPrice,
            workPhotos: booking.workPhotos || [],
            note: `Service completed. Final bill confirmed: ₹${finalPrice}`
          };

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(updated.message || 'Failed to confirm final bill');

      playNotificationSound('stage_update');
      if (onUpdateBooking) onUpdateBooking(updated);
    } catch (err) {
      setErrorMsg(err.message);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="tracker-modal-overlay">
      <div className="tracker-modal-container">
        
        {/* Header */}
        <div className="tracker-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Navigation style={{ color: '#6366F1' }} size={22} />
              Service Tracker
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', padding: '0.15rem 0.6rem', borderRadius: '0.4rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              Order ID: {booking.orderId || ('ORD-' + booking._id?.slice(-6).toUpperCase())}
            </span>
          </div>
          <button className="payment-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="tracker-body">

          {/* Stepper Progress Bar */}
          {currentIndex >= 0 ? (
            <div className="stepper-wrapper">
              <div className="stepper-line">
                <div className="stepper-line-progress" style={{ width: `${progressPercent}%` }} />
              </div>
              {STAGES.map((s, idx) => {
                const isCompleted = idx < currentIndex || (idx === currentIndex && currentStageKey === 'paid');
                const isActive = idx === currentIndex && currentStageKey !== 'paid';

                return (
                  <div 
                    key={s.key} 
                    className={`step-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                    title={s.desc}
                  >
                    <div className="step-circle">
                      {isCompleted ? <Check size={18} /> : s.icon}
                    </div>
                    <span className="step-label">{s.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600 }}>
              ⚠️ Booking is {booking.status.toUpperCase()}
            </div>
          )}

          {/* Status Banner */}
          <div className="status-banner">
            <div className="status-banner-info">
              <h3>
                <span>{currentStageMeta.icon}</span>
                <span>{currentStageMeta.label}</span>
                {booking.paymentStatus === 'paid' && (
                  <span style={{ background: '#ecfdf5', color: '#047857', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', border: '1px solid #a7f3d0' }}>
                    ✓ Paid
                  </span>
                )}
              </h3>
              <p>{currentStageMeta.desc}</p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {(booking.status === 'completed' || currentStageKey === 'completed' || currentStageKey === 'paid') ? 'Final Bill:' : 'Estimated Cost:'}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10B981' }}>
                ₹{booking.paidAmount || booking.finalPrice || booking.providerId?.providerDetails?.hourlyRate || 350}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Render Live GPS Map Tracking when Provider is On The Way */}
          {currentStageKey === 'in_transit' && (
            <LiveTrackingMap 
              bookingId={booking._id}
              providerName={booking.providerId?.name}
              serviceAddress={booking.serviceAddress}
              isProvider={isProvider}
            />
          )}

          {/* Service & Person Info Box */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <div style={{ background: 'var(--surface-bg, #f8fafc)', border: '1px solid var(--surface-border)', padding: '1rem', borderRadius: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>
                {isProvider ? 'Customer Info:' : 'Provider Info:'}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                {isProvider ? booking.customerId?.name || 'Customer' : booking.providerId?.name || 'Service Professional'}
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={13} /> {isProvider ? booking.customerId?.phone : booking.providerId?.phone || 'N/A'}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{ background: '#111111', color: '#D2FE00', border: '1.5px solid #111111', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                  onClick={() => {
                    onClose();
                    navigate(`/messages?bookingId=${booking._id}`);
                  }}
                >
                  <MessageSquare size={13} /> Chat on Localfixr
                </button>
                <button
                  type="button"
                  style={{ background: '#25D366', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                  onClick={() => {
                    const targetPhone = isProvider ? booking.customerId?.phone : booking.providerId?.phone;
                    const msg = formatWhatsAppBookingMessage(booking, isProvider);
                    openWhatsAppChat(targetPhone, msg);
                  }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--surface-bg, #f8fafc)', border: '1px solid var(--surface-border)', padding: '1rem', borderRadius: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>
                Location & Schedule:
              </div>
              <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                <MapPin size={14} style={{ display: 'inline', marginRight: '0.25rem', color: '#6366F1' }} />
                {booking.serviceAddress}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                📅 {booking.date} ({booking.timePreference})
              </div>
            </div>
          </div>

          {/* Timeline Feed */}
          <div className="timeline-feed">
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700 }}>
              📋 Activity & Audit Timeline
            </h4>
            
            {booking.stageHistory && booking.stageHistory.length > 0 ? (
              booking.stageHistory.map((item, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <h4>{item.title}</h4>
                    {item.description && <p>{item.description}</p>}
                    <div className="timeline-time">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                No status history logged yet.
              </p>
            )}
          </div>

          {/* Stage Action Controls */}
          <div className="tracker-actions">
            {isProvider ? (
              /* Provider Stage Advancement Controls */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentStageKey === 'requested' && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      className="provider-action-btn"
                      style={{ flex: 1, background: '#10B981', color: 'white' }}
                      onClick={() => handleAdvanceStage('accepted')}
                      disabled={updating}
                    >
                      {updating ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Accept Booking Request
                    </button>
                    <button 
                      className="provider-action-btn"
                      style={{ background: 'transparent', color: '#EF4444', border: '1px solid #EF4444' }}
                      onClick={() => handleAdvanceStage('declined')}
                      disabled={updating}
                    >
                      Decline
                    </button>
                  </div>
                )}

                {currentStageKey === 'accepted' && (
                  <button 
                    className="provider-action-btn"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: 'white' }}
                    onClick={() => handleAdvanceStage('in_transit')}
                    disabled={updating}
                  >
                    {updating ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />} Mark "I'm On The Way 🚗"
                  </button>
                )}

                {currentStageKey === 'in_transit' && (
                  <button 
                    className="provider-action-btn"
                    style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white' }}
                    onClick={() => handleAdvanceStage('in_progress')}
                    disabled={updating}
                  >
                    {updating ? <Loader2 className="animate-spin" size={18} /> : <Clock size={18} />} Mark "Work Started 🔧"
                  </button>
                )}

                {currentStageKey === 'in_progress' && (
                  <button 
                    className="provider-action-btn"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white' }}
                    onClick={() => handleAdvanceStage('completed')}
                    disabled={updating}
                  >
                    {updating ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />} Complete Service & Generate Final Bill 📸
                  </button>
                )}

                {currentStageKey === 'completed' && (
                  <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', padding: '1rem', borderRadius: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: '#92400E', fontSize: '0.9rem' }}>📄 Confirmed Final Bill:</span>
                      <span style={{ fontWeight: 900, color: '#B45309', fontSize: '1.2rem' }}>₹{booking.finalPrice}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#78350F', display: 'flex', flexDirection: 'column', gap: '0.35rem', background: '#FEF3C7', padding: '0.65rem 0.85rem', borderRadius: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Service / Labor Charge:</span>
                        <span style={{ fontWeight: 700 }}>₹{booking.billingDetails?.serviceAmount || (booking.finalPrice - (booking.billingDetails?.extraExpenses || 0))}</span>
                      </div>
                      {Boolean(booking.billingDetails?.extraExpenses && booking.billingDetails.extraExpenses > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Additional Parts &amp; Materials:</span>
                          <span style={{ fontWeight: 700 }}>+ ₹{booking.billingDetails.extraExpenses}</span>
                        </div>
                      )}
                      {Boolean(booking.billingDetails?.extraExpenseReason) && (
                        <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#92400E' }}>
                          Note: {booking.billingDetails.extraExpenseReason}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '0.65rem', textAlign: 'center', fontSize: '0.82rem', fontWeight: 600, color: '#B45309' }}>
                      ⏳ Service complete! Waiting for customer payment of ₹{booking.finalPrice}.
                    </div>

                    {booking.paymentStatus !== 'paid' && (
                      <>
                        <button
                          type="button"
                          style={{ marginTop: '0.65rem', width: '100%', background: '#0F172A', color: '#D2FE00', border: 'none', padding: '0.75rem 1rem', borderRadius: 6, fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', boxShadow: '0 4px 12px rgba(15,23,42,0.18)' }}
                          onClick={() => setShowCollectPaymentModal(true)}
                        >
                          <QrCode size={18} /> Show QR Code &amp; Collect Payment
                        </button>
                        <button
                          type="button"
                          style={{ marginTop: '0.5rem', width: '100%', background: '#FFFFFF', border: '1.5px solid #D97706', color: '#B45309', padding: '0.5rem', borderRadius: 6, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                          onClick={() => {
                            setIsAdjustingBill(true);
                            setShowBillModal(true);
                          }}
                        >
                          ✏️ Adjust Bill / Add Extra Expenses
                        </button>
                      </>
                    )}
                  </div>
                )}

                {(currentStageKey === 'paid' || booking.paymentStatus === 'paid' || booking.status === 'completed') && (
                  <button 
                    className="provider-action-btn"
                    style={{ background: 'transparent', border: '1px solid #10B981', color: '#10B981' }}
                    onClick={() => {
                      onClose();
                      if (onOpenInvoice) onOpenInvoice(booking);
                    }}
                  >
                    <FileText size={18} /> View Payment Receipt & Work Summary 📄
                  </button>
                )}
              </div>
            ) : (
              /* Customer Stage Action Controls */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* When provider completes service, display itemized confirmed bill to customer */}
                {(booking.status === 'completed' || currentStageKey === 'completed') && booking.paymentStatus !== 'paid' && (
                  <div style={{ background: '#F8FAFC', border: '2px solid #111111', borderRadius: '8px', padding: '1rem', boxShadow: '3px 3px 0px #111111', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>Confirmed Final Bill</span>
                      <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.25rem' }}>₹{booking.finalPrice}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Service / Labor:</span>
                        <span style={{ fontWeight: 600 }}>₹{booking.billingDetails?.serviceAmount || (booking.finalPrice - (booking.billingDetails?.extraExpenses || 0))}</span>
                      </div>
                      {Boolean(booking.billingDetails?.extraExpenses && booking.billingDetails.extraExpenses > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#B45309' }}>
                          <span>Additional Parts / Material:</span>
                          <span style={{ fontWeight: 700 }}>+ ₹{booking.billingDetails.extraExpenses}</span>
                        </div>
                      )}
                      {Boolean(booking.billingDetails?.extraExpenseReason) && (
                        <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#64748B' }}>
                          Details: {booking.billingDetails.extraExpenseReason}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {booking.paymentStatus !== 'paid' && (
                  <button 
                    className="provider-action-btn"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white' }}
                    onClick={() => {
                      onClose();
                      if (onOpenPayment) onOpenPayment(booking);
                    }}
                  >
                    <CreditCard size={18} /> Pay Now (₹{booking.finalPrice || booking.providerId?.providerDetails?.hourlyRate || 350})
                  </button>
                )}

                {booking.paymentStatus === 'paid' && (
                  <button 
                    className="provider-action-btn"
                    style={{ background: 'transparent', border: '1px solid #10B981', color: '#10B981' }}
                    onClick={() => {
                      onClose();
                      if (onOpenInvoice) onOpenInvoice(booking);
                    }}
                  >
                    <FileText size={18} /> View Official Tax Invoice
                  </button>
                )}

                {(booking.status === 'completed' || booking.serviceStage === 'completed' || booking.serviceStage === 'paid') && (!booking.customerReview || !booking.customerReview.rating) && (
                  <button 
                    className="provider-action-btn"
                    style={{ background: '#111111', color: '#D2FE00', border: '2px solid #111111', fontWeight: 800 }}
                    onClick={() => {
                      onClose();
                      if (onOpenReview) onOpenReview(booking);
                    }}
                  >
                    ★ Rate & Review Service
                  </button>
                )}

                {currentIndex >= 0 && currentIndex < 2 && (
                  <button 
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: '#EF4444', color: '#EF4444' }}
                    onClick={() => handleAdvanceStage('cancelled')}
                    disabled={updating}
                  >
                    Cancel Booking Request
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Final Bill Confirmation Modal */}
      {showBillModal && (
        <ConfirmFinalBillModal 
          booking={booking}
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          onConfirm={handleConfirmFinalBill}
          isAdjusting={isAdjustingBill}
        />
      )}

      {/* Provider Collect Payment / Dynamic QR Modal */}
      {showCollectPaymentModal && (
        <ProviderCollectPaymentModal
          booking={booking}
          onClose={() => setShowCollectPaymentModal(false)}
          onPaymentConfirmed={(updatedBooking) => {
            setShowCollectPaymentModal(false);
            if (onUpdateBooking) onUpdateBooking(updatedBooking);
          }}
        />
      )}
    </div>
  );
};

export default ServiceTrackerModal;
