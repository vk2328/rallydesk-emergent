import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatStatus, getStatusColor, getSportIcon, getPlayerName } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Minus, Trophy, RotateCcw, Check, X } from 'lucide-react';

const MatchScoreboard = () => {
  const { tournamentId, matchId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader, user } = useAuth();
  const [match, setMatch] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Current set scores
  const [currentSet, setCurrentSet] = useState(1);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [sets, setSets] = useState([]);

  // Allow scoring for admin, scorekeeper, or any authenticated user (tournament owner is checked on backend)
  const canScore = user && (user.role === 'admin' || user.role === 'scorekeeper' || user.role === 'viewer');

  useEffect(() => {
    fetchMatch();
  }, [tournamentId, matchId]);

  const fetchMatch = async () => {
    try {
      const matchRes = await axios.get(`${API_URL}/tournaments/${tournamentId}/matches/${matchId}`, {
        headers: getAuthHeader()
      });
      setMatch(matchRes.data);
      
      // Fetch competition for scoring rules
      const compRes = await axios.get(`${API_URL}/tournaments/${tournamentId}/competitions/${matchRes.data.competition_id}`, {
        headers: getAuthHeader()
      });
      setCompetition(compRes.data);
      
      // Initialize scores from existing data
      if (matchRes.data.scores?.length > 0) {
        setSets(matchRes.data.scores);
        const lastSet = matchRes.data.scores[matchRes.data.scores.length - 1];
        if (lastSet) {
          setCurrentSet(matchRes.data.scores.length);
          setScore1(lastSet.score1 || 0);
          setScore2(lastSet.score2 || 0);
        }
      }
    } catch (error) {
      toast.error('Failed to load match');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const setsToWin = competition?.scoring_rules?.sets_to_win || 3;
  const pointsPerSet = competition?.scoring_rules?.points_per_set || 11;
  const winByTwo = competition?.scoring_rules?.win_by_two !== false;

  const getSetsWon = useCallback((playerNum) => {
    return sets.filter(s => {
      if (playerNum === 1) return s.score1 > s.score2;
      return s.score2 > s.score1;
    }).length;
  }, [sets]);

  const isSetComplete = useCallback(() => {
    const maxScore = Math.max(score1, score2);
    const minScore = Math.min(score1, score2);
    
    if (winByTwo) {
      return maxScore >= pointsPerSet && (maxScore - minScore) >= 2;
    }
    return maxScore >= pointsPerSet;
  }, [score1, score2, pointsPerSet, winByTwo]);

  const isMatchComplete = useCallback(() => {
    const p1Sets = getSetsWon(1);
    const p2Sets = getSetsWon(2);
    return p1Sets >= setsToWin || p2Sets >= setsToWin;
  }, [getSetsWon, setsToWin]);

  const handleScoreChange = (player, delta) => {
    if (!canScore || isMatchComplete()) return;
    
    if (player === 1) {
      setScore1(prev => Math.max(0, prev + delta));
    } else {
      setScore2(prev => Math.max(0, prev + delta));
    }
  };

  const handleEndSet = async () => {
    if (!isSetComplete()) {
      toast.error(`Set not complete. Need ${pointsPerSet} points${winByTwo ? ' with 2 point lead' : ''}`);
      return;
    }

    const newSet = { set_number: currentSet, score1, score2 };
    const updatedSets = [...sets.slice(0, currentSet - 1), newSet];
    setSets(updatedSets);
    
    // Check if match is complete
    const p1Sets = updatedSets.filter(s => s.score1 > s.score2).length;
    const p2Sets = updatedSets.filter(s => s.score2 > s.score1).length;
    
    if (p1Sets >= setsToWin || p2Sets >= setsToWin) {
      // Match complete - save with winner
      const winnerId = p1Sets >= setsToWin ? match.participant1_id : match.participant2_id;
      await saveMatch(updatedSets, winnerId);
    } else {
      // Start next set
      await saveMatch(updatedSets);
      setCurrentSet(prev => prev + 1);
      setScore1(0);
      setScore2(0);
    }
  };

  const saveMatch = async (setsToSave, winnerId = null) => {
    setSaving(true);
    try {
      const payload = {
        scores: setsToSave,
        status: winnerId ? 'completed' : 'live'
      };
      if (winnerId) {
        payload.winner_id = winnerId;
      }
      
      await axios.put(`${API_URL}/tournaments/${tournamentId}/matches/${matchId}`, payload, {
        headers: getAuthHeader()
      });
      
      if (winnerId) {
        toast.success('Match complete!');
        fetchMatch();
      } else {
        toast.success('Set saved');
      }
    } catch (error) {
      toast.error('Failed to save match');
    } finally {
      setSaving(false);
    }
  };

  const handleStartMatch = async () => {
    try {
      await axios.put(`${API_URL}/tournaments/${tournamentId}/matches/${matchId}`, {
        status: 'live'
      }, { headers: getAuthHeader() });
      toast.success('Match started!');
      fetchMatch();
    } catch (error) {
      toast.error('Failed to start match');
    }
  };

  const handleResetCurrentSet = () => {
    setScore1(0);
    setScore2(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!match) {
    return <div className="p-6">Match not found</div>;
  }

  const participant1Name = match.participant1?.name || getPlayerName(match.participant1) || 'TBD';
  const participant2Name = match.participant2?.name || getPlayerName(match.participant2) || 'TBD';
  const p1SetsWon = getSetsWon(1);
  const p2SetsWon = getSetsWon(2);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" data-testid="match-scoreboard">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getSportIcon(competition?.sport)}</span>
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold uppercase">Match Scoreboard</h1>
              <p className="text-sm text-muted-foreground">Best of {setsToWin * 2 - 1}</p>
            </div>
          </div>
          <Badge className={getStatusColor(match.status)}>
            {formatStatus(match.status)}
          </Badge>
        </div>
      </div>

      {/* Main Scoreboard */}
      <div className="max-w-4xl mx-auto">
        {/* Sets Score */}
        <Card className="bg-card border-border/40 mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* Player 1 */}
              <div className={`p-4 rounded-lg ${match.winner_id === match.participant1_id ? 'bg-green-500/20' : 'bg-muted/30'}`}>
                <p className="font-heading text-lg md:text-xl uppercase truncate">{participant1Name}</p>
                <p className="font-teko text-6xl md:text-8xl font-bold text-primary">{p1SetsWon}</p>
                <p className="text-sm text-muted-foreground">Sets Won</p>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl text-muted-foreground font-bold">VS</p>
                {match.status === 'live' && (
                  <Badge className="mt-2 bg-red-500 animate-pulse">LIVE</Badge>
                )}
                {match.winner_id && (
                  <div className="mt-2 flex items-center gap-1 text-green-500">
                    <Trophy className="w-5 h-5" />
                    <span className="text-sm font-bold">WINNER</span>
                  </div>
                )}
              </div>

              {/* Player 2 */}
              <div className={`p-4 rounded-lg ${match.winner_id === match.participant2_id ? 'bg-green-500/20' : 'bg-muted/30'}`}>
                <p className="font-heading text-lg md:text-xl uppercase truncate">{participant2Name}</p>
                <p className="font-teko text-6xl md:text-8xl font-bold text-secondary">{p2SetsWon}</p>
                <p className="text-sm text-muted-foreground">Sets Won</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Set Scoring */}
        {!isMatchComplete() && match.status !== 'completed' && (
          <Card className="bg-card border-border/40 mb-6">
            <CardHeader>
              <CardTitle className="font-heading uppercase text-center">
                Set {currentSet} - Current Score
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* Player 1 Score */}
                <div className="text-center">
                  <p className="font-teko text-7xl md:text-9xl font-bold">{score1}</p>
                  {canScore && match.status === 'live' && (
                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => handleScoreChange(1, -1)}
                        disabled={score1 === 0}
                        data-testid="p1-minus"
                      >
                        <Minus className="w-6 h-6" />
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => handleScoreChange(1, 1)}
                        className="bg-primary"
                        data-testid="p1-plus"
                      >
                        <Plus className="w-6 h-6" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div className="text-center">
                  <span className="font-teko text-4xl text-muted-foreground">:</span>
                </div>

                {/* Player 2 Score */}
                <div className="text-center">
                  <p className="font-teko text-7xl md:text-9xl font-bold">{score2}</p>
                  {canScore && match.status === 'live' && (
                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => handleScoreChange(2, -1)}
                        disabled={score2 === 0}
                        data-testid="p2-minus"
                      >
                        <Minus className="w-6 h-6" />
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => handleScoreChange(2, 1)}
                        className="bg-secondary"
                        data-testid="p2-plus"
                      >
                        <Plus className="w-6 h-6" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Set Actions */}
              {canScore && match.status === 'live' && (
                <div className="flex justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    onClick={handleResetCurrentSet}
                    data-testid="reset-set"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Set
                  </Button>
                  <Button
                    onClick={handleEndSet}
                    disabled={!isSetComplete() || saving}
                    className="font-bold"
                    data-testid="end-set"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'End Set'}
                  </Button>
                </div>
              )}

              {/* Start Match Button */}
              {canScore && (match.status === 'pending' || match.status === 'scheduled') && (
                <div className="flex justify-center mt-8">
                  <Button
                    size="lg"
                    onClick={handleStartMatch}
                    className="font-bold uppercase tracking-wider bg-green-600 hover:bg-green-700"
                    data-testid="start-match"
                  >
                    Start Match
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Set History */}
        {sets.length > 0 && (
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase">Set History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sets.map((set, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <span className="text-sm text-muted-foreground">Set {set.set_number || idx + 1}</span>
                    <div className="flex items-center gap-4">
                      <span className={`font-teko text-2xl ${set.score1 > set.score2 ? 'text-green-500 font-bold' : ''}`}>
                        {set.score1}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className={`font-teko text-2xl ${set.score2 > set.score1 ? 'text-green-500 font-bold' : ''}`}>
                        {set.score2}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match Complete Message */}
        {match.winner_id && (
          <Card className="bg-green-500/10 border-green-500/30 mt-6">
            <CardContent className="p-6 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <h2 className="font-heading text-2xl uppercase font-bold text-green-500">Match Complete!</h2>
              <p className="text-lg mt-2">
                Winner: <span className="font-bold">
                  {match.winner_id === match.participant1_id ? participant1Name : participant2Name}
                </span>
              </p>
              <p className="text-muted-foreground mt-1">
                Final Score: {p1SetsWon} - {p2SetsWon}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MatchScoreboard;
