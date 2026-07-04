import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
// Import Types
import type { UserSession } from './types';
// Import Component & Pages
import RouteGuard from "./components/RoutesGuard";
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PracticePage from './pages/PracticePage';
import P2PLobby from './pages/P2PLobby';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Sync user state on reload
  useEffect(() => {
    const cachedUser = localStorage.getItem('vantage_user');
    if (cachedUser) {
      setCurrentUser(JSON.parse(cachedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vantage_user');
    localStorage.removeItem('vantage_rating');
    setCurrentUser(null);
    window.location.href = '/login';
  };

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Shared Vantage Navigation Bar */}
        <nav className="fixed top-0 w-full z-50 border-b border-hairline bg-background/85 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="text-foreground font-semibold tracking-tight text-lg">
              Vantage
            </Link>
            
            <div className="hidden md:flex items-center gap-8 text-xs font-bold text-zinc-450 uppercase tracking-widest">
              <Link to="/practice" className="hover:text-foreground transition-colors">
                AI practice
              </Link>
              <Link to="/p2p-lobby" className="hover:text-foreground transition-colors">
                Peer Arena
              </Link>
              {currentUser && (
                <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1 text-accent">
                  <LayoutDashboard className="size-3.5" /> Dashboard
                </Link>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col text-right">
                    <span className="text-zinc-200 text-xs font-semibold">{currentUser.nickname}</span>
                    <span className="text-[9px] text-accent font-mono">Rating: {localStorage.getItem('vantage_rating') || currentUser.rating || 1200} Elo</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-surface hover:bg-surface-2 border border-hairline text-zinc-455 text-xs font-bold px-4 py-2 rounded-full transition"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="text-foreground text-xs font-bold px-4 py-2 rounded-full border border-hairline hover:bg-surface transition"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-foreground text-background text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 transition"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Routed Pages */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage onSignupSuccess={(user) => setCurrentUser(user)} />} />
            <Route path="/login" element={<LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />} />
            
            {/* Authenticated Routes */}
            <Route path="/dashboard" element={
              <RouteGuard>
                <DashboardPage />
              </RouteGuard>
            } />
            <Route path="/practice" element={
              <RouteGuard>
                <PracticePage />
              </RouteGuard>
            } />
            <Route path="/p2p-lobby" element={
              <RouteGuard>
                <P2PLobby />
              </RouteGuard>
            } />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="py-16 border-t border-hairline mt-12 bg-surface/10">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
            <div>© 2026 Vantage Assessment Inc.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}