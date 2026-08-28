import { useRef } from 'react';
import { Printer, Download, CheckCircle, ShieldCheck } from 'lucide-react';
import './InvoiceModal.css';

const InvoiceModal = ({ booking, onClose }) => {
  const invoiceRef = useRef();

  if (!booking) return null;

  const billing = booking.billingDetails || {
    serviceAmount: booking.paidAmount ? (booking.paidAmount / 1.23).toFixed(2) : booking.finalPrice || 0,
    platformFee: booking.paidAmount ? (booking.paidAmount * 0.05).toFixed(2) : 0,
    tax: booking.paidAmount ? (booking.paidAmount * 0.18).toFixed(2) : 0,
    totalAmount: booking.paidAmount || booking.finalPrice || 0
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-modal-overlay">
      <div className="invoice-modal-container">
        
        {/* Printable Paper Area */}
        <div className="invoice-paper" ref={invoiceRef}>
          <div className="invoice-header">
            <div className="invoice-brand">
              <h1>LocalFixr</h1>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                LocalFixr Technologies Inc.
              </p>
            </div>
            <div className="invoice-title-block">
              <h2>TAX INVOICE</h2>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Invoice #: <strong>INV-{booking.paymentId || booking._id?.slice(-8)}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Date: {booking.paidAt ? new Date(booking.paidAt).toLocaleDateString() : new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="invoice-details-grid">
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>Billed To (Customer):</h4>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{booking.customerId?.name || 'Customer'}</p>
              <p style={{ margin: '0.2rem 0 0 0', color: '#64748b' }}>{booking.serviceAddress || 'Customer Location'}</p>
              <p style={{ margin: '0.2rem 0 0 0', color: '#64748b' }}>Phone: {booking.customerId?.phone || 'N/A'}</p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>Service Provider:</h4>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{booking.providerId?.name || 'Service Professional'}</p>
              <p style={{ margin: '0.2rem 0 0 0', color: '#64748b' }}>Phone: {booking.providerId?.phone || 'N/A'}</p>
              <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#ecfdf5', color: '#047857', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
                <CheckCircle size={14} /> Payment Received ({booking.paymentMethod?.toUpperCase() || 'PAID'})
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Date / Slot</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{booking.description || 'Local Service Job'}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Completed by {booking.providerId?.name}
                  </div>
                </td>
                <td>{booking.date} ({booking.timePreference})</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{billing.serviceAmount}</td>
              </tr>
              <tr>
                <td>Platform Convenience & Protection Fee</td>
                <td>Fixed (5%)</td>
                <td style={{ textAlign: 'right' }}>₹{billing.platformFee}</td>
              </tr>
              <tr>
                <td>GST / Service Taxes</td>
                <td>18% GST</td>
                <td style={{ textAlign: 'right' }}>₹{billing.tax}</td>
              </tr>
            </tbody>
          </table>

          {/* Total Box */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <div style={{ width: '240px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.85rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                <span>Total Paid:</span>
                <span style={{ color: '#4f46e5' }}>₹{billing.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={16} style={{ color: '#10b981' }} /> Verified Tax Invoice • LocalPro Marketplace
            </div>
            <div>Transaction ID: {booking.paymentId || 'N/A'}</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="invoice-actions">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InvoiceModal;
