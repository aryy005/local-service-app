import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 200px)',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        fontSize: '6rem',
        fontWeight: 800,
        color: 'var(--primary-color)',
        lineHeight: 1,
        marginBottom: '0.5rem',
        opacity: 0.2
      }}>404</div>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Page not found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: 400, fontSize: '0.95rem' }}>
        Sorry, the page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Link to="/" className="btn btn-primary">
          <Home size={16} /> Go Home
        </Link>
        <button onClick={() => window.history.back()} className="btn btn-outline">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    </div>
  );
};

export default NotFound;
