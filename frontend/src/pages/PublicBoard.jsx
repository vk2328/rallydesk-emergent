import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL, formatStatus, getStatusColor, getSportIcon, getPlayerName, formatSport } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Trophy, Clock, RefreshCw } from 'lucide-react';

const PublicBoard = () => {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [resources, setResources] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/tournaments/${tournamentId}/public-board`);
      setTournament(response.data.tournament);
      setResources(response.data.resources);
      setRecentResults(response.data.recent_results);
      
      // Extract live matches from resources
      const live = response.data.resources
        .filter(r => r.current_match)
        .map(r => ({ ...r.current_match, resource_label: r.label }));
      setLiveMatches(live);
    } catch (error) {
      console.error('Failed to fetch public board data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-20 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Tournament not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="public-board">
      {/* Header */}
      <div className="bg-card border-b border-border/40 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase text-primary">
              {tournament.name}
            </h1>
            {tournament.venue && (
              <p className="text-muted-foreground mt-1">{tournament.venue}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Live updates</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              <h2 className="font-heading text-2xl uppercase">Live Now</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveMatches.map((match, idx) => (
                <Card 
                  key={idx} 
                  className="bg-red-500/5 border-red-500/30 overflow-hidden"
                  data-testid={`live-match-${idx}`}
                >
                  <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-between">
                    <span className="font-bold uppercase text-sm">{match.resource_label}</span>
                    <div className="flex items-center gap-2">
                      {match.score_status === 'pending' && (
                        <Badge className="bg-yellow-500 text-black text-[10px]">UNOFFICIAL</Badge>
                      )}
                      <Badge className="bg-white text-red-500">LIVE</Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-left">
                          <p className="font-heading text-lg uppercase truncate">
                            {match.participant1_name || 'TBD'}
                          </p>
                        </div>
                        <div className="px-4">
                          <span className="font-teko text-4xl">
                            {match.scores?.filter(s => s.score1 > s.score2).length || 0}
                          </span>
                        </div>
                      </div>
                      
                      <div className="border-t border-border/40"></div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-left">
                          <p className="font-heading text-lg uppercase truncate">
                            {match.participant2_name || 'TBD'}
                          </p>
                        </div>
                        <div className="px-4">
                          <span className="font-teko text-4xl">
                            {match.scores?.filter(s => s.score2 > s.score1).length || 0}
                          </span>
                        </div>
                      </div>
                      
                      {match.score_status === 'pending' && (
                        <div className="text-[10px] text-yellow-500 flex items-center justify-center gap-1">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                          Score awaiting official confirmation
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Resources Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Court/Table Status */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase">Resources Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {resources.map(resource => (
                  <div
                    key={resource.id}
                    className={`p-3 rounded-lg text-center ${
                      resource.current_match_id 
                        ? 'bg-red-500/10 border border-red-500/30' 
                        : resource.locked
                          ? 'bg-yellow-500/10 border border-yellow-500/30'
                          : 'bg-green-500/10 border border-green-500/30'
                    }`}
                    data-testid={`resource-status-${resource.id}`}
                  >
                    <span className="text-lg">{getSportIcon(resource.sport)}</span>
                    <p className="font-medium text-sm mt-1">{resource.label}</p>
                    <Badge 
                      variant="outline" 
                      className={`mt-2 text-xs ${
                        resource.current_match_id ? 'border-red-500 text-red-500' :
                        resource.locked ? 'border-yellow-500 text-yellow-500' :
                        'border-green-500 text-green-500'
                      }`}
                    >
                      {resource.current_match_id ? 'In Use' : resource.locked ? 'Locked' : 'Free'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Recent Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentResults.length > 0 ? (
                <div className="space-y-3">
                  {recentResults.slice(0, 8).map((match, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      data-testid={`recent-result-${idx}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={match.winner_id === match.participant1_id ? 'font-bold text-green-500' : 'text-muted-foreground'}>
                            {match.participant1_name || 'Player 1'}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className={match.winner_id === match.participant2_id ? 'font-bold text-green-500' : 'text-muted-foreground'}>
                            {match.participant2_name || 'Player 2'}
                          </span>
                        </div>
                      </div>
                      <div className="font-teko text-lg">
                        {match.scores?.filter(s => s.score1 > s.score2).length || 0} - {match.scores?.filter(s => s.score2 > s.score1).length || 0}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No completed matches yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* No Live Matches Message */}
        {liveMatches.length === 0 && (
          <Card className="bg-card border-border/40 mt-6">
            <CardContent className="py-12 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-heading text-xl uppercase mb-2">No Matches Currently Live</h3>
              <p className="text-muted-foreground">Check back soon for live updates</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 mt-8 py-4 text-center text-sm text-muted-foreground">
        <p>Powered by RallyDesk • Auto-refreshing every 10 seconds</p>
      </div>
    </div>
  );
};

export default PublicBoard;
