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
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Grid3X3, Search, Trophy, ArrowRight } from 'lucide-react';

const Resources = () => {
  const { getAuthHeader } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tournamentFilter, setTournamentFilter] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');

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
      
      // Then get resources from each tournament
      const resourcesPromises = tournamentsRes.data.map(async (tournament) => {
        try {
          const resourcesRes = await axios.get(`${API_URL}/tournaments/${tournament.id}/resources`, {
            headers: getAuthHeader()
          });
          return resourcesRes.data.map(r => ({
            ...r,
            tournament_id: tournament.id,
            tournament_name: tournament.name
          }));
        } catch {
          return [];
        }
      });
      
      const resourcesArrays = await Promise.all(resourcesPromises);
      const allResourcesFlat = resourcesArrays.flat();
      setAllResources(allResourcesFlat);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = allResources.filter(resource => {
    const matchesSearch = resource.label?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTournament = tournamentFilter === 'all' || resource.tournament_id === tournamentFilter;
    const matchesSport = sportFilter === 'all' || resource.sport === sportFilter;
    return matchesSearch && matchesTournament && matchesSport;
  });

  // Group by sport for summary
  const sportCounts = allResources.reduce((acc, r) => {
    acc[r.sport] = (acc[r.sport] || 0) + 1;
    return acc;
  }, {});

  const getStatusColor = (resource) => {
    if (resource.current_match_id) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (resource.locked) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  const getStatusText = (resource) => {
    if (resource.current_match_id) return 'In Use';
    if (resource.locked) return 'Locked';
    return 'Available';
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
    <div className="p-6 space-y-6" data-testid="resources-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
            Resources
          </h1>
          <p className="text-muted-foreground mt-1">
            View all tables and courts across tournaments
          </p>
        </div>
      </div>

      {/* Info Card */}
      {tournaments.length === 0 && (
        <Card className="bg-card border-border/40">
          <CardContent className="py-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="font-heading text-lg uppercase mb-2">No Tournaments Yet</h3>
            <p className="text-muted-foreground mb-4">Create a tournament to start adding resources</p>
            <Link to="/tournaments/new">
              <Button>Create Tournament</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {tournaments.length > 0 && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border/40">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">Total Resources</p>
                <p className="font-teko text-4xl text-primary">{allResources.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/40">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">Available</p>
                <p className="font-teko text-4xl text-green-500">
                  {allResources.filter(r => !r.current_match_id && !r.locked).length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/40">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">In Use</p>
                <p className="font-teko text-4xl text-red-500">
                  {allResources.filter(r => r.current_match_id).length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/40">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">Locked</p>
                <p className="font-teko text-4xl text-yellow-500">
                  {allResources.filter(r => r.locked && !r.current_match_id).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-card border-border/40">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background/50"
                    data-testid="resource-search"
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
                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger className="w-full md:w-48" data-testid="sport-filter">
                    <SelectValue placeholder="Filter by sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sports</SelectItem>
                    <SelectItem value="table_tennis">🏓 Table Tennis</SelectItem>
                    <SelectItem value="badminton">🏸 Badminton</SelectItem>
                    <SelectItem value="volleyball">🏐 Volleyball</SelectItem>
                    <SelectItem value="tennis">🎾 Tennis</SelectItem>
                    <SelectItem value="pickleball">🥒 Pickleball</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Resources Grid */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                All Resources ({filteredResources.length})
              </CardTitle>
              <CardDescription>
                Resources across {tournaments.length} tournament(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredResources.map((resource) => (
                    <div
                      key={`${resource.tournament_id}-${resource.id}`}
                      className={`p-4 rounded-lg border transition-colors ${
                        resource.current_match_id 
                          ? 'border-red-500/50 bg-red-500/5' 
                          : resource.locked
                            ? 'border-yellow-500/50 bg-yellow-500/5'
                            : 'border-border/40 bg-muted/30'
                      }`}
                      data-testid={`resource-card-${resource.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{getSportIcon(resource.sport)}</span>
                        <Badge variant="outline" className={getStatusColor(resource)}>
                          {getStatusText(resource)}
                        </Badge>
                      </div>
                      <p className="font-medium">{resource.label}</p>
                      <p className="text-sm text-muted-foreground">{formatSport(resource.sport)}</p>
                      <Link 
                        to={`/tournaments/${resource.tournament_id}`}
                        className="text-xs text-primary hover:underline mt-2 block"
                      >
                        {resource.tournament_name}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-4">No resources found</p>
                  <p className="text-sm">Add resources from a tournament's detail page</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Resources;
