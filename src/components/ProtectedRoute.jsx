import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireRole }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-64"><p className="text-gray-500">Loading...</p></div>;
  }

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    return <Navigate to="/" replace />; // Redirect to home if role does not match
  }

  return children;
};

export default ProtectedRoute;
