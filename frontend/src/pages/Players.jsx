import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatSport, getSportIcon } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Users, Search, Trophy, ArrowRight } from 'lucide-react';

const Players = () => {
  const { getAuthHeader } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tournamentFilter, setTournamentFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // First get all tournaments
      const tournamentsRes = await axios.get(`${API_URL}/tournaments`, {
        headers: getAuthHeader()
      });
      setTournaments(tournamentsRes.data);
      
      // Then get players from each tournament
      const playersPromises = tournamentsRes.data.map(async (tournament) => {
        try {
          const playersRes = await axios.get(`${API_URL}/tournaments/${tournament.id}/players`, {
            headers: getAuthHeader()
          });
          return playersRes.data.map(p => ({
            ...p,
            tournament_id: tournament.id,
            tournament_name: tournament.name
          }));
        } catch {
          return [];
        }
      });
      
      const playersArrays = await Promise.all(playersPromises);
      const allPlayersFlat = playersArrays.flat();
      setAllPlayers(allPlayersFlat);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = allPlayers.filter(player => {
    const fullName = `${player.first_name || ''} ${player.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         (player.email && player.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTournament = tournamentFilter === 'all' || player.tournament_id === tournamentFilter;
    return matchesSearch && matchesTournament;
  });

  const getSkillBadgeColor = (level) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'advanced': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
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
            View all players across tournaments
          </p>
        </div>
      </div>

      {/* Info Card */}
      {tournaments.length === 0 && (
        <Card className="bg-card border-border/40">
          <CardContent className="py-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="font-heading text-lg uppercase mb-2">No Tournaments Yet</h3>
            <p className="text-muted-foreground mb-4">Create a tournament to start adding players</p>
            <Link to="/tournaments/new">
              <Button>Create Tournament</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {tournaments.length > 0 && (
        <>
          {/* Filters */}
          <Card className="bg-card border-border/40">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search players by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background/50"
                    data-testid="player-search"
                  />
                </div>
                <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                  <SelectTrigger className="w-full md:w-64" data-testid="tournament-filter">
                    <SelectValue placeholder="Filter by tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tournaments</SelectItem>
                    {tournaments.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
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
              <CardDescription>
                Players registered across {tournaments.length} tournament(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPlayers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40">
                        <TableHead>Name</TableHead>
                        <TableHead>Tournament</TableHead>
                        <TableHead>Skill Level</TableHead>
                        <TableHead className="text-center">W</TableHead>
                        <TableHead className="text-center">L</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.map((player) => (
                        <TableRow key={`${player.tournament_id}-${player.id}`} className="border-border/40">
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {player.first_name} {player.last_name}
                              </p>
                              {player.email && (
                                <p className="text-sm text-muted-foreground">{player.email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link to={`/tournaments/${player.tournament_id}`} className="hover:text-primary transition-colors">
                              {player.tournament_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {player.skill_level && (
                              <Badge variant="outline" className={getSkillBadgeColor(player.skill_level)}>
                                {player.skill_level}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-teko text-2xl text-green-400">
                            {player.wins || 0}
                          </TableCell>
                          <TableCell className="text-center font-teko text-2xl text-red-400">
                            {player.losses || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/tournaments/${player.tournament_id}`}>
                              <Button variant="ghost" size="sm">
                                View <ArrowRight className="w-4 h-4 ml-1" />
                              </Button>
                            </Link>
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
                  <p className="text-sm">Add players from a tournament's detail page</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Players;
