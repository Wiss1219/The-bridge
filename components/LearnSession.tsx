import React, { useState, useEffect } from 'react';
import { Exercise, ExerciseResult, LearnerProfile, ExerciseType } from '../types';
import { generateAdaptiveExercise, evaluateOpenEndedAnswer, generateSpeech } from '../services/gemini';
import { decodeAudioData } from '../utils/audio';
import { Sparkles, Lightbulb, CheckCircle, XCircle, ChevronRight, Loader2, Volume2, Flame, Zap } from 'lucide-react';

interface Props {
  profile: LearnerProfile;
  pdfContext: string | null;
  onSessionEnd: (results: ExerciseResult[], xp: number) => void;
  audioContext: AudioContext | null;
  onPlayAudio: (buffer: AudioBuffer) => void;
}

const TYPES: ExerciseType[] = ['mcq', 'true_false', 'fill_blank', 'open_ended'];
const XP_CORRECT = 20;
const XP_STREAK = 5;

type Phase = 'loading' | 'question' | 'evaluating' | 'feedback';

const TYPE_LABELS: Record<ExerciseType, { icon: string; label: string; color: string }> = {
  mcq: { icon: '📝', label: 'Multiple Choice', color: 'from-blue-500 to-cyan-500' },
  true_false: { icon: '⚖️', label: 'True or False', color: 'from-violet-500 to-purple-500' },
  fill_blank: { icon: '✏️', label: 'Fill in the Blank', color: 'from-amber-500 to-orange-500' },
  open_ended: { icon: '💬', label: 'Open Question', color: 'from-emerald-500 to-teal-500' },
};

