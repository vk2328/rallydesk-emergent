import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatStatus, getStatusColor, getSportIcon, getPlayerName } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Minus, Trophy, RotateCcw, Check, QrCode, Copy, Edit2, Save, AlertTriangle, RefreshCw, Wifi, CheckCircle2, Clock } from 'lucide-react';

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
  
  // QR Code state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  
  // Score override state
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [editingSetIndex, setEditingSetIndex] = useState(null);
  const [editScore1, setEditScore1] = useState(0);
  const [editScore2, setEditScore2] = useState(0);
  const [savingOverride, setSavingOverride] = useState(false);
  
  // Score status and live update tracking
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const [confirmingScore, setConfirmingScore] = useState(false);
  const previousScoresRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Allow scoring for admin, scorekeeper, or any authenticated user (tournament owner is checked on backend)
  const canScore = user && (user.role === 'admin' || user.role === 'scorekeeper' || user.role === 'viewer');

  useEffect(() => {
    fetchMatch();
    
    // Set up polling for live score updates (every 5 seconds when match is live)
    pollIntervalRef.current = setInterval(() => {
      if (match?.status === 'live' || match?.status === 'pending') {
        fetchMatchSilent();
      }
    }, 5000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [tournamentId, matchId]);

  // Silent fetch for polling (doesn't show loading state)
  const fetchMatchSilent = async () => {
    try {
      const matchRes = await axios.get(`${API_URL}/tournaments/${tournamentId}/matches/${matchId}`, {
        headers: getAuthHeader()
      });
      
      const newMatch = matchRes.data;
      
      // Check if scores changed (referee updated remotely)
      if (previousScoresRef.current) {
        const prevScores = JSON.stringify(previousScoresRef.current);
        const newScores = JSON.stringify(newMatch.scores || []);
        
        if (prevScores !== newScores) {
          setHasNewUpdates(true);
          setLastUpdateTime(new Date());
          toast.success('Scores updated by referee!', {
            icon: <Wifi className="w-4 h-4 text-green-500" />
          });
        }
      }
      
      previousScoresRef.current = newMatch.scores || [];
      setMatch(newMatch);
      
      // Update local scores from fetched data
      if (newMatch.scores?.length > 0) {
        setSets(newMatch.scores);
        const lastSet = newMatch.scores[newMatch.scores.length - 1];
        if (lastSet) {
          setCurrentSet(newMatch.scores.length);
          setScore1(lastSet.score1 || 0);
          setScore2(lastSet.score2 || 0);
        }
      }
    } catch (error) {
      console.error('Silent fetch error:', error);
    }
  };

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

  const handleGenerateQR = async () => {
    setGeneratingQr(true);
    try {
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/matches/${matchId}/referee-access`,
        {},
        { headers: getAuthHeader() }
      );
      setQrData(response.data);
      setQrDialogOpen(true);
    } catch (error) {
      console.error('QR generation error:', error);
      toast.error('Failed to generate referee access code');
    } finally {
      setGeneratingQr(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Open override dialog for a specific set
  const openOverrideDialog = (setIndex) => {
    const setData = sets[setIndex];
    setEditingSetIndex(setIndex);
    setEditScore1(setData.score1);
    setEditScore2(setData.score2);
    setOverrideDialogOpen(true);
  };

  // Save the overridden scores
  const handleSaveOverride = async () => {
    if (editingSetIndex === null) return;
    
    setSavingOverride(true);
    try {
      // Update the local sets array
      const updatedSets = [...sets];
      updatedSets[editingSetIndex] = {
        ...updatedSets[editingSetIndex],
        score1: editScore1,
        score2: editScore2
      };
      
      // Recalculate winner if match was completed
      const p1SetsWon = updatedSets.filter(s => s.score1 > s.score2).length;
      const p2SetsWon = updatedSets.filter(s => s.score2 > s.score1).length;
      
      let winnerId = null;
      let newStatus = match.status;
      
      if (p1SetsWon >= setsToWin) {
        winnerId = match.participant1_id;
        newStatus = 'completed';
      } else if (p2SetsWon >= setsToWin) {
        winnerId = match.participant2_id;
        newStatus = 'completed';
      } else if (match.status === 'completed') {
        // If match was completed but now no one has enough sets, revert to live
        newStatus = 'live';
      }
      
      // Save to backend
      await axios.put(
        `${API_URL}/tournaments/${tournamentId}/matches/${matchId}/scores`,
        {
          scores: updatedSets,
          status: newStatus,
          winner_id: winnerId
        },
        { headers: getAuthHeader() }
      );
      
      setSets(updatedSets);
      setOverrideDialogOpen(false);
      toast.success('Score updated successfully');
      fetchMatch(); // Refresh match data
    } catch (error) {
      console.error('Override error:', error);
      toast.error('Failed to update score');
    } finally {
      setSavingOverride(false);
    }
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
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          {/* QR Code Button */}
          {canScore && match.status !== 'completed' && (
            <Button 
              variant="outline" 
              onClick={handleGenerateQR}
              disabled={generatingQr}
              data-testid="generate-qr-btn"
            >
              <QrCode className="w-4 h-4 mr-2" />
              {generatingQr ? 'Generating...' : 'Referee QR Code'}
            </Button>
          )}
        </div>
        
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
                {match.status === 'live' ? `Set ${currentSet} - Current Score` : 'Ready to Start'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Show score controls only when match is live */}
              {match.status === 'live' && (
                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Player 1 Score */}
                  <div className="text-center">
                    {canScore ? (
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={score1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setScore1(Math.max(0, Math.min(99, val)));
                        }}
                        className="font-teko text-6xl md:text-8xl font-bold text-center bg-transparent border-2 border-dashed border-primary/30 rounded-xl w-32 md:w-40 mx-auto focus:outline-none focus:border-primary"
                        data-testid="p1-score-input"
                      />
                    ) : (
                      <p className="font-teko text-7xl md:text-9xl font-bold">{score1}</p>
                    )}
                    {canScore && (
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
                    {canScore ? (
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={score2}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setScore2(Math.max(0, Math.min(99, val)));
                        }}
                        className="font-teko text-6xl md:text-8xl font-bold text-center bg-transparent border-2 border-dashed border-secondary/30 rounded-xl w-32 md:w-40 mx-auto focus:outline-none focus:border-secondary"
                        data-testid="p2-score-input"
                      />
                    ) : (
                      <p className="font-teko text-7xl md:text-9xl font-bold">{score2}</p>
                    )}
                    {canScore && (
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
              )}

              {/* Set Actions - only when live */}
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

              {/* Start Match Button - show for pending or scheduled */}
              {canScore && (match.status === 'pending' || match.status === 'scheduled') && (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {match.status === 'scheduled' ? 'Match is ready. Start when players are at the table.' : 'Click to begin the match'}
                  </p>
                  <Button
                    size="lg"
                    onClick={handleStartMatch}
                    className="font-bold uppercase tracking-wider bg-green-600 hover:bg-green-700 px-8 py-6 text-lg"
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
              <CardTitle className="font-heading uppercase flex items-center justify-between">
                <span>Set History</span>
                {canScore && (
                  <span className="text-xs font-normal text-muted-foreground">
                    Click edit to correct scores
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sets.map((set, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group"
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
                      {canScore && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          onClick={() => openOverrideDialog(idx)}
                          data-testid={`edit-set-${idx}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
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

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Referee Access Code
            </DialogTitle>
          </DialogHeader>
          
          {qrData && (
            <div className="space-y-4">
              {/* QR Code Image */}
              {qrData.qr_code && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={qrData.qr_code} 
                    alt="QR Code for referee access" 
                    className="w-48 h-48"
                  />
                </div>
              )}
              
              {/* OTP Code */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Or use this code:</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-3xl font-bold tracking-widest bg-muted px-4 py-2 rounded">
                    {qrData.code}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(qrData.code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Scoring URL */}
              {qrData.scoring_url && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Scoring URL:</p>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs break-all">
                    <span className="flex-1">{qrData.scoring_url}</span>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => copyToClipboard(qrData.scoring_url)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground text-center">
                Share this QR code or OTP with the referee to allow them to enter scores.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Score Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Edit Set {editingSetIndex !== null ? editingSetIndex + 1 : ''} Score
            </DialogTitle>
            <DialogDescription>
              Manually correct the score for this set. This will recalculate the match result if needed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="edit-score1" className="text-sm text-muted-foreground mb-1 block">
                  {participant1Name}
                </Label>
                <Input
                  id="edit-score1"
                  type="number"
                  min="0"
                  max="99"
                  value={editScore1}
                  onChange={(e) => setEditScore1(parseInt(e.target.value) || 0)}
                  className="font-teko text-3xl text-center h-14"
                />
              </div>
              
              <span className="text-2xl text-muted-foreground mt-6">-</span>
              
              <div className="flex-1">
                <Label htmlFor="edit-score2" className="text-sm text-muted-foreground mb-1 block">
                  {participant2Name}
                </Label>
                <Input
                  id="edit-score2"
                  type="number"
                  min="0"
                  max="99"
                  value={editScore2}
                  onChange={(e) => setEditScore2(parseInt(e.target.value) || 0)}
                  className="font-teko text-3xl text-center h-14"
                />
              </div>
            </div>
            
            {editScore1 === editScore2 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>A set cannot end in a tie</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setOverrideDialogOpen(false)}
              disabled={savingOverride}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveOverride}
              disabled={savingOverride || editScore1 === editScore2}
            >
              {savingOverride ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchScoreboard;
