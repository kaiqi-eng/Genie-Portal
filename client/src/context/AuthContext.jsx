import { createContext, useContext, useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setError(null);
    } catch (err) {
      setUser(null);
      if (err.response?.status !== 401) {
        setError('Failed to check authentication');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user,
    isApproved: user?.isApproved || false,
    isAdmin: user?.isAdmin || false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