export const LearnSession: React.FC<Props> = ({ profile, pdfContext, onSessionEnd, audioContext, onPlayAudio }) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [openInput, setOpenInput] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; msg: string; xp: number } | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [speaking, setSpeaking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isExplaining, setIsExplaining] = useState(false);

  const sessionLen = profile.sessionLength || 5;

  // Timer logic
  useEffect(() => {
    if (phase !== 'question') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, exercise]);

  const speak = async (text: string) => {
    if (!audioContext) return;
    setSpeaking(true);
    try {
      const b64 = await generateSpeech(text);
      if (b64) { const buf = await decodeAudioData(b64, audioContext); onPlayAudio(buf); }
    } catch (_) { }
    setSpeaking(false);
  };

  const loadNext = async () => {
    setPhase('loading'); setFeedback(null); setOpenInput('');
    setShowHint(false); setHintIdx(0);
    const type = TYPES[results.length % TYPES.length];
    const ex = await generateAdaptiveExercise(profile, type, undefined, pdfContext);
    if (ex) {
      setExercise(ex);
      setStartTime(Date.now());
      setTimeLeft(60); // Reset timer
      setPhase('question');
      speak(ex.question);
    }
  };

  useEffect(() => { loadNext(); }, []);

  const submit = async (answer: string) => {
    if (!exercise || phase !== 'question') return;
    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    let correct = false; let fbMsg = '';
    if (exercise.type === 'open_ended') {
      setPhase('evaluating');
      const ev = await evaluateOpenEndedAnswer(exercise.question, exercise.correctAnswer, answer, profile);
      correct = ev.isCorrect; fbMsg = ev.feedback;
    } else {
      correct = answer.trim().toLowerCase() === exercise.correctAnswer.trim().toLowerCase();
      fbMsg = correct ? exercise.explanation : `The answer was: "${exercise.correctAnswer}". ${exercise.explanation}`;
    }

    const newStreak = correct ? streak + 1 : 0;
    const earned = correct ? XP_CORRECT + (newStreak > 2 ? XP_STREAK * (newStreak - 1) : 0) : 0;
    setStreak(newStreak); setTotalXP(x => x + earned);

    const result: ExerciseResult = {
      exerciseId: exercise.id, question: exercise.question,
      userAnswer: answer, correctAnswer: exercise.correctAnswer,
      isCorrect: correct, timeTaken, topic: exercise.topic, difficulty: exercise.difficulty
    };
    const newResults = [...results, result];
    setResults(newResults);
    setFeedback({ correct, msg: fbMsg, xp: earned });
    setPhase('feedback');
    speak(correct ? `Correct! ${exercise.explanation}` : `Not quite. ${exercise.explanation}`);

    if (newResults.length >= sessionLen) {
      setTimeout(() => onSessionEnd(newResults, totalXP + earned), 2800);
    }
  };

  const handleExplainDeeper = async () => {
    if (!exercise || !feedback) return;
    setIsExplaining(true);
    setPhase('evaluating');
    const explanation = await evaluateOpenEndedAnswer(
      "Explain this concept in more depth like a personal tutor.",
      exercise.explanation,
      "The user needs more clarification on why this is the answer.",
      profile
    );
    setFeedback(prev => prev ? { ...prev, msg: explanation.feedback } : null);
    setIsExplaining(false);
    setPhase('feedback');
    speak(explanation.feedback);
  };

  const qNum = results.length + 1;
  const progress = (results.length / sessionLen) * 100;
  const correct = results.filter(r => r.isCorrect).length;
  const typeInfo = exercise ? TYPE_LABELS[exercise.type] : null;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-4 animate-slide-up overflow-y-auto h-full">
      {/* Header stats */}
      <div className="flex items-center gap-3">
        <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 flex-1">
          <Sparkles size={14} className="text-blue-400" />
          <span className="text-white/50 text-xs">{profile.subject}</span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-blue-400 text-xs font-medium">{profile.currentLevel}</span>
          <span className="text-white/20 text-xs mx-1">|</span>
          <span className="text-white/60 text-xs">Q {Math.min(qNum, sessionLen)}/{sessionLen}</span>
          <span className="text-white/20 text-xs mx-1">|</span>
          <span className="text-emerald-400 text-xs">{correct}/{results.length} ✓</span>
        </div>

        {/* Timer UI */}
        {phase === 'question' && (
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-1">
            <span className={`text-sm font-bold ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-blue-300'}`}>0:{timeLeft.toString().padStart(2, '0')}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {streak > 1 && (
            <div className="glass rounded-xl px-3 py-2 flex items-center gap-1">
              <Flame size={14} className="text-orange-400" />
              <span className="text-orange-300 font-bold text-sm">×{streak}</span>
            </div>
          )}
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-1">
            <Zap size={14} className="text-yellow-400" />
            <span className="text-yellow-300 font-bold text-sm">{totalXP} XP</span>
          </div>
          {speaking && <Volume2 size={14} className="text-blue-400 animate-pulse" />}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-700"
          style={{ width: `${progress}%` }} />
      </div>

      {/* Main card */}
      <div className="glass-strong rounded-2xl overflow-hidden">
        {/* Card header */}
        {typeInfo && (
          <div className={`px-5 py-3 bg-gradient-to-r ${typeInfo.color} bg-opacity-10 border-b border-white/5 flex items-center gap-2`}
            style={{ background: 'rgba(59,130,246,0.08)' }}>
            <span className="text-base">{typeInfo.icon}</span>
            <span className="text-white/70 text-xs font-medium uppercase tracking-wider">{typeInfo.label}</span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* LOADING */}
          {(phase === 'loading' || phase === 'evaluating') && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="relative flex flex-col items-center">
                <img src="/Lockup-White.png" alt="The Bridge Logo" className="h-16 object-contain" />
                <h2 className="brand font-bold text-white text-xl mt-3">The Bridge</h2>
              </div>
              <p className="text-white/40 text-sm animate-pulse" dir="auto">
                {isExplaining ? 'Tutor is thinking deeply…' : (phase === 'evaluating' ? 'AI is evaluating your answer…' : 'Crafting your personalized exercise…')}
              </p>
            </div>
          )}

          {/* QUESTION */}
          {(phase === 'question' || phase === 'feedback') && exercise && (
            <div className="space-y-5">
              {/* Topic badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs" dir="auto">
                📌 {exercise.topic}
              </div>

              {/* Question */}
              <h3 className="text-white text-base font-semibold leading-relaxed" dir="auto">{exercise.question}</h3>

              {/* MCQ / True-False */}
              {(exercise.type === 'mcq' || exercise.type === 'true_false') && exercise.options && (
                <div className="grid grid-cols-1 gap-2">
                  {exercise.options.map((opt, i) => {
                    const isCorrectOpt = opt === exercise.correctAnswer;
                    const isUserOpt = opt === results[results.length - 1]?.userAnswer && phase === 'feedback';
                    let cls = 'w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 ';
                    if (phase === 'feedback') {
                      if (isCorrectOpt) cls += 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
                      else if (isUserOpt && !feedback?.correct) cls += 'bg-rose-500/15 border-rose-500/40 text-rose-300';
                      else cls += 'bg-white/3 border-white/8 text-white/30';
                    } else {
                      cls += 'glass border-white/10 text-white/80 hover:border-blue-500/40 hover:bg-blue-500/10 cursor-pointer';
                    }
                    return (
                      <button key={i} onClick={() => phase === 'question' && submit(opt)} className={cls} disabled={phase === 'feedback'} dir="auto">
                        <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: phase === 'question' ? 'rgba(59,130,246,0.15)' : 'transparent', color: phase === 'question' ? '#60a5fa' : 'inherit' }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {phase === 'feedback' && isCorrectOpt && <CheckCircle size={16} className="text-emerald-400 shrink-0" />}
                        {phase === 'feedback' && isUserOpt && !feedback?.correct && <XCircle size={16} className="text-rose-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fill blank */}
              {exercise.type === 'fill_blank' && phase === 'question' && (
                <div className="flex gap-2">
                  <input type="text" value={openInput} onChange={e => setOpenInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && openInput.trim() && submit(openInput.trim())}
                    placeholder="Type your answer…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors text-sm" dir="auto" />
                  <button onClick={() => openInput.trim() && submit(openInput.trim())}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Submit</button>
                </div>
              )}

              {/* Open ended */}
              {exercise.type === 'open_ended' && phase === 'question' && (
                <div className="space-y-2">
                  <textarea value={openInput} onChange={e => setOpenInput(e.target.value)} rows={4} placeholder="Write your answer here…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors text-sm resize-none" dir="auto" />
                  <button onClick={() => openInput.trim() && submit(openInput.trim())}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">Submit Answer</button>
                </div>
              )}

              {/* Text answer in feedback (fill/open) */}
              {phase === 'feedback' && (exercise.type === 'fill_blank' || exercise.type === 'open_ended') && (
                <div className="space-y-2 text-sm">
                  <div className={`rounded-xl p-3 border ${feedback?.correct ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`} dir="auto">
                    <span className="font-medium opacity-60">Your answer: </span>{results[results.length - 1]?.userAnswer}
                  </div>
                  {!feedback?.correct && (
                    <div className="rounded-xl p-3 border bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                      <span className="font-medium opacity-60">Correct: </span>{exercise.correctAnswer}
                    </div>
                  )}
                </div>
              )}

              {/* Hint */}
              {phase === 'question' && exercise.hints?.length && (
                <div>
                  {!showHint
                    ? <button onClick={() => setShowHint(true)} className="flex items-center gap-1.5 text-xs text-amber-400/70 hover:text-amber-400 transition-colors">
                      <Lightbulb size={12} /> Need a hint?
                    </button>
                    : <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-300 text-xs">
                      <Lightbulb size={12} className="mt-0.5 shrink-0" />
                      <div>
                        {exercise.hints[hintIdx]}
                        {hintIdx < exercise.hints.length - 1 &&
                          <button onClick={() => setHintIdx(h => h + 1)} className="block font-medium mt-1 text-amber-400 hover:underline">Stronger hint →</button>}
                      </div>
                    </div>}
                </div>
              )}

              {/* Feedback box */}
              {phase === 'feedback' && feedback && (
                <div className={`rounded-xl p-4 border text-sm leading-relaxed ${feedback.correct
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                  <div className="flex items-center gap-2 font-semibold mb-1.5">
                    {feedback.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {feedback.correct ? `+${feedback.xp} XP earned!` : 'Keep going — you got this!'}
                  </div>
                  <p className="opacity-80">{feedback.msg}</p>

                  {!feedback.correct && (
                    <button onClick={handleExplainDeeper} className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline font-medium">
                      🤖 Explain deeper
                    </button>
                  )}
                </div>
              )}

              {/* Next */}
              {phase === 'feedback' && results.length < sessionLen && (
                <button onClick={loadNext}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold hover:from-blue-500 hover:to-violet-500 transition-all flex items-center justify-center gap-2">
                  Next Exercise <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
