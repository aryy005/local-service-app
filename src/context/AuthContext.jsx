import { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const parseJsonResponse = async (res, defaultErrorMsg = 'Server error') => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.message || defaultErrorMsg);
      throw new Error(data.message || defaultErrorMsg);
    }
    return data;
  } else {
    const err = `Server returned non-JSON response (${res.status}). Please set VITE_API_URL to your live Render backend URL in Vercel.`;
    toast.error(err);
    throw new Error(err);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  
  // Custom Global Location State (Default to null. Can be stored as { lng, lat, name })
  const [userLocation, setUserLocation] = useState(() => {
    const saved = localStorage.getItem('userLocation');
    return saved ? JSON.parse(saved) : null;
  });

  // Fetch user if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setUser(data);
        } else {
          logout();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  const login = async (email, password, role) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    
    const data = await parseJsonResponse(res, 'Login failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    toast.success('Welcome back!');
    return data;
  };

  const register = async (userData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await parseJsonResponse(res, 'Registration failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    toast.success('Account created successfully!');
    return data;
  };

  const googleLogin = async (credential, role = 'customer', action = 'login', extraData = {}) => {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, role, action, ...extraData })
    });
    
    const data = await parseJsonResponse(res, action === 'login' ? 'Google login failed' : 'Google registration failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    toast.success(action === 'login' ? 'Welcome back!' : 'Account registered with Google successfully!');
    return data;
  };

  const updateProfile = async (profileData) => {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(profileData)
    });
    
    const updatedUser = await parseJsonResponse(res, 'Failed to update profile');
    setUser(updatedUser);
    return updatedUser;
  };

  const addAddress = async (addressData) => {
    const res = await fetch(`${API_URL}/auth/addresses`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(addressData)
    });
    
    const updatedUser = await parseJsonResponse(res, 'Failed to add address');
    setUser(updatedUser);
    toast.success('New address added successfully!');
    return updatedUser;
  };

  const updateAddress = async (addressId, addressData) => {
    const res = await fetch(`${API_URL}/auth/addresses/${addressId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(addressData)
    });
    
    const updatedUser = await parseJsonResponse(res, 'Failed to update address');
    setUser(updatedUser);
    toast.success('Address updated successfully!');
    return updatedUser;
  };

  const deleteAddress = async (addressId) => {
    const res = await fetch(`${API_URL}/auth/addresses/${addressId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}` 
      }
    });
    
    const updatedUser = await parseJsonResponse(res, 'Failed to delete address');
    setUser(updatedUser);
    toast.success('Address removed');
    return updatedUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const saveLocation = (locationObj) => {
    setUserLocation(locationObj);
    localStorage.setItem('userLocation', JSON.stringify(locationObj));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      register, 
      googleLogin, 
      logout, 
      updateProfile, 
      addAddress, 
      updateAddress, 
      deleteAddress, 
      userLocation, 
      saveLocation 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
