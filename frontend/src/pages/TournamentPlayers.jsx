import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, SPORTS, getSportIcon, getPlayerName } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Users, Search, Upload, Download, FileSpreadsheet, CheckSquare } from 'lucide-react';

const TournamentPlayers = () => {
  const { tournamentId } = useParams();
  const { tournament } = useOutletContext();
  const { getAuthHeader, isAdmin } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    age: '',
    skill_level: 'intermediate',
    sports: [],
    rating: '',
    team_name: '',
    club: ''
  });

  useEffect(() => {
    fetchPlayers();
  }, [tournamentId, sportFilter]);

  const fetchPlayers = async () => {
    try {
      const params = sportFilter !== 'all' ? `?sport=${sportFilter}` : '';
      const response = await axios.get(`${API_URL}/tournaments/${tournamentId}/players${params}`, {
        headers: getAuthHeader()
      });
      setPlayers(response.data);
    } catch (error) {
      toast.error('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '', last_name: '', email: '', phone: '', gender: '',
      age: '', skill_level: 'intermediate', sports: [], rating: '', team_name: '', club: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        rating: formData.rating ? parseInt(formData.rating) : null,
      };
      
      if (editingPlayer) {
        await axios.put(`${API_URL}/tournaments/${tournamentId}/players/${editingPlayer.id}`, payload, {
          headers: getAuthHeader()
        });
        toast.success('Player updated');
      } else {
        await axios.post(`${API_URL}/tournaments/${tournamentId}/players`, payload, {
          headers: getAuthHeader()
        });
        toast.success('Player created');
      }
      setIsDialogOpen(false);
      setEditingPlayer(null);
      resetForm();
      fetchPlayers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setFormData({
      first_name: player.first_name || '',
      last_name: player.last_name || '',
      email: player.email || '',
      phone: player.phone || '',
      gender: player.gender || '',
      age: player.age?.toString() || '',
      skill_level: player.skill_level || 'intermediate',
      sports: player.sports || [],
      rating: player.rating?.toString() || '',
      team_name: player.team_name || '',
      club: player.club || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (playerId) => {
    if (!window.confirm('Delete this player?')) return;
    try {
      await axios.delete(`${API_URL}/tournaments/${tournamentId}/players/${playerId}`, {
        headers: getAuthHeader()
      });
      toast.success('Player deleted');
      fetchPlayers();
    } catch (error) {
      toast.error('Failed to delete player');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPlayers.length === 0) return;
    if (!window.confirm(`Delete ${selectedPlayers.length} selected players?`)) return;
    try {
      await axios.post(`${API_URL}/tournaments/${tournamentId}/players/bulk-delete`, selectedPlayers, {
        headers: getAuthHeader()
      });
      toast.success(`Deleted ${selectedPlayers.length} players`);
      setSelectedPlayers([]);
      fetchPlayers();
    } catch (error) {
      toast.error('Failed to delete players');
    }
  };

  const toggleSelectPlayer = (playerId) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPlayers.length === filteredPlayers.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(filteredPlayers.map(p => p.id));
    }
  };

  const handleSportToggle = (sport) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.includes(sport) 
        ? prev.sports.filter(s => s !== sport)
        : [...prev.sports, sport]
    }));
  };

  const handleDownloadSample = async () => {
    try {
      const response = await axios.get(`${API_URL}/tournaments/${tournamentId}/players/csv/sample`, {
        headers: getAuthHeader(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'players_sample.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Sample CSV downloaded');
    } catch (error) {
      toast.error('Failed to download sample');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    
    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    
    try {
      const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/players/csv/upload`, uploadData, {
        headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
      });
      
      const { created, skipped, errors } = response.data;
      if (created > 0) toast.success(`Imported ${created} players`);
      if (skipped > 0) toast.warning(`${skipped} rows skipped`);
      errors?.slice(0, 3).forEach(err => toast.error(err));
      
      setIsUploadDialogOpen(false);
      fetchPlayers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredPlayers = players.filter(player => {
    const name = getPlayerName(player).toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || 
           player.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <div className="p-6"><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="p-6 space-y-6" data-testid="tournament-players">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight uppercase">Players</h1>
          <p className="text-muted-foreground text-sm">Manage tournament players</p>
        </div>
        {isAdmin() && (
          <div className="flex gap-2 flex-wrap">
            {selectedPlayers.length > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete} data-testid="bulk-delete-btn">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedPlayers.length})
              </Button>
            )}
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="upload-csv-btn">
                  <Upload className="w-4 h-4 mr-2" /> Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-heading uppercase">Import Players</DialogTitle>
                  <DialogDescription>Upload CSV to bulk import players</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Select CSV File'}
                    </Button>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">CSV Columns:</p>
                    <p>firstName, lastName, email, phone, gender, age, skillLevel, sports, rating, teamName, club</p>
                    <p className="mt-2">Note: Multiple sports separated by commas create one entry per sport</p>
                  </div>
                  <Button variant="ghost" className="w-full" onClick={handleDownloadSample}>
                    <Download className="w-4 h-4 mr-2" /> Download Sample CSV
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) { setEditingPlayer(null); resetForm(); }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="add-player-btn">
                  <Plus className="w-4 h-4 mr-2" /> Add Player
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading uppercase">
                    {editingPlayer ? 'Edit Player' : 'Add Player'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required className="bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="bg-background/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-background/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Rating</Label>
                      <Input type="number" value={formData.rating} onChange={(e) => setFormData({...formData, rating: e.target.value})} className="bg-background/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Sports</Label>
                    <div className="flex flex-wrap gap-2">
                      {SPORTS.map(sport => (
                        <Badge 
                          key={sport.value}
                          variant={formData.sports.includes(sport.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleSportToggle(sport.value)}
                        >
                          {sport.icon} {sport.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Skill Level</Label>
                      <Select value={formData.skill_level} onValueChange={(v) => setFormData({...formData, skill_level: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Team Name</Label>
                      <Input value={formData.team_name} onChange={(e) => setFormData({...formData, team_name: e.target.value})} className="bg-background/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Club</Label>
                    <Input value={formData.club} onChange={(e) => setFormData({...formData, club: e.target.value})} className="bg-background/50" />
                  </div>
                  <Button type="submit" className="w-full font-bold uppercase">
                    {editingPlayer ? 'Update Player' : 'Add Player'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search players..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-background/50" />
            </div>
            <Tabs value={sportFilter} onValueChange={setSportFilter}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="all">All</TabsTrigger>
                {SPORTS.map(sport => (
                  <TabsTrigger key={sport.value} value={sport.value}>{sport.icon}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
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
                    {isAdmin() && (
                      <TableHead className="w-10">
                        <Checkbox checked={selectedPlayers.length === filteredPlayers.length && filteredPlayers.length > 0} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                    )}
                    <TableHead>Name</TableHead>
                    <TableHead>Sports</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Team/Club</TableHead>
                    {isAdmin() && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow key={player.id} className="border-border/40">
                      {isAdmin() && (
                        <TableCell>
                          <Checkbox checked={selectedPlayers.includes(player.id)} onCheckedChange={() => toggleSelectPlayer(player.id)} />
                        </TableCell>
                      )}
                      <TableCell>
                        <div>
                          <p className="font-medium">{getPlayerName(player)}</p>
                          {player.email && <p className="text-xs text-muted-foreground">{player.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {player.sports?.map(sport => (
                            <span key={sport} title={sport}>{getSportIcon(sport)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{player.gender}</TableCell>
                      <TableCell>{player.age}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{player.skill_level}</Badge>
                      </TableCell>
                      <TableCell>{player.rating}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {player.team_name && <p>{player.team_name}</p>}
                          {player.club && <p className="text-muted-foreground">{player.club}</p>}
                        </div>
                      </TableCell>
                      {isAdmin() && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(player)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(player.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No players found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentPlayers;
