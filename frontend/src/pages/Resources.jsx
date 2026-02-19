import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, formatSport } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, MapPin, Search, Grid3X3 } from 'lucide-react';

const Resources = () => {
  const { getAuthHeader } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    resource_type: 'table',
    sport: 'table_tennis',
    location: '',
    status: 'available'
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const response = await axios.get(`${API_URL}/resources`, {
        headers: getAuthHeader()
      });
      setResources(response.data);
    } catch (error) {
      toast.error('Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingResource) {
        await axios.put(`${API_URL}/resources/${editingResource.id}`, formData, {
          headers: getAuthHeader()
        });
        toast.success('Resource updated');
      } else {
        await axios.post(`${API_URL}/resources`, formData, {
          headers: getAuthHeader()
        });
        toast.success('Resource created');
      }
      setIsDialogOpen(false);
      setEditingResource(null);
      setFormData({ name: '', resource_type: 'table', sport: 'table_tennis', location: '', status: 'available' });
      fetchResources();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      resource_type: resource.resource_type,
      sport: resource.sport,
      location: resource.location || '',
      status: resource.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await axios.delete(`${API_URL}/resources/${resourceId}`, {
        headers: getAuthHeader()
      });
      toast.success('Resource deleted');
      fetchResources();
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_use': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'maintenance': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-zinc-700 text-zinc-300';
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (resource.location && resource.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSport = sportFilter === 'all' || resource.sport === sportFilter;
    return matchesSearch && matchesSport;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="resources-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
            Resources
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage tables, courts, and venues
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingResource(null);
            setFormData({ name: '', resource_type: 'table', sport: 'table_tennis', location: '', status: 'available' });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="font-bold uppercase tracking-wider" data-testid="add-resource-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-heading uppercase">
                {editingResource ? 'Edit Resource' : 'Add New Resource'}
              </DialogTitle>
              <DialogDescription>
                {editingResource ? 'Update resource details' : 'Register a new table or court'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resource-name">Name *</Label>
                <Input
                  id="resource-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Table 1, Court A"
                  data-testid="resource-name-input"
                  className="bg-background/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sport</Label>
                  <Select 
                    value={formData.sport} 
                    onValueChange={(v) => setFormData({ 
                      ...formData, 
                      sport: v,
                      resource_type: v === 'table_tennis' ? 'table' : 'court'
                    })}
                  >
                    <SelectTrigger data-testid="resource-sport-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table_tennis">🏓 Table Tennis</SelectItem>
                      <SelectItem value="badminton">🏸 Badminton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={formData.resource_type} 
                    onValueChange={(v) => setFormData({ ...formData, resource_type: v })}
                  >
                    <SelectTrigger data-testid="resource-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">Table</SelectItem>
                      <SelectItem value="court">Court</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resource-location">Location</Label>
                <Input
                  id="resource-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Hall A, Floor 2"
                  data-testid="resource-location-input"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger data-testid="resource-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full font-bold uppercase" data-testid="resource-submit-btn">
                {editingResource ? 'Update Resource' : 'Add Resource'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
                data-testid="resource-search"
              />
            </div>
            <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="resource-sport-filter">
                <SelectValue placeholder="Filter by sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="table_tennis">🏓 Table Tennis</SelectItem>
                <SelectItem value="badminton">🏸 Badminton</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResources.map((resource) => (
            <Card 
              key={resource.id} 
              className="bg-card border-border/40 hover:border-primary/50 transition-colors"
              data-testid={`resource-card-${resource.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    resource.sport === 'table_tennis' ? 'bg-table-tennis/20' : 'bg-badminton/20'
                  }`}>
                    <span className="text-2xl">{resource.sport === 'table_tennis' ? '🏓' : '🏸'}</span>
                  </div>
                  <Badge variant="outline" className={getStatusColor(resource.status)}>
                    {resource.status.replace('_', ' ')}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg mb-1">{resource.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {resource.resource_type === 'table' ? 'Table' : 'Court'} • {formatSport(resource.sport)}
                </p>
                {resource.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3" />
                    {resource.location}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(resource)}
                    data-testid={`edit-resource-${resource.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(resource.id)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`delete-resource-${resource.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border/40">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-4">No resources found</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              Add your first resource
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Resources;
