import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useTheme } from '../context/ThemeContext';
import { 
  Trophy, Users, Calendar, BarChart3, Monitor, 
  Upload, Layers, Play, ArrowRight, ChevronRight,
  Zap, Shield, Globe, Sun, Moon, CheckCircle
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const features = [
    {
      icon: Trophy,
      title: 'Multi-Sport Support',
      description: 'Table Tennis, Badminton, Volleyball, Tennis, and Pickleball - all in one platform',
      color: 'text-red-500'
    },
    {
      icon: Layers,
      title: 'Flexible Divisions',
      description: 'Create custom divisions like Open, Men\'s, Women\'s, Mixed, U18 - you define the categories',
      color: 'text-blue-500'
    },
    {
      icon: Users,
      title: 'Team & Player Management',
      description: 'Register players manually or bulk import via CSV with automatic team creation',
      color: 'text-green-500'
    },
    {
      icon: Calendar,
      title: 'Competition Formats',
      description: 'Round Robin, Single Elimination, Groups + Knockout - supports all major formats',
      color: 'text-purple-500'
    },
    {
      icon: Monitor,
      title: 'Live Scoreboard',
      description: 'Real-time match scoring with public display boards for spectators',
      color: 'text-orange-500'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Standings',
      description: 'Auto-generated brackets, standings, and leaderboards for every competition',
      color: 'text-cyan-500'
    }
  ];

  const sports = [
    { name: 'Table Tennis', icon: '🏓' },
    { name: 'Badminton', icon: '🏸' },
    { name: 'Volleyball', icon: '🏐' },
    { name: 'Tennis', icon: '🎾' },
    { name: 'Pickleball', icon: '🥒' }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight">RALLYDESK</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/live')}>
              Live Matches
            </Button>
            <Button onClick={() => navigate('/login')} data-testid="get-started-btn">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Multi-Sport Tournament Operations Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Run Tournaments
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
                Like a Pro
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              From player registration to live scoring - RallyDesk handles every aspect of your tournament. 
              Built for organizers who demand efficiency and spectators who crave real-time updates.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/login')}>
                Start Your Tournament
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate('/live')}>
                <Play className="w-5 h-5 mr-2" />
                View Live Matches
              </Button>
            </div>
          </div>

          {/* Sports Icons */}
          <div className="flex items-center justify-center gap-8 mt-16">
            {sports.map((sport, idx) => (
              <div 
                key={sport.name}
                className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <span className="text-4xl">{sport.icon}</span>
                <span className="text-xs text-muted-foreground">{sport.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow Diagram Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From setup to celebration - a streamlined workflow for tournament success
            </p>
          </div>

          {/* Flow Diagram */}
          <div className="relative">
            {/* Connection Lines (Desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-[12%] right-[12%] h-1 bg-gradient-to-r from-red-500 via-orange-500 to-green-500 -translate-y-1/2 z-0 rounded-full" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-red-500/20 border-2 border-red-500 flex items-center justify-center mb-4 relative">
                  <Trophy className="w-10 h-10 text-red-500" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Create Tournament</h3>
                <p className="text-sm text-muted-foreground">Set up venue, dates, and choose your sports</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center mb-4 relative">
                  <Layers className="w-10 h-10 text-orange-500" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Setup Divisions</h3>
                <p className="text-sm text-muted-foreground">Create Open, Men's, Women's, Mixed categories</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center mb-4 relative">
                  <Upload className="w-10 h-10 text-yellow-500" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Import Players</h3>
                <p className="text-sm text-muted-foreground">CSV upload with auto team & division creation</p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center mb-4 relative">
                  <Play className="w-10 h-10 text-blue-500" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Run Matches</h3>
                <p className="text-sm text-muted-foreground">Live scoring with control desk management</p>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-4 relative">
                  <BarChart3 className="w-10 h-10 text-green-500" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Track Results</h3>
                <p className="text-sm text-muted-foreground">Auto-updated brackets & leaderboards</p>
              </div>
            </div>
          </div>

          {/* Detailed Flow */}
          <div className="mt-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="bg-card/50 border-border/40 hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="font-bold text-lg">For Organizers</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Create tournaments with multiple sports & divisions
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Bulk import players & teams via CSV
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Generate draws & manage resources
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Assign matches to courts/tables
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/40 hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Monitor className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="font-bold text-lg">For Scorekeepers</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Control Desk for match assignments
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Live scoreboard entry interface
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Real-time score updates
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Match status management
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/40 hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="font-bold text-lg">For Spectators</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Public Live Match Center (no login)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Real-time score updates
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Upcoming matches schedule
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Tournament standings & brackets
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to run professional tournaments, all in one place
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card 
                key={feature.title}
                className="bg-card/50 border-border/40 hover:border-primary/40 transition-all hover:scale-[1.02] cursor-default"
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-current/10 flex items-center justify-center mb-4 ${feature.color}`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10 border-primary/20">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Run Your Tournament?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Join tournament organizers who trust RallyDesk to deliver smooth, professional events every time.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/login')}>
                  Create Free Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate('/live')}>
                  Explore Live Matches
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">RALLYDESK</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Multi-Sport Tournament Operations Platform</span>
            </div>
            <div className="flex items-center gap-2">
              {sports.map((sport) => (
                <span key={sport.name} className="text-2xl opacity-60 hover:opacity-100 transition-opacity">
                  {sport.icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
