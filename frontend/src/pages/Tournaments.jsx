import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatSport, formatFormat, formatMatchType, formatStatus, getStatusColor } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Search, Trophy, Calendar, Users, ArrowRight, Trash2 } from 'lucide-react';

const Tournaments = () => {
  const { getAuthHeader } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const handleDelete = async (e, tournamentId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this tournament?')) return;
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

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = sportFilter === 'all' || tournament.sport === sportFilter;
    const matchesStatus = statusFilter === 'all' || tournament.status === statusFilter;
    return matchesSearch && matchesSport && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="tournaments-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
            Tournaments
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your tournaments
          </p>
        </div>
        <Link to="/tournaments/new">
          <Button className="font-bold uppercase tracking-wider" data-testid="create-tournament-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Tournament
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tournaments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
                data-testid="tournament-search"
              />
            </div>
            <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="tournament-sport-filter">
                <SelectValue placeholder="Filter by sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="table_tennis">🏓 Table Tennis</SelectItem>
                <SelectItem value="badminton">🏸 Badminton</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="tournament-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="registration">Registration</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tournaments Grid */}
      {filteredTournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <Link key={tournament.id} to={`/tournaments/${tournament.id}`}>
              <Card 
                className="bg-card border-border/40 hover:border-primary/50 transition-all h-full group cursor-pointer"
                data-testid={`tournament-card-${tournament.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      tournament.sport === 'table_tennis' ? 'bg-table-tennis/20' : 'bg-badminton/20'
                    }`}>
                      <span className="text-2xl">{tournament.sport === 'table_tennis' ? '🏓' : '🏸'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(tournament.status)}>
                        {formatStatus(tournament.status)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, tournament.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        data-testid={`delete-tournament-${tournament.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatFormat(tournament.format)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatMatchType(tournament.match_type)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/40">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(tournament.start_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {tournament.participant_ids?.length || 0} / {tournament.max_participants}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <span className="text-sm text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        View Details <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
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
            <p className="mb-4">No tournaments found</p>
            <Link to="/tournaments/new">
              <Button variant="outline">
                Create your first tournament
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tournaments;
