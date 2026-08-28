import { useState } from 'react';
import { Star, Heart, CheckCircle2, Loader2, DollarSign } from 'lucide-react';
import { API_URL } from '../config';

const ReviewTipModal = ({ booking, token, onClose, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!booking) return null;

  const handleTipClick = (amount) => {
    setTipAmount(amount);
    setCustomTip('');
  };

  const handleCustomTipChange = (e) => {
    const val = e.target.value;
    setCustomTip(val);
    setTipAmount(Number(val) || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Submit review to provider endpoint
      const res = await fetch(`${API_URL}/providers/${booking.providerId?._id || booking.providerId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          comment: comment || 'Great service quality!',
          tipAmount
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');

      setSubmitted(true);
      if (onReviewSubmitted) onReviewSubmitted(booking._id, { rating, comment, tipAmount });

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      alert('Review submission note: ' + err.message);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-white shadow-2xl relative overflow-hidden">
        
        {submitted ? (
          <div className="text-center py-8 space-y-4 fade-in">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-white">Thank You!</h3>
            <p className="text-slate-400 text-sm">
              Your feedback and tip of <strong>₹{tipAmount}</strong> have been shared with <strong>{booking.providerId?.name}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Modal Title */}
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star size={26} className="fill-indigo-400" />
              </div>
              <h2 className="text-xl font-bold">Rate Your Service Experience</h2>
              <p className="text-xs text-slate-400 mt-1">
                Order <strong>#{booking.orderId || ('ORD-' + booking._id?.slice(-6).toUpperCase())}</strong> with <strong>{booking.providerId?.name || 'Professional'}</strong>
              </p>
            </div>

            {/* Star Rating Bar */}
            <div className="flex justify-center items-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      size={32}
                      className={isFilled ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
                    />
                  </button>
                );
              })}
            </div>

            {/* Text Review */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Write a Review
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience (e.g. Arrived on time, fixed the issue cleanly...)"
                className="w-full p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Tip Addition Section */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <Heart size={14} className="text-rose-400 fill-rose-400" /> Add a Tip for Professional
                </span>
                {tipAmount > 0 && (
                  <span className="text-xs font-black text-emerald-400">+ ₹{tipAmount} Tip</span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleTipClick(amt)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      tipAmount === amt && !customTip
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    + ₹{amt}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleTipClick(0)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    tipAmount === 0
                      ? 'bg-slate-700 border-slate-600 text-slate-300'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  No Tip
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-all"
              >
                Skip
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Submit Review'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export default ReviewTipModal;
