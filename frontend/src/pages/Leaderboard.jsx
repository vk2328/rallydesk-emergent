import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL, formatSport, getSportColor } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Trophy, Medal, TrendingUp, ArrowLeft, Home } from 'lucide-react';

const Leaderboard = () => {
  const { sport } = useParams();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [sport]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Public endpoint - no auth needed
      const response = await axios.get(`${API_URL}/leaderboard/${sport}`);
      console.log('Leaderboard data:', response.data);
      setLeaderboard(response.data || []);
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      setError(error.message);
      toast.error('Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-full bg-zinc-400/20 flex items-center justify-center">
            <Medal className="w-5 h-5 text-zinc-400" />
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 rounded-full bg-orange-700/20 flex items-center justify-center">
            <Medal className="w-5 h-5 text-orange-700" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <span className="font-teko text-xl text-muted-foreground">{rank}</span>
          </div>
        );
    }
  };

  const getSkillBadgeColor = (level) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'advanced': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'pro': return 'bg-table-tennis/20 text-table-tennis border-table-tennis/30';
      default: return 'bg-zinc-700 text-zinc-300';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const sportNames = {
    'table_tennis': 'Table Tennis',
    'badminton': 'Badminton',
    'volleyball': 'Volleyball',
    'tennis': 'Tennis',
    'pickleball': 'Pickleball'
  };
  
  const sportEmojis = {
    'table_tennis': '🏓',
    'badminton': '🏸',
    'volleyball': '🏐',
    'tennis': '🎾',
    'pickleball': '🥒'
  };

  const sportName = sportNames[sport] || sport;
  const sportEmoji = sportEmojis[sport] || '🏆';

  return (
    <div className="p-6 space-y-6" data-testid="leaderboard-page">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
          <Home className="w-4 h-4" />
          Home
        </Button>
      </div>

      {/* Header */}
      <div 
        className="relative rounded-xl overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.7)), url('https://images.pexels.com/photos/6250947/pexels-photo-6250947.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="p-8 md:p-12">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-5xl">{sportEmoji}</span>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase text-white drop-shadow-lg">
                {sportName}
              </h1>
              <p className="text-xl text-zinc-200 drop-shadow-md">
                Leaderboard
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <Card className="bg-card border-border/40">
        <CardHeader>
          <CardTitle className="font-heading uppercase flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Player Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12 text-red-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Error loading leaderboard</p>
              <p className="text-sm mt-1">{error}</p>
              <Button variant="outline" onClick={fetchLeaderboard} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                    player.rank <= 3 
                      ? 'bg-muted/50 border border-border/40' 
                      : 'bg-muted/20 hover:bg-muted/30'
                  }`}
                  data-testid={`leaderboard-player-${player.id}`}
                >
                  <div className="flex items-center gap-4">
                    {getRankBadge(player.rank)}
                    <div>
                      <h3 className={`font-semibold ${player.rank <= 3 ? 'text-lg' : ''}`}>
                        {player.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getSkillBadgeColor(player.skill_level)}>
                          {player.skill_level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="font-teko text-3xl text-green-400">{player.wins}</p>
                      <p className="text-xs text-muted-foreground uppercase">Wins</p>
                    </div>
                    <div className="text-center">
                      <p className="font-teko text-3xl text-red-400">{player.losses}</p>
                      <p className="text-xs text-muted-foreground uppercase">Losses</p>
                    </div>
                    <div className="text-center">
                      <p className="font-teko text-3xl">{player.matches_played}</p>
                      <p className="text-xs text-muted-foreground uppercase">Played</p>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <p className={`font-teko text-3xl ${
                        player.win_rate >= 70 ? 'text-green-400' : 
                        player.win_rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {player.win_rate}%
                      </p>
                      <p className="text-xs text-muted-foreground uppercase">Win Rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No players with match history yet</p>
              <p className="text-sm mt-1">Complete some {sportName} matches to see rankings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
