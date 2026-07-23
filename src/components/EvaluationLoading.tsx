import React, { useState, useEffect } from 'react';
import { Loader2, Check, Sparkles, Brain, MessageSquare, Award } from 'lucide-react';

const EVALUATION_STAGES = [
  { label: "Reviewing responses", icon: Sparkles },
  { label: "Evaluating technical knowledge", icon: Brain },
  { label: "Analyzing communication", icon: MessageSquare },
  { label: "Generating personalized feedback", icon: Award }
];

interface EvaluationLoadingProps {
  isReady: boolean;
  onComplete: () => void;
}

export const EvaluationLoading: React.FC<EvaluationLoadingProps> = ({ isReady, onComplete }) => {
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [hasFinishedMinSpin, setHasFinishedMinSpin] = useState<boolean>(false);

  useEffect(() => {
    if (completedCount < 3) {
      // For the first three stages, stay spinning for 1800ms, then complete the stage
      const timer = setTimeout(() => {
        setCompletedCount((prev) => prev + 1);
      }, 1800);
      return () => clearTimeout(timer);
    } else if (completedCount === 3) {
      // For the final stage, start a timer of 1800ms to ensure a brief display of its loading spinner
      setHasFinishedMinSpin(false);
      const timer = setTimeout(() => {
        setHasFinishedMinSpin(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [completedCount]);

  // When stage 3 has finished its minimum spin duration AND the backend report is ready,
  // mark the final stage as completed.
  useEffect(() => {
    if (completedCount === 3 && hasFinishedMinSpin && isReady) {
      setCompletedCount(4);
    }
  }, [completedCount, hasFinishedMinSpin, isReady]);

  // Once all 4 stages are completed, wait 200ms and trigger onComplete()
  useEffect(() => {
    if (completedCount === 4) {
      const timer = setTimeout(() => {
        onComplete();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [completedCount, onComplete]);

  return (
    <div className="min-h-[460px] flex flex-col items-center justify-center p-8 bg-card-warm border border-border-warm rounded-2xl shadow-sm space-y-8 animate-fade-in" id="evaluation-loading-container">
      {/* Dynamic spinner area */}
      <div className="relative">
        <div className="absolute inset-0 bg-accent-forest/10 rounded-full blur-xl animate-pulse"></div>
        <div className="relative w-16 h-16 bg-accent-forest/5 border border-border-warm rounded-full flex items-center justify-center text-accent-forest shadow-2xs">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>

      {/* Main Title and Description */}
      <div className="text-center space-y-2.5 max-w-md">
        <h2 className="text-2xl font-bold text-text-charcoal font-serif-editorial italic tracking-tight">
          Analyzing Your Interview
        </h2>
        <p className="text-xs sm:text-sm text-text-soft leading-relaxed font-sans">
          We're reviewing your responses, evaluating your technical knowledge, and preparing your personalized interview report.
        </p>
      </div>

      {/* Structured, elegantly styled progress steps */}
      <div className="w-full max-w-sm bg-bg-warm/40 border border-border-warm/50 rounded-xl p-5 space-y-4">
        {EVALUATION_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = idx < completedCount;
          const isActive = idx === completedCount;

          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-300 ${
                isActive
                  ? 'bg-accent-forest/5 border-accent-forest/20 text-accent-forest'
                  : isCompleted
                  ? 'bg-bg-warm border-transparent text-text-charcoal/70'
                  : 'bg-transparent border-transparent text-text-soft/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-accent-forest/15 text-accent-forest'
                      : isCompleted
                      ? 'bg-accent-forest/10 text-accent-forest/80'
                      : 'bg-border-warm/30 text-text-soft/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs font-sans transition-all ${isActive ? 'font-semibold' : ''}`}>
                  {stage.label}
                </span>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0">
                {isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-accent-forest/10 flex items-center justify-center text-accent-forest animate-fade-in">
                    <Check className="w-3 h-3 stroke-[3px]" />
                  </div>
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-forest" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-border-warm/80 mx-1.5"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
