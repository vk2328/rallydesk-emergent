import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatFormat, getSportIcon, formatSport, getPlayerName } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Medal, TrendingUp } from 'lucide-react';

const Standings = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  useEffect(() => {
    if (selectedCompetition) {
      fetchStandings(selectedCompetition);
    }
  }, [selectedCompetition]);

  const fetchData = async () => {
    try {
      const [tournamentRes, competitionsRes] = await Promise.all([
        axios.get(`${API_URL}/tournaments/${tournamentId}`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${tournamentId}/competitions`, { headers: getAuthHeader() })
      ]);
      
      setTournament(tournamentRes.data);
      setCompetitions(competitionsRes.data);
      
      // Select first competition by default
      if (competitionsRes.data.length > 0) {
        setSelectedCompetition(competitionsRes.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load standings data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async (competitionId) => {
    try {
      const response = await axios.get(
        `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/standings`,
        { headers: getAuthHeader() }
      );
      setStandings(response.data);
    } catch (error) {
      // If standings endpoint doesn't exist, calculate from matches
      try {
        const matchesRes = await axios.get(
          `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/matches`,
          { headers: getAuthHeader() }
        );
        const participantsRes = await axios.get(
          `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/participants`,
          { headers: getAuthHeader() }
        );
        
        // Calculate standings from matches
        const standingsMap = {};
        participantsRes.data.forEach(p => {
          standingsMap[p.id] = {
            participant_id: p.id,
            name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            played: 0,
            won: 0,
            lost: 0,
            sets_won: 0,
            sets_lost: 0,
            points_won: 0,
            points_lost: 0,
            points: 0
          };
        });
        
        matchesRes.data.filter(m => m.status === 'completed').forEach(match => {
          const p1 = standingsMap[match.participant1_id];
          const p2 = standingsMap[match.participant2_id];
          
          if (p1 && p2) {
            p1.played++;
            p2.played++;
            
            const p1Sets = match.scores?.filter(s => s.score1 > s.score2).length || 0;
            const p2Sets = match.scores?.filter(s => s.score2 > s.score1).length || 0;
            
            p1.sets_won += p1Sets;
            p1.sets_lost += p2Sets;
            p2.sets_won += p2Sets;
            p2.sets_lost += p1Sets;
            
            match.scores?.forEach(s => {
              p1.points_won += s.score1;
              p1.points_lost += s.score2;
              p2.points_won += s.score2;
              p2.points_lost += s.score1;
            });
            
            if (match.winner_id === match.participant1_id) {
              p1.won++;
              p1.points += 2; // 2 points for win
              p2.lost++;
            } else {
              p2.won++;
              p2.points += 2;
              p1.lost++;
            }
          }
        });
        
        // Sort by points, then set difference, then points difference
        const sortedStandings = Object.values(standingsMap).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          const aSetDiff = a.sets_won - a.sets_lost;
          const bSetDiff = b.sets_won - b.sets_lost;
          if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
          return (b.points_won - b.points_lost) - (a.points_won - a.points_lost);
        });
        
        setStandings(sortedStandings);
      } catch (e) {
        setStandings([]);
      }
    }
  };

  const currentCompetition = competitions.find(c => c.id === selectedCompetition);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="standings-page">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => navigate(`/tournaments/${tournamentId}`)} className="w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournament
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
              Standings
            </h1>
            <p className="text-muted-foreground mt-1">
              {tournament?.name}
            </p>
          </div>
          
          {competitions.length > 0 && (
            <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
              <SelectTrigger className="w-64" data-testid="competition-select">
                <SelectValue placeholder="Select competition" />
              </SelectTrigger>
              <SelectContent>
                {competitions.map(comp => (
                  <SelectItem key={comp.id} value={comp.id}>
                    {getSportIcon(comp.sport)} {comp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Competition Info */}
      {currentCompetition && (
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 flex items-center gap-4">
            <span className="text-3xl">{getSportIcon(currentCompetition.sport)}</span>
            <div>
              <h2 className="font-heading text-xl uppercase">{currentCompetition.name}</h2>
              <p className="text-sm text-muted-foreground">
                {formatSport(currentCompetition.sport)} • {formatFormat(currentCompetition.format)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standings Table */}
      {standings.length > 0 ? (
        <Card className="bg-card border-border/40 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-heading uppercase">Leaderboard</CardTitle>
            <CardDescription>
              Current standings based on completed matches
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-heading uppercase text-sm">#</th>
                    <th className="text-left p-4 font-heading uppercase text-sm">Participant</th>
                    <th className="text-center p-4 font-heading uppercase text-sm">P</th>
                    <th className="text-center p-4 font-heading uppercase text-sm">W</th>
                    <th className="text-center p-4 font-heading uppercase text-sm">L</th>
                    <th className="text-center p-4 font-heading uppercase text-sm">Sets</th>
                    <th className="text-center p-4 font-heading uppercase text-sm">Points</th>
                    <th className="text-center p-4 font-heading uppercase text-sm">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((standing, idx) => (
                    <tr 
                      key={standing.participant_id || idx}
                      className={`border-t border-border/40 ${idx < 3 ? 'bg-primary/5' : ''}`}
                      data-testid={`standing-row-${idx}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                          {idx === 1 && <Medal className="w-5 h-5 text-gray-400" />}
                          {idx === 2 && <Medal className="w-5 h-5 text-orange-600" />}
                          {idx > 2 && <span className="font-teko text-xl">{idx + 1}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium">{standing.name}</span>
                      </td>
                      <td className="p-4 text-center">{standing.played}</td>
                      <td className="p-4 text-center text-green-500 font-medium">{standing.won}</td>
                      <td className="p-4 text-center text-red-500">{standing.lost}</td>
                      <td className="p-4 text-center">
                        <span className="text-green-500">{standing.sets_won}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-red-500">{standing.sets_lost}</span>
                      </td>
                      <td className="p-4 text-center text-sm text-muted-foreground">
                        {standing.points_won}-{standing.points_lost}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-teko text-2xl font-bold text-primary">{standing.points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border/40">
          <CardContent className="py-12 text-center text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">No standings available yet</p>
            <p className="text-sm">Standings will appear after matches are completed</p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="bg-card border-border/40">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Legend</h4>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span><strong>P</strong> = Played</span>
            <span><strong>W</strong> = Won</span>
            <span><strong>L</strong> = Lost</span>
            <span><strong>Sets</strong> = Sets Won/Lost</span>
            <span><strong>Points</strong> = Total Points Scored</span>
            <span><strong>Pts</strong> = Standing Points (Win=2)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Standings;
