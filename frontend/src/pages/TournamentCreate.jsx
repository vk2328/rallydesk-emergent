import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, SPORTS } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
    venue: '',
    timezone: 'UTC',
    description: '',
    min_rest_minutes: 10,
    buffer_minutes: 5
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
        name: formData.name,
        venue: formData.venue || null,
        timezone: formData.timezone,
        start_date: startDate.toISOString(),
        end_date: endDate ? endDate.toISOString() : null,
        description: formData.description || null,
        settings: {
          min_rest_minutes: formData.min_rest_minutes,
          buffer_minutes: formData.buffer_minutes,
          default_duration_minutes: {
            table_tennis: 20,
            badminton: 30,
            volleyball: 45,
            tennis: 60,
            pickleball: 25
          },
          scorekeeper_can_assign: true
        }
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
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g., City Sports Hall"
                  data-testid="tournament-venue-input"
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

          {/* Schedule */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase text-lg">Schedule</CardTitle>
              <CardDescription>Tournament dates and timing</CardDescription>
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

          {/* Settings */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase text-lg">Tournament Settings</CardTitle>
              <CardDescription>Configure scheduling rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_rest">Min Rest Between Matches (minutes)</Label>
                  <Input
                    id="min_rest"
                    type="number"
                    min="0"
                    max="60"
                    value={formData.min_rest_minutes}
                    onChange={(e) => setFormData({ ...formData, min_rest_minutes: parseInt(e.target.value) || 10 })}
                    data-testid="tournament-minrest-input"
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buffer">Buffer Time Between Matches (minutes)</Label>
                  <Input
                    id="buffer"
                    type="number"
                    min="0"
                    max="30"
                    value={formData.buffer_minutes}
                    onChange={(e) => setFormData({ ...formData, buffer_minutes: parseInt(e.target.value) || 5 })}
                    data-testid="tournament-buffer-input"
                    className="bg-background/50"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                These settings help ensure players have adequate rest between matches.
              </p>
            </CardContent>
          </Card>

          {/* Supported Sports */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="font-heading uppercase text-lg">Supported Sports</CardTitle>
              <CardDescription>This tournament can support competitions in these sports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {SPORTS.map((sport) => (
                  <div
                    key={sport.value}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40"
                  >
                    <span className="text-lg">{sport.icon}</span>
                    <span className="text-sm">{sport.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                After creating the tournament, you can add players, resources, divisions, and competitions for each sport.
              </p>
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
