import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Calendar, 
  Settings, 
  Play, 
  QrCode,
  FileDown,
  BarChart3,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Zap,
  Shield,
  Monitor,
  Smartphone,
  HelpCircle,
  BookOpen
} from 'lucide-react';

const HelpGuide = () => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState('getting-started');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Zap,
      color: 'text-yellow-500',
      steps: [
        {
          title: 'Create an Account',
          description: 'Register with your email and password, or use Google login for quick access.',
          tip: 'The first registered user becomes the Admin with full access.'
        },
        {
          title: 'Verify Your Email',
          description: 'Check your inbox for a verification email and click the link to activate your account.',
          tip: 'Some features may be restricted until you verify your email.'
        },
        {
          title: 'Access Dashboard',
          description: 'After login, you\'ll see your Dashboard with quick stats and recent tournaments.',
          tip: 'Use the sidebar to navigate between different sections.'
        }
      ]
    },
    {
      id: 'create-tournament',
      title: 'Creating a Tournament',
      icon: Trophy,
      color: 'text-red-500',
      steps: [
        {
          title: 'Click "New Tournament"',
          description: 'From Dashboard or Tournaments page, click the "New Tournament" button.',
          tip: 'Plan your tournament structure before creating it.'
        },
        {
          title: 'Fill Tournament Details',
          description: 'Enter name, select sport (Table Tennis, Badminton, etc.), set dates, and add description.',
          tip: 'Choose the correct sport - scoring rules will be configured based on this.'
        },
        {
          title: 'Configure Scoring Rules',
          description: 'Set points per set, sets to win, deuce rules, and other sport-specific settings.',
          tip: 'For Table Tennis: 11 points/set, best of 5 sets is standard.'
        },
        {
          title: 'Save Tournament',
          description: 'Your tournament is created in "Draft" status. You can now add players and competitions.',
          tip: 'Tournament status will auto-update as matches progress.'
        }
      ]
    },
    {
      id: 'manage-players',
      title: 'Managing Players',
      icon: Users,
      color: 'text-blue-500',
      steps: [
        {
          title: 'Navigate to Players',
          description: 'Click "Players" in the navigation bar to see all registered players.',
          tip: 'Players are shared across all your tournaments.'
        },
        {
          title: 'Add Players Manually',
          description: 'Click "Add Player" and enter First Name, Last Name, Email, Phone, and Skill Level.',
          tip: 'Skill level helps with seeded draws.'
        },
        {
          title: 'Import from CSV',
          description: 'For bulk import, prepare a CSV file with columns: first_name, last_name, email, phone.',
          tip: 'Download the template CSV to see the correct format.'
        },
        {
          title: 'Assign to Tournaments',
          description: 'Players can be added to specific competitions within a tournament.',
          tip: 'One player can participate in multiple competitions.'
        }
      ]
    },
    {
      id: 'setup-competition',
      title: 'Setting Up Competitions',
      icon: Calendar,
      color: 'text-green-500',
      steps: [
        {
          title: 'Open Tournament Detail',
          description: 'Click on a tournament to view its details and manage competitions.',
          tip: 'A tournament can have multiple competitions (e.g., Men\'s Singles, Women\'s Doubles).'
        },
        {
          title: 'Create Competition',
          description: 'Click "Add Competition", enter name, select format (Single Elimination, Round Robin, etc.).',
          tip: 'Single Elimination is best for quick tournaments; Round Robin ensures everyone plays multiple matches.'
        },
        {
          title: 'Add Participants',
          description: 'Go to competition detail and add players from your player pool.',
          tip: 'You need at least 2 participants to generate a draw.'
        },
        {
          title: 'Generate Draw',
          description: 'Click "Generate Draw" and choose seeding method: Random, By Rating, or Manual.',
          tip: 'Manual seeding lets you control exactly who plays whom in early rounds.'
        }
      ]
    },
    {
      id: 'manage-resources',
      title: 'Managing Resources (Courts/Tables)',
      icon: Settings,
      color: 'text-purple-500',
      steps: [
        {
          title: 'Navigate to Resources',
          description: 'Click "Resources" in the navigation to manage your courts and tables.',
          tip: 'Resources are venue-specific and reusable across tournaments.'
        },
        {
          title: 'Add Resources',
          description: 'Click "Add Resource", enter name (e.g., "Table 1", "Court A"), and select type.',
          tip: 'Add all available tables/courts before the tournament day.'
        },
        {
          title: 'Assign to Matches',
          description: 'In Control Desk, assign matches to specific resources for organization.',
          tip: 'This helps referees and players know where to go.'
        }
      ]
    },
    {
      id: 'run-matches',
      title: 'Running Matches (Control Desk)',
      icon: Play,
      color: 'text-orange-500',
      steps: [
        {
          title: 'Access Control Desk',
          description: 'From Tournament Detail, click "Control Desk" to manage live matches.',
          tip: 'Control Desk is your command center during the tournament.'
        },
        {
          title: 'View Pending Matches',
          description: 'See all matches waiting to be played, organized by round.',
          tip: 'Matches are auto-generated when you create the draw.'
        },
        {
          title: 'Assign Match to Resource',
          description: 'Drag a match to a table/court or use the assign button.',
          tip: 'This marks the match as "Scheduled".'
        },
        {
          title: 'Start Match',
          description: 'Click on a scheduled match and hit "Start Match" to begin scoring.',
          tip: 'The match status changes to "Live".'
        },
        {
          title: 'Enter Scores',
          description: 'Use + and - buttons to update scores for each player during each set.',
          tip: 'Click "End Set" when a set is complete to move to the next.'
        },
        {
          title: 'Match Auto-Completes',
          description: 'When a player wins the required sets, the match automatically ends.',
          tip: 'Winner advances to the next round automatically.'
        }
      ]
    },
    {
      id: 'digital-scoring',
      title: 'Digital Scoring with QR Code',
      icon: QrCode,
      color: 'text-cyan-500',
      steps: [
        {
          title: 'Open Match Scoreboard',
          description: 'Click on a live match to open the scoreboard interface.',
          tip: 'You can score directly or delegate to a referee.'
        },
        {
          title: 'Generate Referee QR Code',
          description: 'Click "Referee QR Code" button to generate access for a scorer.',
          tip: 'This creates a one-time code valid for this match only.'
        },
        {
          title: 'Share with Referee',
          description: 'Show the QR code to the referee or share the 6-digit OTP code.',
          tip: 'Referee can scan QR or enter code at the scoring URL.'
        },
        {
          title: 'Referee Enters Scores',
          description: 'The referee uses their phone to update scores in real-time.',
          tip: 'No login required - the code provides temporary access.'
        },
        {
          title: 'Scores Update Live',
          description: 'All score updates appear in real-time on the Live Match Center.',
          tip: 'Spectators can follow along from anywhere!'
        }
      ]
    },
    {
      id: 'score-sheets',
      title: 'PDF Score Sheets',
      icon: FileDown,
      color: 'text-pink-500',
      steps: [
        {
          title: 'Access Competition Detail',
          description: 'Navigate to the competition you want to print score sheets for.',
          tip: 'Score sheets work best when the draw is already generated.'
        },
        {
          title: 'Click "Score Sheet PDF"',
          description: 'Click the button to download a PDF with all match score sheets.',
          tip: 'Each match gets its own page with player names and scoring grid.'
        },
        {
          title: 'Print and Distribute',
          description: 'Print the PDF and give sheets to referees for manual scoring backup.',
          tip: 'Great for venues with limited WiFi or as backup.'
        }
      ]
    },
    {
      id: 'leaderboards',
      title: 'Leaderboards & Live Center',
      icon: BarChart3,
      color: 'text-emerald-500',
      steps: [
        {
          title: 'Access Live Match Center',
          description: 'Click "Live" in the header to see all currently active matches.',
          tip: 'This page auto-updates every few seconds.'
        },
        {
          title: 'View Leaderboards',
          description: 'Click "Leaderboards" dropdown and select a sport to see rankings.',
          tip: 'Rankings are based on wins, losses, and win rate.'
        },
        {
          title: 'Tournament Standings',
          description: 'From Tournament Detail, click "Standings" to see competition-specific rankings.',
          tip: 'Standings show sets won/lost and points scored.'
        },
        {
          title: 'Share with Spectators',
          description: 'Share the Live Match Center URL with spectators for real-time updates.',
          tip: 'No login required to view public leaderboards!'
        }
      ]
    }
  ];

  const quickTips = [
    { icon: Shield, text: 'Add Moderators to help manage your tournament' },
    { icon: Monitor, text: 'Use a tablet at each table for easy scoring' },
    { icon: Smartphone, text: 'QR codes work great on mobile phones' },
    { icon: CheckCircle2, text: 'Verify your email to unlock all features' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold uppercase">
                How to Use RallyDesk
              </h1>
              <p className="text-muted-foreground mt-1">
                Complete guide to running your tournament like a pro
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Quick Tips */}
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-primary" />
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickTips.map((tip, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <tip.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{tip.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Flow Overview */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {sections.slice(0, 6).map((section, idx) => (
            <React.Fragment key={section.id}>
              <Badge 
                variant="outline" 
                className={`cursor-pointer whitespace-nowrap ${expandedSection === section.id ? 'bg-primary/10 border-primary' : ''}`}
                onClick={() => setExpandedSection(section.id)}
              >
                <span className="mr-1">{idx + 1}</span>
                {section.title.split(' ')[0]}
              </Badge>
              {idx < 5 && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, sectionIdx) => (
            <Card 
              key={section.id} 
              className={`transition-all duration-200 ${expandedSection === section.id ? 'ring-2 ring-primary/30' : ''}`}
            >
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center`}>
                      <section.icon className={`w-5 h-5 ${section.color}`} />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Step {sectionIdx + 1}</span>
                      <h3 className="font-heading text-xl">{section.title}</h3>
                    </div>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      expandedSection === section.id ? 'rotate-180' : ''
                    }`} 
                  />
                </CardTitle>
              </CardHeader>
              
              {expandedSection === section.id && (
                <CardContent className="pt-0">
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20 ml-5">
                    {section.steps.map((step, stepIdx) => (
                      <div key={stepIdx} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <h4 className="font-semibold mb-1">{step.title}</h4>
                        <p className="text-muted-foreground text-sm mb-2">{step.description}</p>
                        {step.tip && (
                          <div className="flex items-start gap-2 text-xs bg-muted/50 p-2 rounded">
                            <HelpCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground"><strong>Tip:</strong> {step.tip}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Footer CTA */}
        <Card className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="font-heading text-2xl font-bold mb-2">Ready to Start?</h3>
            <p className="text-muted-foreground mb-4">
              Create your first tournament and see how easy it is!
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/tournaments/new')}>
                Create Tournament
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HelpGuide;
