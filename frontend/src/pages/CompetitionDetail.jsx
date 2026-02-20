import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatStatus, getStatusColor, formatFormat, getSportIcon, getPlayerName } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, Users, Trophy, Play, Plus, Grid3X3, 
  Award, ChevronRight, X, RefreshCw, Swords, Settings2,
  ArrowUpDown, GripVertical, Check, Shuffle
} from 'lucide-react';

const CompetitionDetail = () => {
  const { tournamentId, competitionId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader, user } = useAuth();
  const [competition, setCompetition] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [generating, setGenerating] = useState(false);
  
  // Draw management state
  const [isDrawOptionsOpen, setIsDrawOptionsOpen] = useState(false);
  const [seedingOption, setSeedingOption] = useState('random');
  const [manualSeedOrder, setManualSeedOrder] = useState([]);
  const [isEditBracketMode, setIsEditBracketMode] = useState(false);
  const [selectedMatchForSwap, setSelectedMatchForSwap] = useState(null);
  const [bracketData, setBracketData] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, [tournamentId, competitionId]);

  const fetchData = async () => {
    try {
      const [compRes, participantsRes, matchesRes, playersRes, teamsRes] = await Promise.all([
        axios.get(`${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/participants`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/matches`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${tournamentId}/players`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${tournamentId}/teams`, { headers: getAuthHeader() })
      ]);
      
      setCompetition(compRes.data);
      setParticipants(participantsRes.data);
      setMatches(matchesRes.data);
      
      // Filter available players/teams not already registered
      const registeredIds = new Set(participantsRes.data.map(p => p.id));
      setAvailablePlayers(playersRes.data.filter(p => !registeredIds.has(p.id)));
      setAvailableTeams(teamsRes.data.filter(t => !registeredIds.has(t.id)));
      
      // Set initial manual seed order
      setManualSeedOrder(participantsRes.data.map(p => p.id));
      
      // Fetch bracket data if draw is generated
      if (compRes.data.status !== 'draft') {
        try {
          const bracketRes = await axios.get(
            `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/bracket`,
            { headers: getAuthHeader() }
          );
          setBracketData(bracketRes.data);
        } catch (e) {
          // Bracket endpoint might not exist for older data
        }
      }
    } catch (error) {
      toast.error('Failed to load competition data');
      navigate(`/tournaments/${tournamentId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipants = async () => {
    if (selectedParticipants.length === 0) return;
    try {
      await axios.post(
        `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/participants/bulk`,
        selectedParticipants,
        { headers: getAuthHeader() }
      );
      toast.success(`Added ${selectedParticipants.length} participants`);
      setIsAddParticipantOpen(false);
      setSelectedParticipants([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add participants');
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    try {
      await axios.delete(
        `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/participants/${participantId}`,
        { headers: getAuthHeader() }
      );
      toast.success('Participant removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove participant');
    }
  };

  const handleGenerateDraw = async () => {
    if (participants.length < 2) {
      toast.error('Need at least 2 participants to generate draw');
      return;
    }
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/generate-draw-advanced`,
        {
          seeding: seedingOption,
          seed_order: seedingOption === 'manual' ? manualSeedOrder : null
        },
        { headers: getAuthHeader() }
      );
      toast.success(response.data.message);
      setIsDrawOptionsOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate draw');
    } finally {
      setGenerating(false);
    }
  };

  const handleSwapParticipants = async (match1Id, match2Id, swapType) => {
    try {
      await axios.post(
        `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/swap-participants`,
        { match1_id: match1Id, match2_id: match2Id, swap_type: swapType },
        { headers: getAuthHeader() }
      );
      toast.success('Participants swapped');
      setSelectedMatchForSwap(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to swap participants');
    }
  };

  const handleAdvanceWinner = async (matchId, winnerId) => {
    try {
      await axios.post(
        `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/advance-winner`,
        { match_id: matchId, winner_id: winnerId },
        { headers: getAuthHeader() }
      );
      toast.success('Winner advanced to next round');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to advance winner');
    }
  };

  const moveSeedUp = (idx) => {
    if (idx === 0) return;
    const newOrder = [...manualSeedOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setManualSeedOrder(newOrder);
  };

  const moveSeedDown = (idx) => {
    if (idx === manualSeedOrder.length - 1) return;
    const newOrder = [...manualSeedOrder];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setManualSeedOrder(newOrder);
  };

  const getParticipantName = (participantId) => {
    if (!participantId) return 'TBD';
    const player = participants.find(p => p.id === participantId);
    if (player) {
      return `${player.first_name || ''} ${player.last_name || ''}`.trim() || player.name || 'Unknown';
    }
    return bracketData?.participants?.[participantId]?.name || 'Unknown';
  };

  const handleResetDraw = async () => {
    if (!window.confirm('Are you sure? This will delete all matches.')) return;
    try {
      await axios.post(
        `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/reset-draw`,
        {},
        { headers: getAuthHeader() }
      );
      toast.success('Draw reset');
      fetchData();
    } catch (error) {
      toast.error('Failed to reset draw');
    }
  };

  const toggleParticipant = (id) => {
    setSelectedParticipants(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.round_number;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  // Group matches by group (for group stage)
  const matchesByGroup = matches.reduce((acc, match) => {
    const group = match.group_number || 0;
    if (!acc[group]) acc[group] = [];
    acc[group].push(match);
    return acc;
  }, {});

  const availableList = competition?.participant_type === 'single' ? availablePlayers : availableTeams;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!competition) {
    return <div className="p-6">Competition not found</div>;
  }

  return (
    <div className="p-6 space-y-6" data-testid="competition-detail-page">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => navigate(`/tournaments/${tournamentId}`)} className="w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournament
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="text-3xl">{getSportIcon(competition.sport)}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
                  {competition.name}
                </h1>
                <Badge className={getStatusColor(competition.status)}>
                  {formatStatus(competition.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {formatFormat(competition.format)} • {competition.participant_type === 'single' ? 'Singles' : competition.participant_type === 'pair' ? 'Doubles' : 'Teams'}
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <div className="flex gap-2">
              {competition.status === 'draft' && participants.length >= 2 && (
                <Dialog open={isDrawOptionsOpen} onOpenChange={setIsDrawOptionsOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="font-bold uppercase tracking-wider"
                      data-testid="generate-draw-btn"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Generate Draw
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-heading uppercase">Draw Options</DialogTitle>
                      <DialogDescription>
                        Configure seeding and generate the competition bracket
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      {/* Seeding Options */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Seeding Method</Label>
                        <div className="grid grid-cols-3 gap-3">
                          <Button
                            variant={seedingOption === 'random' ? 'default' : 'outline'}
                            className="flex flex-col h-auto py-4"
                            onClick={() => setSeedingOption('random')}
                          >
                            <Shuffle className="w-5 h-5 mb-2" />
                            <span className="text-sm">Random</span>
                          </Button>
                          <Button
                            variant={seedingOption === 'rating' ? 'default' : 'outline'}
                            className="flex flex-col h-auto py-4"
                            onClick={() => setSeedingOption('rating')}
                          >
                            <Trophy className="w-5 h-5 mb-2" />
                            <span className="text-sm">By Rating</span>
                          </Button>
                          <Button
                            variant={seedingOption === 'manual' ? 'default' : 'outline'}
                            className="flex flex-col h-auto py-4"
                            onClick={() => setSeedingOption('manual')}
                          >
                            <GripVertical className="w-5 h-5 mb-2" />
                            <span className="text-sm">Manual</span>
                          </Button>
                        </div>
                      </div>

                      {/* Manual Seed Order */}
                      {seedingOption === 'manual' && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Seed Order (drag to reorder)</Label>
                          <ScrollArea className="h-64 border border-border rounded-lg p-2">
                            {manualSeedOrder.map((participantId, idx) => {
                              const p = participants.find(p => p.id === participantId);
                              const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.name : 'Unknown';
                              return (
                                <div
                                  key={participantId}
                                  className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 group"
                                >
                                  <span className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center font-bold text-sm">
                                    {idx + 1}
                                  </span>
                                  <span className="flex-1">{name}</span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => moveSeedUp(idx)}
                                      disabled={idx === 0}
                                    >
                                      <ArrowUpDown className="w-4 h-4 rotate-180" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => moveSeedDown(idx)}
                                      disabled={idx === manualSeedOrder.length - 1}
                                    >
                                      <ArrowUpDown className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </ScrollArea>
                        </div>
                      )}

                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsDrawOptionsOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleGenerateDraw}
                          disabled={generating}
                          data-testid="confirm-generate-draw"
                        >
                          {generating ? 'Generating...' : 'Generate Draw'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {competition.status !== 'draft' && (
                <>
                  <Button 
                    variant={isEditBracketMode ? 'default' : 'outline'}
                    onClick={() => setIsEditBracketMode(!isEditBracketMode)}
                    data-testid="edit-bracket-btn"
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    {isEditBracketMode ? 'Done Editing' : 'Edit Bracket'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleResetDraw}
                    data-testid="reset-draw-btn"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Draw
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Participants</p>
              <p className="font-medium">{participants.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Swords className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Matches</p>
              <p className="font-medium">{matches.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Completed</p>
              <p className="font-medium">{matches.filter(m => m.status === 'completed').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Grid3X3 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Sets to Win</p>
              <p className="font-medium">{competition.scoring_rules?.sets_to_win || 3}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bracket" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="bracket" data-testid="bracket-tab">Bracket</TabsTrigger>
          <TabsTrigger value="participants" data-testid="participants-tab">Participants</TabsTrigger>
          <TabsTrigger value="matches" data-testid="matches-tab">All Matches</TabsTrigger>
        </TabsList>

        {/* Bracket Tab */}
        <TabsContent value="bracket" className="mt-4">
          {matches.length > 0 ? (
            <Card className="bg-card border-border/40">
              <CardHeader>
                <CardTitle className="font-heading uppercase">Tournament Bracket</CardTitle>
                <CardDescription>{formatFormat(competition.format)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="flex gap-8 min-w-max pb-4">
                    {Object.keys(matchesByRound).sort((a, b) => a - b).map((round) => (
                      <div key={round} className="min-w-[300px]">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                          {round > 100 ? `Knockout R${round - 100}` : `Round ${round}`}
                        </h3>
                        <div className="space-y-4">
                          {matchesByRound[round].map((match) => (
                            <div
                              key={match.id}
                              className={`border rounded-lg overflow-hidden transition-colors ${
                                match.status === 'live' ? 'border-red-500 animate-pulse' : 
                                selectedMatchForSwap?.id === match.id ? 'border-primary ring-2 ring-primary' :
                                isEditBracketMode && selectedMatchForSwap ? 'border-primary/50 cursor-pointer hover:border-primary' :
                                'border-border/40 cursor-pointer hover:border-primary/50'
                              }`}
                              onClick={() => {
                                if (isEditBracketMode && selectedMatchForSwap && selectedMatchForSwap.id !== match.id) {
                                  // Swap with selected match
                                  handleSwapParticipants(selectedMatchForSwap.id, match.id, 'both');
                                } else if (isEditBracketMode) {
                                  // Select this match for swapping
                                  setSelectedMatchForSwap(match);
                                } else if (match.participant1_id && match.participant2_id) {
                                  navigate(`/tournaments/${tournamentId}/matches/${match.id}`);
                                }
                              }}
                              data-testid={`bracket-match-${match.id}`}
                            >
                              {/* Edit Mode Header */}
                              {isEditBracketMode && (
                                <div className="px-3 py-1.5 bg-primary/10 border-b border-border/40 flex items-center justify-between">
                                  <span className="text-xs font-medium text-primary">
                                    {selectedMatchForSwap?.id === match.id ? 'Selected - Click another match to swap' : 'Click to select'}
                                  </span>
                                  {selectedMatchForSwap?.id === match.id && (
                                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={(e) => { e.stopPropagation(); setSelectedMatchForSwap(null); }}>
                                      <X className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                              
                              {/* Participant 1 */}
                              <div className={`p-3 flex items-center justify-between ${
                                match.winner_id === match.participant1_id ? 'bg-green-500/10' : 'bg-muted/30'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {match.seed1 && <span className="text-xs text-muted-foreground">[{match.seed1}]</span>}
                                  {match.winner_id === match.participant1_id && (
                                    <Award className="w-4 h-4 text-green-500" />
                                  )}
                                  <span className={match.winner_id === match.participant1_id ? 'font-semibold' : ''}>
                                    {match.participant1?.name || getParticipantName(match.participant1_id)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {match.scores?.length > 0 && (
                                    <span className="font-teko text-xl">
                                      {match.scores.filter(s => s.score1 > s.score2).length}
                                    </span>
                                  )}
                                  {/* Manual advance button */}
                                  {isEditBracketMode && match.participant1_id && match.participant2_id && match.status !== 'completed' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={(e) => { e.stopPropagation(); handleAdvanceWinner(match.id, match.participant1_id); }}
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              <div className="border-t border-border/40" />
                              
                              {/* Participant 2 */}
                              <div className={`p-3 flex items-center justify-between ${
                                match.winner_id === match.participant2_id ? 'bg-green-500/10' : 'bg-muted/30'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {match.seed2 && <span className="text-xs text-muted-foreground">[{match.seed2}]</span>}
                                  {match.winner_id === match.participant2_id && (
                                    <Award className="w-4 h-4 text-green-500" />
                                  )}
                                  <span className={match.winner_id === match.participant2_id ? 'font-semibold' : ''}>
                                    {match.participant2?.name || getParticipantName(match.participant2_id)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {match.scores?.length > 0 && (
                                    <span className="font-teko text-xl">
                                      {match.scores.filter(s => s.score2 > s.score1).length}
                                    </span>
                                  )}
                                  {/* Manual advance button */}
                                  {isEditBracketMode && match.participant1_id && match.participant2_id && match.status !== 'completed' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={(e) => { e.stopPropagation(); handleAdvanceWinner(match.id, match.participant2_id); }}
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Match action */}
                              {!isEditBracketMode && match.participant1_id && match.participant2_id && match.status !== 'completed' && (
                                <div className="p-2 bg-muted/20 border-t border-border/40">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/tournaments/${tournamentId}/matches/${match.id}`);
                                    }}
                                  >
                                    {match.status === 'live' ? 'Continue Match' : 'Start Match'}
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
                
                {/* Edit Mode Instructions */}
                {isEditBracketMode && (
                  <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <h4 className="font-medium mb-2">Edit Mode Active</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Click a match to select it, then click another match to swap all participants</li>
                      <li>• Click the checkmark (✓) next to a player to manually advance them as winner</li>
                      <li>• Click "Done Editing" when finished</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border/40">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="mb-2">No bracket generated yet</p>
                <p className="text-sm">Add at least 2 participants and generate the draw</p>
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
                <CardDescription>{participants.length} registered</CardDescription>
              </div>
              {isAdmin && competition.status === 'draft' && (
                <Dialog open={isAddParticipantOpen} onOpenChange={setIsAddParticipantOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="add-participant-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Participants
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="font-heading uppercase">Add Participants</DialogTitle>
                      <DialogDescription>
                        Select {competition.participant_type === 'single' ? 'players' : 'teams'} to add
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-2">
                        {availableList.length > 0 ? availableList.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleParticipant(item.id)}
                          >
                            <Checkbox
                              checked={selectedParticipants.includes(item.id)}
                              onCheckedChange={() => toggleParticipant(item.id)}
                            />
                            <span>{item.name || `${item.first_name} ${item.last_name}`}</span>
                          </div>
                        )) : (
                          <p className="text-center text-muted-foreground py-4">
                            No available {competition.participant_type === 'single' ? 'players' : 'teams'}
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                    <Button 
                      onClick={handleAddParticipants} 
                      className="w-full"
                      disabled={selectedParticipants.length === 0}
                      data-testid="confirm-add-participants"
                    >
                      Add {selectedParticipants.length} Participants
                    </Button>
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
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      data-testid={`participant-${participant.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-teko text-lg">
                          {idx + 1}
                        </span>
                        <span className="font-medium">
                          {participant.name || `${participant.first_name || ''} ${participant.last_name || ''}`.trim()}
                        </span>
                      </div>
                      {isAdmin && competition.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="text-muted-foreground hover:text-destructive"
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

        {/* All Matches Tab */}
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
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${
                        match.status === 'live' ? 'border-red-500 bg-red-500/5' : 
                        match.status === 'completed' ? 'border-border/40 bg-muted/20' : 'border-border/40'
                      }`}
                      onClick={() => match.participant1_id && match.participant2_id && navigate(`/tournaments/${tournamentId}/matches/${match.id}`)}
                      data-testid={`match-row-${match.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs text-muted-foreground uppercase">
                            {match.group_number ? `G${match.group_number}` : `R${match.round_number}`}
                          </p>
                          <p className="font-teko text-xl">M{match.match_number}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={match.winner_id === match.participant1_id ? 'font-semibold text-green-400' : ''}>
                            {match.participant1?.name || getPlayerName(match.participant1) || 'TBD'}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className={match.winner_id === match.participant2_id ? 'font-semibold text-green-400' : ''}>
                            {match.participant2?.name || getPlayerName(match.participant2) || 'TBD'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {match.scores?.length > 0 && (
                          <div className="flex items-center gap-2 font-teko text-xl">
                            <span>{match.scores.filter(s => s.score1 > s.score2).length}</span>
                            <span className="text-muted-foreground">-</span>
                            <span>{match.scores.filter(s => s.score2 > s.score1).length}</span>
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
                  <Swords className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No matches yet. Generate draw first.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompetitionDetail;
