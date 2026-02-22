import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { 
  Users, Trophy, Play, ChevronRight, 
  Award, Swords, ArrowRightCircle, Loader2, QrCode, Copy
} from 'lucide-react';
import { API_URL, formatStatus, getStatusColor } from '../../lib/utils';

const GroupStageView = ({ 
  tournamentId, 
  competitionId, 
  competition,
  matches, 
  participants, 
  getAuthHeader, 
  isAdmin,
  onRefresh 
}) => {
  const navigate = useNavigate();
  const [generatingKnockout, setGeneratingKnockout] = useState(false);
  const [groupStandings, setGroupStandings] = useState({});
  
  // QR Code state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [selectedGroupForQr, setSelectedGroupForQr] = useState(null);
  
  // Group matches by group_number
  const groupMatches = matches.reduce((acc, match) => {
    const groupNum = match.group_number || 0;
    // Only include group stage matches (not knockout)
    if (match.round_number < 100) {
      if (!acc[groupNum]) acc[groupNum] = [];
      acc[groupNum].push(match);
    }
    return acc;
  }, {});

  // Get knockout matches
  const knockoutMatches = matches.filter(m => m.round_number >= 100);

  // Calculate standings for each group
  useEffect(() => {
    const standings = {};
    
    Object.entries(groupMatches).forEach(([groupNum, groupMatchList]) => {
      const groupParticipants = new Set();
      const stats = {};
      
      // Collect all participants in this group
      groupMatchList.forEach(match => {
        if (match.participant1_id) groupParticipants.add(match.participant1_id);
        if (match.participant2_id) groupParticipants.add(match.participant2_id);
      });
      
      // Initialize stats for each participant
      groupParticipants.forEach(pid => {
        const participant = participants.find(p => p.id === pid);
        stats[pid] = {
          id: pid,
          name: participant ? 
            `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || participant.name || 'Unknown' 
            : 'Unknown',
          played: 0,
          wins: 0,
          losses: 0,
          setsFor: 0,
          setsAgainst: 0,
          pointsFor: 0,
          pointsAgainst: 0
        };
      });
      
      // Calculate stats from completed matches
      groupMatchList.forEach(match => {
        if (match.status === 'completed' && match.participant1_id && match.participant2_id) {
          const p1 = match.participant1_id;
          const p2 = match.participant2_id;
          
          if (stats[p1]) stats[p1].played += 1;
          if (stats[p2]) stats[p2].played += 1;
          
          if (match.winner_id === p1) {
            if (stats[p1]) stats[p1].wins += 1;
            if (stats[p2]) stats[p2].losses += 1;
          } else if (match.winner_id === p2) {
            if (stats[p2]) stats[p2].wins += 1;
            if (stats[p1]) stats[p1].losses += 1;
          }
          
          // Calculate sets and points from scores
          (match.scores || []).forEach(score => {
            const s1 = score.score1 || 0;
            const s2 = score.score2 || 0;
            
            if (stats[p1]) {
              stats[p1].pointsFor += s1;
              stats[p1].pointsAgainst += s2;
              if (s1 > s2) stats[p1].setsFor += 1;
              else if (s2 > s1) stats[p1].setsAgainst += 1;
            }
            if (stats[p2]) {
              stats[p2].pointsFor += s2;
              stats[p2].pointsAgainst += s1;
              if (s2 > s1) stats[p2].setsFor += 1;
              else if (s1 > s2) stats[p2].setsAgainst += 1;
            }
          });
        }
      });
      
      // Sort by wins, then point difference
      const sorted = Object.values(stats).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const aDiff = a.pointsFor - a.pointsAgainst;
        const bDiff = b.pointsFor - b.pointsAgainst;
        return bDiff - aDiff;
      });
      
      standings[groupNum] = sorted;
    });
    
    setGroupStandings(standings);
  }, [matches, participants]);

  // Check if group stage is complete
  const groupStageMatches = Object.values(groupMatches).flat();
  const completedGroupMatches = groupStageMatches.filter(m => m.status === 'completed').length;
  const totalGroupMatches = groupStageMatches.length;
  const groupStageComplete = totalGroupMatches > 0 && completedGroupMatches === totalGroupMatches;
  const knockoutGenerated = knockoutMatches.length > 0;

  const handleGenerateKnockout = async () => {
    if (!groupStageComplete) {
      toast.error('Complete all group stage matches first');
      return;
    }
    
    setGeneratingKnockout(true);
    try {
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/generate-knockout`,
        {},
        { headers: getAuthHeader() }
      );
      toast.success(response.data.message || 'Knockout bracket generated!');
      onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate knockout bracket');
    } finally {
      setGeneratingKnockout(false);
    }
  };

  const handleGenerateGroupQR = async (groupNum) => {
    setGeneratingQr(true);
    setSelectedGroupForQr(groupNum);
    try {
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}/group/${groupNum}/scorer-access`,
        {},
        { headers: getAuthHeader() }
      );
      setQrData(response.data);
      setQrDialogOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate QR code');
    } finally {
      setGeneratingQr(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getParticipantName = (participantId) => {
    if (!participantId) return 'TBD';
    const participant = participants.find(p => p.id === participantId);
    if (participant) {
      return `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || participant.name || 'Unknown';
    }
    return 'Unknown';
  };

  const numGroups = Object.keys(groupMatches).length;
  const advancePerGroup = competition?.advance_per_group || 2;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="bg-card border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg uppercase tracking-wider">Group Stage Progress</h3>
              <p className="text-sm text-muted-foreground">
                {completedGroupMatches} / {totalGroupMatches} matches completed
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${totalGroupMatches > 0 ? (completedGroupMatches / totalGroupMatches) * 100 : 0}%` }}
                />
              </div>
              {groupStageComplete && !knockoutGenerated && isAdmin && (
                <Button 
                  onClick={handleGenerateKnockout}
                  disabled={generatingKnockout}
                  className="font-bold uppercase tracking-wider"
                  data-testid="generate-knockout-btn"
                >
                  {generatingKnockout ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ArrowRightCircle className="w-4 h-4 mr-2" />
                      Generate Knockout
                    </>
                  )}
                </Button>
              )}
              {knockoutGenerated && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Knockout Generated
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group Tables */}
      <div className={`grid gap-6 ${numGroups === 1 ? 'grid-cols-1' : numGroups === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
        {Object.entries(groupMatches).sort((a, b) => Number(a[0]) - Number(b[0])).map(([groupNum, groupMatchList]) => (
          <Card key={groupNum} className="bg-card border-border/40" data-testid={`group-${groupNum}`}>
            <CardHeader className="pb-2">
              <CardTitle className="font-heading uppercase flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Group {groupNum}
              </CardTitle>
              <CardDescription>
                {groupMatchList.filter(m => m.status === 'completed').length} / {groupMatchList.length} matches played
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Standings Table */}
              <div className="border border-border/40 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Player</th>
                      <th className="text-center p-2 font-medium">P</th>
                      <th className="text-center p-2 font-medium">W</th>
                      <th className="text-center p-2 font-medium">L</th>
                      <th className="text-center p-2 font-medium">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(groupStandings[groupNum] || []).map((player, idx) => {
                      const qualifies = idx < advancePerGroup;
                      return (
                        <tr 
                          key={player.id} 
                          className={`border-t border-border/30 ${qualifies ? 'bg-green-500/10' : ''}`}
                          data-testid={`standings-row-${player.id}`}
                        >
                          <td className="p-2">
                            <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                              qualifies ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-2 font-medium truncate max-w-[120px]" title={player.name}>
                            {player.name}
                            {qualifies && <ArrowRightCircle className="w-3 h-3 inline ml-1 text-green-400" />}
                          </td>
                          <td className="text-center p-2 text-muted-foreground">{player.played}</td>
                          <td className="text-center p-2 text-green-400 font-medium">{player.wins}</td>
                          <td className="text-center p-2 text-red-400 font-medium">{player.losses}</td>
                          <td className="text-center p-2">
                            <span className={player.pointsFor - player.pointsAgainst >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {player.pointsFor - player.pointsAgainst >= 0 ? '+' : ''}{player.pointsFor - player.pointsAgainst}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Group Matches */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Swords className="w-3 h-3" />
                  Matches
                </h4>
                <div className="space-y-1.5">
                  {groupMatchList.map(match => (
                    <div 
                      key={match.id}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${
                        match.status === 'live' ? 'border-red-500 bg-red-500/5' : 
                        match.status === 'completed' ? 'border-border/40 bg-muted/20' : 'border-border/40'
                      }`}
                      onClick={() => match.participant1_id && match.participant2_id && navigate(`/tournaments/${tournamentId}/matches/${match.id}`)}
                      data-testid={`group-match-${match.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground w-6">M{match.match_number}</span>
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <span className={`truncate text-sm ${match.winner_id === match.participant1_id ? 'font-semibold text-green-400' : ''}`}>
                            {getParticipantName(match.participant1_id)}
                          </span>
                          <span className="text-muted-foreground text-xs mx-1">vs</span>
                          <span className={`truncate text-sm ${match.winner_id === match.participant2_id ? 'font-semibold text-green-400' : ''}`}>
                            {getParticipantName(match.participant2_id)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {match.scores?.length > 0 && (
                          <span className="font-teko text-lg">
                            {match.scores.filter(s => s.score1 > s.score2).length}-{match.scores.filter(s => s.score2 > s.score1).length}
                          </span>
                        )}
                        <Badge className={`${getStatusColor(match.status)} text-xs`}>
                          {formatStatus(match.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Knockout Stage Section (if generated) */}
      {knockoutGenerated && (
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle className="font-heading uppercase flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Knockout Stage
            </CardTitle>
            <CardDescription>
              {knockoutMatches.filter(m => m.status === 'completed').length} / {knockoutMatches.length} matches completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="flex gap-8 min-w-max pb-4">
                {/* Group knockout matches by round */}
                {Object.entries(
                  knockoutMatches.reduce((acc, match) => {
                    const round = match.round_number;
                    if (!acc[round]) acc[round] = [];
                    acc[round].push(match);
                    return acc;
                  }, {})
                ).sort((a, b) => Number(a[0]) - Number(b[0])).map(([round, roundMatches]) => (
                  <div key={round} className="min-w-[280px]">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                      {getRoundName(Number(round), knockoutMatches)}
                    </h3>
                    <div className="space-y-3">
                      {roundMatches.map(match => (
                        <div
                          key={match.id}
                          className={`border rounded-lg overflow-hidden transition-colors cursor-pointer hover:border-primary/50 ${
                            match.status === 'live' ? 'border-red-500 animate-pulse' : 'border-border/40'
                          }`}
                          onClick={() => match.participant1_id && match.participant2_id && navigate(`/tournaments/${tournamentId}/matches/${match.id}`)}
                          data-testid={`knockout-match-${match.id}`}
                        >
                          {/* Participant 1 */}
                          <div className={`p-3 flex items-center justify-between ${
                            match.winner_id === match.participant1_id ? 'bg-green-500/10' : 'bg-muted/30'
                          }`}>
                            <div className="flex items-center gap-2">
                              {match.winner_id === match.participant1_id && (
                                <Award className="w-4 h-4 text-green-500" />
                              )}
                              <span className={match.winner_id === match.participant1_id ? 'font-semibold' : ''}>
                                {getParticipantName(match.participant1_id)}
                              </span>
                            </div>
                            {match.scores?.length > 0 && (
                              <span className="font-teko text-xl">
                                {match.scores.filter(s => s.score1 > s.score2).length}
                              </span>
                            )}
                          </div>
                          
                          <div className="border-t border-border/40" />
                          
                          {/* Participant 2 */}
                          <div className={`p-3 flex items-center justify-between ${
                            match.winner_id === match.participant2_id ? 'bg-green-500/10' : 'bg-muted/30'
                          }`}>
                            <div className="flex items-center gap-2">
                              {match.winner_id === match.participant2_id && (
                                <Award className="w-4 h-4 text-green-500" />
                              )}
                              <span className={match.winner_id === match.participant2_id ? 'font-semibold' : ''}>
                                {getParticipantName(match.participant2_id)}
                              </span>
                            </div>
                            {match.scores?.length > 0 && (
                              <span className="font-teko text-xl">
                                {match.scores.filter(s => s.score2 > s.score1).length}
                              </span>
                            )}
                          </div>
                          
                          {/* Match action */}
                          {match.participant1_id && match.participant2_id && match.status !== 'completed' && (
                            <div className="p-2 bg-muted/20 border-t border-border/40">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/tournaments/${tournamentId}/matches/${match.id}`);
                                }}
                              >
                                {match.status === 'live' ? 'Continue Match' : 'Start Match'}
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
          <span>Qualifies for knockout (Top {advancePerGroup})</span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowRightCircle className="w-3 h-3 text-green-400" />
          <span>Advancing</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to get round name for knockout stage
function getRoundName(roundNumber, allMatches) {
  const knockoutRounds = [...new Set(allMatches.map(m => m.round_number))].sort((a, b) => a - b);
  const roundIndex = knockoutRounds.indexOf(roundNumber);
  const totalRounds = knockoutRounds.length;
  const fromEnd = totalRounds - roundIndex;
  
  if (fromEnd === 1) return 'Final';
  if (fromEnd === 2) return 'Semi-Final';
  if (fromEnd === 3) return 'Quarter-Final';
  return `Round ${roundIndex + 1}`;
}

export default GroupStageView;
