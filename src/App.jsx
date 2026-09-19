import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Search from './pages/Search';
import ProviderProfile from './pages/ProviderProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/CustomerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import SafetyAndTrust from './pages/SafetyAndTrust';
import PartnerGuidelines from './pages/PartnerGuidelines';
import Support from './pages/Support';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();
  const location = useLocation();
  const isDashboard = location.pathname.includes('-dashboard') || location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#EBEAE5]">
      <ScrollToTop />
      {!user && <Header />}
      <main className="flex-grow w-full z-10">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/provider/:id" element={<ProviderProfile />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/signup" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/about" element={<About />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/safety" element={<SafetyAndTrust />} />
            <Route path="/guidelines" element={<PartnerGuidelines />} />
            <Route path="/support" element={<Support />} />
            <Route path="/contact" element={<Support />} />
            <Route 
              path="/customer-dashboard" 
              element={
                <ProtectedRoute requireRole="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/provider-dashboard" 
              element={
                <ProtectedRoute requireRole="provider">
                  <ProviderDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin-dashboard" 
              element={
                <ProtectedRoute requireRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requireRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {!isDashboard && <Footer />}
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          },
        }} 
      />
    </div>
  );
}

export default App;
