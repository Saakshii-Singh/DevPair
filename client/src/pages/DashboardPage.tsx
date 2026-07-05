import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Award, Brain } from 'lucide-react';
import type { HistoryItem } from '../types';
const SOCKET_URL = 'http://localhost:5000';

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistoryScorecard, setSelectedHistoryScorecard] = useState<HistoryItem | null>(null);

  const user = JSON.parse(localStorage.getItem('vantage_user') || '{}');

  useEffect(() => {
    if (!user.id) return;
    fetch(`${SOCKET_URL}/api/user/dashboard/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProfile(data.profile);
          setStats(data.stats);
          setHistory(data.history);
          localStorage.setItem('vantage_rating', data.profile.rating.toString());
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vantage_user');
    localStorage.removeItem('vantage_rating');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-3">
        <div className="size-10 border-2 border-hairline border-t-accent rounded-full animate-spin"></div>
        <p className="text-xs text-zinc-500 font-medium">Loading profile cockpit...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 px-6 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-hairline pb-8">
        <div className="space-y-2">
          <div className="text-[10px] text-accent uppercase tracking-widest font-bold font-mono">User Profile Command</div>
          <h2 className="font-serif text-4xl text-zinc-100">Welcome, {profile?.nickname || 'Developer'}</h2>
          <p className="text-zinc-500 text-xs">Review your mock ratings progression and solved coding history.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/practice" className="bg-accent text-accent-foreground px-6 py-2.5 rounded-full text-xs font-bold transition hover:brightness-110 shadow-lg shadow-accent/15">
            Practice Sandbox
          </Link>
          <button onClick={handleLogout} className="bg-surface hover:bg-surface-2 text-zinc-400 px-4 py-2.5 rounded-full text-xs border border-hairline transition flex items-center gap-1.5">
            <LogOut className="size-3.5" /> Log Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4 bg-surface/20 border border-hairline rounded-3xl p-8 flex flex-col justify-between h-56 relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold font-mono">Vantage Rating Score</span>
              <h3 className="font-serif text-5xl text-foreground font-bold mt-2 font-mono">{profile?.rating} <span className="text-xs text-zinc-400 italic font-serif">Elo</span></h3>
            </div>
            <Award className="size-8 text-accent shrink-0" />
          </div>
          <div className="border-t border-hairline pt-3 flex justify-between text-[11px] text-zinc-500 font-mono">
            <span>Peak: {profile?.peakRating} Elo</span>
            <span>Trophies: {profile?.solvedCount} Solved</span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-8 bg-surface/20 border border-hairline rounded-3xl p-6 grid md:grid-cols-3 gap-6 h-auto md:h-56">
          <div className="flex flex-col justify-between bg-zinc-950/20 p-5 rounded-2xl border border-hairline">
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">Technical accuracy</span>
            <div className="text-2xl font-bold font-mono text-zinc-200">{stats?.technicalAverage}%</div>
            <div className="h-1.5 bg-zinc-900 rounded-full mt-3 overflow-hidden border border-hairline/20">
              <div className="h-full bg-accent" style={{ width: `${stats?.technicalAverage}%` }}></div>
            </div>
          </div>
          <div className="flex flex-col justify-between bg-zinc-950/20 p-5 rounded-2xl border border-hairline">
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">Communication skills</span>
            <div className="text-2xl font-bold font-mono text-zinc-200">{stats?.communicationAverage}%</div>
            <div className="h-1.5 bg-zinc-900 rounded-full mt-3 overflow-hidden border border-hairline/20">
              <div className="h-full bg-accent" style={{ width: `${stats?.communicationAverage}%` }}></div>
            </div>
          </div>
          <div className="flex flex-col justify-between bg-zinc-950/20 p-5 rounded-2xl border border-hairline">
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">Behavioral/Composure</span>
            <div className="text-2xl font-bold font-mono text-zinc-200">{stats?.behavioralAverage}%</div>
            <div className="h-1.5 bg-zinc-900 rounded-full mt-3 overflow-hidden border border-hairline/20">
              <div className="h-full bg-accent" style={{ width: `${stats?.behavioralAverage}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 pt-4">
        <div className="col-span-12 md:col-span-7 bg-surface/20 border border-hairline rounded-3xl p-6 space-y-4">
          <h4 className="text-sm font-semibold tracking-tight text-zinc-350">Mock solved history list</h4>
          <div className="overflow-x-auto">
            {history.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-6">No interview sessions found. Go solve challenges inside the practice workspace!</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-hairline text-zinc-500">
                    <th className="pb-3 font-semibold">Problem Challenge</th>
                    <th className="pb-3 font-semibold">Difficulty</th>
                    <th className="pb-3 font-semibold text-right">Overall Score</th>
                    <th className="pb-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline/30">
                  {history.map((h) => (
                    <tr key={h._id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="py-3 font-medium text-zinc-300">{h.problemTitle}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 border border-hairline/50 text-zinc-400">
                          {h.difficulty}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-accent font-semibold">{h.overallScore}</td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => setSelectedHistoryScorecard(h)}
                          className="text-accent hover:underline text-[11px] font-bold"
                        >
                          View Scorecard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-span-12 md:col-span-5 bg-surface/20 border border-hairline rounded-3xl p-6">
          {selectedHistoryScorecard ? (
            <div className="space-y-6">
              <div className="border-b border-hairline pb-4 flex justify-between items-center">
                <h4 className="font-serif text-lg text-zinc-200">{selectedHistoryScorecard.problemTitle}</h4>
                <button 
                  onClick={() => setSelectedHistoryScorecard(null)}
                  className="text-zinc-500 hover:text-foreground text-[10px]"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-zinc-950/20 p-2.5 rounded-xl border border-hairline">
                  <div className="text-[10px] text-zinc-500 font-bold mb-1">Tech</div>
                  <div className="font-mono text-zinc-300">{selectedHistoryScorecard.technicalScore}</div>
                </div>
                <div className="bg-zinc-950/20 p-2.5 rounded-xl border border-hairline">
                  <div className="text-[10px] text-zinc-500 font-bold mb-1">Comm</div>
                  <div className="font-mono text-zinc-300">{selectedHistoryScorecard.communicationScore}</div>
                </div>
                <div className="bg-zinc-950/20 p-2.5 rounded-xl border border-hairline">
                  <div className="text-[10px] text-zinc-500 font-bold mb-1">Behav</div>
                  <div className="font-mono text-zinc-300">{selectedHistoryScorecard.behavioralScore}</div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Feedback transcript summary</span>
                <p className="text-xs text-zinc-400 leading-relaxed text-pretty">
                  {selectedHistoryScorecard.feedback || 'No review remarks archived.'}
                </p>
              </div>

              <div className="text-[10px] text-zinc-500 font-mono">
                Session date: {new Date(selectedHistoryScorecard.date).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center p-6 text-zinc-500 space-y-2">
              <Brain className="size-8 text-hairline" />
              <p className="text-xs italic">Select a problem scorecard in the history log to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}