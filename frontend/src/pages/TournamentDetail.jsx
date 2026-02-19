import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatSport, formatFormat, formatMatchType, formatStatus, getStatusColor, getSportColor } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  ArrowLeft, Calendar, Users, Trophy, Play, 
  UserPlus, Grid3X3, Award, ChevronRight, X
} from 'lucide-react';

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [availableParticipants, setAvailableParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState('');

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      const [tournamentRes, participantsRes, matchesRes] = await Promise.all([
        axios.get(`${API_URL}/tournaments/${id}`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${id}/participants`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${id}/matches`, { headers: getAuthHeader() })
      ]);
      
      setTournament(tournamentRes.data);
      setParticipants(participantsRes.data);
      setMatches(matchesRes.data);
      
      // Fetch available players/teams
      const collection = tournamentRes.data.match_type === 'singles' ? 'players' : 'teams';
      const availableRes = await axios.get(`${API_URL}/${collection}?sport=${tournamentRes.data.sport}`, {
        headers: getAuthHeader()
      });
      
      const registeredIds = participantsRes.data.map(p => p.id);
      setAvailableParticipants(availableRes.data.filter(p => !registeredIds.includes(p.id)));
    } catch (error) {
      toast.error('Failed to fetch tournament data');
      navigate('/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedParticipant) return;
    try {
      await axios.post(`${API_URL}/tournaments/${id}/participants/${selectedParticipant}`, {}, {
        headers: getAuthHeader()
      });
      toast.success('Participant added');
      setIsAddDialogOpen(false);
      setSelectedParticipant('');
      fetchTournamentData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add participant');
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    try {
      await axios.delete(`${API_URL}/tournaments/${id}/participants/${participantId}`, {
        headers: getAuthHeader()
      });
      toast.success('Participant removed');
      fetchTournamentData();
    } catch (error) {
      toast.error('Failed to remove participant');
    }
  };

  const handleGenerateBracket = async () => {
    try {
      const response = await axios.post(`${API_URL}/tournaments/${id}/generate-bracket`, {}, {
        headers: getAuthHeader()
      });
      toast.success(response.data.message);
      fetchTournamentData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate bracket');
    }
  };

  const handleStartMatch = (matchId) => {
    navigate(`/matches/${matchId}`);
  };

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.round_number;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!tournament) {
    return <div className="p-6">Tournament not found</div>;
  }

  return (
    <div className="p-6 space-y-6" data-testid="tournament-detail-page">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => navigate('/tournaments')} className="w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournaments
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
              tournament.sport === 'table_tennis' ? 'bg-table-tennis/20' : 'bg-badminton/20'
            }`}>
              <span className="text-3xl">{tournament.sport === 'table_tennis' ? '🏓' : '🏸'}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
                  {tournament.name}
                </h1>
                <Badge className={getStatusColor(tournament.status)}>
                  {formatStatus(tournament.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {formatSport(tournament.sport)} • {formatFormat(tournament.format)} • {formatMatchType(tournament.match_type)}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {tournament.status === 'registration' && participants.length >= 2 && (
              <Button 
                onClick={handleGenerateBracket}
                className="font-bold uppercase tracking-wider"
                data-testid="generate-bracket-btn"
              >
                <Play className="w-4 h-4 mr-2" />
                Generate Bracket
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Start Date</p>
              <p className="font-medium">{new Date(tournament.start_date).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Participants</p>
              <p className="font-medium">{participants.length} / {tournament.max_participants}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Grid3X3 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Matches</p>
              <p className="font-medium">{matches.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Best of</p>
              <p className="font-medium">{tournament.sets_to_win * 2 - 1} sets</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bracket" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="bracket" data-testid="bracket-tab">Bracket</TabsTrigger>
          <TabsTrigger value="participants" data-testid="participants-tab">Participants</TabsTrigger>
          <TabsTrigger value="matches" data-testid="matches-tab">Matches</TabsTrigger>
        </TabsList>

        {/* Bracket Tab */}
        <TabsContent value="bracket" className="mt-4">
          {matches.length > 0 ? (
            <Card className="bg-card border-border/40">
              <CardHeader>
                <CardTitle className="font-heading uppercase">Tournament Bracket</CardTitle>
                <CardDescription>
                  {formatFormat(tournament.format)} format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="flex gap-8 min-w-max pb-4">
                    {Object.keys(matchesByRound).sort((a, b) => a - b).map((round) => (
                      <div key={round} className="min-w-[280px]">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                          Round {round}
                        </h3>
                        <div className="space-y-4">
                          {matchesByRound[round].map((match) => (
                            <div
                              key={match.id}
                              className={`border rounded-lg overflow-hidden ${
                                match.status === 'in_progress' 
                                  ? 'border-primary animate-pulse' 
                                  : 'border-border/40'
                              }`}
                              data-testid={`bracket-match-${match.id}`}
                            >
                              {/* Participant 1 */}
                              <div className={`p-3 flex items-center justify-between ${
                                match.winner_id === match.participant1_id 
                                  ? 'bg-green-500/10' 
                                  : 'bg-muted/30'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {match.winner_id === match.participant1_id && (
                                    <Award className="w-4 h-4 text-green-500" />
                                  )}
                                  <span className={match.winner_id === match.participant1_id ? 'font-semibold' : ''}>
                                    {match.participant1?.name || 'TBD'}
                                  </span>
                                </div>
                                {match.scores && (
                                  <span className="font-teko text-xl">
                                    {match.scores.filter(s => s.participant1_score > s.participant2_score).length}
                                  </span>
                                )}
                              </div>
                              
                              {/* Divider */}
                              <div className="border-t border-border/40" />
                              
                              {/* Participant 2 */}
                              <div className={`p-3 flex items-center justify-between ${
                                match.winner_id === match.participant2_id 
                                  ? 'bg-green-500/10' 
                                  : 'bg-muted/30'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {match.winner_id === match.participant2_id && (
                                    <Award className="w-4 h-4 text-green-500" />
                                  )}
                                  <span className={match.winner_id === match.participant2_id ? 'font-semibold' : ''}>
                                    {match.participant2?.name || 'TBD'}
                                  </span>
                                </div>
                                {match.scores && (
                                  <span className="font-teko text-xl">
                                    {match.scores.filter(s => s.participant2_score > s.participant1_score).length}
                                  </span>
                                )}
                              </div>
                              
                              {/* Action */}
                              {match.participant1_id && match.participant2_id && match.status !== 'completed' && (
                                <div className="p-2 bg-muted/20 border-t border-border/40">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full text-xs"
                                    onClick={() => handleStartMatch(match.id)}
                                    data-testid={`start-match-${match.id}`}
                                  >
                                    {match.status === 'in_progress' ? 'Continue Match' : 'Start Match'}
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border/40">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="mb-2">No bracket generated yet</p>
                <p className="text-sm">Add at least 2 participants and generate the bracket to start</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="mt-4">
          <Card className="bg-card border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading uppercase">Participants</CardTitle>
                <CardDescription>
                  {participants.length} / {tournament.max_participants} registered
                </CardDescription>
              </div>
              {(tournament.status === 'draft' || tournament.status === 'registration') && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="add-participant-btn">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Participant
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="font-heading uppercase">Add Participant</DialogTitle>
                      <DialogDescription>
                        Select a {tournament.match_type === 'singles' ? 'player' : 'team'} to register
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
                        <SelectTrigger data-testid="participant-select">
                          <SelectValue placeholder="Select participant" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableParticipants.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableParticipants.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No available {tournament.match_type === 'singles' ? 'players' : 'teams'} for this sport
                        </p>
                      )}
                      <Button 
                        onClick={handleAddParticipant} 
                        className="w-full"
                        disabled={!selectedParticipant}
                        data-testid="confirm-add-participant"
                      >
                        Add to Tournament
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {participants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {participants.map((participant, idx) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`participant-${participant.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-teko text-lg">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          {participant.players && (
                            <p className="text-xs text-muted-foreground">
                              {participant.players.map(p => p.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      {(tournament.status === 'draft' || tournament.status === 'registration') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="text-muted-foreground hover:text-destructive"
                          data-testid={`remove-participant-${participant.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No participants yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matches Tab */}
        <TabsContent value="matches" className="mt-4">
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase">All Matches</CardTitle>
              <CardDescription>
                {matches.filter(m => m.status === 'completed').length} / {matches.length} completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matches.length > 0 ? (
                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/30 ${
                        match.status === 'in_progress' 
                          ? 'border-primary bg-primary/5' 
                          : match.status === 'completed'
                            ? 'border-border/40 bg-muted/20'
                            : 'border-border/40'
                      }`}
                      onClick={() => match.participant1_id && match.participant2_id && handleStartMatch(match.id)}
                      data-testid={`match-row-${match.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase">Round</p>
                          <p className="font-teko text-2xl">{match.round_number}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={match.winner_id === match.participant1_id ? 'font-semibold text-green-400' : ''}>
                              {match.participant1?.name || 'TBD'}
                            </p>
                          </div>
                          <span className="text-muted-foreground">vs</span>
                          <div className="text-left">
                            <p className={match.winner_id === match.participant2_id ? 'font-semibold text-green-400' : ''}>
                              {match.participant2?.name || 'TBD'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {match.scores && match.scores.length > 0 && (
                          <div className="flex items-center gap-2 font-teko text-xl">
                            <span>{match.scores.filter(s => s.participant1_score > s.participant2_score).length}</span>
                            <span className="text-muted-foreground">-</span>
                            <span>{match.scores.filter(s => s.participant2_score > s.participant1_score).length}</span>
                          </div>
                        )}
                        <Badge className={getStatusColor(match.status)}>
                          {formatStatus(match.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No matches yet. Generate bracket first.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentDetail;
