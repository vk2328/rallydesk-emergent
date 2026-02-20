import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatStatus, getStatusColor, formatFormat, formatSport, getSportIcon, SPORTS, FORMATS, PARTICIPANT_TYPES } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, Calendar, MapPin, Users, Trophy, Play, 
  Plus, Settings, Grid3X3, ChevronRight, Trash2
} from 'lucide-react';

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader, user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [resources, setResources] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [isAddCompetitionOpen, setIsAddCompetitionOpen] = useState(false);
  
  // Form states
  const [newPlayer, setNewPlayer] = useState({ first_name: '', last_name: '', email: '', sports: [] });
  const [newResource, setNewResource] = useState({ sport: 'table_tennis', count: 1 });
  const [newCompetition, setNewCompetition] = useState({
    name: '', sport: 'table_tennis', format: 'single_elimination', participant_type: 'single'
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      const [tournamentRes, playersRes, resourcesRes, divisionsRes, competitionsRes] = await Promise.all([
        axios.get(`${API_URL}/tournaments/${id}`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${id}/players`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${id}/resources`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${id}/divisions`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${id}/competitions`, { headers: getAuthHeader() })
      ]);
      
      setTournament(tournamentRes.data);
      setPlayers(playersRes.data);
      setResources(resourcesRes.data);
      setDivisions(divisionsRes.data);
      setCompetitions(competitionsRes.data);
    } catch (error) {
      toast.error('Failed to fetch tournament data');
      navigate('/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    try {
      await axios.post(`${API_URL}/tournaments/${id}/players`, newPlayer, {
        headers: getAuthHeader()
      });
      toast.success('Player added');
      setIsAddPlayerOpen(false);
      setNewPlayer({ first_name: '', last_name: '', email: '', sports: [] });
      fetchTournamentData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add player');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to remove this player?')) return;
    try {
      await axios.delete(`${API_URL}/tournaments/${id}/players/${playerId}`, {
        headers: getAuthHeader()
      });
      toast.success('Player removed');
      fetchTournamentData();
    } catch (error) {
      toast.error('Failed to remove player');
    }
  };

  const handleAddResources = async () => {
    try {
      await axios.post(
        `${API_URL}/tournaments/${id}/resources/bulk-add?sport=${newResource.sport}&count=${newResource.count}`,
        {},
        { headers: getAuthHeader() }
      );
      toast.success(`Added ${newResource.count} resources`);
      setIsAddResourceOpen(false);
      setNewResource({ sport: 'table_tennis', count: 1 });
      fetchTournamentData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add resources');
    }
  };

  const handleDeleteResource = async (resourceId) => {
    try {
      await axios.delete(`${API_URL}/tournaments/${id}/resources/${resourceId}`, {
        headers: getAuthHeader()
      });
      toast.success('Resource deleted');
      fetchTournamentData();
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  const handleAddCompetition = async () => {
    try {
      await axios.post(`${API_URL}/tournaments/${id}/competitions`, newCompetition, {
        headers: getAuthHeader()
      });
      toast.success('Competition created');
      setIsAddCompetitionOpen(false);
      setNewCompetition({ name: '', sport: 'table_tennis', format: 'single_elimination', participant_type: 'single' });
      fetchTournamentData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create competition');
    }
  };

  const handleDeleteCompetition = async (competitionId) => {
    if (!window.confirm('Are you sure you want to delete this competition?')) return;
    try {
      await axios.delete(`${API_URL}/tournaments/${id}/competitions/${competitionId}`, {
        headers: getAuthHeader()
      });
      toast.success('Competition deleted');
      fetchTournamentData();
    } catch (error) {
      toast.error('Failed to delete competition');
    }
  };

  // Group resources by sport
  const resourcesBySport = resources.reduce((acc, r) => {
    if (!acc[r.sport]) acc[r.sport] = [];
    acc[r.sport].push(r);
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
            <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary" />
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
              {tournament.venue && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {tournament.venue}
                </p>
              )}
            </div>
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Players</p>
              <p className="font-medium">{players.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Grid3X3 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Resources</p>
              <p className="font-medium">{resources.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Competitions</p>
              <p className="font-medium">{competitions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="competitions" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="competitions" data-testid="competitions-tab">Competitions</TabsTrigger>
          <TabsTrigger value="players" data-testid="players-tab">Players</TabsTrigger>
          <TabsTrigger value="resources" data-testid="resources-tab">Resources</TabsTrigger>
          <TabsTrigger value="settings" data-testid="settings-tab">Settings</TabsTrigger>
        </TabsList>

        {/* Competitions Tab */}
        <TabsContent value="competitions" className="mt-4">
          <Card className="bg-card border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading uppercase">Competitions</CardTitle>
                <CardDescription>
                  Manage competitions within this tournament
                </CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={isAddCompetitionOpen} onOpenChange={setIsAddCompetitionOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="add-competition-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Competition
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="font-heading uppercase">Create Competition</DialogTitle>
                      <DialogDescription>
                        Set up a new competition event
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Competition Name</Label>
                        <Input
                          value={newCompetition.name}
                          onChange={(e) => setNewCompetition({ ...newCompetition, name: e.target.value })}
                          placeholder="e.g., Men's Singles"
                          data-testid="competition-name-input"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Sport</Label>
                          <Select 
                            value={newCompetition.sport} 
                            onValueChange={(v) => setNewCompetition({ ...newCompetition, sport: v })}
                          >
                            <SelectTrigger data-testid="competition-sport-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SPORTS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.icon} {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Participant Type</Label>
                          <Select 
                            value={newCompetition.participant_type} 
                            onValueChange={(v) => setNewCompetition({ ...newCompetition, participant_type: v })}
                          >
                            <SelectTrigger data-testid="competition-type-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PARTICIPANT_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Format</Label>
                        <Select 
                          value={newCompetition.format} 
                          onValueChange={(v) => setNewCompetition({ ...newCompetition, format: v })}
                        >
                          <SelectTrigger data-testid="competition-format-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FORMATS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        onClick={handleAddCompetition} 
                        className="w-full"
                        disabled={!newCompetition.name}
                        data-testid="confirm-add-competition"
                      >
                        Create Competition
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {competitions.length > 0 ? (
                <div className="space-y-3">
                  {competitions.map((competition) => (
                    <div
                      key={competition.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`competition-${competition.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <span className="text-lg">{getSportIcon(competition.sport)}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{competition.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatSport(competition.sport)} • {formatFormat(competition.format)} • {competition.participant_ids?.length || 0} participants
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(competition.status)}>
                          {formatStatus(competition.status)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/tournaments/${id}/competitions/${competition.id}`)}
                          data-testid={`view-competition-${competition.id}`}
                        >
                          Manage <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCompetition(competition.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`delete-competition-${competition.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No competitions yet</p>
                  <p className="text-sm mt-1">Create competitions for different sports and categories</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Players Tab */}
        <TabsContent value="players" className="mt-4">
          <Card className="bg-card border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading uppercase">Players</CardTitle>
                <CardDescription>
                  {players.length} players registered
                </CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={isAddPlayerOpen} onOpenChange={setIsAddPlayerOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="add-player-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Player
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="font-heading uppercase">Add Player</DialogTitle>
                      <DialogDescription>
                        Register a new player for this tournament
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>First Name *</Label>
                          <Input
                            value={newPlayer.first_name}
                            onChange={(e) => setNewPlayer({ ...newPlayer, first_name: e.target.value })}
                            placeholder="John"
                            data-testid="player-firstname-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input
                            value={newPlayer.last_name}
                            onChange={(e) => setNewPlayer({ ...newPlayer, last_name: e.target.value })}
                            placeholder="Smith"
                            data-testid="player-lastname-input"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newPlayer.email}
                          onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                          placeholder="john@example.com"
                          data-testid="player-email-input"
                        />
                      </div>
                      <Button 
                        onClick={handleAddPlayer} 
                        className="w-full"
                        disabled={!newPlayer.first_name}
                        data-testid="confirm-add-player"
                      >
                        Add Player
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {players.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {players.map((player, idx) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`player-${player.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-teko text-lg">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium">
                            {player.first_name} {player.last_name}
                          </p>
                          {player.email && (
                            <p className="text-xs text-muted-foreground">{player.email}</p>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePlayer(player.id)}
                          className="text-muted-foreground hover:text-destructive"
                          data-testid={`delete-player-${player.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No players yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="mt-4">
          <Card className="bg-card border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading uppercase">Resources</CardTitle>
                <CardDescription>
                  Tables, courts, and playing areas
                </CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={isAddResourceOpen} onOpenChange={setIsAddResourceOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="add-resource-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Resources
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="font-heading uppercase">Add Resources</DialogTitle>
                      <DialogDescription>
                        Add tables or courts for matches
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Sport</Label>
                        <Select 
                          value={newResource.sport} 
                          onValueChange={(v) => setNewResource({ ...newResource, sport: v })}
                        >
                          <SelectTrigger data-testid="resource-sport-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SPORTS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.icon} {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Number to Add</Label>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={newResource.count}
                          onChange={(e) => setNewResource({ ...newResource, count: parseInt(e.target.value) || 1 })}
                          data-testid="resource-count-input"
                        />
                      </div>
                      <Button 
                        onClick={handleAddResources} 
                        className="w-full"
                        data-testid="confirm-add-resources"
                      >
                        Add {newResource.count} {newResource.sport === 'table_tennis' ? 'Tables' : 'Courts'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {resources.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(resourcesBySport).map(([sport, sportResources]) => (
                    <div key={sport}>
                      <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <span>{getSportIcon(sport)}</span>
                        {formatSport(sport)} ({sportResources.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {sportResources.map((resource) => (
                          <div
                            key={resource.id}
                            className={`p-3 rounded-lg border transition-colors ${
                              resource.current_match_id 
                                ? 'border-red-500 bg-red-500/10' 
                                : resource.locked 
                                  ? 'border-yellow-500 bg-yellow-500/10'
                                  : 'border-border/40 bg-muted/30'
                            }`}
                            data-testid={`resource-${resource.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{resource.label}</span>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteResource(resource.id)}
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {resource.current_match_id ? 'In Use' : resource.locked ? 'Locked' : 'Available'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No resources yet</p>
                  <p className="text-sm mt-1">Add tables or courts for matches</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase">Tournament Settings</CardTitle>
              <CardDescription>Configuration and scheduling settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Min Rest Between Matches</p>
                  <p className="font-medium">{tournament.settings?.min_rest_minutes || 10} minutes</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Buffer Time</p>
                  <p className="font-medium">{tournament.settings?.buffer_minutes || 5} minutes</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scorekeeper Can Assign Matches</p>
                <p className="font-medium">{tournament.settings?.scorekeeper_can_assign ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Default Match Durations</p>
                <div className="flex flex-wrap gap-2">
                  {tournament.settings?.default_duration_minutes && Object.entries(tournament.settings.default_duration_minutes).map(([sport, duration]) => (
                    <Badge key={sport} variant="outline">
                      {getSportIcon(sport)} {duration} min
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentDetail;
