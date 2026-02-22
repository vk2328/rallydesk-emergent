import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Players from "./pages/Players";
import Teams from "./pages/Teams";
import Resources from "./pages/Resources";
import Tournaments from "./pages/Tournaments";
import TournamentCreate from "./pages/TournamentCreate";
import TournamentDetail from "./pages/TournamentDetail";
import CompetitionDetail from "./pages/CompetitionDetail";
import MatchScoreboard from "./pages/MatchScoreboard";
import ControlDesk from "./pages/ControlDesk";
import PublicBoard from "./pages/PublicBoard";
import PlayerImport from "./pages/PlayerImport";
import Standings from "./pages/Standings";
import Leaderboard from "./pages/Leaderboard";
import AuthCallback from "./pages/AuthCallback";
import LiveMatchCenter from "./pages/LiveMatchCenter";
import RefereeScoring from "./pages/RefereeScoring";
import HelpGuide from "./pages/HelpGuide";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  const location = useLocation();
  
  // Check URL fragment for session_id (OAuth callback) - synchronous check during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/live" element={<LiveMatchCenter />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/players" element={<ProtectedRoute><Players /></ProtectedRoute>} />
      <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
      <Route path="/tournaments" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
      <Route path="/tournaments/new" element={<ProtectedRoute><TournamentCreate /></ProtectedRoute>} />
      <Route path="/tournaments/:id" element={<ProtectedRoute><TournamentDetail /></ProtectedRoute>} />
      <Route path="/tournaments/:tournamentId/competitions/:competitionId" element={<ProtectedRoute><CompetitionDetail /></ProtectedRoute>} />
      <Route path="/tournaments/:tournamentId/matches/:matchId" element={<ProtectedRoute><MatchScoreboard /></ProtectedRoute>} />
      <Route path="/tournaments/:tournamentId/control-desk" element={<ProtectedRoute><ControlDesk /></ProtectedRoute>} />
      <Route path="/tournaments/:tournamentId/standings" element={<ProtectedRoute><Standings /></ProtectedRoute>} />
      <Route path="/tournaments/:tournamentId/import-players" element={<ProtectedRoute><PlayerImport /></ProtectedRoute>} />
      <Route path="/tournaments/:tournamentId/board" element={<PublicBoard />} />
      <Route path="/referee/:tournamentId/:matchId" element={<RefereeScoring />} />
      <Route path="/leaderboard/:sport" element={<Leaderboard />} />
      <Route path="/" element={<Navigate to="/live" replace />} />
      <Route path="*" element={<Navigate to="/live" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
