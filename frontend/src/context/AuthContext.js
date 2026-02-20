import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../lib/utils';

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
  const [token, setToken] = useState(localStorage.getItem('rallydesk_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('rallydesk_token');
      if (savedToken) {
        try {
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setUser(response.data);
          setToken(savedToken);
        } catch (error) {
          localStorage.removeItem('rallydesk_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { username, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('rallydesk_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (username, email, password, display_name) => {
    const response = await axios.post(`${API_URL}/auth/register`, { username, email, password, display_name });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('rallydesk_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('rallydesk_token');
    setToken(null);
    setUser(null);
  };

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const isAdmin = () => user?.role === 'admin';
  const isScorekeeper = () => user?.role === 'scorekeeper' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, token, login, register, logout, loading, getAuthHeader, isAdmin, isScorekeeper, setUser, setToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};
