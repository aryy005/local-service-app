import React, { useState, useEffect } from 'react';
import { X, Receipt, PlusCircle, Wrench, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import './ConfirmFinalBillModal.css';

const ConfirmFinalBillModal = ({ booking, isOpen, onClose, onConfirm, isAdjusting = false }) => {
  const [basePrice, setBasePrice] = useState('');
  const [extraExpenses, setExtraExpenses] = useState('');
  const [extraReason, setExtraReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (booking && isOpen) {
      const existingBase = booking.billingDetails?.serviceAmount || 
        (booking.finalPrice ? Math.max(0, booking.finalPrice - (booking.billingDetails?.extraExpenses || 0)) : null) ||
        booking.providerId?.providerDetails?.hourlyRate ||
        350;

      const existingExtras = booking.billingDetails?.extraExpenses || 0;
      const existingReason = booking.billingDetails?.extraExpenseReason || '';

      setBasePrice(String(existingBase));
      setExtraExpenses(existingExtras > 0 ? String(existingExtras) : '');
      setExtraReason(existingReason);
      setErrorMsg('');
      setSubmitting(false);
    }
  }, [booking, isOpen]);

  if (!isOpen || !booking) return null;

  const numBase = Math.max(0, Number(basePrice) || 0);
  const numExtras = Math.max(0, Number(extraExpenses) || 0);
  const totalBill = numBase + numExtras;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (numBase <= 0) {
      setErrorMsg('Base service charge must be greater than ₹0');
      return;
    }

    if (numExtras > 0 && !extraReason.trim()) {
      setErrorMsg('Please provide a brief reason or item description for additional expenses/parts');
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm({
        serviceAmount: numBase,
        extraExpenses: numExtras,
        extraExpenseReason: extraReason.trim(),
        finalPrice: totalBill
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to confirm final bill');
    } finally {
      setSubmitting(false);
    }
  };

  const customerName = booking.customerId?.name || 'Customer';
  const orderId = booking.orderId || `#BK-${(booking._id || '').slice(-4).toUpperCase()}`;

  return (
    <div className="cfb-overlay" onClick={onClose}>
      <div className="cfb-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cfb-header">
          <div className="cfb-header-left">
            <div className="cfb-tag">
              <Receipt size={14} />
              {isAdjusting ? 'ADJUST BILL' : 'FINAL BILL CONFIRMATION'}
            </div>
            <h2 className="cfb-title">
              {isAdjusting ? 'Modify Final Amount' : 'Confirm Service & Final Bill'}
            </h2>
            <p className="cfb-subtitle">
              Order {orderId} • {booking.description || 'Service Appointment'}
            </p>
          </div>
          <button className="cfb-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="cfb-form">
          {errorMsg && (
            <div className="cfb-error-banner">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Customer info card */}
          <div className="cfb-customer-strip">
            <div className="cfb-cs-item">
              <span className="cfb-cs-label">Customer:</span>
              <span className="cfb-cs-val">{customerName}</span>
            </div>
            <div className="cfb-cs-item">
              <span className="cfb-cs-label">Location:</span>
              <span className="cfb-cs-val">{booking.serviceAddress || 'Customer Address'}</span>
            </div>
          </div>

          {/* Base Labor / Service Charge */}
          <div className="cfb-field-group">
            <label className="cfb-label">
              <span>Base Service / Labor Charge (₹)</span>
              <span className="cfb-req">*Mandatory</span>
            </label>
            <div className="cfb-input-wrapper">
              <span className="cfb-currency-symbol">₹</span>
              <input 
                type="number" 
                min="1" 
                step="1"
                required
                className="cfb-input cfb-input-amount"
                placeholder="e.g. 450"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
              />
            </div>
            <span className="cfb-hint">Your standard hourly or fixed service charge.</span>
          </div>

          {/* Extra Expenses / Parts */}
          <div className="cfb-field-group" style={{ background: '#FFFDF5', padding: '1rem', border: '2px dashed #E2E8F0', borderRadius: '8px' }}>
            <label className="cfb-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PlusCircle size={16} color="#D97706" />
              <span>Additional Expenses / Replacement Parts (₹)</span>
              <span className="cfb-opt">(Optional)</span>
            </label>
            <div className="cfb-input-wrapper">
              <span className="cfb-currency-symbol">₹</span>
              <input 
                type="number" 
                min="0" 
                step="1"
                className="cfb-input cfb-input-amount"
                placeholder="0"
                value={extraExpenses}
                onChange={(e) => setExtraExpenses(e.target.value)}
              />
            </div>

            {numExtras > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <label className="cfb-label" style={{ fontSize: '0.78rem' }}>
                  <span>Expense Details / Replaced Parts</span>
                  <span className="cfb-req">*Required when extra expense &gt; 0</span>
                </label>
                <input 
                  type="text" 
                  className="cfb-input" 
                  placeholder="e.g. Replaced capacitor, copper pipe 2m, MCB switch"
                  value={extraReason}
                  onChange={(e) => setExtraReason(e.target.value)}
                  required={numExtras > 0}
                />
              </div>
            )}
            <span className="cfb-hint">Add genuine costs for parts, spare materials, or hardware purchased for this job.</span>
          </div>

          {/* Live Bill Summary Box */}
          <div className="cfb-summary-card">
            <div className="cfb-summary-row">
              <span>Service Charge:</span>
              <span className="cfb-sum-val">₹{numBase}</span>
            </div>
            {numExtras > 0 && (
              <div className="cfb-summary-row extras">
                <span>Extra Parts &amp; Expenses:</span>
                <span className="cfb-sum-val">+ ₹{numExtras}</span>
              </div>
            )}
            {numExtras > 0 && extraReason && (
              <div className="cfb-extras-note">
                <Wrench size={13} /> {extraReason}
              </div>
            )}
            <div className="cfb-summary-divider" />
            <div className="cfb-summary-total">
              <div>
                <div className="cfb-total-label">Total Confirmed Bill</div>
                <div className="cfb-total-sub">Reflected on Customer Dashboard</div>
              </div>
              <div className="cfb-total-val">₹{totalBill}</div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="cfb-notice">
            <ShieldCheck size={16} />
            <span>
              Once confirmed, <strong>{customerName}</strong> will immediately see the updated final bill of <strong>₹{totalBill}</strong> to pay securely via UPI, Card, or Netbanking.
            </span>
          </div>

          {/* Actions */}
          <div className="cfb-actions">
            <button 
              type="button" 
              className="cfb-btn-secondary" 
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="cfb-btn-primary" 
              disabled={submitting || totalBill <= 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  CONFIRMING &amp; DISPATCHING...
                </>
              ) : (
                <>
                  {isAdjusting ? 'UPDATE FINAL BILL' : 'CONFIRM & SEND BILL'} (₹{totalBill})
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfirmFinalBillModal;
