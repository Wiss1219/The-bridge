import React from 'react';
import { ProgressReport, LearnerProfile, DifficultyLevel } from '../types';
import { Sparkles, CheckCircle, XCircle, TrendingUp, AlertCircle, BookOpen, ArrowRight, Loader2, Trophy, Zap, ChevronUp, ChevronDown, Minus } from 'lucide-react';

interface Props {
  report: ProgressReport | null;
  profile: LearnerProfile;
  xpEarned: number;
  onContinue: (updated: LearnerProfile) => void;
  onGoHome: () => void;
}

const LEVEL_ORDER: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const LEVEL_GRADIENT: Record<DifficultyLevel, string> = {
  Beginner: 'from-emerald-500 to-teal-500',
  Intermediate: 'from-blue-500 to-cyan-500',
  Advanced: 'from-violet-500 to-purple-500',
  Expert: 'from-rose-500 to-pink-500',
};

export const LearnReport: React.FC<Props> = ({ report, profile, xpEarned, onContinue, onGoHome }) => {
  if (!report) return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 animate-slide-up">
      <div className="relative flex flex-col items-center">
        <img src="/Lockup-White.png" alt="The Bridge Logo" className="h-16 object-contain" />
        <h2 className="brand font-bold text-white text-xl mt-3">The Bridge</h2>
      </div>
      <p className="text-white/40 text-sm animate-pulse">Your AI Coach is analysing your session…</p>
    </div>
  );

  const correct = report.sessionResults.filter(r => r.isCorrect).length;
  const total = report.sessionResults.length;
  const prevIdx = LEVEL_ORDER.indexOf(profile.currentLevel);
  const nextIdx = LEVEL_ORDER.indexOf(report.nextDifficulty);
  const levelChanged = report.nextDifficulty !== profile.currentLevel;
  const levelUp = nextIdx > prevIdx;

  const updatedProfile: LearnerProfile = {
    ...profile,
    currentLevel: report.nextDifficulty,
    totalXP: profile.totalXP + xpEarned,
    sessionsCompleted: profile.sessionsCompleted + 1,
    weakAreas: [...new Set(report.sessionResults.filter(r => !r.isCorrect).map(r => r.topic))].slice(0, 5),
    strongAreas: [...new Set(report.sessionResults.filter(r => r.isCorrect).map(r => r.topic))].slice(0, 5),
    lastActive: new Date().toLocaleDateString(),
  };

  const scoreColor = report.overallScore >= 80 ? '#10b981' : report.overallScore >= 50 ? '#3b82f6' : '#ef4444';
  const circumference = 2 * Math.PI * 32;
  const dashOffset = circumference * (1 - report.overallScore / 100);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-5 space-y-4 animate-slide-up overflow-y-auto h-full">

      {/* Score + XP header */}
      <div className="glass-strong rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 to-violet-600/8 pointer-events-none" />
        <div className="flex items-center gap-5">
          {/* Circular score */}
          <div className="relative shrink-0">
            <svg width="80" height="80" className="-rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="6"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${scoreColor})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white">{report.overallScore}%</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={16} className="text-yellow-400" />
              <span className="text-white font-bold text-lg">Session Complete!</span>
            </div>
            <div className="text-white/50 text-sm mb-2">{correct}/{total} correct answers</div>

            {/* XP earned */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20">
              <Zap size={12} className="text-yellow-400" />
              <span className="text-yellow-300 text-xs font-semibold">+{xpEarned} XP earned</span>
            </div>
          </div>

          {/* Level badge */}
          <div className="shrink-0 text-center">
            <div className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${LEVEL_GRADIENT[report.nextDifficulty]} text-white text-xs font-bold mb-1`}>
              {report.nextDifficulty}
            </div>
            {levelChanged && (
              <div className={`flex items-center gap-0.5 text-[10px] justify-center ${levelUp ? 'text-emerald-400' : 'text-amber-400'}`}>
                {levelUp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {levelUp ? 'Promoted!' : 'Adjusted'}
              </div>
            )}
            {!levelChanged && <div className="text-white/25 text-[10px] flex items-center gap-0.5 justify-center"><Minus size={10} /> Same level</div>}
          </div>
        </div>
      </div>

      {/* AI Coach message */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center glow-blue shrink-0">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="text-white/60 text-xs font-medium uppercase tracking-wider">AI Coach</span>
        </div>
        <p className="text-white/75 text-sm leading-relaxed italic" dir="auto">"{report.aiCoachMessage}"</p>
      </div>

      {/* Strengths & weaknesses */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium mb-2">
            <CheckCircle size={12} /> Strengths
          </div>
          <p className="text-white/60 text-xs leading-relaxed" dir="auto">{report.strengthsSummary}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium mb-2">
            <AlertCircle size={12} /> Focus Areas
          </div>
          <p className="text-white/60 text-xs leading-relaxed" dir="auto">{report.weaknessesSummary}</p>
        </div>
      </div>

      {/* Recommended topics */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-1.5 text-blue-400 text-xs font-medium mb-3">
          <TrendingUp size={12} /> Recommended Next Topics
        </div>
        <div className="flex flex-wrap gap-2">
          {report.recommendedTopics.map((t, i) => (
            <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300" dir="auto">{t}</span>
          ))}
        </div>
      </div>

      {/* Q-by-Q review */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5">
          <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Question Review</span>
        </div>
        <div className="max-h-44 overflow-y-auto divide-y divide-white/5">
          {report.sessionResults.map((r, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5">
              {r.isCorrect
                ? <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                : <XCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-white/60 text-xs truncate" dir="auto">{r.question}</div>
                {!r.isCorrect && <div className="text-rose-400/70 text-xs mt-0.5" dir="auto">✓ {r.correctAnswer}</div>}
              </div>
              <span className="text-white/25 text-xs shrink-0">{r.timeTaken}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pb-2">
        <button onClick={() => onContinue(updatedProfile)}
          className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm hover:from-blue-500 hover:to-violet-500 transition-all glow-blue flex items-center justify-center gap-2">
          <BookOpen size={15} /> Continue <ArrowRight size={15} />
        </button>
        <button onClick={onGoHome}
          className="py-3 rounded-xl glass border-white/10 text-white/70 font-medium text-sm hover:text-white hover:border-white/20 transition-all">
          Back to Home
        </button>
      </div>
    </div>
  );
};
