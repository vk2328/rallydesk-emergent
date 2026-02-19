import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, Trophy, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

const TournamentCreate = () => {
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sport: 'table_tennis',
    format: 'single_elimination',
    match_type: 'singles',
    max_participants: 16,
    description: '',
    sets_to_win: 3,
    points_per_set: 11
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null
      };
      
      const response = await axios.post(`${API_URL}/tournaments`, payload, {
        headers: getAuthHeader()
      });
      
      toast.success('Tournament created successfully!');
      navigate(`/tournaments/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto" data-testid="tournament-create-page">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/tournaments')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournaments
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
              Create Tournament
            </h1>
            <p className="text-muted-foreground mt-1">
              Set up a new tournament event
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase text-lg">Basic Information</CardTitle>
              <CardDescription>Tournament name and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tournament Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Championship 2025"
                  required
                  data-testid="tournament-name-input"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tournament details, rules, prizes..."
                  rows={3}
                  data-testid="tournament-description-input"
                  className="bg-background/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sport & Format */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase text-lg">Sport & Format</CardTitle>
              <CardDescription>Choose the sport and tournament format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sport *</Label>
                  <Select value={formData.sport} onValueChange={(v) => setFormData({ ...formData, sport: v })}>
                    <SelectTrigger data-testid="tournament-sport-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table_tennis">🏓 Table Tennis</SelectItem>
                      <SelectItem value="badminton">🏸 Badminton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Match Type *</Label>
                  <Select value={formData.match_type} onValueChange={(v) => setFormData({ ...formData, match_type: v })}>
                    <SelectTrigger data-testid="tournament-matchtype-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="singles">Singles</SelectItem>
                      <SelectItem value="doubles">Doubles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tournament Format *</Label>
                <Select value={formData.format} onValueChange={(v) => setFormData({ ...formData, format: v })}>
                  <SelectTrigger data-testid="tournament-format-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_elimination">Single Elimination</SelectItem>
                    <SelectItem value="double_elimination">Double Elimination</SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.format === 'single_elimination' && 'One loss and you\'re out. Classic knockout format.'}
                  {formData.format === 'double_elimination' && 'Two losses to be eliminated. Winners and losers brackets.'}
                  {formData.format === 'round_robin' && 'Everyone plays everyone. Best for smaller groups.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase text-lg">Match Settings</CardTitle>
              <CardDescription>Configure scoring rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_participants">Max Participants</Label>
                  <Select 
                    value={formData.max_participants.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, max_participants: parseInt(v) })}
                  >
                    <SelectTrigger data-testid="tournament-maxparticipants-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="16">16</SelectItem>
                      <SelectItem value="32">32</SelectItem>
                      <SelectItem value="64">64</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sets_to_win">Sets to Win</Label>
                  <Select 
                    value={formData.sets_to_win.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, sets_to_win: parseInt(v) })}
                  >
                    <SelectTrigger data-testid="tournament-setstowin-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (Best of 1)</SelectItem>
                      <SelectItem value="2">2 (Best of 3)</SelectItem>
                      <SelectItem value="3">3 (Best of 5)</SelectItem>
                      <SelectItem value="4">4 (Best of 7)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points_per_set">Points per Set</Label>
                  <Select 
                    value={formData.points_per_set.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, points_per_set: parseInt(v) })}
                  >
                    <SelectTrigger data-testid="tournament-pointsperset-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11">11 (Standard TT)</SelectItem>
                      <SelectItem value="21">21 (Standard Badminton)</SelectItem>
                      <SelectItem value="15">15 (Short Format)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase text-lg">Schedule</CardTitle>
              <CardDescription>Tournament dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background/50",
                          !startDate && "text-muted-foreground"
                        )}
                        data-testid="tournament-startdate-btn"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background/50",
                          !endDate && "text-muted-foreground"
                        )}
                        data-testid="tournament-enddate-btn"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(date) => startDate && date < startDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/tournaments')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="font-bold uppercase tracking-wider"
              disabled={loading}
              data-testid="tournament-create-submit"
            >
              {loading ? 'Creating...' : 'Create Tournament'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TournamentCreate;
