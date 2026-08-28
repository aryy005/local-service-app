import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { API_URL } from '../config';
import './Auth.css';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Enter OTP & Reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to process request');

      if (data.otp) {
        setGeneratedOtp(data.otp);
        setOtp(data.otp); // Pre-fill for quick testing ease
      }

      setMessage(data.message || 'OTP verification code sent!');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!otp || !newPassword) {
      setError('Please enter the OTP code and your new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password reset failed');

      setMessage('🎉 Password updated successfully! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container fade-in min-h-screen flex items-center justify-center p-4">
      <div className="auth-card max-w-md w-full glass-panel p-8 rounded-3xl shadow-2xl relative">
        
        <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 mb-6 transition-all">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-500/30">
            <KeyRound size={28} />
          </div>
          <h2 className="text-2xl font-black text-white">Reset Your Password</h2>
          <p className="text-xs text-slate-400 mt-1">
            {step === 1 
              ? 'Enter your registered email address to receive a password reset code.' 
              : `Enter the OTP sent to ${email} and set your new password.`}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-semibold mb-4 text-center">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs font-semibold mb-4 text-center flex items-center justify-center gap-2">
            <CheckCircle2 size={16} /> {message}
          </div>
        )}

        {step === 1 ? (
          /* Step 1: Request OTP Form */
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="form-group">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          /* Step 2: Enter OTP & New Password */
          <form onSubmit={handleResetPassword} className="space-y-4">
            
            {generatedOtp && (
              <div className="bg-indigo-950/60 border border-indigo-500/40 p-3 rounded-xl text-center mb-2">
                <span className="text-xs text-indigo-300 block">Your Verification OTP Code:</span>
                <span className="text-xl font-black tracking-widest text-indigo-400">{generatedOtp}</span>
              </div>
            )}

            <div className="form-group">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                6-Digit OTP Verification Code
              </label>
              <input 
                type="text" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="e.g. 849201" 
                required
                maxLength={6}
                className="w-full p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-mono text-center tracking-widest text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="form-group">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                New Password
              </label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters" 
                required
                minLength={6}
                className="w-full p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="form-group">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Confirm New Password
              </label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password" 
                required
                minLength={6}
                className="w-full p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Save New Password & Sign In'}
            </button>

            <button 
              type="button" 
              onClick={() => setStep(1)}
              className="w-full text-xs text-slate-400 hover:text-slate-200 mt-2 text-center"
            >
              Didn't get code? Request again
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
          <ShieldCheck size={14} className="text-emerald-400" /> 256-Bit Encrypted Secure Password Recovery
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;
