import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { 
  Trophy, Lock, Unlock, Plus, Minus, Check, 
  AlertTriangle, Wifi, WifiOff, RefreshCw, Users
} from 'lucide-react';

const GroupScorer = () => {
  const { tournamentId, competitionId, groupNumber } = useParams();
  const [searchParams] = useSearchParams();
  const accessCode = searchParams.get('code');
  
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Lock state
  const [hasLock, setHasLock] = useState(false);
  const [lockError, setLockError] = useState(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const lockRenewalRef = useRef(null);
  
  // Scoring state
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [currentScores, setCurrentScores] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchGroupData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/group-scorer/${tournamentId}/${competitionId}/${groupNumber}/matches?code=${accessCode}`
      );
      setGroupData(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, competitionId, groupNumber, accessCode]);

  useEffect(() => {
    if (accessCode) {
      fetchGroupData();
    } else {
      setError('No access code provided');
      setLoading(false);
    }
  }, [accessCode, fetchGroupData]);

  // Auto-refresh data every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchGroupData, 10000);
    return () => clearInterval(interval);
  }, [fetchGroupData]);

  // Lock renewal every 5 minutes
  useEffect(() => {
    if (hasLock) {
      lockRenewalRef.current = setInterval(async () => {
        try {
          await axios.post(
            `${API_URL}/group-scorer/${tournamentId}/${competitionId}/${groupNumber}/renew-lock?code=${accessCode}&session_id=${sessionId}`
          );
        } catch (err) {
          console.error('Lock renewal failed:', err);
          setHasLock(false);
          toast.error('Lock expired. Please re-acquire lock.');
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => {
        if (lockRenewalRef.current) {
          clearInterval(lockRenewalRef.current);
        }
      };
    }
  }, [hasLock, tournamentId, competitionId, groupNumber, accessCode, sessionId]);

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (hasLock) {
        axios.post(
          `${API_URL}/group-scorer/${tournamentId}/${competitionId}/${groupNumber}/release-lock?code=${accessCode}&session_id=${sessionId}`
        ).catch(console.error);
      }
    };
  }, [hasLock, tournamentId, competitionId, groupNumber, accessCode, sessionId]);

  const acquireLock = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/group-scorer/${tournamentId}/${competitionId}/${groupNumber}/acquire-lock?code=${accessCode}&session_id=${sessionId}`
      );
      
      if (response.data.locked) {
        setLockError(response.data.message);
        toast.error(response.data.message);
      } else {
        setHasLock(true);
        setLockError(null);
        toast.success('Lock acquired! You can now enter scores.');
      }
    } catch (err) {
      setLockError(err.response?.data?.detail || 'Failed to acquire lock');
      toast.error(err.response?.data?.detail || 'Failed to acquire lock');
    }
  };

  const releaseLock = async () => {
    try {
      await axios.post(
        `${API_URL}/group-scorer/${tournamentId}/${competitionId}/${groupNumber}/release-lock?code=${accessCode}&session_id=${sessionId}`
      );
      setHasLock(false);
      toast.success('Lock released');
    } catch (err) {
      toast.error('Failed to release lock');
    }
  };

  const selectMatch = (match) => {
    if (!hasLock) {
      toast.error('Please acquire lock first to enter scores');
      return;
    }
    setSelectedMatch(match);
    setCurrentScores(match.scores || [{ score1: 0, score2: 0, set_number: 1 }]);
  };

  const updateSetScore = (setIndex, player, delta) => {
    const newScores = [...currentScores];
    if (!newScores[setIndex]) {
      newScores[setIndex] = { score1: 0, score2: 0, set_number: setIndex + 1 };
    }
    const key = player === 1 ? 'score1' : 'score2';
    newScores[setIndex][key] = Math.max(0, (newScores[setIndex][key] || 0) + delta);
    setCurrentScores(newScores);
  };

  const setScoreDirectly = (setIndex, player, value) => {
    const newScores = [...currentScores];
    if (!newScores[setIndex]) {
      newScores[setIndex] = { score1: 0, score2: 0, set_number: setIndex + 1 };
    }
    const key = player === 1 ? 'score1' : 'score2';
    newScores[setIndex][key] = Math.max(0, Math.min(99, parseInt(value) || 0));
    setCurrentScores(newScores);
  };

  const addSet = () => {
    setCurrentScores([...currentScores, { score1: 0, score2: 0, set_number: currentScores.length + 1 }]);
  };

  const saveScore = async (markComplete = false) => {
    if (!selectedMatch || !hasLock) return;
    
    setSaving(true);
    try {
      // Determine winner if marking complete
      let winnerId = null;
      if (markComplete) {
        const p1Sets = currentScores.filter(s => s.score1 > s.score2).length;
        const p2Sets = currentScores.filter(s => s.score2 > s.score1).length;
        if (p1Sets > p2Sets) {
          winnerId = selectedMatch.participant1_id;
        } else if (p2Sets > p1Sets) {
          winnerId = selectedMatch.participant2_id;
        } else {
          toast.error('Cannot complete: No clear winner');
          setSaving(false);
          return;
        }
      }
      
      await axios.post(
        `${API_URL}/group-scorer/${tournamentId}/${competitionId}/${groupNumber}/update-score?match_id=${selectedMatch.id}&code=${accessCode}&session_id=${sessionId}`,
        {
          access_code: accessCode,
          scores: currentScores.map((s, i) => ({ ...s, set_number: i + 1 })),
          winner_id: winnerId
        }
      );
      
      toast.success(markComplete ? 'Match completed!' : 'Score saved');
      setSelectedMatch(null);
      fetchGroupData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save score');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Access Error</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoringRules = groupData?.scoring_rules || {};
  const setsToWin = scoringRules.sets_to_win || 3;
  const pointsPerSet = scoringRules.points_per_set || 11;

  return (
    <div className="min-h-screen bg-background p-4" data-testid="group-scorer-page">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="text-center mb-4">
          <Badge className="mb-2">Group {groupNumber} Scorer</Badge>
          <h1 className="font-heading text-2xl font-bold uppercase">{groupData?.competition_name}</h1>
          <p className="text-sm text-muted-foreground">Best of {setsToWin * 2 - 1} • {pointsPerSet} points per set</p>
        </div>
        
        {/* Lock Status */}
        <Card className={`mb-4 ${hasLock ? 'border-green-500 bg-green-500/10' : 'border-yellow-500 bg-yellow-500/10'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hasLock ? (
                  <Unlock className="w-6 h-6 text-green-500" />
                ) : (
                  <Lock className="w-6 h-6 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium">
                    {hasLock ? 'You have the scoring lock' : 'Lock required to score'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasLock ? 'Only you can enter scores' : 'Acquire lock to prevent conflicts'}
                  </p>
                </div>
              </div>
              {hasLock ? (
                <Button variant="outline" size="sm" onClick={releaseLock}>
                  Release Lock
                </Button>
              ) : (
                <Button onClick={acquireLock} className="bg-primary">
                  <Lock className="w-4 h-4 mr-2" />
                  Acquire Lock
                </Button>
              )}
            </div>
            {lockError && (
              <p className="text-sm text-red-400 mt-2">{lockError}</p>
            )}
          </CardContent>
        </Card>

        {/* Connection Status */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
          <Wifi className="w-3 h-3 text-green-500" />
          <span>Auto-refreshing</span>
        </div>
      </div>

      {/* Match Scoring Dialog */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle className="text-center">
                {selectedMatch.participant1_name} vs {selectedMatch.participant2_name}
              </CardTitle>
              <CardDescription className="text-center">
                Match {selectedMatch.match_number} • Enter scores below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sets */}
              {currentScores.map((set, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-3 text-center">Set {idx + 1}</p>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    {/* Player 1 */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1 truncate">{selectedMatch.participant1_name}</p>
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        value={set.score1 || 0}
                        onChange={(e) => setScoreDirectly(idx, 1, e.target.value)}
                        className="text-center text-2xl font-bold h-14"
                      />
                      <div className="flex gap-1 mt-2 justify-center">
                        <Button size="sm" variant="outline" onClick={() => updateSetScore(idx, 1, -1)}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={() => updateSetScore(idx, 1, 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-center text-2xl text-muted-foreground">:</div>
                    
                    {/* Player 2 */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1 truncate">{selectedMatch.participant2_name}</p>
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        value={set.score2 || 0}
                        onChange={(e) => setScoreDirectly(idx, 2, e.target.value)}
                        className="text-center text-2xl font-bold h-14"
                      />
                      <div className="flex gap-1 mt-2 justify-center">
                        <Button size="sm" variant="outline" onClick={() => updateSetScore(idx, 2, -1)}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={() => updateSetScore(idx, 2, 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add Set Button */}
              {currentScores.length < (setsToWin * 2 - 1) && (
                <Button variant="outline" className="w-full" onClick={addSet}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Set
                </Button>
              )}
              
              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedMatch(null)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={() => saveScore(false)}
                  disabled={saving}
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  onClick={() => saveScore(true)}
                  disabled={saving}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Matches List */}
      <div className="max-w-2xl mx-auto space-y-3">
        <h2 className="font-heading text-lg uppercase flex items-center gap-2">
          <Users className="w-5 h-5" />
          Group {groupNumber} Matches
        </h2>
        
        {groupData?.matches?.sort((a, b) => a.match_number - b.match_number).map((match) => {
          const p1Sets = (match.scores || []).filter(s => s.score1 > s.score2).length;
          const p2Sets = (match.scores || []).filter(s => s.score2 > s.score1).length;
          
          return (
            <Card 
              key={match.id}
              className={`cursor-pointer transition-all ${
                match.status === 'completed' 
                  ? 'bg-muted/30 border-green-500/30' 
                  : match.status === 'live'
                  ? 'border-red-500 bg-red-500/10'
                  : 'hover:border-primary/50'
              } ${!hasLock && match.status !== 'completed' ? 'opacity-60' : ''}`}
              onClick={() => match.status !== 'completed' && selectMatch(match)}
              data-testid={`group-match-${match.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">M{match.match_number}</span>
                      {match.status === 'live' && (
                        <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
                      )}
                      {match.status === 'completed' && (
                        <Badge className="bg-green-500">Done</Badge>
                      )}
                      {match.score_status === 'pending' && match.scores?.length > 0 && (
                        <Badge className="bg-yellow-500">Pending Confirm</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className={`font-medium ${match.winner_id === match.participant1_id ? 'text-green-400' : ''}`}>
                          {match.participant1_name}
                        </p>
                        <p className={`font-medium ${match.winner_id === match.participant2_id ? 'text-green-400' : ''}`}>
                          {match.participant2_name}
                        </p>
                      </div>
                      {match.scores?.length > 0 && (
                        <div className="text-right">
                          <p className="font-teko text-3xl">{p1Sets}</p>
                          <p className="font-teko text-3xl">{p2Sets}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {match.status !== 'completed' && hasLock && (
                    <div className="ml-4">
                      <Button size="sm" variant="outline">
                        Score
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default GroupScorer;
