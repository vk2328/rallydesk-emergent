import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, SPORTS, FORMATS, PARTICIPANT_TYPES, formatFormat, formatStatus, getStatusColor, getSportIcon, getPlayerName } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2, Award, ArrowRight, Play, RotateCcw } from 'lucide-react';

const TournamentCompetitions = () => {
  const { tournamentId } = useParams();
  const { getAuthHeader, isAdmin } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    division_id: '',
    sport: 'table_tennis',
    discipline: 'singles',
    format: 'round_robin',
    participant_type: 'single',
    num_groups: 1,
    advance_per_group: 2,
    scoring_rules: {
      sets_to_win: 3,
      points_per_set: 11,
      win_by_two: true
    }
  });

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      const [compRes, divRes] = await Promise.all([
        axios.get(`${API_URL}/tournaments/${tournamentId}/competitions`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/tournaments/${tournamentId}/divisions`, { headers: getAuthHeader() })
      ]);
      setCompetitions(compRes.data);
      setDivisions(divRes.data);
    } catch (error) {
      toast.error('Failed to fetch competitions');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', division_id: '', sport: 'table_tennis', discipline: 'singles',
      format: 'round_robin', participant_type: 'single', num_groups: 1, advance_per_group: 2,
      scoring_rules: { sets_to_win: 3, points_per_set: 11, win_by_two: true }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/tournaments/${tournamentId}/competitions`, {
        ...formData,
        division_id: formData.division_id || null
      }, { headers: getAuthHeader() });
      toast.success('Competition created');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create competition');
    }
  };

  const handleDelete = async (competitionId) => {
    if (!window.confirm('Delete this competition and all its matches?')) return;
    try {
      await axios.delete(`${API_URL}/tournaments/${tournamentId}/competitions/${competitionId}`, {
        headers: getAuthHeader()
      });
      toast.success('Competition deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete competition');
    }
  };

  if (loading) {
    return <div className="p-6"><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="p-6 space-y-6" data-testid="tournament-competitions">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight uppercase">Competitions</h1>
          <p className="text-muted-foreground text-sm">Manage brackets and events</p>
        </div>
        {isAdmin() && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> New Competition</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading uppercase">Create Competition</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Men's Singles Championship" className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label>Division (optional)</Label>
                  <Select value={formData.division_id} onValueChange={(v) => setFormData({...formData, division_id: v})}>
                    <SelectTrigger><SelectValue placeholder="No division" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No division</SelectItem>
                      {divisions.map(div => (
                        <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sport</Label>
                    <Select value={formData.sport} onValueChange={(v) => setFormData({...formData, sport: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SPORTS.map(sport => (
                          <SelectItem key={sport.value} value={sport.value}>{sport.icon} {sport.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Discipline</Label>
                    <Select value={formData.discipline} onValueChange={(v) => setFormData({...formData, discipline: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="singles">Singles</SelectItem>
                        <SelectItem value="doubles">Doubles</SelectItem>
                        <SelectItem value="mixed_doubles">Mixed Doubles</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select value={formData.format} onValueChange={(v) => setFormData({...formData, format: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMATS.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Participant Type</Label>
                    <Select value={formData.participant_type} onValueChange={(v) => setFormData({...formData, participant_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PARTICIPANT_TYPES.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.format === 'groups_knockout' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Number of Groups</Label>
                      <Input type="number" min="1" max="16" value={formData.num_groups} onChange={(e) => setFormData({...formData, num_groups: parseInt(e.target.value)})} className="bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Advance per Group</Label>
                      <Input type="number" min="1" max="8" value={formData.advance_per_group} onChange={(e) => setFormData({...formData, advance_per_group: parseInt(e.target.value)})} className="bg-background/50" />
                    </div>
                  </div>
                )}
                <div className="border-t border-border/40 pt-4">
                  <Label className="text-sm font-semibold">Scoring Rules</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Sets to Win</Label>
                      <Select value={formData.scoring_rules.sets_to_win.toString()} onValueChange={(v) => setFormData({...formData, scoring_rules: {...formData.scoring_rules, sets_to_win: parseInt(v)}})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 (Best of 1)</SelectItem>
                          <SelectItem value="2">2 (Best of 3)</SelectItem>
                          <SelectItem value="3">3 (Best of 5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Points per Set</Label>
                      <Select value={formData.scoring_rules.points_per_set.toString()} onValueChange={(v) => setFormData({...formData, scoring_rules: {...formData.scoring_rules, points_per_set: parseInt(v)}})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="11">11</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="21">21</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full font-bold uppercase">Create Competition</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Competitions Grid */}
      {competitions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.map((comp) => (
            <Card key={comp.id} className="bg-card border-border/40 hover:border-primary/50 transition-colors group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
                    <span className="text-2xl">{getSportIcon(comp.sport)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(comp.status)}>{formatStatus(comp.status)}</Badge>
                    {isAdmin() && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(comp.id)} 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardTitle className="mt-3 text-lg">{comp.name}</CardTitle>
                <CardDescription>
                  {formatFormat(comp.format)} • {comp.participant_type === 'single' ? 'Singles' : comp.participant_type === 'pair' ? 'Pairs' : 'Teams'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {comp.participant_ids?.length || 0} participants
                  </span>
                  <Link to={`/tournaments/${tournamentId}/competitions/${comp.id}`}>
                    <Button variant="ghost" size="sm">
                      Manage <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border/40">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No competitions yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TournamentCompetitions;
