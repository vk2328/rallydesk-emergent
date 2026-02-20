import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Turnstile from 'react-turnstile';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Trophy, Target, Mail, RefreshCw, Shield } from 'lucide-react';

// Facebook App ID - you'll need to set this in your environment
const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID || '';
// Cloudflare Turnstile Site Key - for bot protection
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || '';

const Login = () => {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resending, setResending] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [loginTurnstileToken, setLoginTurnstileToken] = useState('');
  const [registerTurnstileToken, setRegisterTurnstileToken] = useState('');
  const loginTurnstileRef = useRef(null);
  const registerTurnstileRef = useRef(null);
  const { login, register, verifyEmail, resendVerification, loginWithFacebook } = useAuth();
  const navigate = useNavigate();

  // Initialize Facebook SDK
  useEffect(() => {
    if (FACEBOOK_APP_ID && !window.FB) {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
      };

      // Load Facebook SDK
      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    }
  }, []);

  const handleFacebookLogin = () => {
    if (!FACEBOOK_APP_ID) {
      toast.error('Facebook login is not configured');
      return;
    }

    setFacebookLoading(true);
    
    window.FB.login(async (response) => {
      if (response.authResponse) {
        try {
          await loginWithFacebook(response.authResponse.accessToken);
          toast.success('Welcome to RallyDesk!');
          navigate('/dashboard');
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Facebook login failed');
        }
      } else {
        toast.error('Facebook login was cancelled');
      }
      setFacebookLoading(false);
    }, { scope: 'public_profile,email' });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Check Turnstile token if enabled
    if (TURNSTILE_SITE_KEY && !loginTurnstileToken) {
      toast.error('Please complete the security verification');
      return;
    }
    
    setLoading(true);
    try {
      const response = await login(loginUsername, loginPassword, loginTurnstileToken);
      toast.success('Welcome back!');
      if (!response.user.email_verified) {
        setShowVerification(true);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      // Reset turnstile on error
      if (loginTurnstileRef.current) {
        loginTurnstileRef.current.reset();
        setLoginTurnstileToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Check Turnstile token if enabled
    if (TURNSTILE_SITE_KEY && !registerTurnstileToken) {
      toast.error('Please complete the security verification');
      return;
    }
    
    setLoading(true);
    try {
      await register(registerUsername, registerEmail, registerPassword, registerFirstName, registerLastName, registerPhone, registerTurnstileToken);
      toast.success('Account created! Please verify your email.');
      setShowVerification(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
      // Reset turnstile on error
      if (registerTurnstileRef.current) {
        registerTurnstileRef.current.reset();
        setRegisterTurnstileToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyEmail(verificationCode);
      toast.success('Email verified successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      await resendVerification();
      toast.success('Verification code sent! Check your email.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)'
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Trophy className="w-12 h-12 text-red-500" />
              <Target className="w-6 h-6 text-lime-400 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <h1 className="font-heading text-5xl font-black tracking-tighter uppercase text-white">
            RALLYDESK
          </h1>
          <p className="text-muted-foreground mt-2">
            Multi-Sport Tournament Platform
          </p>
        </div>

        <Card className="bg-card/80 backdrop-blur border-border/40" data-testid="auth-card">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader>
                  <CardTitle className="font-heading uppercase tracking-tight">Welcome Back</CardTitle>
                  <CardDescription>Enter your credentials to continue</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="Your username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      required
                      data-testid="login-username"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      data-testid="login-password"
                      className="bg-background/50"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full font-bold uppercase tracking-wider"
                    disabled={loading}
                    data-testid="login-submit"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/40" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
                      const redirectUrl = window.location.origin + '/dashboard';
                      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
                    }}
                    data-testid="google-login-btn"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  {FACEBOOK_APP_ID && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white border-[#1877F2]"
                      onClick={handleFacebookLogin}
                      disabled={facebookLoading}
                      data-testid="facebook-login-btn"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      {facebookLoading ? 'Connecting...' : 'Continue with Facebook'}
                    </Button>
                  )}
                </CardContent>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardHeader>
                  <CardTitle className="font-heading uppercase tracking-tight">Create Account</CardTitle>
                  <CardDescription>Join RallyDesk today</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname">First Name *</Label>
                      <Input
                        id="register-firstname"
                        type="text"
                        placeholder="John"
                        value={registerFirstName}
                        onChange={(e) => setRegisterFirstName(e.target.value)}
                        required
                        data-testid="register-firstname"
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastname">Last Name *</Label>
                      <Input
                        id="register-lastname"
                        type="text"
                        placeholder="Doe"
                        value={registerLastName}
                        onChange={(e) => setRegisterLastName(e.target.value)}
                        required
                        data-testid="register-lastname"
                        className="bg-background/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username *</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="johndoe"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        required
                        data-testid="register-username"
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-phone">Phone Number</Label>
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        data-testid="register-phone"
                        className="bg-background/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="john@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      data-testid="register-email"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password * (min 6 chars)</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Choose a password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      minLength={6}
                      data-testid="register-password"
                      className="bg-background/50"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full font-bold uppercase tracking-wider"
                    disabled={loading}
                    data-testid="register-submit"
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Create and manage your own tournaments
                  </p>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/40" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const redirectUrl = window.location.origin + '/dashboard';
                      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
                    }}
                    data-testid="google-register-btn"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>

                  {FACEBOOK_APP_ID && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white border-[#1877F2]"
                      onClick={handleFacebookLogin}
                      disabled={facebookLoading}
                      data-testid="facebook-register-btn"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      {facebookLoading ? 'Connecting...' : 'Continue with Facebook'}
                    </Button>
                  )}
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Email Verification Modal */}
        <Dialog open={showVerification} onOpenChange={setShowVerification}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Verify Your Email
              </DialogTitle>
              <DialogDescription>
                We've sent a verification code to your email. Enter it below to verify your account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  data-testid="verification-code"
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    navigate('/dashboard');
                    setShowVerification(false);
                  }}
                >
                  Skip for now
                </Button>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">Didn't receive the code?</span>
                <Button 
                  type="button" 
                  variant="link" 
                  size="sm"
                  className="p-0 h-auto"
                  onClick={handleResendCode}
                  disabled={resending}
                  data-testid="resend-code-btn"
                >
                  {resending ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend Code'
                  )}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Check your spam folder if you don't see the email.
              </p>
            </form>
          </DialogContent>
        </Dialog>

        {/* Sport icons */}
        <div className="flex justify-center gap-4 mt-8 opacity-40">
          {['🏓', '🏸', '🏐', '🎾', '🥒'].map((icon, i) => (
            <span key={i} className="text-2xl">{icon}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;
