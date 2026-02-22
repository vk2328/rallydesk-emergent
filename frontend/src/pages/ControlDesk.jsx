import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatStatus, getStatusColor, getSportIcon, getPlayerName, formatSport } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, Play, Square, ChevronRight, RefreshCw,
  Clock, AlertCircle, CheckCircle2
} from 'lucide-react';

const ControlDesk = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader, user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [resources, setResources] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('all');

  // Allow assignment for any authenticated user (tournament access is checked on backend)
  const canAssign = !!user;

  const fetchData = useCallback(async () => {
    try {
      const [tournamentRes, resourcesRes, competitionsRes] = await Promise.all([
        axios.get(`${API_URL}/tournaments/${tournamentId}`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${tournamentId}/resources`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${tournamentId}/competitions`, { headers: getAuthHeader() })
      ]);
      
      setTournament(tournamentRes.data);
      setResources(resourcesRes.data);
      setCompetitions(competitionsRes.data);
      
      // Fetch matches for all competitions
      const allMatches = [];
      for (const comp of competitionsRes.data) {
        try {
          const matchesRes = await axios.get(
            `${API_URL}/tournaments/${tournamentId}/competitions/${comp.id}/matches`,
            { headers: getAuthHeader() }
          );
          allMatches.push(...matchesRes.data.map(m => ({ ...m, competition_name: comp.name, competition_sport: comp.sport })));
        } catch (e) {
          // Competition might not have matches yet
        }
      }
      setMatches(allMatches);
    } catch (error) {
      toast.error('Failed to load control desk data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, getAuthHeader]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAssignMatch = async (matchId, resourceId) => {
    try {
      await axios.post(
        `${API_URL}/tournaments/${tournamentId}/matches/${matchId}/assign?resource_id=${resourceId}`,
        {},
        { headers: getAuthHeader() }
      );
      toast.success('Match assigned to resource');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign match');
    }
  };

  const handleStartMatch = async (matchId) => {
    try {
      await axios.post(
        `${API_URL}/tournaments/${tournamentId}/matches/${matchId}/start`,
        {},
        { headers: getAuthHeader() }
      );
      toast.success('Match started');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start match');
    }
  };

  const handleEndMatch = async (matchId) => {
    navigate(`/tournaments/${tournamentId}/matches/${matchId}`);
  };

  // Filter resources by sport
  const filteredResources = selectedSport === 'all' 
    ? resources 
    : resources.filter(r => r.sport === selectedSport);

  // Get pending matches that can be assigned
  const pendingMatches = matches.filter(m => 
    m.status === 'pending' && 
    m.participant1_id && 
    m.participant2_id &&
    !m.resource_id &&
    (selectedSport === 'all' || m.competition_sport === selectedSport)
  );

  // Get scheduled matches (assigned but not started)
  const scheduledMatches = matches.filter(m => 
    m.status === 'scheduled' && 
    m.resource_id &&
    (selectedSport === 'all' || m.competition_sport === selectedSport)
  );

  // Get live matches
  const liveMatches = matches.filter(m => m.status === 'live');

  // Get matches with pending referee scores (need confirmation)
  const pendingScoreMatches = matches.filter(m => 
    m.score_status === 'pending' &&
    (selectedSport === 'all' || m.competition_sport === selectedSport)
  );

  // Get available resources
  const availableResources = filteredResources.filter(r => r.enabled && !r.locked && !r.current_match_id);

  // Get unique sports from resources
  const sportsList = [...new Set(resources.map(r => r.sport))];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="control-desk">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => navigate(`/tournaments/${tournamentId}`)} className="w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournament
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
              Control Desk
            </h1>
            <p className="text-muted-foreground mt-1">
              {tournament?.name} - Manage matches and resources
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="w-48" data-testid="sport-filter">
                <SelectValue placeholder="Filter by sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                {sportsList.map(sport => (
                  <SelectItem key={sport} value={sport}>
                    {getSportIcon(sport)} {formatSport(sport)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchData} data-testid="refresh-btn">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Live Matches</p>
            <p className="font-teko text-4xl text-red-500">{liveMatches.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Pending</p>
            <p className="font-teko text-4xl text-yellow-500">{pendingMatches.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Available Resources</p>
            <p className="font-teko text-4xl text-green-500">{availableResources.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Total Matches</p>
            <p className="font-teko text-4xl">{matches.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resources Panel */}
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle className="font-heading uppercase">Resources</CardTitle>
            <CardDescription>Tables and courts status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredResources.length > 0 ? filteredResources.map(resource => {
                const currentMatch = matches.find(m => m.resource_id === resource.id && m.status === 'live');
                const scheduledMatch = matches.find(m => m.resource_id === resource.id && m.status === 'scheduled');
                const activeMatch = currentMatch || scheduledMatch;
                
                return (
                  <div
                    key={resource.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      currentMatch 
                        ? 'border-red-500 bg-red-500/10' 
                        : scheduledMatch
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : resource.locked 
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-border/40 bg-muted/30'
                    }`}
                    data-testid={`resource-${resource.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getSportIcon(resource.sport)}</span>
                        <span className="font-medium">{resource.label}</span>
                      </div>
                      <Badge variant="outline" className={
                        currentMatch ? 'border-red-500 text-red-500' :
                        scheduledMatch ? 'border-yellow-500 text-yellow-500' :
                        resource.locked ? 'border-orange-500 text-orange-500' :
                        'border-green-500 text-green-500'
                      }>
                        {currentMatch ? 'Live' : scheduledMatch ? 'Ready' : resource.locked ? 'Locked' : 'Available'}
                      </Badge>
                    </div>
                    
                    {activeMatch && (
                      <div className="mt-3 p-3 bg-background/50 rounded">
                        <p className="text-sm text-muted-foreground mb-1">{activeMatch.competition_name}</p>
                        <p className="font-medium">
                          {activeMatch.participant1?.name || getPlayerName(activeMatch.participant1)} vs{' '}
                          {activeMatch.participant2?.name || getPlayerName(activeMatch.participant2)}
                        </p>
                        
                        {scheduledMatch && canAssign && (
                          <Button
                            size="sm"
                            className="mt-2 w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleStartMatch(scheduledMatch.id)}
                            data-testid={`start-match-${scheduledMatch.id}`}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start Match
                          </Button>
                        )}
                        
                        {currentMatch && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full"
                            onClick={() => handleEndMatch(currentMatch.id)}
                          >
                            <ChevronRight className="w-4 h-4 mr-1" />
                            View Scoreboard
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <p className="text-center text-muted-foreground py-4">No resources available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Match Queue Panel */}
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle className="font-heading uppercase">Match Queue</CardTitle>
            <CardDescription>Assign pending matches to resources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingMatches.length > 0 ? pendingMatches.slice(0, 10).map(match => (
                <div
                  key={match.id}
                  className="p-4 rounded-lg border border-border/40 bg-muted/30"
                  data-testid={`queue-match-${match.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{getSportIcon(match.competition_sport)}</span>
                      <span className="text-sm text-muted-foreground">{match.competition_name}</span>
                    </div>
                    <Badge variant="outline">R{match.round_number}</Badge>
                  </div>
                  
                  <p className="font-medium mb-3">
                    {match.participant1?.name || getPlayerName(match.participant1)} vs{' '}
                    {match.participant2?.name || getPlayerName(match.participant2)}
                  </p>
                  
                  {canAssign && availableResources.filter(r => r.sport === match.competition_sport).length > 0 && (
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(resourceId) => handleAssignMatch(match.id, resourceId)}>
                        <SelectTrigger className="flex-1" data-testid={`assign-select-${match.id}`}>
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableResources
                            .filter(r => r.sport === match.competition_sport)
                            .map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {availableResources.filter(r => r.sport === match.competition_sport).length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-500">
                      <Clock className="w-4 h-4" />
                      <span>No available {formatSport(match.competition_sport)} resources</span>
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pending matches in queue</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <Card className="bg-card border-red-500/30">
          <CardHeader>
            <CardTitle className="font-heading uppercase flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              Live Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveMatches.map(match => {
                const resource = resources.find(r => r.id === match.resource_id);
                return (
                  <div
                    key={match.id}
                    className="p-4 rounded-lg border border-red-500/30 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors"
                    onClick={() => navigate(`/tournaments/${tournamentId}/matches/${match.id}`)}
                    data-testid={`live-match-${match.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-red-500">{resource?.label || 'Unknown'}</Badge>
                      <span className="text-sm text-muted-foreground">{match.competition_name}</span>
                    </div>
                    <p className="font-medium">
                      {match.participant1?.name || getPlayerName(match.participant1)}
                    </p>
                    <p className="text-muted-foreground text-sm">vs</p>
                    <p className="font-medium">
                      {match.participant2?.name || getPlayerName(match.participant2)}
                    </p>
                    {match.scores?.length > 0 && (
                      <div className="mt-2 text-center">
                        <span className="font-teko text-2xl">
                          {match.scores.filter(s => s.score1 > s.score2).length} - {match.scores.filter(s => s.score2 > s.score1).length}
                        </span>
                      </div>
                    )}
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

export default ControlDesk;
