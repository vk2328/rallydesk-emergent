import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/utils';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Get session_id from URL hash
      const hash = window.location.hash;
      const sessionMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionMatch) {
        toast.error('No session found');
        navigate('/login');
        return;
      }

      const sessionId = sessionMatch[1];

      try {
        // Exchange session_id for user data
        const response = await axios.post(
          `${API_URL}/auth/google/session?session_id=${sessionId}`,
          {},
          { withCredentials: true }
        );

        const { access_token, user } = response.data;
        
        // Store token and user
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        
        toast.success(`Welcome, ${user.display_name || user.username}!`);
        navigate('/dashboard', { state: { user } });
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed');
        navigate('/login');
      }
    };

    processAuth();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
