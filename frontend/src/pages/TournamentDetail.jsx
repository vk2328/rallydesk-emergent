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
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  ArrowLeft, Calendar, MapPin, Users, Trophy, Play, 
  Plus, Settings, Grid3X3, ChevronRight, Trash2, Upload, BarChart3, Monitor, ExternalLink, Layers, Edit,
  UserPlus, UserMinus, Search, Shield, Crown
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
  const [isAddDivisionOpen, setIsAddDivisionOpen] = useState(false);
  
  // Edit dialog states
  const [editingDivision, setEditingDivision] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [editingCompetition, setEditingCompetition] = useState(null);
  
  // Form states
  const [newPlayer, setNewPlayer] = useState({ first_name: '', last_name: '', email: '', sports: [], division_id: '' });
  const [newResource, setNewResource] = useState({ sport: 'table_tennis', count: 1 });
  const [newCompetition, setNewCompetition] = useState({
    name: '', sport: 'table_tennis', format: 'single_elimination', participant_type: 'single', division_id: ''
  });
  const [newDivision, setNewDivision] = useState({ name: '', description: '' });
  
  // Edit form states
  const [editDivisionForm, setEditDivisionForm] = useState({ name: '', description: '' });
  const [editResourceForm, setEditResourceForm] = useState({ name: '', sport: '' });
  const [editCompetitionForm, setEditCompetitionForm] = useState({ name: '', format: '', participant_type: '' });
  
  // Filter states
  const [playerDivisionFilter, setPlayerDivisionFilter] = useState('all');
  
  // Scoring rules states
  const [editingScoringRules, setEditingScoringRules] = useState(null);
  const [scoringRulesForm, setScoringRulesForm] = useState(null);

  // Moderator management states
  const [moderators, setModerators] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // In SaaS mode, if user can see tournament, they have access to manage it
  const isAdmin = true;  // User has access if they can fetch the tournament
  const isOwner = user?.id === ownerId;

  useEffect(() => {
    fetchTournamentData();
    fetchModerators();
  }, [id]);

  const fetchModerators = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/tournaments/${id}/moderators`,
        { headers: getAuthHeader() }
      );
      setModerators(response.data.moderators || []);
      setOwnerId(response.data.owner_id);
    } catch (error) {
      console.error('Failed to fetch moderators');
    }
  };

  const handleSearchUsers = async (query) => {
    setUserSearchQuery(query);
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    
    setSearchingUsers(true);
    try {
      const response = await axios.get(
        `${API_URL}/users/search?q=${encodeURIComponent(query)}`,
        { headers: getAuthHeader() }
      );
      // Filter out existing moderators and owner
      const filtered = response.data.filter(
        u => u.id !== ownerId && !moderators.some(m => m.id === u.id)
      );
      setUserSearchResults(filtered);
    } catch (error) {
      console.error('Failed to search users');
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleAddModerator = async (userId) => {
    try {
      await axios.post(
        `${API_URL}/tournaments/${id}/moderators`,
        { user_id: userId, action: 'add' },
        { headers: getAuthHeader() }
      );
      toast.success('Moderator added');
      fetchModerators();
      setUserSearchQuery('');
      setUserSearchResults([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add moderator');
    }
  };

  const handleRemoveModerator = async (userId) => {
    if (!window.confirm('Remove this moderator?')) return;
    try {
      await axios.post(
        `${API_URL}/tournaments/${id}/moderators`,
        { user_id: userId, action: 'remove' },
        { headers: getAuthHeader() }
      );
      toast.success('Moderator removed');
      fetchModerators();
    } catch (error) {
      toast.error('Failed to remove moderator');
    }
  };

  const handleUpdateScoringRules = async () => {
    if (!editingScoringRules) return;
    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/tournaments/${id}/scoring-rules/${editingScoringRules}`,
        scoringRulesForm,
        { headers: getAuthHeader() }
      );
      toast.success(`Scoring rules updated for ${editingScoringRules.replace('_', ' ')}`);
      setEditingScoringRules(null);
      fetchTournamentData();
    } catch (error) {
      toast.error('Failed to update scoring rules');
    } finally {
      setLoading(false);
    }
  };

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

  const handleAddDivision = async () => {
    try {
      await axios.post(`${API_URL}/tournaments/${id}/divisions`, newDivision, {
        headers: getAuthHeader()
      });
      toast.success('Division created');
      setIsAddDivisionOpen(false);
      setNewDivision({ name: '', description: '' });
      fetchTournamentData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create division');
    }
  };

  const handleDeleteDivision = async (divisionId) => {
    if (!window.confirm('Are you sure you want to delete this division? Players in this division will be unassigned.')) return;
    try {
      // Unassign players from this division first
      await axios.put(`${API_URL}/tournaments/${id}/divisions/${divisionId}/unassign-players`, {}, {
        headers: getAuthHeader()
      }).catch(() => {}); // Ignore if endpoint doesn't exist
      
      await axios.delete(`${API_URL}/tournaments/${id}/divisions/${divisionId}`, {
        headers: getAuthHeader()
      });
      toast.success('Division deleted');
      fetchTournamentData();
    } catch (error) {
      toast.error('Failed to delete division');
    }
  };

  // Update handlers
  const handleEditDivision = (division) => {
    setEditDivisionForm({ name: division.name, description: division.description || '' });
    setEditingDivision(division);
  };

  const handleUpdateDivision = async () => {
    if (!editingDivision) return;
    try {
      await axios.put(
        `${API_URL}/tournaments/${id}/divisions/${editingDivision.id}`,
        editDivisionForm,
        { headers: getAuthHeader() }
      );
      toast.success('Division updated');
      setEditingDivision(null);
      fetchTournamentData();
    } catch (error) {
      toast.error('Failed to update division');
    }
  };

  const handleEditResource = (resource) => {
    setEditResourceForm({ name: resource.name, sport: resource.sport });
    setEditingResource(resource);
  };

  const handleUpdateResource = async () => {
    if (!editingResource) return;
    try {
      await axios.put(
        `${API_URL}/tournaments/${id}/resources/${editingResource.id}`,
        editResourceForm,
        { headers: getAuthHeader() }
      );
      toast.success('Resource updated');
      setEditingResource(null);
      fetchTournamentData();
    } catch (error) {
      toast.error('Failed to update resource');
    }
  };

  const handleEditCompetition = (competition) => {
    setEditCompetitionForm({ 
      name: competition.name, 
      format: competition.format,
      participant_type: competition.participant_type 
    });
    setEditingCompetition(competition);
  };

  const handleUpdateCompetition = async () => {
    if (!editingCompetition) return;
    try {
      await axios.put(
        `${API_URL}/tournaments/${id}/competitions/${editingCompetition.id}`,
        editCompetitionForm,
        { headers: getAuthHeader() }
      );
      toast.success('Competition updated');
      setEditingCompetition(null);
      fetchTournamentData();
    } catch (error) {
      toast.error('Failed to update competition');
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
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/tournaments/${id}/control-desk`)}
              data-testid="control-desk-btn"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Control Desk
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/tournaments/${id}/standings`)}
              data-testid="standings-btn"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Standings
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/tournaments/${id}/board`, '_blank')}
              data-testid="public-board-btn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Public Board
            </Button>
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
          <TabsTrigger value="divisions" data-testid="divisions-tab">Divisions</TabsTrigger>
          <TabsTrigger value="competitions" data-testid="competitions-tab">Competitions</TabsTrigger>
          <TabsTrigger value="players" data-testid="players-tab">Players</TabsTrigger>
          <TabsTrigger value="resources" data-testid="resources-tab">Resources</TabsTrigger>
          <TabsTrigger value="settings" data-testid="settings-tab">Settings</TabsTrigger>
        </TabsList>

        {/* Divisions Tab */}
        <TabsContent value="divisions" className="mt-4">
          <Card className="bg-card border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading uppercase">Divisions</CardTitle>
                <CardDescription>
                  Organize players into categories (e.g., Open, Men's, Women's, Mixed)
                </CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={isAddDivisionOpen} onOpenChange={setIsAddDivisionOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="add-division-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Division
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="font-heading uppercase">Create Division</DialogTitle>
                      <DialogDescription>
                        Create a new division to organize players
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Division Name *</Label>
                        <Input
                          value={newDivision.name}
                          onChange={(e) => setNewDivision({ ...newDivision, name: e.target.value })}
                          placeholder="e.g., Open, Men's, Women's, Mixed, U18"
                          data-testid="division-name-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={newDivision.description}
                          onChange={(e) => setNewDivision({ ...newDivision, description: e.target.value })}
                          placeholder="Optional description for this division"
                          data-testid="division-description-input"
                        />
                      </div>
                      <Button 
                        onClick={handleAddDivision} 
                        className="w-full"
                        disabled={!newDivision.name}
                        data-testid="confirm-add-division"
                      >
                        Create Division
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {divisions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {divisions.map((division) => {
                    const playersInDivision = players.filter(p => p.division_id === division.id);
                    return (
                      <div
                        key={division.id}
                        className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/40"
                        data-testid={`division-${division.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Layers className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{division.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {playersInDivision.length} players
                              </p>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditDivision(division)}
                                className="text-muted-foreground hover:text-primary"
                                data-testid={`edit-division-${division.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteDivision(division.id)}
                                className="text-muted-foreground hover:text-destructive"
                                data-testid={`delete-division-${division.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {division.description && (
                          <p className="text-sm text-muted-foreground mt-2">{division.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No divisions yet</p>
                  <p className="text-sm mt-1">Create divisions like Open, Men's, Women's, Mixed, etc.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                      <div className="grid grid-cols-2 gap-4">
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
                        <div className="space-y-2">
                          <Label>Division</Label>
                          <Select 
                            value={newCompetition.division_id || 'none'} 
                            onValueChange={(v) => setNewCompetition({ ...newCompetition, division_id: v === 'none' ? '' : v })}
                          >
                            <SelectTrigger data-testid="competition-division-select">
                              <SelectValue placeholder="Select division" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Division</SelectItem>
                              {divisions.map((d) => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
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
                  {competitions.map((competition) => {
                    const divisionName = divisions.find(d => d.id === competition.division_id)?.name;
                    return (
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
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{competition.name}</h4>
                            {divisionName && (
                              <Badge variant="outline" className="text-xs">
                                {divisionName}
                              </Badge>
                            )}
                          </div>
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
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCompetition(competition)}
                              className="text-muted-foreground hover:text-primary"
                              data-testid={`edit-competition-${competition.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCompetition(competition.id)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`delete-competition-${competition.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    );
                  })}
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
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate(`/tournaments/${id}/import-players`)}
                    data-testid="import-players-btn"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
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
                      {divisions.length > 0 && (
                        <div className="space-y-2">
                          <Label>Division</Label>
                          <Select 
                            value={newPlayer.division_id || 'none'} 
                            onValueChange={(v) => setNewPlayer({ ...newPlayer, division_id: v === 'none' ? '' : v })}
                          >
                            <SelectTrigger data-testid="player-division-select">
                              <SelectValue placeholder="Select division (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No division</SelectItem>
                              {divisions.map((d) => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
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
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* Division Filter */}
              {divisions.length > 0 && players.length > 0 && (
                <div className="mb-4 flex items-center gap-3">
                  <Label className="text-sm text-muted-foreground">Filter by Division:</Label>
                  <Select value={playerDivisionFilter} onValueChange={setPlayerDivisionFilter}>
                    <SelectTrigger className="w-48" data-testid="player-division-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      <SelectItem value="none">No Division</SelectItem>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {players.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {players
                    .filter(player => {
                      if (playerDivisionFilter === 'all') return true;
                      if (playerDivisionFilter === 'none') return !player.division_id;
                      return player.division_id === playerDivisionFilter;
                    })
                    .map((player, idx) => (
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
                          <div className="flex items-center gap-2">
                            {player.division_name && (
                              <Badge variant="outline" className="text-xs">{player.division_name}</Badge>
                            )}
                            {player.email && (
                              <p className="text-xs text-muted-foreground">{player.email}</p>
                            )}
                          </div>
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
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditResource(resource)}
                                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteResource(resource.id)}
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
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
        <TabsContent value="settings" className="mt-4 space-y-6">
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

          {/* Scoring Rules Card */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase">Scoring Rules</CardTitle>
              <CardDescription>Configure sets and points for each sport</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: 'table_tennis', name: 'Table Tennis', icon: '🏓', defaults: { sets: 3, points: 11 } },
                  { key: 'badminton', name: 'Badminton', icon: '🏸', defaults: { sets: 2, points: 21 } },
                  { key: 'volleyball', name: 'Volleyball', icon: '🏐', defaults: { sets: 3, points: 25 } },
                  { key: 'tennis', name: 'Tennis', icon: '🎾', defaults: { sets: 2, points: 6 } },
                  { key: 'pickleball', name: 'Pickleball', icon: '🥒', defaults: { sets: 2, points: 11 } },
                ].map((sport) => {
                  const rules = tournament.settings?.scoring_rules?.[sport.key] || sport.defaults;
                  return (
                    <div key={sport.key} className="p-4 rounded-lg border border-border/40 bg-muted/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{sport.icon}</span>
                        <h4 className="font-semibold">{sport.name}</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sets to win:</span>
                          <span className="font-medium">{rules.sets_to_win || rules.sets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Points per set:</span>
                          <span className="font-medium">{rules.points_to_win_set || rules.points}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Win by:</span>
                          <span className="font-medium">{rules.points_must_win_by || 2} pts</span>
                        </div>
                        {rules.max_points_per_set && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max points:</span>
                            <span className="font-medium">{rules.max_points_per_set}</span>
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={() => {
                            setEditingScoringRules(sport.key);
                            setScoringRulesForm(rules);
                          }}
                          data-testid={`edit-scoring-${sport.key}`}
                        >
                          <Edit className="w-3 h-3 mr-1" /> Edit Rules
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Team Management / Moderators Card */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Add moderators who can help manage this tournament
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Owner */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tournament Owner</p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{user?.display_name || user?.username}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">Owner</Badge>
                </div>
              </div>

              {/* Moderators List */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Moderators ({moderators.length})
                </p>
                {moderators.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic p-3 border border-dashed rounded-lg text-center">
                    No moderators added yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {moderators.map((mod) => (
                      <div 
                        key={mod.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
                      >
                        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-secondary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{mod.display_name || mod.username}</p>
                          <p className="text-xs text-muted-foreground">{mod.email}</p>
                        </div>
                        <Badge variant="outline">Moderator</Badge>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveModerator(mod.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            data-testid={`remove-moderator-${mod.id}`}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Moderator Search */}
              {isOwner && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Add Moderator</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by username or email..."
                      value={userSearchQuery}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                      className="pl-10"
                      data-testid="moderator-search-input"
                    />
                  </div>
                  
                  {/* Search Results */}
                  {userSearchResults.length > 0 && (
                    <div className="mt-2 border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {userSearchResults.map((u) => (
                        <div 
                          key={u.id} 
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{u.display_name || u.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddModerator(u.id)}
                            data-testid={`add-moderator-${u.id}`}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {userSearchQuery.length >= 2 && userSearchResults.length === 0 && !searchingUsers && (
                    <p className="mt-2 text-sm text-muted-foreground text-center p-3">
                      No users found matching "{userSearchQuery}"
                    </p>
                  )}
                  
                  {searchingUsers && (
                    <p className="mt-2 text-sm text-muted-foreground text-center p-3">
                      Searching...
                    </p>
                  )}
                </div>
              )}

              {/* Permissions Info */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                <p className="text-sm font-medium mb-2">Moderator Permissions</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• View and manage players, teams, and resources</li>
                  <li>• Create and manage competitions and matches</li>
                  <li>• Update match scores and standings</li>
                  <li>• Generate referee access codes</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Only the owner can add/remove moderators and delete the tournament.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scoring Rules Edit Dialog */}
      <Dialog open={!!editingScoringRules} onOpenChange={() => setEditingScoringRules(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Scoring Rules</DialogTitle>
            <DialogDescription>
              Configure the scoring rules for {editingScoringRules?.replace('_', ' ')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sets to Win</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={scoringRulesForm?.sets_to_win || scoringRulesForm?.sets || 2}
                  onChange={(e) => setScoringRulesForm({ ...scoringRulesForm, sets_to_win: parseInt(e.target.value) })}
                  data-testid="scoring-sets-input"
                />
                <p className="text-xs text-muted-foreground">Best of {((scoringRulesForm?.sets_to_win || 2) * 2) - 1}</p>
              </div>
              <div className="space-y-2">
                <Label>Points to Win Set</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={scoringRulesForm?.points_to_win_set || scoringRulesForm?.points || 21}
                  onChange={(e) => setScoringRulesForm({ ...scoringRulesForm, points_to_win_set: parseInt(e.target.value) })}
                  data-testid="scoring-points-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Must Win By</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={scoringRulesForm?.points_must_win_by || 2}
                  onChange={(e) => setScoringRulesForm({ ...scoringRulesForm, points_must_win_by: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Points (Cap)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="No cap"
                  value={scoringRulesForm?.max_points_per_set || ''}
                  onChange={(e) => setScoringRulesForm({ ...scoringRulesForm, max_points_per_set: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
            </div>
            <Button 
              className="w-full" 
              onClick={handleUpdateScoringRules}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Scoring Rules'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Division Dialog */}
      <Dialog open={!!editingDivision} onOpenChange={() => setEditingDivision(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">Edit Division</DialogTitle>
            <DialogDescription>Update division details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Men's Open, Women's U18"
                value={editDivisionForm.name}
                onChange={(e) => setEditDivisionForm({ ...editDivisionForm, name: e.target.value })}
                data-testid="edit-division-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Division description or rules..."
                value={editDivisionForm.description}
                onChange={(e) => setEditDivisionForm({ ...editDivisionForm, description: e.target.value })}
                data-testid="edit-division-description"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleUpdateDivision}
              disabled={!editDivisionForm.name}
              data-testid="save-division-btn"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={!!editingResource} onOpenChange={() => setEditingResource(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">Edit Resource</DialogTitle>
            <DialogDescription>Update court/table details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Court 1, Table A"
                value={editResourceForm.name}
                onChange={(e) => setEditResourceForm({ ...editResourceForm, name: e.target.value })}
                data-testid="edit-resource-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Sport</Label>
              <Select
                value={editResourceForm.sport}
                onValueChange={(value) => setEditResourceForm({ ...editResourceForm, sport: value })}
              >
                <SelectTrigger data-testid="edit-resource-sport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPORTS.map((sport) => (
                    <SelectItem key={sport.value} value={sport.value}>
                      {sport.icon} {sport.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full" 
              onClick={handleUpdateResource}
              disabled={!editResourceForm.name}
              data-testid="save-resource-btn"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Competition Dialog */}
      <Dialog open={!!editingCompetition} onOpenChange={() => setEditingCompetition(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">Edit Competition</DialogTitle>
            <DialogDescription>Update competition details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Singles Championship"
                value={editCompetitionForm.name}
                onChange={(e) => setEditCompetitionForm({ ...editCompetitionForm, name: e.target.value })}
                data-testid="edit-competition-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={editCompetitionForm.format}
                onValueChange={(value) => setEditCompetitionForm({ ...editCompetitionForm, format: value })}
              >
                <SelectTrigger data-testid="edit-competition-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Participant Type</Label>
              <Select
                value={editCompetitionForm.participant_type}
                onValueChange={(value) => setEditCompetitionForm({ ...editCompetitionForm, participant_type: value })}
              >
                <SelectTrigger data-testid="edit-competition-participant-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTICIPANT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full" 
              onClick={handleUpdateCompetition}
              disabled={!editCompetitionForm.name}
              data-testid="save-competition-btn"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentDetail;
