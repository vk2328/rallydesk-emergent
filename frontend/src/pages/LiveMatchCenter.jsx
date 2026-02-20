import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL, getSportIcon, formatSport } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Trophy, RefreshCw, Clock, Zap, Activity } from 'lucide-react';

const LiveMatchCenter = () => {
  const [liveMatches, setLiveMatches] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [stats, setStats] = useState({ live: 0, completed: 0, pending: 0, tournaments: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/live-match-center`);
      setLiveMatches(response.data.live_matches || []);
      setRecentResults(response.data.recent_results || []);
      setUpcomingMatches(response.data.upcoming_matches || []);
      setStats(response.data.stats || { live: 0, completed: 0, pending: 0, tournaments: 0 });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch live match data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 seconds for live data
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading live matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="live-match-center">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-emerald-500/30 flex items-center justify-center">
                <Activity className="w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight uppercase text-emerald-400">
                  Live Match Center
                </h1>
                <p className="text-muted-foreground mt-1">
                  Real-time scores across all tournaments
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Auto-updating</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last update: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-card/50 border-b border-border/40 py-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-teko font-bold text-red-500">{stats.live}</p>
                <p className="text-xs text-muted-foreground uppercase">Live Now</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-teko font-bold text-yellow-500">{stats.pending}</p>
                <p className="text-xs text-muted-foreground uppercase">Upcoming</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-teko font-bold text-green-500">{stats.completed}</p>
                <p className="text-xs text-muted-foreground uppercase">Completed Today</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-teko font-bold text-primary">{stats.tournaments}</p>
                <p className="text-xs text-muted-foreground uppercase">Active Tournaments</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Live Matches Section */}
        {liveMatches.length > 0 ? (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></span>
              <h2 className="font-heading text-2xl uppercase font-bold">Live Matches</h2>
              <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveMatches.map((match, idx) => (
                <Card 
                  key={idx}
                  className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30 overflow-hidden hover:border-red-500/50 transition-all"
                  data-testid={`live-match-${idx}`}
                >
                  <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getSportIcon(match.sport)}</span>
                      <span className="font-medium text-sm truncate">{match.tournament_name}</span>
                    </div>
                    <Badge variant="outline" className="bg-white/20 border-white/40 text-white text-xs">
                      {match.resource_label}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-3">{match.competition_name}</p>
                    
                    {/* Player 1 */}
                    <div className={`flex items-center justify-between p-3 rounded-lg mb-2 ${
                      match.p1_sets > match.p2_sets ? 'bg-primary/10' : 'bg-muted/30'
                    }`}>
                      <span className="font-medium truncate flex-1">{match.participant1_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-teko text-3xl font-bold text-primary">{match.p1_sets || 0}</span>
                        {match.current_score && (
                          <span className="text-muted-foreground font-teko text-xl">({match.current_score.p1})</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Player 2 */}
                    <div className={`flex items-center justify-between p-3 rounded-lg ${
                      match.p2_sets > match.p1_sets ? 'bg-secondary/10' : 'bg-muted/30'
                    }`}>
                      <span className="font-medium truncate flex-1">{match.participant2_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-teko text-3xl font-bold text-secondary">{match.p2_sets || 0}</span>
                        {match.current_score && (
                          <span className="text-muted-foreground font-teko text-xl">({match.current_score.p2})</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 text-center">
                      <Link to={`/tournaments/${match.tournament_id}/board`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          View Tournament Board
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="bg-card border-border/40 mb-10">
            <CardContent className="py-16 text-center">
              <Activity className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="font-heading text-xl uppercase mb-2">No Matches Currently Live</h3>
              <p className="text-muted-foreground">Check back soon for live action!</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Matches */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Coming Up Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMatches.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMatches.slice(0, 6).map((match, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`upcoming-match-${idx}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getSportIcon(match.sport)}</span>
                        <div>
                          <p className="font-medium text-sm">
                            {match.participant1_name} vs {match.participant2_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {match.tournament_name} • {match.competition_name}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        R{match.round_number}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No upcoming matches</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-500" />
                Recent Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentResults.length > 0 ? (
                <div className="space-y-3">
                  {recentResults.slice(0, 6).map((match, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      data-testid={`recent-result-${idx}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getSportIcon(match.sport)}</span>
                        <div>
                          <p className="text-sm">
                            <span className={match.winner_id === match.participant1_id ? 'font-bold text-green-500' : 'text-muted-foreground'}>
                              {match.participant1_name}
                            </span>
                            <span className="text-muted-foreground mx-2">vs</span>
                            <span className={match.winner_id === match.participant2_id ? 'font-bold text-green-500' : 'text-muted-foreground'}>
                              {match.participant2_name}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">{match.tournament_name}</p>
                        </div>
                      </div>
                      <div className="font-teko text-xl">
                        {match.p1_sets || 0} - {match.p2_sets || 0}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No recent results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 mt-8 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Powered by <span className="font-heading text-primary">RallyDesk</span> • Auto-refreshing every 5 seconds
        </p>
        <div className="mt-2">
          <Link to="/login">
            <Button variant="link" className="text-muted-foreground text-xs">
              Tournament Organizer? Sign In →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LiveMatchCenter;
