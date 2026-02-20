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
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Welcome back!');
      navigate('/dashboard');
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
      await register(registerEmail, registerPassword, registerName);
      toast.success('Account created successfully!');
      navigate('/dashboard');
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
        backgroundImage: `linear-gradient(to bottom, rgba(9, 9, 11, 0.85), rgba(9, 9, 11, 0.95)), url('https://images.unsplash.com/photo-1701272873248-ee041b51b02b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwxfHxpbmRvb3IlMjBzcG9ydHMlMjBoYWxsJTIwYmx1cnJlZCUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzcxNTM2Mzg1fDA&ixlib=rb-4.1.0&q=85')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-table-tennis/5 via-transparent to-badminton/5" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Trophy className="w-12 h-12 text-table-tennis" />
              <Target className="w-6 h-6 text-badminton absolute -bottom-1 -right-1" />
            </div>
          </div>
          <h1 className="font-heading text-5xl font-black tracking-tighter uppercase text-white">
            RALLYDESK
          </h1>
          <p className="text-muted-foreground mt-2">
            Sports Tournament Management
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
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="player@rallydesk.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      data-testid="login-email"
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
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Name</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Your name"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      data-testid="register-name"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="player@rallydesk.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      data-testid="register-email"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Choose a password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
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
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Sport icons */}
        <div className="flex justify-center gap-8 mt-8 opacity-30">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-table-tennis/20 flex items-center justify-center mx-auto mb-1">
              <span className="text-table-tennis text-lg">🏓</span>
            </div>
            <span className="text-xs text-muted-foreground">Table Tennis</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-badminton/20 flex items-center justify-center mx-auto mb-1">
              <span className="text-badminton text-lg">🏸</span>
            </div>
            <span className="text-xs text-muted-foreground">Badminton</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
