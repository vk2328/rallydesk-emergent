import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatSport, getSportBgColor } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Plus, Minus, Award, RotateCcw } from 'lucide-react';

const MatchScoreboard = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const [match, setMatch] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScores, setCurrentScores] = useState({ p1: 0, p2: 0 });
  const [sets, setSets] = useState([]);
  const [currentSet, setCurrentSet] = useState(1);
  const [serving, setServing] = useState(1); // 1 or 2

  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  const fetchMatchData = async () => {
    try {
      const matchRes = await axios.get(`${API_URL}/matches/${matchId}`, {
        headers: getAuthHeader()
      });
      setMatch(matchRes.data);
      
      const tournamentRes = await axios.get(`${API_URL}/tournaments/${matchRes.data.tournament_id}`, {
        headers: getAuthHeader()
      });
      setTournament(tournamentRes.data);
      
      // Initialize scores from existing data
      if (matchRes.data.scores && matchRes.data.scores.length > 0) {
        setSets(matchRes.data.scores);
        setCurrentSet(matchRes.data.current_set || matchRes.data.scores.length + 1);
      }
    } catch (error) {
      toast.error('Failed to fetch match data');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const addPoint = async (player) => {
    const newScores = { ...currentScores };
    if (player === 1) newScores.p1++;
    else newScores.p2++;
    setCurrentScores(newScores);
    
    // Check for set win
    const pointsToWin = tournament?.points_per_set || 11;
    const minLead = 2;
    
    if (
      (newScores.p1 >= pointsToWin || newScores.p2 >= pointsToWin) &&
      Math.abs(newScores.p1 - newScores.p2) >= minLead
    ) {
      // Set won
      const newSet = {
        set_number: currentSet,
        participant1_score: newScores.p1,
        participant2_score: newScores.p2
      };
      
      const updatedSets = [...sets, newSet];
      setSets(updatedSets);
      
      // Save to backend
      await saveScore(newSet);
      
      // Check for match win
      const setsToWin = tournament?.sets_to_win || 3;
      const p1Sets = updatedSets.filter(s => s.participant1_score > s.participant2_score).length;
      const p2Sets = updatedSets.filter(s => s.participant2_score > s.participant1_score).length;
      
      if (p1Sets >= setsToWin || p2Sets >= setsToWin) {
        // Match won
        const winnerId = p1Sets >= setsToWin ? match.participant1_id : match.participant2_id;
        await declareWinner(winnerId);
        toast.success('Match completed!');
        return;
      }
      
      // Next set
      setCurrentSet(currentSet + 1);
      setCurrentScores({ p1: 0, p2: 0 });
      toast.success(`Set ${currentSet} complete!`);
    }
    
    // Switch serve every 2 points (or every point after 10-10)
    const totalPoints = newScores.p1 + newScores.p2;
    if (newScores.p1 >= 10 && newScores.p2 >= 10) {
      setServing(serving === 1 ? 2 : 1);
    } else if (totalPoints % 2 === 0) {
      setServing(serving === 1 ? 2 : 1);
    }
  };

  const subtractPoint = (player) => {
    const newScores = { ...currentScores };
    if (player === 1 && newScores.p1 > 0) newScores.p1--;
    else if (player === 2 && newScores.p2 > 0) newScores.p2--;
    setCurrentScores(newScores);
  };

  const saveScore = async (setScore) => {
    try {
      await axios.post(`${API_URL}/matches/${matchId}/score`, setScore, {
        headers: getAuthHeader()
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const declareWinner = async (winnerId) => {
    try {
      await axios.put(`${API_URL}/matches/${matchId}`, { winner_id: winnerId }, {
        headers: getAuthHeader()
      });
    } catch (error) {
      toast.error('Failed to save match result');
    }
  };

  const resetSet = () => {
    setCurrentScores({ p1: 0, p2: 0 });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    );
  }

  if (!match || !tournament) {
    return <div className="p-6">Match not found</div>;
  }

  const p1Sets = sets.filter(s => s.participant1_score > s.participant2_score).length;
  const p2Sets = sets.filter(s => s.participant2_score > s.participant1_score).length;
  const sportColor = tournament.sport === 'table_tennis' ? 'bg-table-tennis' : 'bg-badminton';

  return (
    <div 
      className="min-h-screen bg-background p-4 md:p-6"
      data-testid="match-scoreboard"
    >
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <Button variant="ghost" onClick={() => navigate(`/tournaments/${tournament.id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournament
        </Button>
      </div>

      {/* Main Scoreboard */}
      <div className="max-w-6xl mx-auto">
        <Card className="bg-card/80 backdrop-blur border-border/40 overflow-hidden">
          {/* Tournament Info */}
          <div className={`${sportColor} p-3 text-center`}>
            <p className="font-heading uppercase font-bold text-white text-lg">
              {tournament.name}
            </p>
            <p className="text-white/80 text-sm">
              {formatSport(tournament.sport)} • Round {match.round_number}
            </p>
          </div>

          <CardContent className="p-6 md:p-8">
            {/* Set Progress */}
            <div className="flex justify-center gap-2 mb-8">
              {[...Array(tournament.sets_to_win * 2 - 1)].map((_, idx) => {
                const setNum = idx + 1;
                const setData = sets.find(s => s.set_number === setNum);
                let status = 'pending';
                if (setData) {
                  status = setData.participant1_score > setData.participant2_score ? 'p1' : 'p2';
                } else if (setNum === currentSet) {
                  status = 'current';
                }
                return (
                  <div
                    key={setNum}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                      status === 'current' 
                        ? 'bg-primary text-primary-foreground animate-pulse'
                        : status === 'p1'
                          ? 'bg-green-500 text-white'
                          : status === 'p2'
                            ? 'bg-red-500 text-white'
                            : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {setNum}
                  </div>
                );
              })}
            </div>

            {/* Players & Scores */}
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Player 1 */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  {serving === 1 && (
                    <div className={`w-4 h-4 rounded-full ${sportColor} animate-pulse`} />
                  )}
                </div>
                <h2 className="font-heading text-2xl md:text-3xl uppercase font-bold mb-2">
                  {match.participant1?.name || 'Player 1'}
                </h2>
                <div className="flex justify-center gap-2 mb-4">
                  <Badge variant="outline" className="font-teko text-xl px-3">
                    Sets: {p1Sets}
                  </Badge>
                </div>
                
                {/* Score */}
                <div className="font-teko text-[8rem] md:text-[12rem] leading-none tracking-tighter">
                  {currentScores.p1}
                </div>
                
                {/* Controls */}
                {match.status !== 'completed' && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => subtractPoint(1)}
                      className="w-16 h-16"
                      data-testid="p1-minus"
                    >
                      <Minus className="w-6 h-6" />
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => addPoint(1)}
                      className="w-24 h-16 font-bold text-lg"
                      data-testid="p1-plus"
                    >
                      <Plus className="w-6 h-6" />
                    </Button>
                  </div>
                )}
                
                {match.winner_id === match.participant1_id && (
                  <div className="flex justify-center mt-4">
                    <Badge className="bg-green-500 text-white text-lg px-4 py-2">
                      <Award className="w-5 h-5 mr-2" />
                      WINNER
                    </Badge>
                  </div>
                )}
              </div>

              {/* Center - VS */}
              <div className="text-center">
                <p className="font-heading text-4xl md:text-6xl text-muted-foreground">VS</p>
                <p className="text-sm text-muted-foreground mt-2">Set {currentSet}</p>
                
                {match.status !== 'completed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetSet}
                    className="mt-4"
                    data-testid="reset-set"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Player 2 */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  {serving === 2 && (
                    <div className={`w-4 h-4 rounded-full ${sportColor} animate-pulse`} />
                  )}
                </div>
                <h2 className="font-heading text-2xl md:text-3xl uppercase font-bold mb-2">
                  {match.participant2?.name || 'Player 2'}
                </h2>
                <div className="flex justify-center gap-2 mb-4">
                  <Badge variant="outline" className="font-teko text-xl px-3">
                    Sets: {p2Sets}
                  </Badge>
                </div>
                
                {/* Score */}
                <div className="font-teko text-[8rem] md:text-[12rem] leading-none tracking-tighter">
                  {currentScores.p2}
                </div>
                
                {/* Controls */}
                {match.status !== 'completed' && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => subtractPoint(2)}
                      className="w-16 h-16"
                      data-testid="p2-minus"
                    >
                      <Minus className="w-6 h-6" />
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => addPoint(2)}
                      className="w-24 h-16 font-bold text-lg"
                      data-testid="p2-plus"
                    >
                      <Plus className="w-6 h-6" />
                    </Button>
                  </div>
                )}
                
                {match.winner_id === match.participant2_id && (
                  <div className="flex justify-center mt-4">
                    <Badge className="bg-green-500 text-white text-lg px-4 py-2">
                      <Award className="w-5 h-5 mr-2" />
                      WINNER
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Set History */}
            {sets.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border/40">
                <h3 className="text-center text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Set History
                </h3>
                <div className="flex justify-center gap-4 flex-wrap">
                  {sets.map((set) => (
                    <div key={set.set_number} className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Set {set.set_number}</p>
                      <div className="flex items-center gap-2">
                        <span className={`font-teko text-2xl ${set.participant1_score > set.participant2_score ? 'text-green-400' : ''}`}>
                          {set.participant1_score}
                        </span>
                        <span className="text-muted-foreground">-</span>
                        <span className={`font-teko text-2xl ${set.participant2_score > set.participant1_score ? 'text-green-400' : ''}`}>
                          {set.participant2_score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MatchScoreboard;
