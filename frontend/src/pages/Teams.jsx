import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatSport, getSportColor } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2, Users, Target, Search } from 'lucide-react';

const Teams = () => {
  const { getAuthHeader } = useAuth();
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    sport: 'table_tennis',
    player_ids: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, playersRes] = await Promise.all([
        axios.get(`${API_URL}/teams`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/players`, { headers: getAuthHeader() })
      ]);
      setTeams(teamsRes.data);
      setPlayers(playersRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.player_ids.length < 2) {
      toast.error('A team needs at least 2 players');
      return;
    }
    try {
      await axios.post(`${API_URL}/teams`, formData, {
        headers: getAuthHeader()
      });
      toast.success('Team created successfully');
      setIsDialogOpen(false);
      setFormData({ name: '', sport: 'table_tennis', player_ids: [] });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create team');
    }
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    try {
      await axios.delete(`${API_URL}/teams/${teamId}`, {
        headers: getAuthHeader()
      });
      toast.success('Team deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  const togglePlayer = (playerId) => {
    setFormData(prev => ({
      ...prev,
      player_ids: prev.player_ids.includes(playerId)
        ? prev.player_ids.filter(id => id !== playerId)
        : [...prev.player_ids, playerId]
    }));
  };

  const availablePlayers = players.filter(p => p.sport === formData.sport);

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = sportFilter === 'all' || team.sport === sportFilter;
    return matchesSearch && matchesSport;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="teams-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
            Teams
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage doubles teams for tournaments
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold uppercase tracking-wider" data-testid="add-team-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading uppercase">Create New Team</DialogTitle>
              <DialogDescription>
                Form a doubles team by selecting players
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name *</Label>
                <Input
                  id="team-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Thunder Duo"
                  data-testid="team-name-input"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-sport">Sport *</Label>
                <Select 
                  value={formData.sport} 
                  onValueChange={(v) => setFormData({ ...formData, sport: v, player_ids: [] })}
                >
                  <SelectTrigger data-testid="team-sport-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table_tennis">🏓 Table Tennis</SelectItem>
                    <SelectItem value="badminton">🏸 Badminton</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Players (min 2)</Label>
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-2 bg-background/30">
                  {availablePlayers.length > 0 ? (
                    availablePlayers.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                        onClick={() => togglePlayer(player.id)}
                      >
                        <Checkbox
                          checked={formData.player_ids.includes(player.id)}
                          onCheckedChange={() => togglePlayer(player.id)}
                        />
                        <span className="flex-1">{player.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {player.skill_level}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-muted-foreground text-sm">
                      No players available for this sport. Add players first.
                    </p>
                  )}
                </div>
                {formData.player_ids.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {formData.player_ids.length} player(s) selected
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full font-bold uppercase" 
                disabled={formData.player_ids.length < 2}
                data-testid="team-submit-btn"
              >
                Create Team
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
                data-testid="team-search"
              />
            </div>
            <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="team-sport-filter">
                <SelectValue placeholder="Filter by sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="table_tennis">🏓 Table Tennis</SelectItem>
                <SelectItem value="badminton">🏸 Badminton</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => (
            <Card 
              key={team.id} 
              className="bg-card border-border/40 hover:border-primary/50 transition-colors"
              data-testid={`team-card-${team.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      team.sport === 'table_tennis' ? 'bg-table-tennis/20' : 'bg-badminton/20'
                    }`}>
                      <span className="text-xl">{team.sport === 'table_tennis' ? '🏓' : '🏸'}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <p className={`text-sm ${getSportColor(team.sport)}`}>
                        {formatSport(team.sport)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(team.id)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`delete-team-${team.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Team Members */}
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2">
                      Members
                    </p>
                    <div className="space-y-1">
                      {team.players?.map((player) => (
                        <div key={player.id} className="flex items-center gap-2 text-sm">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          {player.name}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-4 pt-2 border-t border-border/40">
                    <div className="text-center">
                      <p className="font-teko text-2xl text-green-400">{team.wins}</p>
                      <p className="text-xs text-muted-foreground">Wins</p>
                    </div>
                    <div className="text-center">
                      <p className="font-teko text-2xl text-red-400">{team.losses}</p>
                      <p className="text-xs text-muted-foreground">Losses</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border/40">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-4">No teams found</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              Create your first team
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Teams;
