import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { UserSession } from '../types';
const SOCKET_URL = 'http://localhost:5000';

interface SignupPageProps {
  onSignupSuccess: (user: UserSession) => void;
}

export default function SignupPage({ onSignupSuccess }: SignupPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${SOCKET_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('vantage_user', JSON.stringify(data.user));
        localStorage.setItem('vantage_rating', '1200');
        onSignupSuccess(data.user);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Signup failed.');
      }
    } catch (err) {
      setError('Connection failure.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 pt-16">
      <div className="max-w-md w-full bg-surface/30 p-8 rounded-3xl border border-hairline space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="text-center space-y-2">
          <h2 className="font-serif text-3xl tracking-tight">Create Account</h2>
          <p className="text-zinc-500 text-xs">Join Vantage Mock Interviews and track your Elo rating progress.</p>
        </div>
        {error && <p className="text-xs text-rose-400 text-center font-semibold">{error}</p>}
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Nickname</label>
            <input
              type="text"
              required
              className="w-full bg-background border border-hairline focus:border-accent focus:outline-none rounded-xl px-4 py-2 text-xs text-foreground"
              placeholder="Your display name"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-background border border-hairline focus:border-accent focus:outline-none rounded-xl px-4 py-2 text-xs text-foreground"
              placeholder="name@domain.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Password</label>
            <input
              type="password"
              required
              className="w-full bg-background border border-hairline focus:border-accent focus:outline-none rounded-xl px-4 py-2 text-xs text-foreground"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-accent text-accent-foreground text-xs font-bold rounded-full transition hover:brightness-110 shadow-lg shadow-accent/10"
          >
            Sign Up
          </button>
        </form>
        <p className="text-[11px] text-zinc-500 text-center">
          Already have an account? <Link to="/login" className="text-accent font-semibold hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
}