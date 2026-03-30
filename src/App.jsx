import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Search from './pages/Search';
import ProviderProfile from './pages/ProviderProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/CustomerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';

function App() {
  return (
    <>
      <Header />
      <main className="container z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/provider/:id" element={<ProviderProfile />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Register />} />
          <Route path="/customer-dashboard" element={<CustomerDashboard />} />
          <Route path="/provider-dashboard" element={<ProviderDashboard />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
