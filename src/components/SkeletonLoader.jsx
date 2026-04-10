const SkeletonLoader = () => {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--surface-border)',
      borderRadius: 'var(--border-radius)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      animation: 'pulse 1.8s ease-in-out infinite'
    }}>
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--bg-secondary)', flexShrink: 0
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, width: '60%', background: 'var(--bg-secondary)', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 10, width: '40%', background: 'var(--bg-secondary)', borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ height: 10, width: '90%', background: 'var(--bg-secondary)', borderRadius: 4 }} />
      <div style={{ height: 10, width: '70%', background: 'var(--bg-secondary)', borderRadius: 4 }} />
      <div style={{
        height: 1, background: 'var(--surface-border)', marginTop: 4
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ height: 14, width: 60, background: 'var(--bg-secondary)', borderRadius: 4 }} />
        <div style={{ height: 14, width: 80, background: 'var(--bg-secondary)', borderRadius: 4 }} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default SkeletonLoader;
