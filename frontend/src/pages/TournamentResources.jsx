import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, SPORTS, getSportIcon, formatSport } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Grid3X3, MapPin, Lock, Unlock } from 'lucide-react';

const TournamentResources = () => {
  const { tournamentId } = useParams();
  const { getAuthHeader, isAdmin } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [sportFilter, setSportFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    sport: 'table_tennis',
    label: '',
    location: '',
    resource_type: 'table',
    enabled: true
  });
  
  const [bulkData, setBulkData] = useState({ sport: 'table_tennis', count: 4 });

  useEffect(() => {
    fetchResources();
  }, [tournamentId, sportFilter]);

  const fetchResources = async () => {
    try {
      const params = sportFilter !== 'all' ? `?sport=${sportFilter}` : '';
      const response = await axios.get(`${API_URL}/tournaments/${tournamentId}/resources${params}`, {
        headers: getAuthHeader()
      });
      setResources(response.data);
    } catch (error) {
      toast.error('Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ sport: 'table_tennis', label: '', location: '', resource_type: 'table', enabled: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingResource) {
        await axios.put(`${API_URL}/tournaments/${tournamentId}/resources/${editingResource.id}`, formData, {
          headers: getAuthHeader()
        });
        toast.success('Resource updated');
      } else {
        await axios.post(`${API_URL}/tournaments/${tournamentId}/resources`, formData, {
          headers: getAuthHeader()
        });
        toast.success('Resource created');
      }
      setIsDialogOpen(false);
      setEditingResource(null);
      resetForm();
      fetchResources();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/tournaments/${tournamentId}/resources/bulk-add?sport=${bulkData.sport}&count=${bulkData.count}`, {}, {
        headers: getAuthHeader()
      });
      toast.success(`Created ${bulkData.count} resources`);
      setIsBulkDialogOpen(false);
      fetchResources();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create resources');
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      sport: resource.sport,
      label: resource.label,
      location: resource.location || '',
      resource_type: resource.resource_type,
      enabled: resource.enabled
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (resourceId) => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await axios.delete(`${API_URL}/tournaments/${tournamentId}/resources/${resourceId}`, {
        headers: getAuthHeader()
      });
      toast.success('Resource deleted');
      fetchResources();
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  const handleLockToggle = async (resource) => {
    try {
      const action = resource.locked ? 'unlock' : 'lock';
      await axios.post(`${API_URL}/tournaments/${tournamentId}/resources/${resource.id}/${action}`, {}, {
        headers: getAuthHeader()
      });
      toast.success(`Resource ${action}ed`);
      fetchResources();
    } catch (error) {
      toast.error('Failed to update lock status');
    }
  };

  const getStatusColor = (resource) => {
    if (!resource.enabled) return 'bg-zinc-800 text-zinc-500';
    if (resource.locked) return 'bg-yellow-600 text-white';
    if (resource.current_match_id) return 'bg-red-500 text-white animate-pulse';
    return 'bg-green-600 text-white';
  };

  const getStatusLabel = (resource) => {
    if (!resource.enabled) return 'Disabled';
    if (resource.locked) return 'Locked';
    if (resource.current_match_id) return 'In Use';
    return 'Available';
  };

  if (loading) {
    return <div className="p-6"><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="p-6 space-y-6" data-testid="tournament-resources">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight uppercase">Resources</h1>
          <p className="text-muted-foreground text-sm">Manage courts and tables</p>
        </div>
        {isAdmin() && (
          <div className="flex gap-2">
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Bulk Add
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-heading uppercase">Bulk Add Resources</DialogTitle>
                  <DialogDescription>Create multiple resources at once</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBulkAdd} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sport</Label>
                    <Select value={bulkData.sport} onValueChange={(v) => setBulkData({...bulkData, sport: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SPORTS.map(sport => (
                          <SelectItem key={sport.value} value={sport.value}>
                            {sport.icon} {sport.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Resources</Label>
                    <Input type="number" min="1" max="20" value={bulkData.count} onChange={(e) => setBulkData({...bulkData, count: parseInt(e.target.value)})} className="bg-background/50" />
                  </div>
                  <Button type="submit" className="w-full">Create Resources</Button>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) { setEditingResource(null); resetForm(); }
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Add Resource</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-heading uppercase">
                    {editingResource ? 'Edit Resource' : 'Add Resource'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sport</Label>
                    <Select value={formData.sport} onValueChange={(v) => setFormData({...formData, sport: v, resource_type: v === 'table_tennis' ? 'table' : 'court'})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SPORTS.map(sport => (
                          <SelectItem key={sport.value} value={sport.value}>
                            {sport.icon} {sport.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Label *</Label>
                    <Input value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} required placeholder="Table Tennis 1" className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Hall A" className="bg-background/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={formData.resource_type} onValueChange={(v) => setFormData({...formData, resource_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="table">Table</SelectItem>
                          <SelectItem value="court">Court</SelectItem>
                          <SelectItem value="field">Field</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Enabled</Label>
                      <Select value={formData.enabled.toString()} onValueChange={(v) => setFormData({...formData, enabled: v === 'true'})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full font-bold uppercase">
                    {editingResource ? 'Update Resource' : 'Add Resource'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={sportFilter} onValueChange={setSportFilter}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">All</TabsTrigger>
          {SPORTS.map(sport => (
            <TabsTrigger key={sport.value} value={sport.value}>{sport.icon} {sport.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Resources Grid */}
      {resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {resources.map((resource) => (
            <Card key={resource.id} className="bg-card border-border/40 hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
                    <span className="text-2xl">{getSportIcon(resource.sport)}</span>
                  </div>
                  <Badge className={getStatusColor(resource)}>
                    {getStatusLabel(resource)}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg mb-1">{resource.label}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {resource.resource_type} • {formatSport(resource.sport)}
                </p>
                {resource.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3" /> {resource.location}
                  </div>
                )}
                {isAdmin() && (
                  <div className="flex justify-end gap-1 pt-2 border-t border-border/40">
                    <Button variant="ghost" size="icon" onClick={() => handleLockToggle(resource)} title={resource.locked ? 'Unlock' : 'Lock'}>
                      {resource.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(resource)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(resource.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border/40">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No resources found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TournamentResources;
