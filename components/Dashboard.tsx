import React, { useState, useRef } from 'react';
import { Sparkles, BookOpen, Upload, ChevronRight, GraduationCap, Target, TrendingUp, Award, X } from 'lucide-react';
import { LearnerProfile, DifficultyLevel, Subject, User } from '../types';
import { supabase } from '../services/supabase';
import { Loader2 } from 'lucide-react';

interface DashboardProps {
  user: User;
  profile: LearnerProfile | null;
  onStart: (profile: LearnerProfile, pdfData: string | null, pdfContext?: string) => void;
}

const SUBJECTS: Subject[] = [
  'Mathematics', 'Physics', 'History', 'Biology',
  'Computer Science', 'Literature', 'Chemistry', 'Economics',
  'Based on PDF'
];

const LEVELS: { value: DifficultyLevel; label: string; color: string; desc: string }[] = [
  { value: 'Beginner',     label: 'Beginner',      color: 'from-emerald-500 to-teal-500',    desc: 'Just starting out' },
  { value: 'Intermediate', label: 'Intermediate',   color: 'from-blue-500 to-cyan-500',       desc: 'Some experience' },
  { value: 'Advanced',     label: 'Advanced',       color: 'from-violet-500 to-purple-500',   desc: 'Strong foundation' },
  { value: 'Expert',       label: 'Expert',         color: 'from-rose-500 to-pink-500',       desc: 'Mastery level' },
];

