import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatStatus, getStatusColor } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trophy, Calendar, MapPin, ArrowRight, Trash2 } from 'lucide-react';

const TournamentList = () => {
  const { getAuthHeader, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    start_date: '',
    end_date: '',
    description: ''
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await axios.get(`${API_URL}/tournaments`, {
        headers: getAuthHeader()
      });
      setTournaments(response.data);
    } catch (error) {
      toast.error('Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await axios.post(`${API_URL}/tournaments`, formData, {
        headers: getAuthHeader()
      });
      toast.success('Tournament created!');
      setIsCreateOpen(false);
      setFormData({ name: '', venue: '', start_date: '', end_date: '', description: '' });
      navigate(`/tournaments/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, tournamentId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this tournament and all its data?')) return;
    try {
      await axios.delete(`${API_URL}/tournaments/${tournamentId}`, {
        headers: getAuthHeader()
      });
      toast.success('Tournament deleted');
      fetchTournaments();
    } catch (error) {
      toast.error('Failed to delete tournament');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="tournaments-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
            Tournaments
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a tournament to manage
          </p>
        </div>
        {isAdmin() && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="font-bold uppercase tracking-wider" data-testid="create-tournament-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Tournament
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading uppercase">Create Tournament</DialogTitle>
                <DialogDescription>Set up a new tournament event</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tournament Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Summer Championship 2026"
                    data-testid="tournament-name-input"
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="Sports Center"
                    className="bg-background/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="bg-background/50"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full font-bold uppercase" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Tournament'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <Link key={tournament.id} to={`/tournaments/${tournament.id}`}>
              <Card 
                className="bg-card border-border/40 hover:border-primary/50 transition-all h-full group cursor-pointer"
                data-testid={`tournament-card-${tournament.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(tournament.status)}>
                        {formatStatus(tournament.status)}
                      </Badge>
                      {isAdmin() && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(e, tournament.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardTitle className="mt-3 text-xl group-hover:text-primary transition-colors">
                    {tournament.name}
                  </CardTitle>
                  <CardDescription>
                    {tournament.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {tournament.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {tournament.venue}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(tournament.start_date).toLocaleDateString()}
                      {tournament.end_date && ` - ${new Date(tournament.end_date).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex justify-end pt-3">
                    <span className="text-sm text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                      Open Dashboard <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border/40">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-4">No tournaments yet</p>
            {isAdmin() && (
              <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
                Create your first tournament
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TournamentList;
