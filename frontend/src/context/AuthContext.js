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
    return response.data;
  };

  const register = async (username, email, password, first_name, last_name, phone_number) => {
    const response = await axios.post(`${API_URL}/auth/register`, { 
      username, 
      email, 
      password, 
      first_name, 
      last_name, 
      phone_number: phone_number || null 
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('rallydesk_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const verifyEmail = async (code) => {
    const response = await axios.post(`${API_URL}/auth/verify-email`, { code }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Update user state to reflect email verified
    setUser(prev => ({ ...prev, email_verified: true }));
    return response.data;
  };

  const resendVerification = async () => {
    const response = await axios.post(`${API_URL}/auth/resend-verification`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  };

  const loginWithFacebook = async (facebookAccessToken) => {
    const response = await axios.post(`${API_URL}/auth/facebook/callback`, {
      access_token: facebookAccessToken
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('rallydesk_token', access_token);
    setToken(access_token);
    setUser(userData);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('rallydesk_token');
    setToken(null);
    setUser(null);
  };

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // In SaaS mode, these checks are less relevant - permissions are per-tournament
  // Keep for backwards compatibility but always return true for logged-in users
  const isAdmin = () => !!user;  // Any logged-in user can manage their own tournaments
  const isScorekeeper = () => !!user;  // Any logged-in user can score their own tournaments

  return (
    <AuthContext.Provider value={{ 
      user, token, login, register, logout, loading, getAuthHeader, isAdmin, isScorekeeper, setUser, setToken, verifyEmail, resendVerification, loginWithFacebook
    }}>
      {children}
    </AuthContext.Provider>
  );
};
