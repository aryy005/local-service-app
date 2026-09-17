import { useState } from 'react';
import { Star, CheckCircle } from 'lucide-react';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import '../pages/Auth.css';

const RATING_LABELS = {
  1: '1 Star - Terrible',
  2: '2 Stars - Poor',
  3: '3 Stars - Average',
  4: '4 Stars - Very Good',
  5: '5 Stars - Excellent'
};

export const ReviewModal = ({ booking, token: propToken, onClose, onSuccess, onReviewSubmitted }) => {
  const { token: contextToken } = useAuth();
  const token = propToken || contextToken || localStorage.getItem('token');

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!booking) return null;

  const providerId = booking.providerId?._id || booking.providerId;
  const providerName = booking.providerId?.name || 'Service Partner';
  const orderId = booking.orderId || ('ORD-' + (booking._id ? booking._id.slice(-6).toUpperCase() : '000000'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/providers/${providerId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
          bookingId: booking._id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');

      setSubmitted(true);

      const reviewData = { rating, comment: comment.trim() };
      if (onSuccess) onSuccess(reviewData);
      if (onReviewSubmitted) onReviewSubmitted(booking._id, reviewData);

      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="auth-page fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#EBEAE5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        overflowY: 'auto'
      }}
    >
      <div className="auth-card" style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: '#FFFFFF',
            border: '2px solid #111111',
            boxShadow: '2px 2px 0 #111111',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 900,
            color: '#111111',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#D2FE00';
            e.currentTarget.style.transform = 'translate(1px, 1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.transform = 'none';
          }}
        >
          ✕
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#D2FE00',
              border: '2.5px solid #111111',
              boxShadow: '3px 3px 0 #111111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#111111'
            }}>
              <CheckCircle size={36} strokeWidth={2.5} />
            </div>
            <div className="auth-tag" style={{ margin: '0 auto 0.75rem' }}>SUCCESS</div>
            <h2 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              THANK YOU!
            </h2>
            <p className="auth-subtitle" style={{ margin: '0 auto', maxWidth: '320px' }}>
              Your rating has been recorded for <strong>{providerName}</strong>.
            </p>
          </div>
        ) : (
          <>
            <div className="auth-tag">SERVICE RATING</div>
            <h1 className="auth-title">RATE EXPERIENCE</h1>
            <p className="auth-subtitle">
              Order #{orderId} • Technician: {providerName}
            </p>

            {error && <div className="error-alert">⚠️ {error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              
              {/* Star Rating */}
              <div className="form-group" style={{ alignItems: 'center', margin: '1rem 0 1.25rem' }}>
                <label style={{ marginBottom: '0.75rem', alignSelf: 'center', letterSpacing: '0.08em' }}>
                  SELECT RATING
                </label>
                
                <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          transform: (hoverRating || rating) >= star ? 'scale(1.15)' : 'scale(1)',
                          transition: 'transform 0.15s ease'
                        }}
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          size={38}
                          fill={active ? '#FFD700' : '#FFFFFF'}
                          stroke="#111111"
                          strokeWidth={2.2}
                        />
                      </button>
                    );
                  })}
                </div>

                <div style={{
                  marginTop: '0.65rem',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#111111',
                  letterSpacing: '0.04em'
                }}>
                  {RATING_LABELS[hoverRating || rating]}
                </div>
              </div>

              {/* Text Review */}
              <div className="form-group">
                <label>
                  Write a Review <span style={{ color: '#777777', fontWeight: 600, textTransform: 'none' }}>(Optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details of your experience (optional)..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #111111',
                    borderRadius: '5px',
                    color: '#111111',
                    fontFamily: 'inherit',
                    fontSize: '0.92rem',
                    fontWeight: 500,
                    boxShadow: '2px 2px 0 #111111',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    minHeight: '90px'
                  }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = '4px 4px 0 #D2FE00';
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = '2px 2px 0 #111111';
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="auth-submit-btn"
                style={{ marginTop: '0.75rem' }}
              >
                {submitting ? 'SUBMITTING...' : 'SUBMIT RATING'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
};

export default ReviewModal;
