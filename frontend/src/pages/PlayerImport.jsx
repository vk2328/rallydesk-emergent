import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Upload, FileText, Download, AlertCircle, CheckCircle, Users, Layers } from 'lucide-react';

const PlayerImport = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState('');

  useEffect(() => {
    fetchDivisions();
  }, [tournamentId]);

  const fetchDivisions = async () => {
    try {
      const response = await axios.get(`${API_URL}/tournaments/${tournamentId}/divisions`, {
        headers: getAuthHeader()
      });
      setDivisions(response.data);
    } catch (error) {
      console.error('Failed to fetch divisions:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/players/csv/upload`,
        formData,
        {
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setResult(response.data);
      toast.success(`Successfully imported ${response.data.imported} players`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import players');
      setResult({
        imported: 0,
        errors: [error.response?.data?.detail || 'Upload failed']
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = `first_name,last_name,email,skill_level
John,Smith,john@example.com,intermediate
Jane,Doe,jane@example.com,advanced
Bob,Wilson,bob@example.com,beginner`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'players_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto" data-testid="player-import-page">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate(`/tournaments/${tournamentId}`)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournament
        </Button>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase">
          Import Players
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload a CSV file to bulk import players
        </p>
      </div>

      {/* Template Download */}
      <Card className="bg-card border-border/40 mb-6">
        <CardHeader>
          <CardTitle className="font-heading uppercase text-lg">CSV Template</CardTitle>
          <CardDescription>Download a template to see the expected format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">players_template.csv</p>
                <p className="text-sm text-muted-foreground">
                  Columns: first_name, last_name, email, skill_level
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate} data-testid="download-template-btn">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card className="bg-card border-border/40 mb-6">
        <CardHeader>
          <CardTitle className="font-heading uppercase text-lg">Upload CSV</CardTitle>
          <CardDescription>Select your CSV file with player data</CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              data-testid="csv-file-input"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {file ? (
              <div>
                <p className="font-medium text-primary">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Click to select a CSV file</p>
                <p className="text-sm text-muted-foreground">or drag and drop</p>
              </div>
            )}
          </div>

          {file && (
            <Button 
              onClick={handleUpload} 
              className="w-full mt-4 font-bold uppercase"
              disabled={uploading}
              data-testid="upload-csv-btn"
            >
              {uploading ? 'Uploading...' : 'Import Players'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={`border ${result.imported > 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              {result.imported > 0 ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-500" />
              )}
              <div>
                <h3 className="font-heading text-lg uppercase">Import Result</h3>
                <p className="text-muted-foreground">
                  {result.imported > 0 
                    ? `Successfully imported ${result.imported} players` 
                    : 'Import failed'}
                </p>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div className="mt-4 p-4 bg-red-500/10 rounded-lg">
                <p className="font-medium text-red-400 mb-2">Errors:</p>
                <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                  {result.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.imported > 0 && (
              <Button 
                variant="outline" 
                onClick={() => navigate(`/tournaments/${tournamentId}`)}
                className="mt-4"
              >
                View Players
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-card border-border/40 mt-6">
        <CardHeader>
          <CardTitle className="font-heading uppercase text-lg">CSV Format Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Required Columns:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><span className="text-foreground">first_name</span> - Player's first name (required)</li>
              <li><span className="text-foreground">last_name</span> - Player's last name (optional)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Optional Columns:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><span className="text-foreground">email</span> - Player's email address</li>
              <li><span className="text-foreground">skill_level</span> - beginner, intermediate, or advanced</li>
              <li><span className="text-foreground">phone</span> - Contact phone number</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerImport;
