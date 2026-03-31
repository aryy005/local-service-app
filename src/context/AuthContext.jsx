import { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

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
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          toast.error("Session expired. Please log in again.");
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
    
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.message || 'Login failed');
      throw new Error(data.message || 'Login failed');
    }
    
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
    
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.message || 'Registration failed');
      throw new Error(data.message || 'Registration failed');
    }
    
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    toast.success('Account created successfully!');
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
    
    if (!res.ok) throw new Error('Failed to update profile');
    const updatedUser = await res.json();
    setUser(updatedUser);
    return updatedUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
