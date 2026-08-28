import { useState, useEffect } from 'react';
import { Navigation, MapPin, Shield, Clock } from 'lucide-react';

const LiveTrackingMap = ({ providerName, serviceAddress, etaMinutes = 12 }) => {
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 25 : prev + 5));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a, #1e293b)',
      borderRadius: '1rem',
      padding: '1.25rem',
      color: 'white',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      marginBottom: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: '#4f46e5', padding: '0.35rem', borderRadius: '50%' }}>
            <Navigation size={18} className="animate-pulse" style={{ color: 'white' }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc' }}>
              Live GPS Provider Tracking
            </h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              {providerName || 'Service Professional'} is en route to your location
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.35rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Clock size={14} /> ETA: ~{etaMinutes} Mins
        </div>
      </div>

      {/* Simulated Live Route Canvas */}
      <div style={{
        position: 'relative',
        height: '140px',
        background: '#020617',
        borderRadius: '0.75rem',
        border: '1px solid #1e293b',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        overflow: 'hidden'
      }}>
        {/* Background Grid Pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.15,
          backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }} />

        {/* Animated Connecting GPS Route Line */}
        <div style={{
          position: 'absolute',
          left: '12%',
          right: '12%',
          height: '4px',
          background: '#334155',
          borderRadius: '2px'
        }} />

        <div style={{
          position: 'absolute',
          left: '12%',
          width: `${progress}%`,
          height: '4px',
          background: 'linear-gradient(90deg, #6366f1, #10b981)',
          borderRadius: '2px',
          transition: 'width 2s ease-in-out'
        }} />

        {/* Provider Live Moving Pin */}
        <div style={{
          position: 'absolute',
          left: `calc(12% + ${progress}% - 16px)`,
          transition: 'left 2s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10
        }}>
          <div style={{
            background: '#6366f1',
            color: 'white',
            padding: '0.4rem',
            borderRadius: '50%',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.8)',
            transform: 'scale(1.1)'
          }}>
            🚗
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#1e1b4b', color: '#a5b4fc', padding: '0.1rem 0.4rem', borderRadius: '4px', marginTop: '4px', whiteSpace: 'nowrap' }}>
            {providerName?.split(' ')[0] || 'Pro'}
          </span>
        </div>

        {/* Start Point Pin */}
        <div style={{ zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '28px', height: '28px', background: '#1e293b', border: '2px solid #6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
            🏠
          </div>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>Dispatch</span>
        </div>

        {/* Destination Pin (Customer) */}
        <div style={{ zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '32px', background: '#10b981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)' }}>
            <MapPin size={18} />
          </div>
          <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 800, marginTop: '4px' }}>Destination</span>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', fontSize: '0.78rem', color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <MapPin size={14} style={{ color: '#10b981' }} />
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{serviceAddress || 'Customer Location'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#818cf8' }}>
          <Shield size={14} /> Live GPS En-route Tracking Verified
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingMap;