const SUBJECT_ICONS: Record<string, string> = {
  'Mathematics': '∑', 'Physics': 'φ', 'History': '⏳', 'Biology': '🧬',
  'Computer Science': '</>', 'Literature': '📖', 'Chemistry': '⚗', 'Economics': '📈',
  'Based on PDF': '📄',
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => (
  <div className="glass rounded-xl p-4 flex flex-col gap-1">
    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-1`}>{icon}</div>
    <div className="text-white/40 text-xs uppercase tracking-wider">{label}</div>
    <div className="text-white font-bold text-xl">{value}</div>
  </div>
);

const XPBar = ({ xp }: { xp: number }) => {
  const lvl = Math.floor(xp / 100) + 1;
  const pct = xp % 100;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-white/40 mb-1.5">
        <span>Level {lvl}</span><span>{xp} XP total · {100 - pct} XP to next</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ user, profile, onStart }) => {
  const [step, setStep] = useState<'setup' | 'ready'>(profile ? 'ready' : 'setup');
  const [name, setName] = useState(profile?.name || user.name || '');
  const [subject, setSubject] = useState<Subject | string>(profile?.subject || SUBJECTS[0]);
  const [level, setLevel] = useState<DifficultyLevel>(profile?.currentLevel || 'Beginner');
  const [sessionLength, setSessionLength] = useState<number>(profile?.sessionLength || 5);
  const [language, setLanguage] = useState<'en' | 'ar'>(profile?.language || 'en');
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || f.type !== 'application/pdf') return;
    const r = new FileReader();
    r.onload = () => { setPdfData((r.result as string).split(',')[1]); setPdfName(f.name); };
    r.readAsDataURL(f);
  };

  const builtProfile: LearnerProfile = {
    name: name || 'Learner',
    subject: subject === 'Based on PDF' ? 'Based on PDF' : subject,
    currentLevel: level,
    sessionLength,
    language,
    totalXP: profile?.totalXP || 0,
    sessionsCompleted: profile?.sessionsCompleted || 0,
    weakAreas: profile?.weakAreas || [],
    strongAreas: profile?.strongAreas || [],
    lastActive: new Date().toLocaleDateString(),
  };

  const handleLaunch = () => onStart(builtProfile, pdfData);

  const handleSetupComplete = async () => {
    if (!name.trim() || (subject === 'Based on PDF' && !pdfData)) return;
    setIsSaving(true);
    
    // Save to Supabase
    await supabase.from('profiles').upsert({
      id: user.id,
      name,
      subject: subject === 'Based on PDF' ? 'Based on PDF' : subject,
      current_level: level,
      session_length: sessionLength,
      language,
      last_active: new Date().toISOString()
    });
    
    setIsSaving(false);
    setStep('ready');
  };

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (step === 'setup') return (
    <div className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto px-3 max-[360px]:px-2 sm:px-4 lg:px-8 py-5 max-[360px]:py-4 space-y-5 animate-slide-up overflow-y-auto h-full">
      <div className="text-center mb-2">
        <h2 className="brand text-xl max-[360px]:text-lg sm:text-2xl lg:text-3xl font-bold text-white">Configure Your Learning Path</h2>
        <p className="text-white/40 text-xs sm:text-sm mt-1">The AI will adapt everything to your choices</p>
      </div>

      {/* Name */}
      <div className="glass rounded-xl p-4 space-y-2">
        <label className="text-xs text-white/50 uppercase tracking-wider">Your Name</label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Alex..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors text-sm"
        />
      </div>

      {/* Subject */}
      <div className="glass rounded-xl p-4 space-y-3">
        <label className="text-xs text-white/50 uppercase tracking-wider">Subject</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)}
              className={`p-2.5 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                subject === s
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'bg-white/3 border-white/8 text-white/50 hover:border-white/20 hover:text-white/70'
              }`}
            >
              <span className="text-lg">{SUBJECT_ICONS[s]}</span>
              <span className="text-[10px] leading-tight">{s}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Level & Language Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        {/* Level */}
        <div className="glass rounded-xl p-4 space-y-3">
          <label className="text-xs text-white/50 uppercase tracking-wider">Starting Level</label>
          <div className="flex flex-col gap-2">
            {LEVELS.map(l => (
              <button key={l.value} onClick={() => setLevel(l.value)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  level === l.value
                    ? 'border-transparent text-white'
                    : 'bg-white/3 border-white/8 text-white/50 hover:border-white/20'
                }`}
                style={level === l.value ? { background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)' } : {}}
              >
                <div className={`text-xs font-bold bg-gradient-to-r ${l.color} bg-clip-text text-transparent`}>{l.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="glass rounded-xl p-4 space-y-3">
          <label className="text-xs text-white/50 uppercase tracking-wider">Language</label>
          <div className="flex flex-col gap-2">
            {[
              { val: 'en', label: 'English', desc: 'US / UK' },
              { val: 'ar', label: 'Arabic (العربية)', desc: 'Standard Arabic' }
            ].map(l => (
              <button key={l.val} onClick={() => setLanguage(l.val as 'en' | 'ar')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  language === l.val
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'bg-white/3 border-white/8 text-white/50 hover:border-white/20'
                }`}
              >
                <div className={`text-xs font-bold ${language === l.val ? 'text-blue-300' : 'text-white/70'}`}>{l.label}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{l.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Session Length */}
      <div className="glass rounded-xl p-4 space-y-3">
        <label className="text-xs text-white/50 uppercase tracking-wider">Session Length</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-3">
          {[
            { val: 3, label: 'Quick', desc: '3 Exercises' },
            { val: 5, label: 'Standard', desc: '5 Exercises' },
            { val: 10, label: 'Deep Dive', desc: '10 Exercises' }
          ].map(len => (
            <button key={len.val} onClick={() => setSessionLength(len.val)}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col items-center gap-1 ${
                sessionLength === len.val
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'bg-white/3 border-white/8 text-white/50 hover:border-white/20'
              }`}
            >
              <div className={`text-xs font-bold ${sessionLength === len.val ? 'text-blue-300' : 'text-white/70'}`}>{len.label}</div>
              <div className="text-[10px] text-white/40">{len.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* PDF */}
      <div className={`glass rounded-xl p-4 space-y-2 transition-all ${subject === 'Based on PDF' && !pdfData ? 'ring-2 ring-blue-500/50 bg-blue-500/5' : ''}`}>
        <label className="text-xs text-white/50 uppercase tracking-wider">Course Material {subject === 'Based on PDF' ? <span className="text-blue-400 font-bold ml-1">(Required for "Based on PDF")</span> : <span className="text-white/25">(Optional PDF)</span>}</label>
        {pdfData ? (
          <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            <BookOpen size={14} className="text-blue-400 shrink-0" />
            <span className="text-sm text-blue-300 truncate flex-1">{pdfName}</span>
            <button onClick={() => { setPdfData(null); setPdfName(null); }} className="text-white/30 hover:text-white"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed border-white/15 rounded-lg p-4 flex items-center gap-3 text-white/30 hover:border-blue-500/40 hover:text-blue-400 transition-colors">
            <Upload size={16} /> <span className="text-sm">Upload PDF — AI will generate exercises from it</span>
            <input ref={fileRef} type="file" className="hidden" accept="application/pdf" onChange={handleFile} />
          </button>
        )}
      </div>

      <button
        onClick={handleSetupComplete}
        disabled={!name.trim() || (subject === 'Based on PDF' && !pdfData) || isSaving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold hover:from-blue-500 hover:to-violet-500 transition-all glow-blue disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
        {isSaving ? 'Saving Profile...' : 'Create Profile & Continue'} 
        {!isSaving && <ChevronRight size={16} />}
      </button>
    </div>
  );

  // ── READY / DASHBOARD ─────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto px-3 max-[360px]:px-2 sm:px-4 lg:px-8 py-5 max-[360px]:py-4 space-y-5 animate-slide-up overflow-y-auto h-full">
      {/* Profile Banner */}
      <div className="glass-strong rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-violet-600/10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white glow-blue shrink-0">
            {builtProfile.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-lg">{builtProfile.name}</div>
            <div className="text-white/40 text-sm">{builtProfile.subject} · <span className="text-blue-400">{builtProfile.currentLevel}</span></div>
          </div>
          <button onClick={() => setStep('setup')} className="text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1 glass rounded-lg self-start sm:self-auto">Edit</button>
        </div>
        <XPBar xp={builtProfile.totalXP} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <StatCard icon={<Award size={14} className="text-white" />} label="Sessions" value={builtProfile.sessionsCompleted} color="from-blue-500 to-cyan-500" />
        <StatCard icon={<Target size={14} className="text-white" />} label="Weak Areas" value={builtProfile.weakAreas.length || '—'} color="from-rose-500 to-pink-500" />
        <StatCard icon={<TrendingUp size={14} className="text-white" />} label="Total XP" value={builtProfile.totalXP} color="from-violet-500 to-purple-500" />
      </div>

      {/* Weak areas chips */}
      {builtProfile.weakAreas.length > 0 && (
        <div className="glass rounded-xl p-4 space-y-2">
          <div className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-2"><Target size={10} /> Focus Areas</div>
          <div className="flex flex-wrap gap-2">
            {builtProfile.weakAreas.map((w, i) => (
              <span key={i} className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">{w}</span>
            ))}
          </div>
        </div>
      )}

      {/* PDF */}
      <div className="glass rounded-xl p-4 space-y-2">
        <label className="text-xs text-white/40 uppercase tracking-wider">Course Material</label>
        {pdfData ? (
          <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            <BookOpen size={14} className="text-blue-400 shrink-0" />
            <span className="text-sm text-blue-300 truncate flex-1">{pdfName}</span>
            <button onClick={() => { setPdfData(null); setPdfName(null); }} className="text-white/30 hover:text-white"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed border-white/10 rounded-lg p-3 flex items-center gap-3 text-white/25 hover:border-blue-500/30 hover:text-blue-400 transition-colors text-sm">
            <Upload size={14} /> Add PDF course material
            <input ref={fileRef} type="file" className="hidden" accept="application/pdf" onChange={handleFile} />
          </button>
        )}
      </div>

      {/* Launch */}
      <button
        onClick={handleLaunch}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-base hover:from-blue-500 hover:to-violet-500 transition-all glow-blue flex items-center justify-center gap-2"
      >
        <GraduationCap size={18} /> Launch AI Learning Session <ChevronRight size={18} />
      </button>
    </div>
  );
};
