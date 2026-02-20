import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Users2, Search, Trophy, ArrowRight } from 'lucide-react';

const Teams = () => {
  const { getAuthHeader } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
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
      
      // Then get teams from each tournament
      const teamsPromises = tournamentsRes.data.map(async (tournament) => {
        try {
          const teamsRes = await axios.get(`${API_URL}/tournaments/${tournament.id}/teams`, {
            headers: getAuthHeader()
          });
          return teamsRes.data.map(t => ({
            ...t,
            tournament_id: tournament.id,
            tournament_name: tournament.name
          }));
        } catch {
          return [];
        }
      });
      
      const teamsArrays = await Promise.all(teamsPromises);
      const allTeamsFlat = teamsArrays.flat();
      setAllTeams(allTeamsFlat);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = allTeams.filter(team => {
    const matchesSearch = team.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTournament = tournamentFilter === 'all' || team.tournament_id === tournamentFilter;
    return matchesSearch && matchesTournament;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
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
            View all teams across tournaments
          </p>
        </div>
      </div>

      {/* Info Card */}
      {tournaments.length === 0 && (
        <Card className="bg-card border-border/40">
          <CardContent className="py-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="font-heading text-lg uppercase mb-2">No Tournaments Yet</h3>
            <p className="text-muted-foreground mb-4">Create a tournament to start adding teams</p>
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
                    placeholder="Search teams by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background/50"
                    data-testid="team-search"
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

          {/* Teams Table */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase flex items-center gap-2">
                <Users2 className="w-5 h-5" />
                All Teams ({filteredTeams.length})
              </CardTitle>
              <CardDescription>
                Teams registered across {tournaments.length} tournament(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTeams.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40">
                        <TableHead>Team Name</TableHead>
                        <TableHead>Tournament</TableHead>
                        <TableHead className="text-center">Players</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeams.map((team) => (
                        <TableRow key={`${team.tournament_id}-${team.id}`} className="border-border/40">
                          <TableCell>
                            <p className="font-medium">{team.name}</p>
                          </TableCell>
                          <TableCell>
                            <Link to={`/tournaments/${team.tournament_id}`} className="hover:text-primary transition-colors">
                              {team.tournament_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center font-teko text-xl">
                            {team.player_ids?.length || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/tournaments/${team.tournament_id}`}>
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
                  <Users2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-4">No teams found</p>
                  <p className="text-sm">Create teams from a tournament's detail page</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Teams;
