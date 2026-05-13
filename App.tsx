import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HomePage } from './components/HomePage';
import { Dashboard } from './components/Dashboard';
import { LearnSession } from './components/LearnSession';
import { LearnReport } from './components/LearnReport';
import { Auth } from './components/Auth';
import { AppMode, LearnerProfile, ExerciseResult, ProgressReport, User } from './types';
import { extractPdfContent, generateProgressReport, generateSpeech } from './services/gemini';
import { decodeAudioData } from './utils/audio';
import { Brain } from 'lucide-react';
import { supabase } from './services/supabase';



export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AppMode>('home');
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [pdfContext, setPdfContext] = useState<string | null>(null);
  const [sessionResults, setSessionResults] = useState<ExerciseResult[]>([]);
  const [sessionXP, setSessionXP] = useState(0);
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [isPrepping, setIsPrepping] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartRef = useRef(0);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '', name: session.user.user_metadata?.name || '' });
        fetchProfile(session.user.id);
        setMode('dashboard');
      }
    });

    // Listen to Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '', name: session.user.user_metadata?.name || '' });
        fetchProfile(session.user.id);
        setMode('dashboard');
      } else {
        setUser(null);
        setProfile(null);
        setMode('home');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data && !error) {
      setProfile({
        name: data.name || '',
        subject: data.subject || 'Mathematics',
        currentLevel: data.current_level || 'Beginner',
        sessionLength: data.session_length || 5,
        language: data.language || 'en',
        totalXP: data.total_xp || 0,
        sessionsCompleted: data.sessions_completed || 0,
        weakAreas: data.weak_areas || [],
        strongAreas: data.strong_areas || [],
        lastActive: data.last_active || new Date().toISOString(),
      });
    }
  };

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const playAudio = useCallback((buffer: AudioBuffer) => {
    const ctx = getAudioCtx();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    if (nextStartRef.current < now) nextStartRef.current = now;
    src.start(nextStartRef.current);
    nextStartRef.current += buffer.duration;
  }, [getAudioCtx]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleLogin = (u: User) => {
    // Rely on Supabase onAuthStateChange
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleStart = async (p: LearnerProfile, pdfData: string | null) => {
    setProfile(p);
    // Profile is updated/saved to Supabase in Dashboard.tsx

    setReport(null); setSessionResults([]); setSessionXP(0);

    if (pdfData) {
      setIsPrepping(true);
      const ctx = await extractPdfContent(pdfData);
      setPdfContext(ctx || null);
      setIsPrepping(false);
    } else {
      setPdfContext(null);
    }
    setMode('session');
  };

  const handleSessionEnd = async (results: ExerciseResult[], xp: number) => {
    setSessionResults(results);
    setSessionXP(xp);
    setMode('report');
    if (profile && user) {
      const r = await generateProgressReport(profile, results);
      setReport(r);
      
      // Save Session to Supabase
      if (r) {
        const { data: sessionData, error } = await supabase.from('sessions').insert({
          user_id: user.id,
          overall_score: r.overallScore,
          strengths_summary: r.strengthsSummary,
          weaknesses_summary: r.weaknessesSummary,
          recommended_topics: r.recommendedTopics,
          next_difficulty: r.nextDifficulty,
          ai_coach_message: r.aiCoachMessage
        }).select('id').single();

        if (sessionData && !error) {
          const formattedResults = results.map(res => ({
            session_id: sessionData.id,
            user_id: user.id,
            exercise_id: res.exerciseId,
            question: res.question,
            user_answer: res.userAnswer,
            correct_answer: res.correctAnswer,
            is_correct: res.isCorrect,
            time_taken: res.timeTaken,
            topic: res.topic,
            difficulty: res.difficulty
          }));
          await supabase.from('exercise_results').insert(formattedResults);
        }
      }
    }
  };

  const handleContinue = async (updated: LearnerProfile) => {
    setProfile(updated);
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        name: updated.name,
        subject: updated.subject,
        current_level: updated.currentLevel,
        session_length: updated.sessionLength,
        language: updated.language,
        total_xp: updated.totalXP,
        sessions_completed: updated.sessionsCompleted,
        weak_areas: updated.weakAreas,
        strong_areas: updated.strongAreas,
        last_active: updated.lastActive
      });
    }
    setMode('dashboard');
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#080C18] flex flex-col">
      {/* Dark overlay gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />

      {/* Navbar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0"
        style={{ background: 'rgba(8,12,24,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <img src="/Lockup-White.png" alt="The Bridge Logo" className="h-10 object-contain" />
          <span className="brand font-bold text-white text-xl tracking-tight">The Bridge</span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 glass rounded-full px-3 py-1.5">
              <span className="text-white/70 text-xs font-medium px-2 border-r border-white/10">Welcome, {user.name}</span>
              {profile && (
                <div className="flex items-center gap-2 ml-1">
                  <span className="text-white/30 text-xs">·</span>
                  <span className="text-blue-400 text-xs font-bold">{profile.totalXP} XP</span>
                </div>
              )}
            </div>
          )}
          {user && (
             <button onClick={handleLogout} className="text-xs text-white/30 hover:text-white/60 transition-colors glass px-3 py-1.5 rounded-full">
               Logout
             </button>
          )}
          {mode !== 'dashboard' && mode !== 'auth' && mode !== 'home' && (
            <button onClick={() => setMode('dashboard')}
              className="text-xs text-white/30 hover:text-white/60 transition-colors glass px-3 py-1.5 rounded-full">
              ← Home
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 overflow-hidden flex items-start justify-center">
        {/* Prepping overlay */}
        {isPrepping && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6"
            style={{ background: 'rgba(8,12,24,0.85)', backdropFilter: 'blur(8px)' }}>
            <img src="/Lockup-White.png" alt="The Bridge Logo" className="h-20 object-contain" />
            <h2 className="brand text-3xl font-bold text-white">The Bridge</h2>
            <p className="text-white/50 text-sm animate-pulse mt-2">Reading your course material…</p>
          </div>
        )}

        {mode === 'home' && (
          <HomePage onGetStarted={() => setMode('auth')} />
        )}
        {mode === 'auth' && (
          <Auth onLogin={handleLogin} />
        )}
        {mode === 'dashboard' && (
          <Dashboard profile={profile} onStart={handleStart} user={user!} />
        )}
        {mode === 'session' && profile && (
          <LearnSession
            profile={profile}
            pdfContext={pdfContext}
            onSessionEnd={handleSessionEnd}
            audioContext={audioCtxRef.current}
            onPlayAudio={playAudio}
          />
        )}
        {mode === 'report' && profile && (
          <LearnReport
            report={report}
            profile={profile}
            xpEarned={sessionXP}
            onContinue={handleContinue}
            onGoHome={() => setMode('dashboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-20 flex items-center justify-center px-6 py-2 border-t border-white/5 shrink-0"
        style={{ background: 'rgba(8,12,24,0.8)', backdropFilter: 'blur(20px)' }}>
        <span className="text-white/15 text-xs">The Bridge · Adaptive Learning System</span>
      </footer>
    </div>
  );
}