import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Code, Users, Sparkles, ChevronRight } from 'lucide-react';

const sarahImg = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=256";

export default function LandingPage() {
  const navigate = useNavigate();
  const user = localStorage.getItem('vantage_user');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pt-16">
        <section className="px-6 py-20 relative overflow-hidden">
          {/* Grid background mask detail */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.28_0.008_270)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.28_0.008_270)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-12 gap-8 items-end">
              <div className="col-span-12 lg:col-span-8">
                <div className="inline-flex items-center gap-2 mb-8 px-3 py-1 rounded-full border border-hairline bg-surface/50 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                  <Sparkles className="size-3.5" />
                  Now with Adaptive AI Feedback v4
                </div>
                <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl text-foreground leading-[0.95] text-balance mb-10">
                  The new standard for <span className="italic text-accent">talent</span> assessment.
                </h1>
                <p className="max-w-[52ch] text-lg text-zinc-400 text-pretty mb-12">
                  Evaluate candidates through high-fidelity AI simulations or connect with expert human interviewers on a single, integrated platform.
                </p>
                <div className="flex flex-wrap gap-4">
                  {user ? (
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="bg-accent text-accent-foreground px-6 py-3 rounded-full text-sm font-semibold flex items-center gap-2 hover:brightness-110 transition shadow-lg shadow-accent/20"
                    >
                      Go to Dashboard <ChevronRight className="size-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate('/signup')}
                        className="bg-accent text-accent-foreground px-6 py-3 rounded-full text-sm font-semibold hover:brightness-110 transition shadow-lg shadow-accent/20"
                      >
                        Create Account
                      </button>
                      <button
                        onClick={() => navigate('/login')}
                        className="bg-surface text-foreground px-6 py-3 rounded-full text-sm font-medium border border-hairline hover:bg-surface-2 transition-colors"
                      >
                        Log In
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="hidden lg:block lg:col-span-4">
                <div className="border-l border-hairline pl-8 pb-4">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-6">
                    Trusted by innovators
                  </div>
                  <div className="space-y-5">
                    {["Starlight Systems", "Linear Dynamic", "Veridian Global", "Northwind Labs"].map(
                      (name) => (
                        <div key={name} className="text-2xl font-serif italic text-zinc-300">
                          {name}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 border-t border-hairline">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-7 bg-surface/10 p-10 md:p-12 rounded-3xl border border-hairline flex flex-col justify-between">
                <div className="size-9 bg-accent/10 rounded-lg flex items-center justify-center mb-6 text-accent">
                  <Brain className="size-5" />
                </div>
                <div>
                  <h3 className="font-serif text-3xl text-foreground mb-3">Adaptive AI interviewer</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-[44ch]">
                    Our proprietary model analyzes responses in real-time and generates follow-up questions that probe for true expertise — never a fixed script.
                  </p>
                </div>
              </div>

              <div className="col-span-12 md:col-span-5 bg-surface/10 p-10 md:p-12 rounded-3xl border border-hairline flex flex-col justify-end">
                <div className="size-9 bg-accent/10 rounded-lg flex items-center justify-center mb-6 text-accent">
                  <Code className="size-5" />
                </div>
                <div>
                  <h3 className="font-serif text-3xl text-foreground mb-3">LeetCode Integration</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Write answers in our collaborative Monaco code environment. Compile code dynamically and verify syntax with secure compiler systems.
                  </p>
                </div>
              </div>

              <div className="col-span-12 md:col-span-4 bg-surface/10 p-8 rounded-2xl border border-hairline">
                <h3 className="text-lg font-semibold text-foreground mb-2">Unified scorecard</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Normalized performance metrics across all interview types for objective hiring decisions.
                </p>
              </div>

              <div className="col-span-12 md:col-span-4 bg-surface/10 p-8 rounded-2xl border border-hairline">
                <h3 className="text-lg font-semibold text-foreground mb-2">P2P Matching</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Connect instantly to online candidates over WebSockets to carry out mock interviews and collaborative coding.
                </p>
              </div>

              <div className="col-span-12 md:col-span-4 bg-surface/10 p-8 rounded-2xl border border-hairline">
                <h3 className="text-lg font-semibold text-foreground mb-2">Bias guardrails</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Structured rubrics and IO-psychology audits keep evaluations fair and defensible.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="py-24 border-t border-hairline">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-12 gap-12">
              <div className="col-span-12 lg:col-span-4">
                <div className="lg:sticky lg:top-32 space-y-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">Workflow</div>
                  <h2 className="font-serif text-4xl md:text-5xl text-foreground">Precision from day one.</h2>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-[34ch]">
                    We've built a workflow that respects the time of both the hiring manager and the candidate.
                  </p>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-8 space-y-16">
                {[
                  { n: "01", t: "Define requirements", d: "Upload a job description or select from our library of skill benchmarks. The AI builds a custom interview script." },
                  { n: "02", t: "Deploy simulations", d: "Candidates interact with the realistic AI interviewer. You receive a structured scorecard with details and scoring." },
                  { n: "03", t: "Verify with peers", d: "Open the collaborative P2P arena to mock-interview peers in real-time, verifying live communication and coding accuracy." }
                ].map((s) => (
                  <div key={s.n} className="flex gap-8 border-t border-hairline pt-8">
                    <span className="font-serif italic text-4xl text-accent/70 shrink-0">{s.n}</span>
                    <div>
                      <h4 className="text-xl font-serif text-zinc-200 mb-2">{s.t}</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed max-w-[52ch]">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 border-t border-hairline">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-surface/10 border border-hairline p-12 md:p-20 rounded-[32px] text-center space-y-8">
              <div className="font-serif text-3xl md:text-5xl text-foreground leading-snug max-w-3xl mx-auto text-balance">
                "Vantage transformed our engineering hiring process. We reduced time-to-hire by <span className="italic text-accent">60%</span> without sacrificing quality."
              </div>
              <div className="flex flex-col items-center">
                <img
                  src={sarahImg}
                  alt="Sarah Chen"
                  className="size-14 rounded-full object-cover mb-3 ring-4 ring-background border border-hairline"
                />
                <div className="text-zinc-200 text-sm font-semibold">Sarah Chen</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">VP of Engineering • CloudCore</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}