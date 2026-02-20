import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatSport, getSportColor } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Users, Trophy, Target, Search, Upload, Download, FileSpreadsheet } from 'lucide-react';

const Players = () => {
  const { getAuthHeader } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    sport: 'table_tennis',
    skill_level: 'intermediate'
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API_URL}/players`, {
        headers: getAuthHeader()
      });
      setPlayers(response.data);
    } catch (error) {
      toast.error('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlayer) {
        await axios.put(`${API_URL}/players/${editingPlayer.id}`, formData, {
          headers: getAuthHeader()
        });
        toast.success('Player updated successfully');
      } else {
        await axios.post(`${API_URL}/players`, formData, {
          headers: getAuthHeader()
        });
        toast.success('Player created successfully');
      }
      setIsDialogOpen(false);
      setEditingPlayer(null);
      setFormData({ name: '', email: '', phone: '', sport: 'table_tennis', skill_level: 'intermediate' });
      fetchPlayers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      email: player.email || '',
      phone: player.phone || '',
      sport: player.sport,
      skill_level: player.skill_level
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (playerId) => {
    if (!window.confirm('Are you sure you want to delete this player?')) return;
    try {
      await axios.delete(`${API_URL}/players/${playerId}`, {
        headers: getAuthHeader()
      });
      toast.success('Player deleted');
      fetchPlayers();
    } catch (error) {
      toast.error('Failed to delete player');
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (player.email && player.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSport = sportFilter === 'all' || player.sport === sportFilter;
    return matchesSearch && matchesSport;
  });

  const getSkillBadgeColor = (level) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'advanced': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'pro': return 'bg-table-tennis/20 text-table-tennis border-table-tennis/30';
      default: return 'bg-zinc-700 text-zinc-300';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="players-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
            Players
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your tournament players
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingPlayer(null);
            setFormData({ name: '', email: '', phone: '', sport: 'table_tennis', skill_level: 'intermediate' });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="font-bold uppercase tracking-wider" data-testid="add-player-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-heading uppercase">
                {editingPlayer ? 'Edit Player' : 'Add New Player'}
              </DialogTitle>
              <DialogDescription>
                {editingPlayer ? 'Update player information' : 'Register a new player'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="player-name-input"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="player-email-input"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="player-phone-input"
                  className="bg-background/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport *</Label>
                  <Select value={formData.sport} onValueChange={(v) => setFormData({ ...formData, sport: v })}>
                    <SelectTrigger data-testid="player-sport-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table_tennis">🏓 Table Tennis</SelectItem>
                      <SelectItem value="badminton">🏸 Badminton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skill">Skill Level</Label>
                  <Select value={formData.skill_level} onValueChange={(v) => setFormData({ ...formData, skill_level: v })}>
                    <SelectTrigger data-testid="player-skill-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full font-bold uppercase" data-testid="player-submit-btn">
                {editingPlayer ? 'Update Player' : 'Add Player'}
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
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
                data-testid="player-search"
              />
            </div>
            <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="player-sport-filter">
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

      {/* Players Table */}
      <Card className="bg-card border-border/40">
        <CardHeader>
          <CardTitle className="font-heading uppercase flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Players ({filteredPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPlayers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead>Player</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead className="text-center">W</TableHead>
                    <TableHead className="text-center">L</TableHead>
                    <TableHead className="text-center">Played</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow key={player.id} className="border-border/40" data-testid={`player-row-${player.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{player.name}</p>
                          {player.email && (
                            <p className="text-sm text-muted-foreground">{player.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`${getSportColor(player.sport)} font-medium`}>
                          {player.sport === 'table_tennis' ? '🏓' : '🏸'} {formatSport(player.sport)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSkillBadgeColor(player.skill_level)}>
                          {player.skill_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-teko text-2xl text-green-400">
                        {player.wins}
                      </TableCell>
                      <TableCell className="text-center font-teko text-2xl text-red-400">
                        {player.losses}
                      </TableCell>
                      <TableCell className="text-center font-teko text-2xl">
                        {player.matches_played}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(player)}
                            data-testid={`edit-player-${player.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(player.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`delete-player-${player.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-4">No players found</p>
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                Add your first player
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Players;
