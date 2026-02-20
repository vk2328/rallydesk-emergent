import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatSport, formatStatus, getStatusColor, formatFormat } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { 
  Trophy, Users, Target, Calendar, Award, 
  ArrowRight, Plus, TrendingUp 
} from 'lucide-react';

const Dashboard = () => {
  const { getAuthHeader } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats/dashboard`, {
        headers: getAuthHeader()
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome to RallyDesk - Your Tournament Control Center
          </p>
        </div>
        <Link to="/tournaments/new">
          <Button className="font-bold uppercase tracking-wider" data-testid="create-tournament-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Tournament
          </Button>
        </Link>
      </div>

      {/* Stats Grid - Bento Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Tournaments */}
        <Card className="bg-card border-border/40 hover:border-primary/50 transition-colors" data-testid="stat-tournaments">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                  Tournaments
                </p>
                <p className="font-teko text-5xl font-bold mt-1">
                  {stats?.total_tournaments || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                {stats?.active_tournaments || 0} Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Players */}
        <Card className="bg-card border-border/40 hover:border-secondary/50 transition-colors" data-testid="stat-players">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                  Players
                </p>
                <p className="font-teko text-5xl font-bold mt-1">
                  {stats?.total_players || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-table-tennis">{stats?.sport_breakdown?.table_tennis || 0} TT</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-badminton">{stats?.sport_breakdown?.badminton || 0} BD</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Teams */}
        <Card className="bg-card border-border/40 hover:border-blue-500/50 transition-colors" data-testid="stat-teams">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                  Teams
                </p>
                <p className="font-teko text-5xl font-bold mt-1">
                  {stats?.total_teams || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matches */}
        <Card className="bg-card border-border/40 hover:border-purple-500/50 transition-colors" data-testid="stat-matches">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                  Matches
                </p>
                <p className="font-teko text-5xl font-bold mt-1">
                  {stats?.total_matches || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              {stats?.completed_matches || 0} Completed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="bg-card border-border/40 lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-heading uppercase tracking-tight">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/tournaments/new" className="block">
              <Button variant="outline" className="w-full justify-start" data-testid="quick-new-tournament">
                <Trophy className="w-4 h-4 mr-2 text-primary" />
                Create Tournament
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
            <Link to="/players" className="block">
              <Button variant="outline" className="w-full justify-start" data-testid="quick-players">
                <Users className="w-4 h-4 mr-2 text-secondary" />
                Manage Players
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
            <Link to="/teams" className="block">
              <Button variant="outline" className="w-full justify-start" data-testid="quick-teams">
                <Target className="w-4 h-4 mr-2 text-blue-500" />
                Manage Teams
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
            <Link to="/resources" className="block">
              <Button variant="outline" className="w-full justify-start" data-testid="quick-resources">
                <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                Manage Resources
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Tournaments */}
        <Card className="bg-card border-border/40 lg:col-span-2" data-testid="recent-tournaments">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading uppercase tracking-tight">Recent Tournaments</CardTitle>
              <CardDescription>Latest tournaments in the system</CardDescription>
            </div>
            <Link to="/tournaments">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recent_tournaments?.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_tournaments.map((tournament) => (
                  <Link 
                    key={tournament.id} 
                    to={`/tournaments/${tournament.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tournament.sport === 'table_tennis' ? 'bg-table-tennis/20' : 'bg-badminton/20'
                        }`}>
                          <span className="text-xl">
                            {tournament.sport === 'table_tennis' ? '🏓' : '🏸'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{tournament.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatFormat(tournament.format)} • {formatSport(tournament.sport)}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(tournament.status)}>
                        {formatStatus(tournament.status)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No tournaments yet</p>
                <Link to="/tournaments/new">
                  <Button variant="outline" size="sm" className="mt-3">
                    Create your first tournament
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sport Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className="bg-card border-border/40 overflow-hidden relative group"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(9, 9, 11, 0.95), rgba(9, 9, 11, 0.7)), url('https://images.unsplash.com/photo-1741096325036-731b74a03309?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwxfHx0YWJsZSUyMHRlbm5pcyUyMHBsYXllciUyMGRyYW1hdGljJTIwbGlnaHRpbmclMjBhY3Rpb258ZW58MHx8fHwxNzcxNTM2MzcyfDA&ixlib=rb-4.1.0&q=85')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-table-tennis/20 flex items-center justify-center">
                <span className="text-2xl">🏓</span>
              </div>
              <div>
                <h3 className="font-heading text-xl uppercase font-bold text-table-tennis">
                  Table Tennis
                </h3>
                <p className="text-sm text-muted-foreground">
                  {stats?.sport_breakdown?.table_tennis || 0} Players
                </p>
              </div>
            </div>
            <Link to="/leaderboard/table_tennis">
              <Button variant="outline" size="sm" className="border-table-tennis/30 hover:bg-table-tennis/10">
                View Leaderboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card 
          className="bg-card border-border/40 overflow-hidden relative group"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(9, 9, 11, 0.95), rgba(9, 9, 11, 0.7)), url('https://images.unsplash.com/photo-1761286753703-570ed91dd90e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwxfHxiYWRtaW50b24lMjBwbGF5ZXIlMjBzbWFzaCUyMGFjdGlvbiUyMGhpZ2glMjBzaHV0dGVyJTIwc3BlZWR8ZW58MHx8fHwxNzcxNTM2MzczfDA&ixlib=rb-4.1.0&q=85')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-badminton/20 flex items-center justify-center">
                <span className="text-2xl">🏸</span>
              </div>
              <div>
                <h3 className="font-heading text-xl uppercase font-bold text-badminton">
                  Badminton
                </h3>
                <p className="text-sm text-muted-foreground">
                  {stats?.sport_breakdown?.badminton || 0} Players
                </p>
              </div>
            </div>
            <Link to="/leaderboard/badminton">
              <Button variant="outline" size="sm" className="border-badminton/30 hover:bg-badminton/10">
                View Leaderboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
