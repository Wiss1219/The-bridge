import React from 'react';
import { Brain, Sparkles, Zap, ChevronRight } from 'lucide-react';

interface HomePageProps {
  onGetStarted: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGetStarted }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 animate-slide-up">
      <div className="mb-8">
        <img src="/Lockup-White.png" alt="The Bridge Logo" className="h-32 object-contain mx-auto opacity-100" />
      </div>
      <div className="max-w-xl">
        <h1 className="brand text-6xl font-bold mb-6 tracking-tight">The Bridge</h1>
        <p className="text-white/40 text-lg leading-relaxed mb-10 font-light">
          An adaptive learning system that personalizes every exercise, coaches you in real-time, and evolves with your progress.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {['Adaptive Exercises', 'AI Coach Feedback', '4 Question Types', 'XP & Progression', 'PDF Integration'].map(f => (
            <span key={f} className="glass px-3 py-1 rounded-full text-xs text-white/60">{f}</span>
          ))}
        </div>
        <button
          onClick={onGetStarted}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-base hover:from-blue-500 hover:to-violet-500 transition-all glow-blue flex items-center gap-2 mx-auto"
        >
          Get Started <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
