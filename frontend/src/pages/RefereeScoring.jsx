import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Trophy, Plus, Minus, Check, AlertCircle, Loader2 } from 'lucide-react';

const RefereeScoring = () => {
  const { tournamentId, matchId } = useParams();
  const [searchParams] = useSearchParams();
  const accessCode = searchParams.get('code') || '';
  
  const [matchInfo, setMatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState(accessCode);
  const [scores, setScores] = useState([]);
  const [currentSet, setCurrentSet] = useState(1);

  useEffect(() => {
    if (accessCode) {
      fetchMatchInfo(accessCode);
    } else {
      setLoading(false);
    }
  }, [accessCode]);

  const fetchMatchInfo = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API_URL}/referee/match/${tournamentId}/${matchId}?code=${code}`
      );
      setMatchInfo(response.data);
      
      // Initialize scores from existing or empty
      const existingScores = response.data.current_scores || [];
      const setsToWin = response.data.scoring_rules?.sets_to_win || 3;
      const totalSets = (setsToWin * 2) - 1;
      
      const initialScores = [];
      for (let i = 0; i < totalSets; i++) {
        initialScores.push(existingScores[i] || { set_number: i + 1, score1: 0, score2: 0 });
      }
      setScores(initialScores);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load match info');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (manualCode.length === 6) {
      fetchMatchInfo(manualCode);
    }
  };

  const updateScore = (setIndex, player, delta) => {
    setScores(prev => {
      const newScores = [...prev];
      const key = player === 1 ? 'score1' : 'score2';
      newScores[setIndex] = {
        ...newScores[setIndex],
        [key]: Math.max(0, (newScores[setIndex][key] || 0) + delta)
      };
      return newScores;
    });
  };

  const calculateWinner = () => {
    const setsToWin = matchInfo?.scoring_rules?.sets_to_win || 3;
    const pointsToWin = matchInfo?.scoring_rules?.points_to_win_set || 11;
    const winBy = matchInfo?.scoring_rules?.points_must_win_by || 2;
    
    let p1Sets = 0, p2Sets = 0;
    
    scores.forEach(set => {
      const s1 = set.score1 || 0;
      const s2 = set.score2 || 0;
      
      // Check if set is won
      if (s1 >= pointsToWin && s1 - s2 >= winBy) p1Sets++;
      else if (s2 >= pointsToWin && s2 - s1 >= winBy) p2Sets++;
    });
    
    if (p1Sets >= setsToWin) return matchInfo.participant1.id;
    if (p2Sets >= setsToWin) return matchInfo.participant2.id;
    return null;
  };

  const handleSubmitScore = async () => {
    setSubmitting(true);
    try {
      const winnerId = calculateWinner();
      
      await axios.post(`${API_URL}/referee/score/${tournamentId}/${matchId}`, {
        access_code: manualCode || accessCode,
        scores: scores.filter(s => s.score1 > 0 || s.score2 > 0),
        winner_id: winnerId
      });
      
      toast.success('Score submitted! Awaiting organizer confirmation.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit score');
    } finally {
      setSubmitting(false);
    }
  };

  // Code entry screen
  if (!matchInfo && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-heading uppercase">Referee Access</CardTitle>
            <CardDescription>Enter your 6-digit access code</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="000000"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-3xl tracking-[0.5em] font-mono h-16"
                maxLength={6}
              />
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={manualCode.length !== 6}
              >
                Access Match
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const setsToWin = matchInfo?.scoring_rules?.sets_to_win || 3;
  const pointsToWin = matchInfo?.scoring_rules?.points_to_win_set || 11;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Match Header */}
        <Card className="bg-card">
          <CardHeader className="text-center pb-2">
            <Badge variant="outline" className="mx-auto mb-2">
              {matchInfo.sport?.replace('_', ' ').toUpperCase()}
            </Badge>
            <CardTitle className="text-lg">{matchInfo.tournament_name}</CardTitle>
            <CardDescription>{matchInfo.competition_name} - Round {matchInfo.round_number}</CardDescription>
          </CardHeader>
        </Card>

        {/* Players */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase mb-1">Player 1</p>
              <p className="font-bold text-lg">{matchInfo.participant1?.name || 'TBD'}</p>
            </CardContent>
          </Card>
          <Card className="bg-secondary/10 border-secondary/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase mb-1">Player 2</p>
              <p className="font-bold text-lg">{matchInfo.participant2?.name || 'TBD'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Scoring Info */}
        <Card>
          <CardContent className="p-3 text-center text-sm text-muted-foreground">
            Best of {(setsToWin * 2) - 1} sets | {pointsToWin} points to win set
          </CardContent>
        </Card>

        {/* Score Entry */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Enter Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scores.map((set, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-16 text-sm text-muted-foreground">Set {index + 1}</span>
                
                {/* Player 1 Score */}
                <div className="flex-1 flex items-center justify-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => updateScore(index, 1, -1)}
                    disabled={set.score1 <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center text-2xl font-bold">{set.score1}</span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => updateScore(index, 1, 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <span className="text-muted-foreground">-</span>

                {/* Player 2 Score */}
                <div className="flex-1 flex items-center justify-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => updateScore(index, 2, -1)}
                    disabled={set.score2 <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center text-2xl font-bold">{set.score2}</span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => updateScore(index, 2, 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <Button 
          className="w-full h-14 text-lg" 
          onClick={handleSubmitScore}
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Check className="w-5 h-5 mr-2" />
          )}
          Submit Score
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Score will be submitted for organizer review and confirmation
        </p>
      </div>
    </div>
  );
};

export default RefereeScoring;
