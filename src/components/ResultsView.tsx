/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Award, ArrowLeft, CheckCircle2, XCircle, AlertCircle, BookOpen, BarChart3, ChevronDown, ChevronUp, Star, RefreshCw } from 'lucide-react';
import { InterviewSession, AnswerSubmission, InterviewQuestion } from '../types';

interface ResultsViewProps {
  session: InterviewSession;
  onBackToDashboard: () => void;
  onBackToHistory?: () => void;
  onRetry?: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  session,
  onBackToDashboard,
  onBackToHistory,
  onRetry,
}) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const feedback = session.overallFeedback;
  const isInitiallyCompleted = session.status === 'completed' && !!feedback;

  const [visualStage, setVisualStage] = useState(isInitiallyCompleted ? 3 : 0);
  const [showReassuringMessage, setShowReassuringMessage] = useState(false);
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(isInitiallyCompleted);

  useEffect(() => {
    if (isInitiallyCompleted) return;

    // Advance stages progressively every 1.2 seconds
    const stageInterval = setInterval(() => {
      setVisualStage((prev) => {
        if (prev < 3) return prev + 1;
        clearInterval(stageInterval);
        return prev;
      });
    }, 1200);

    // Set minimum time elapsed after 3.6 seconds (when Stage 3 is reached)
    const minTimeTimeout = setTimeout(() => {
      setMinimumTimeElapsed(true);
    }, 3600);

    // Timeout fallback for reassuring message after 7.5 seconds
    const reassuringTimeout = setTimeout(() => {
      setShowReassuringMessage(true);
    }, 7500);

    return () => {
      clearInterval(stageInterval);
      clearTimeout(minTimeTimeout);
      clearTimeout(reassuringTimeout);
    };
  }, [isInitiallyCompleted, session.status]);

  if (session.status === 'abandoned') {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-card-warm border border-border-warm rounded-2xl shadow-sm text-center space-y-8 animate-fade-in" id="abandoned-interview-details">
        <div className="mx-auto h-12 w-12 bg-accent-clay/10 border border-accent-clay/20 text-accent-clay rounded-xl flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-extrabold text-text-charcoal font-serif-editorial italic tracking-tight">
            Interview Abandoned
          </h2>
          <p className="text-text-soft text-sm leading-relaxed max-w-sm mx-auto font-sans">
            This interview was exited before completion. No evaluation report was generated.
          </p>
        </div>

        <div className="bg-bg-warm/60 border border-border-warm rounded-xl p-5 text-left space-y-4 font-sans text-xs">
          <div className="flex items-center justify-between border-b border-border-warm/50 pb-2.5">
            <span className="font-medium text-text-soft uppercase font-mono tracking-wider text-[10px]">Completed Questions</span>
            <span className="font-extrabold text-text-charcoal text-sm">
              {Object.keys(session.answers || {}).length} / {session.questionCount}
            </span>
          </div>
          <div className="space-y-1">
            <span className="font-medium text-text-soft uppercase font-mono tracking-wider text-[10px] block">Reason</span>
            <span className="text-text-charcoal font-medium">
              Interview ended before submission.
            </span>
          </div>
        </div>

        <div className="pt-4 flex flex-col space-y-3">
          <button
            onClick={onRetry}
            className="w-full py-3 bg-accent-forest hover:bg-accent-forest/90 text-white text-xs uppercase tracking-wider font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-xs border border-accent-forest/10 active:scale-95 text-center"
          >
            Start New Interview
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onBackToDashboard}
              className="flex-1 py-3 bg-card-warm hover:bg-bg-warm text-text-charcoal border border-border-warm text-xs uppercase tracking-wider font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-xs active:scale-95 text-center"
            >
              Back to Dashboard
            </button>
            {onBackToHistory && (
              <button
                onClick={onBackToHistory}
                className="flex-1 py-3 bg-card-warm hover:bg-bg-warm text-text-charcoal border border-border-warm text-xs uppercase tracking-wider font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-xs active:scale-95 text-center"
              >
                View Practice Logs
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const readyToShow = !!feedback && minimumTimeElapsed;

  if (!readyToShow) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-card-warm border border-border-warm rounded-2xl shadow-sm text-center space-y-8 animate-fade-in" id="evaluation-loading-container">
        <div className="flex justify-center relative">
          <div className="relative flex items-center justify-center">
            {/* Outer spinning ring */}
            <div className="absolute w-16 h-16 rounded-full border-2 border-accent-forest/10 border-t-accent-forest animate-spin" />
            {/* Inner pulsing circle */}
            <div className="w-12 h-12 rounded-full bg-accent-forest/5 flex items-center justify-center text-accent-forest animate-pulse">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-extrabold text-text-charcoal font-serif-editorial italic tracking-tight">
            Analyzing Your Interview
          </h3>
          <p className="text-text-soft text-xs leading-relaxed max-w-sm mx-auto font-sans">
            We're reviewing your responses, evaluating your technical knowledge, and preparing your personalized interview report.
          </p>
        </div>

        {/* Live Evaluation Stages */}
        <div className="bg-bg-warm/60 border border-border-warm rounded-xl p-4 text-left space-y-3.5 font-sans">
          {[
            "Processing interview responses",
            "Evaluating technical knowledge",
            "Analyzing communication",
            "Generating personalized recommendations"
          ].map((stageText, idx) => {
            const isCompleted = visualStage > idx;
            const isActive = visualStage === idx;
            const isPending = visualStage < idx;

            return (
              <div key={idx} className="flex items-center justify-between text-xs transition-opacity duration-300">
                <div className="flex items-center space-x-3">
                  {isCompleted ? (
                    <span className="w-4 h-4 rounded-full bg-accent-forest/10 text-accent-forest flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  ) : isActive ? (
                    <span className="w-4 h-4 rounded-full bg-accent-forest/5 text-accent-forest flex items-center justify-center animate-pulse">
                      ⏳
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-border-warm/30 text-text-soft/40 flex items-center justify-center text-[9px]">
                      •
                    </span>
                  )}
                  <span className={`font-medium ${
                    isCompleted ? 'text-text-charcoal/80 line-through decoration-text-soft/20' :
                    isActive ? 'text-accent-forest font-bold animate-pulse' :
                    'text-text-soft/55'
                  }`}>
                    {stageText}
                  </span>
                </div>
                {isActive && (
                  <span className="text-[10px] font-mono font-semibold text-accent-forest bg-accent-forest/5 px-1.5 py-0.5 rounded animate-pulse">
                    ACTIVE
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[10px] font-mono font-semibold text-text-soft/60">
                    DONE
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-border-warm/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-forest rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${Math.min(100, (visualStage + 1) * 25)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-text-soft/60 font-mono">
            <span>START</span>
            <span>COMPILING</span>
          </div>
        </div>

        {/* Timeout / Reassuring message */}
        {showReassuringMessage && (
          <div className="p-3 bg-accent-clay/5 border border-accent-clay/10 rounded-xl text-center animate-fade-in">
            <p className="text-[10.5px] text-accent-clay font-medium leading-normal">
              This interview is taking a little longer than usual to evaluate. Please wait while we finish preparing your report.
            </p>
          </div>
        )}

        <div className="text-[10px] text-text-soft/40 font-mono">
          This usually takes only a few seconds.
        </div>
      </div>
    );
  }

  const hasDiagnostics = session.questions && session.questions.length > 0 && session.answers && Object.keys(session.answers).length > 0;

  // Map evaluated score dimensions for radar chart and skill breakdown
  const allMetrics = [
    {
      name: 'Technical Accuracy',
      score: feedback.technicalAccuracy,
      desc: 'Correctness of core technical concepts, systems, logic, or domain theory.'
    },
    {
      name: 'Communication',
      score: feedback.communication,
      desc: 'Pacing, clarity of voice, structured articulation, and narrative quality.'
    },
    {
      name: 'Clarity',
      score: feedback.clarity,
      desc: 'Concise phrasing, logical argument flow, and avoidance of ambiguity.'
    },
    {
      name: 'Completeness',
      score: feedback.completeness,
      desc: 'Answering all parts of the question without leaving critical gaps.'
    },
    {
      name: 'Confidence',
      score: feedback.confidence,
      desc: 'Steady speaking rate, firm delivery, and minimal hesitation or filler words.'
    }
  ];

  const evaluatedMetrics = allMetrics.filter((m): m is { name: string; score: number; desc: string } => typeof m.score === 'number' && !isNaN(m.score));
  const radarData = evaluatedMetrics.map(m => ({ name: m.name, score: m.score }));

  const genuineStrengths = (feedback.strengths || []).filter(st => {
    if (!st || typeof st !== 'string') return false;
    const lower = st.toLowerCase();
    if (lower.startsWith('submitted responses') || lower.startsWith('completed responses') || lower.startsWith('attempted ') || (lower.includes('out of') && lower.includes('question'))) {
      return false;
    }
    return true;
  });

  const formatDifficulty = (diff: string) => {
    if (!diff) return '';
    const d = diff.toLowerCase();
    if (d === 'easy') return 'Easy';
    if (d === 'medium') return 'Medium';
    if (d === 'hard') return 'Hard';
    return diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-accent-forest/5 text-accent-forest border-accent-forest/10';
      case 'medium': return 'bg-accent-clay/5 text-accent-clay border-accent-clay/10';
      case 'hard': return 'bg-accent-clay/10 text-accent-clay border-accent-clay/20';
      default: return 'bg-text-soft/5 text-text-soft border-border-warm';
    }
  };

  const getPerformanceBadge = (score: number, summary?: string) => {
    if (summary === "There was insufficient response data to generate a reliable evaluation." || (score === 0 && evaluatedMetrics.length === 0)) {
      return { label: 'Insufficient Data', color: 'text-text-soft bg-text-soft/10 border-border-warm' };
    }
    if (score >= 90) return { label: 'Strong Performance', color: 'text-accent-forest bg-accent-forest/10 border-accent-forest/20' };
    if (score >= 80) return { label: 'Interview Ready', color: 'text-accent-forest bg-accent-forest/5 border-accent-forest/10' };
    if (score >= 70) return { label: 'Developing', color: 'text-accent-clay bg-accent-clay/5 border-accent-clay/10' };
    return { label: 'Needs Practice', color: 'text-accent-clay bg-accent-clay/10 border-accent-clay/20' };
  };

  const performance = getPerformanceBadge(feedback.averageScore, feedback.summaryText || feedback.summary);

  return (
    <div className="space-y-8 animate-fade-in pb-16" id="results-view-wrapper">
      {/* Header back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToHistory || onBackToDashboard}
            className="p-2.5 bg-card-warm border border-border-warm rounded-xl hover:bg-bg-warm text-text-soft hover:text-text-charcoal transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-text-charcoal tracking-tight font-serif-editorial italic">Evaluation Report</h1>
            <p className="text-xs text-text-soft mt-1">Detailed evaluation breakdown and actionable feedback.</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4.5 py-2.5 bg-card-warm hover:bg-bg-warm text-text-charcoal border border-border-warm text-xs uppercase tracking-wider font-bold rounded-xl transition-all duration-200 flex items-center space-x-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Practice Again</span>
            </button>
          )}
          <button
            onClick={onBackToDashboard}
            className="px-4.5 py-2.5 bg-accent-forest hover:bg-accent-forest/90 text-white text-xs uppercase tracking-wider font-bold rounded-xl transition-all duration-200 shadow-xs border border-accent-forest/10 cursor-pointer"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Main Composite metrics layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Grade Card & Radar charts */}
        <div className="space-y-6">
          {/* Main Grade Panel */}
          <div className="p-6 bg-card-warm border border-border-warm rounded-2xl text-center space-y-4 shadow-sm">
            <div className="mx-auto h-16 w-16 bg-accent-forest/5 border border-accent-forest/10 text-accent-forest rounded-2xl flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-text-soft font-bold block">Overall Score</span>
              <span className="text-5xl font-extrabold text-text-charcoal tracking-tight block mt-1.5 font-serif-editorial italic">
                {performance.label === 'Insufficient Data' ? 'N/A' : `${feedback.averageScore}%`}
              </span>
            </div>
            <div className={`inline-block px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${performance.color}`}>
              {performance.label}
            </div>

            <div className="pt-4 border-t border-border-warm grid grid-cols-2 gap-4 text-[10px] text-text-soft font-mono uppercase tracking-wider">
              <div className="text-left space-y-1">
                <span>Difficulty</span>
                <span className="block font-bold text-text-charcoal normal-case text-xs font-sans">{formatDifficulty(session.difficulty)}</span>
              </div>
              <div className="text-left space-y-1">
                <span>Subject</span>
                <span className="block font-bold text-text-charcoal normal-case text-xs font-sans">{session.subject}</span>
              </div>
            </div>
          </div>

          {/* Skill Breakdown & Evaluated Dimensions */}
          {evaluatedMetrics.length > 0 && (
            <div className="p-6 bg-card-warm border border-border-warm rounded-2xl shadow-sm space-y-5">
              <h3 className="text-xs font-bold flex items-center space-x-2 font-display uppercase tracking-wider text-text-charcoal">
                <BarChart3 className="w-4 h-4 text-accent-forest" />
                <span>Skill Breakdown</span>
              </h3>

              {evaluatedMetrics.length >= 3 && (
                <div className="h-60 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="var(--color-border-warm-val)" />
                      <PolarAngleAxis dataKey="name" stroke="var(--color-text-soft-val)" fontSize={9} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--color-border-warm-val)" fontSize={8} />
                      <Radar name="Candidate" dataKey="score" stroke="var(--color-accent-forest-val)" fill="var(--color-accent-forest-val)" fillOpacity={0.15} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Metric descriptions with helper texts */}
              <div className="pt-2 space-y-4">
                {evaluatedMetrics.map((metric) => (
                  <div key={metric.name} className="space-y-1 group">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-text-charcoal group-hover:text-accent-forest transition-colors duration-150">
                        {metric.name}
                      </span>
                      <span className="font-mono font-bold text-accent-forest">
                        {metric.score}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-border-warm/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 bg-accent-forest" 
                        style={{ width: `${metric.score}%` }}
                      />
                    </div>
                    {/* Simple helper description */}
                    <p className="text-[10px] text-text-soft leading-normal font-sans">
                      {metric.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 2 Columns: Actionable feedback & recommended readings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actionable Feedback suggestions block */}
          <div className="p-6 bg-card-warm border border-border-warm rounded-2xl space-y-6 shadow-sm">
            <h3 className="text-base font-bold text-text-charcoal font-serif-editorial italic">Performance Summary</h3>
            <p className="text-xs text-text-soft leading-relaxed font-sans font-medium">{feedback.summaryText || feedback.summary || 'No summary text available.'}</p>

            <div className="space-y-4 pt-5 border-t border-border-warm">
              <h4 className="text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">Key Strengths</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {genuineStrengths.map((st, i) => (
                  <div key={i} className="flex items-start space-x-2.5 p-3.5 bg-accent-forest/5 border border-accent-forest/10 rounded-xl text-xs text-text-charcoal leading-normal">
                    <CheckCircle2 className="w-4 h-4 text-accent-forest shrink-0 mt-0.5" />
                    <span>{st}</span>
                  </div>
                ))}
                {genuineStrengths.length === 0 && (
                  <div className="p-3.5 bg-bg-warm border border-border-warm rounded-xl text-xs text-text-soft italic col-span-2">
                    No measurable strengths were identified during this interview.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-5 border-t border-border-warm">
              <h4 className="text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">Areas for Improvement</h4>
              <div className="space-y-2.5">
                {(feedback.actionableAdvice || feedback.actionableSuggestions || feedback.weaknesses || []).map((adv, i) => (
                  <div key={i} className="flex items-start space-x-2.5 p-3.5 bg-accent-clay/5 border border-accent-clay/10 rounded-xl text-xs text-text-charcoal leading-normal">
                    <Star className="w-4 h-4 text-accent-clay shrink-0 mt-0.5" />
                    <span>{adv}</span>
                  </div>
                ))}
                {(!(feedback.actionableAdvice || feedback.actionableSuggestions || feedback.weaknesses) || (feedback.actionableAdvice || feedback.actionableSuggestions || feedback.weaknesses || []).length === 0) && (
                  <div className="p-3.5 bg-bg-warm border border-border-warm rounded-xl text-xs text-text-soft italic">
                    No specific improvement suggestions recorded.
                  </div>
                )}
              </div>
            </div>

            {((feedback.recommendedReadings && feedback.recommendedReadings.length > 0) || (feedback.recommendedResources && feedback.recommendedResources.length > 0)) && (
              <div className="space-y-4 pt-5 border-t border-border-warm">
                <h4 className="text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-accent-forest" />
                  <span>Recommended Topics & Resources</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(feedback.recommendedReadings || feedback.recommendedResources || []).map((read, i) => {
                    const isUrl = typeof read === 'string' && (read.startsWith('http://') || read.startsWith('https://'));
                    const href = isUrl ? read : `https://www.google.com/search?q=${encodeURIComponent(read)}`;
                    const displayLabel = isUrl ? 'Open Resource' : 'Learn More';
                    return (
                      <a
                        key={i}
                        href={href}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="p-4 bg-bg-warm/50 border border-border-warm rounded-xl text-xs flex flex-col justify-between hover:border-accent-forest/30 hover:bg-accent-forest/[0.02] transition-all duration-200 group cursor-pointer shadow-xs"
                      >
                        <div>
                          <span className="font-semibold text-text-charcoal mb-2 block font-display line-clamp-2 group-hover:text-accent-forest transition-colors duration-200">
                            {read}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent-forest flex items-center space-x-1 mt-3">
                          <span>{displayLabel}</span>
                          <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question-By-Question Detailed Response Panels */}
      <div className="space-y-4">
        {!hasDiagnostics ? (
          <div className="p-6 bg-card-warm border border-border-warm rounded-2xl text-center space-y-3 shadow-sm max-w-xl mx-auto animate-fade-in" id="no-diagnostics-container">
            <p className="text-xs text-text-soft leading-relaxed font-sans">
              Detailed diagnostics will become available after additional interview sessions.
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold text-text-charcoal mb-4 font-serif-editorial italic">Deep Diagnostics Breakdown</h3>
            
            {session.questions.map((q: InterviewQuestion, index: number) => {
              const ans: AnswerSubmission | undefined = session.answers[q.id];
              const isExpanded = expandedQuestionId === q.id;

          return (
            <div
              key={q.id}
              className="bg-card-warm border border-border-warm rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:border-accent-forest/15"
            >
              <button
                onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                className="w-full text-left p-5 flex items-center justify-between cursor-pointer hover:bg-bg-warm/30 transition-all duration-300 select-none focus:outline-none"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center space-x-4 pr-4">
                  <span className="text-xs font-mono text-text-soft font-bold shrink-0">Q{index + 1}</span>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-text-charcoal line-clamp-1 leading-normal font-display">{q.questionText}</span>
                    <span className="text-[9px] font-mono uppercase text-text-soft bg-bg-warm border border-border-warm px-1.5 py-0.5 rounded">
                      {q.type === 'subjective' ? 'Subjective' : 'MCQ Selection'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0">
                  {ans?.feedback ? (
                    <span className="text-xs font-bold font-mono text-accent-forest bg-accent-forest/5 px-2 py-1 border border-accent-forest/10 rounded-md">{ans.feedback.overallScore}%</span>
                  ) : (
                    <span className="text-[10px] font-mono text-text-soft/60 font-semibold">UNANSWERED</span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-text-soft transition-transform duration-300 shrink-0 ${
                      isExpanded ? 'rotate-180 text-accent-forest' : ''
                    }`}
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="px-5 pb-6 pt-4 border-t border-border-warm/30 bg-bg-warm/5 space-y-4 text-xs text-text-soft">
                      {/* Question fully printed */}
                      <div className="space-y-1">
                        <h4 className="text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono">Question Prompter</h4>
                        <p className="text-text-charcoal font-medium font-sans leading-relaxed text-sm">{q.questionText}</p>
                      </div>

                      {/* MCQ specific feedback */}
                      {(q.type === 'mcq_single' || q.type === 'mcq_multi') && (
                        <div className="space-y-2">
                          <h4 className="text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono">Options List</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {(q.options || []).map(o => {
                              const correctIds = q.type === 'mcq_multi' ? (q as any).correctOptionIds : [(q as any).correctOptionId];
                              const isCorrect = correctIds?.includes(o.id);
                              const isUserSelected = ans?.selectedOptionIds?.includes(o.id) || (!!ans?.userAnswer && (ans.userAnswer === o.text || ans.userAnswer.includes(o.text)));
                              return (
                                <div
                                  key={o.id}
                                  className={`p-3.5 rounded-lg border text-xs flex items-center justify-between font-sans ${
                                    isCorrect
                                      ? 'bg-accent-forest/5 border-accent-forest/15 text-accent-forest font-semibold'
                                      : isUserSelected
                                        ? 'bg-accent-clay/5 border-accent-clay/15 text-accent-clay'
                                        : 'bg-card-warm border-border-warm text-text-soft'
                                  }`}
                                >
                                  <span>{o.text}</span>
                                  <div className="flex items-center space-x-2">
                                    {isCorrect && <span className="bg-accent-forest/10 border border-accent-forest/20 text-accent-forest font-bold px-1.5 py-0.5 rounded text-[8px] uppercase font-mono tracking-wider">Correct Choice</span>}
                                    {isUserSelected && <span className="bg-accent-clay/10 border border-accent-clay/20 text-accent-clay font-bold px-1.5 py-0.5 rounded text-[8px] uppercase font-mono tracking-wider">Your Selection</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Answer Submitted */}
                      <div className="space-y-1.5">
                        <h4 className="text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono">
                          {q.type === 'mcq_single' || q.type === 'mcq_multi' ? 'Your Selected Choice' : 'Your Technical Transcript'}
                        </h4>
                        <p className="bg-bg-warm/50 p-4 border border-border-warm rounded-xl text-text-charcoal leading-relaxed font-sans italic">
                          {ans?.userAnswer || '[No response submission recorded]'}
                        </p>
                        {ans?.transcriptionEdited && (
                          <span className="text-[9px] text-accent-forest block mt-1.5 font-mono uppercase tracking-wider">✓ Written revisions applied by candidate</span>
                        )}
                      </div>

                      {/* Ideal solution blueprint */}
                      <div className="space-y-1.5">
                        <h4 className="text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono">Expert Solutions Evaluation Outline</h4>
                        <p className="bg-bg-warm/30 p-4 border border-border-warm rounded-xl text-text-soft leading-relaxed font-sans">
                          {q.type === 'subjective' ? (q as any).modelAnswer : (q as any).explanation}
                        </p>
                      </div>

                      {/* AI feedback details */}
                      {ans?.feedback && (
                        <div className="p-4.5 bg-accent-forest/5 border border-accent-forest/10 rounded-xl space-y-4 shadow-xs">
                          <div className="flex items-center justify-between border-b border-border-warm pb-3">
                            <h4 className="text-[10px] font-bold text-accent-forest uppercase tracking-wider font-mono">Linguistic Evaluation Summary</h4>
                            <span className="text-[10px] font-mono font-bold text-accent-forest bg-accent-forest/10 border border-accent-forest/20 px-2.5 py-1 rounded-md">
                              Score: {ans.feedback.overallScore}%
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono block">Scored Strengths</span>
                            <p className="text-xs text-text-charcoal leading-relaxed font-sans">
                              {Array.isArray(ans.feedback.strengths) && ans.feedback.strengths.length > 0 
                                ? ans.feedback.strengths.join(', ') 
                                : 'No measurable strengths could be identified from the submitted response.'}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono block">Improvement Advice</span>
                            <p className="text-xs text-text-charcoal leading-relaxed font-sans">
                              {Array.isArray(ans.feedback.weaknesses) ? ans.feedback.weaknesses.join(', ') : (typeof ans.feedback.weaknesses === 'string' ? ans.feedback.weaknesses : 'No specific weaknesses recorded.')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
          </>
        )}
      </div>
    </div>
  );
};
