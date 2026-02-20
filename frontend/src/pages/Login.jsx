import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Trophy, Target } from 'lucide-react';

const Login = () => {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginUsername, loginPassword);
      toast.success('Welcome back!');
      navigate('/tournaments');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(registerUsername, registerEmail, registerPassword, registerDisplayName);
      toast.success('Account created! You start as a Viewer.');
      navigate('/tournaments');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
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
                      <Label htmlFor="register-username">Username *</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="username"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        required
                        data-testid="register-username"
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-displayname">Display Name</Label>
                      <Input
                        id="register-displayname"
                        type="text"
                        placeholder="Your name"
                        value={registerDisplayName}
                        onChange={(e) => setRegisterDisplayName(e.target.value)}
                        data-testid="register-displayname"
                        className="bg-background/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@example.com"
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
                    New accounts start with Viewer role
                  </p>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

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
