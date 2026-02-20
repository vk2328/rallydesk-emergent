import React, { useState, useEffect } from 'react';
import { useParams, Link, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTournament } from '../context/TournamentContext';
import { API_URL, formatStatus, getStatusColor, SPORTS } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Trophy, Users, Target, Grid3X3, Layers, Award, 
  Monitor, ArrowLeft, Calendar, MapPin, Settings
} from 'lucide-react';
import { cn } from '../lib/utils';

const TournamentDashboard = () => {
  const { tournamentId } = useParams();
  const location = useLocation();
  const { getAuthHeader, isAdmin, isScorekeeper } = useAuth();
  const { setCurrentTournament } = useTournament();
  const [tournament, setTournament] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournament();
    fetchStats();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      const response = await axios.get(`${API_URL}/tournaments/${tournamentId}`, {
        headers: getAuthHeader()
      });
      setTournament(response.data);
      setCurrentTournament(response.data);
    } catch (error) {
      toast.error('Failed to fetch tournament');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/tournaments/${tournamentId}/stats`, {
        headers: getAuthHeader()
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const navItems = [
    { path: '', label: 'Overview', icon: Trophy, end: true },
    { path: 'players', label: 'Players', icon: Users },
    { path: 'teams', label: 'Teams', icon: Target },
    { path: 'resources', label: 'Resources', icon: Grid3X3 },
    { path: 'divisions', label: 'Divisions', icon: Layers },
    { path: 'competitions', label: 'Competitions', icon: Award },
    { path: 'control-desk', label: 'Control Desk', icon: Monitor, requiresScorekeeper: true },
  ];

  const isActive = (path) => {
    const basePath = `/tournaments/${tournamentId}`;
    if (path === '') {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    return location.pathname.startsWith(`${basePath}/${path}`);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!tournament) {
    return <div className="p-6">Tournament not found</div>;
  }

  // Check if we're on a sub-page
  const isSubPage = location.pathname !== `/tournaments/${tournamentId}` && 
                    location.pathname !== `/tournaments/${tournamentId}/`;

  if (isSubPage) {
    return (
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border/40 p-4 hidden lg:block">
          <Link to="/tournaments" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" />
            All Tournaments
          </Link>
          <div className="mb-6">
            <h2 className="font-heading text-lg font-bold uppercase truncate">{tournament.name}</h2>
            <Badge className={getStatusColor(tournament.status)}>{formatStatus(tournament.status)}</Badge>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              if (item.requiresScorekeeper && !isScorekeeper()) return null;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={`/tournaments/${tournamentId}${item.path ? `/${item.path}` : ''}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive(item.path) 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ tournament, stats, refreshStats: fetchStats }} />
        </main>
      </div>
    );
  }

  // Overview page
  return (
    <div className="p-6 space-y-6" data-testid="tournament-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Link to="/tournaments" className="text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Tournaments
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
                {tournament.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge className={getStatusColor(tournament.status)}>{formatStatus(tournament.status)}</Badge>
                {tournament.venue && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {tournament.venue}
                  </span>
                )}
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(tournament.start_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        {isAdmin() && (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" /> Settings
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_players}</p>
                  <p className="text-xs text-muted-foreground uppercase">Players</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Grid3X3 className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_resources}</p>
                  <p className="text-xs text-muted-foreground uppercase">Resources</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_competitions}</p>
                  <p className="text-xs text-muted-foreground uppercase">Competitions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.completed_matches}/{stats.total_matches}</p>
                  <p className="text-xs text-muted-foreground uppercase">Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {navItems.map((item) => {
          if (item.requiresScorekeeper && !isScorekeeper()) return null;
          const Icon = item.icon;
          return (
            <Link key={item.path} to={`/tournaments/${tournamentId}${item.path ? `/${item.path}` : ''}`}>
              <Card className="bg-card border-border/40 hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Icon className="w-10 h-10 text-primary mb-3" />
                  <h3 className="font-semibold">{item.label}</h3>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Sport Breakdown */}
      {stats?.sport_breakdown && Object.keys(stats.sport_breakdown).length > 0 && (
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle className="font-heading uppercase">Players by Sport</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.sport_breakdown).map(([sport, count]) => {
                const sportInfo = SPORTS.find(s => s.value === sport);
                return (
                  <div key={sport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30">
                    <span className="text-2xl">{sportInfo?.icon || '🎯'}</span>
                    <div>
                      <p className="font-semibold">{count}</p>
                      <p className="text-xs text-muted-foreground">{sportInfo?.label || sport}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TournamentDashboard;
