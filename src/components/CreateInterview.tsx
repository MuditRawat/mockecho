/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Loader2, Play, Volume2, AlignLeft, ShieldAlert, ArrowLeft, Clock } from 'lucide-react';

interface CreateInterviewProps {
  onBackToDashboard: () => void;
  onSessionStarted: () => void;
}

const targetRoles = [
  'Software Engineer',
  'Frontend Engineer',
  'React Developer',
  'Backend Engineer',
  'Node.js Developer',
  'Full Stack Developer',
  'Java Developer',
  'Python Developer',
  'C++ Developer',
  'Android Developer',
  'iOS Developer',
  'DevOps Engineer',
  'Cloud Engineer',
  'Data Analyst',
  'Data Scientist',
  'Machine Learning Engineer',
  'AI Engineer',
  'Cybersecurity Analyst',
  'QA Engineer',
  'SDET'
];

const practiceSubjects = [
  'React',
  'JavaScript',
  'TypeScript',
  'HTML',
  'CSS',
  'Node.js',
  'Express.js',
  'MongoDB',
  'SQL',
  'DBMS',
  'Operating Systems',
  'Computer Networks',
  'OOP',
  'Java',
  'Python',
  'C++',
  'DSA',
  'System Design',
  'REST APIs',
  'Git & GitHub'
];

interface SearchableDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="block text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={isOpen ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch('');
          }}
          placeholder={placeholder}
          className="block w-full px-4.5 py-3 bg-bg-warm/50 border border-border-warm rounded-xl text-text-charcoal placeholder-text-soft/40 focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest hover:border-border-warm/80 text-sm transition-all duration-300 font-sans shadow-xs focus:shadow-sm pr-10"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-soft/60 hover:text-text-charcoal cursor-pointer"
        >
          <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-card-warm border border-border-warm rounded-xl shadow-lg z-30 font-sans divide-y divide-border-warm/30 scrollbar-thin">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-accent-forest/5 hover:text-accent-forest transition duration-150 flex items-center justify-between ${
                  value === opt ? 'bg-accent-forest/5 text-accent-forest font-bold' : 'text-text-charcoal'
                }`}
              >
                <span>{opt}</span>
                {value === opt && <span className="text-[10px] text-accent-forest font-bold">✓</span>}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-text-soft/70 italic text-center">
              No matching options found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CreateInterview: React.FC<CreateInterviewProps> = ({
  onBackToDashboard,
  onSessionStarted,
}) => {
  const { profile, startNewSession, loading, error, clearError } = useApp();
  const [role, setRole] = useState<string>(profile?.targetRole || 'Frontend Engineer');
  const [subject, setSubject] = useState<string>('React');
  const [difficulty, setDifficulty] = useState<'mixed' | 'easy' | 'medium' | 'hard'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [format, setFormat] = useState<'mixed' | 'subjective' | 'mcq' | 'application'>('mixed');
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [timeMode, setTimeMode] = useState<'no_limit' | 'timed'>('no_limit');
  const [timerType, setTimerType] = useState<'auto' | 'custom'>('auto');
  const [customDuration, setCustomDuration] = useState<number>(15); // in minutes

  // Calculate estimated interview duration dynamically
  const estimatedDuration = React.useMemo(() => {
    let perQuestionMinutes = 3;
    if (format === 'mcq') {
      perQuestionMinutes = 1.5;
    } else if (format === 'subjective') {
      perQuestionMinutes = mode === 'voice' ? 4 : 3;
    } else if (format === 'application') {
      perQuestionMinutes = mode === 'voice' ? 5 : 4;
    } else {
      // Mixed
      perQuestionMinutes = mode === 'voice' ? 3.5 : 2.5;
    }
    return Math.max(5, Math.round(questionCount * perQuestionMinutes));
  }, [questionCount, format, mode]);

  const handleStart = async () => {
    clearError();
    try {
      const durationSeconds = timeMode === 'timed'
        ? (timerType === 'auto' ? estimatedDuration * 60 : customDuration * 60)
        : undefined;

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('just_started_interview', 'true');
      }

      await startNewSession(
        role,
        subject,
        difficulty,
        questionCount,
        mode,
        timeMode,
        durationSeconds,
        format
      );
      onSessionStarted();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12" id="create-interview-wrapper">
      {/* Back Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBackToDashboard}
          className="p-2.5 bg-card-warm border border-border-warm rounded-xl hover:bg-bg-warm text-text-soft hover:text-text-charcoal transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-text-charcoal tracking-tight font-serif-editorial italic">Start Mock Interview</h1>
          <p className="text-xs text-text-soft mt-1">Configure parameters to customize your evaluated mock interview.</p>
        </div>
      </div>

      <div className="bg-card-warm border border-border-warm rounded-2xl p-6 sm:p-8 space-y-7 shadow-sm">
        {error && (
          <div className="p-4 bg-accent-clay/5 border border-accent-clay/20 text-accent-clay rounded-xl text-xs leading-relaxed font-sans">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Role Dropdown */}
          <SearchableDropdown
            label="Target Role"
            value={role}
            onChange={setRole}
            options={targetRoles}
            placeholder="Search role e.g. Frontend Engineer"
          />

          {/* Subject Dropdown */}
          <SearchableDropdown
            label="Practice Subject"
            value={subject}
            onChange={setSubject}
            options={practiceSubjects}
            placeholder="Search subject e.g. React"
          />
        </div>

        {/* Difficulty Selection */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">
            Difficulty Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { id: 'mixed', label: 'Mixed (Recommended)' },
              { id: 'easy', label: 'Easy' },
              { id: 'medium', label: 'Medium' },
              { id: 'hard', label: 'Hard' },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDifficulty(item.id)}
                className={`py-3 px-3 rounded-xl border font-semibold text-xs transition-all duration-300 cursor-pointer active:scale-95 hover:-translate-y-0.5 text-center ${
                  difficulty === item.id
                    ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-sm font-bold'
                    : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {difficulty === 'mixed' && (
            <p className="text-[11px] text-text-soft leading-relaxed font-sans">
              Includes a balanced mix of easy, medium, and hard questions for a realistic interview experience.
            </p>
          )}
        </div>

        {/* Question Count */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">
            Question Count
          </label>
          <div className="space-y-2">
            <div className="inline-flex bg-bg-warm/50 border border-border-warm p-1 rounded-xl">
              {[3, 5, 10].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setQuestionCount(cnt)}
                  className={`px-5 py-2.5 rounded-lg font-bold text-xs transition-all duration-200 cursor-pointer active:scale-95 ${
                    questionCount === cnt
                      ? 'bg-accent-forest text-white shadow-xs'
                      : 'text-text-soft hover:text-text-charcoal hover:bg-bg-warm/80'
                  }`}
                >
                  {cnt} Questions
                </button>
              ))}
            </div>
            <p className="text-[10px] text-text-soft leading-relaxed max-w-sm font-sans">
              Choose how many questions you'd like in this interview. More questions create a longer interview session.
            </p>
          </div>
        </div>

        {/* Interview Format */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">
            Interview Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormat('mixed')}
              className={`p-4.5 rounded-xl border text-left flex items-start space-x-3.5 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] ${
                format === 'mixed'
                  ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-sm'
                  : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
              }`}
            >
              <div className="mt-1">
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${format === 'mixed' ? 'border-accent-forest bg-accent-forest text-white' : 'border-border-warm'}`}>
                  {format === 'mixed' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-text-charcoal font-display">Mixed Interview (Recommended)</div>
                <div className="text-[11px] text-text-soft mt-1 leading-relaxed font-sans">
                  Includes MCQs, conceptual questions, and application/scenario-based questions.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('subjective')}
              className={`p-4.5 rounded-xl border text-left flex items-start space-x-3.5 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] ${
                format === 'subjective'
                  ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-sm'
                  : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
              }`}
            >
              <div className="mt-1">
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${format === 'subjective' ? 'border-accent-forest bg-accent-forest text-white' : 'border-border-warm'}`}>
                  {format === 'subjective' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-text-charcoal font-display">Subjective Only</div>
                <div className="text-[11px] text-text-soft mt-1 leading-relaxed font-sans">
                  Long-form interview questions only.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('mcq')}
              className={`p-4.5 rounded-xl border text-left flex items-start space-x-3.5 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] ${
                format === 'mcq'
                  ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-sm'
                  : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
              }`}
            >
              <div className="mt-1">
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${format === 'mcq' ? 'border-accent-forest bg-accent-forest text-white' : 'border-border-warm'}`}>
                  {format === 'mcq' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-text-charcoal font-display">MCQs Only</div>
                <div className="text-[11px] text-text-soft mt-1 leading-relaxed font-sans">
                  Multiple-choice questions only.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('application')}
              className={`p-4.5 rounded-xl border text-left flex items-start space-x-3.5 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] ${
                format === 'application'
                  ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-sm'
                  : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
              }`}
            >
              <div className="mt-1">
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${format === 'application' ? 'border-accent-forest bg-accent-forest text-white' : 'border-border-warm'}`}>
                  {format === 'application' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-text-charcoal font-display">Application-Based</div>
                <div className="text-[11px] text-text-soft mt-1 leading-relaxed font-sans">
                  Practical, real-world scenario questions that assess how you apply technical concepts.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">
            Communication Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode('voice')}
              className={`p-5 rounded-xl border text-left flex items-start space-x-4 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] ${
                mode === 'voice'
                  ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-sm'
                  : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
              }`}
            >
              <Volume2 className="w-5 h-5 mt-0.5 shrink-0 text-accent-forest" />
              <div>
                <div className="font-bold text-sm text-text-charcoal font-display">Voice Interview</div>
                <div className="text-[11px] text-text-soft mt-1.5 leading-relaxed font-sans">
                  The panel speaks to you via web synthesis. Deliver your answers verbally, review raw transcripts, and edit before submitting.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('text')}
              className={`p-5 rounded-xl border text-left flex items-start space-x-4 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] ${
                mode === 'text'
                  ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-sm'
                  : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
              }`}
            >
              <AlignLeft className="w-5 h-5 mt-0.5 shrink-0 text-accent-forest" />
              <div>
                <div className="font-bold text-sm text-text-charcoal font-display">Text Interview</div>
                <div className="text-[11px] text-text-soft mt-1.5 leading-relaxed font-sans">
                  The panel displays written questions on screen. Type your structured technical responses directly inside the text console.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Time Mode */}
        <div className="border-t border-border-warm pt-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-text-charcoal font-serif-editorial italic">Interview Timing</h3>
            <p className="text-[11px] text-text-soft mt-0.5 leading-relaxed">
              Determine your temporal preferences. A count-down timer is integrated directly into the panel window.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTimeMode('no_limit')}
              className={`p-5 rounded-xl border text-left flex items-start space-x-4 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] ${
                timeMode === 'no_limit'
                  ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-sm'
                  : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
              }`}
            >
              <Clock className="w-5 h-5 mt-0.5 shrink-0 text-text-soft" />
              <div>
                <div className="font-bold text-sm text-text-charcoal font-display">Untimed Practice</div>
                <div className="text-[11px] text-text-soft mt-1.5 leading-relaxed font-sans">
                  Practice without time limits. Answer at your own pace.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTimeMode('timed')}
              className={`p-5 rounded-xl border text-left flex items-start space-x-4 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] ${
                timeMode === 'timed'
                  ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-sm'
                  : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
              }`}
            >
              <Clock className="w-5 h-5 mt-0.5 shrink-0 text-accent-clay" />
              <div>
                <div className="font-bold text-sm text-text-charcoal font-display">Timed Interview</div>
                <div className="text-[11px] text-text-soft mt-1.5 leading-relaxed font-sans">
                  Simulates a real interview with a countdown timer. Unfinished answers are automatically submitted when time expires.
                </div>
              </div>
            </button>
          </div>

          {timeMode === 'timed' && (
            <div className="p-5 bg-bg-warm/50 border border-border-warm rounded-xl space-y-5 animate-fade-in">
              {/* Timer Mode Options */}
              <div className="space-y-2.5">
                <label className="block text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">
                  Timer Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTimerType('auto')}
                    className={`p-3.5 rounded-xl border text-left flex items-start space-x-3 transition-all duration-200 cursor-pointer ${
                      timerType === 'auto'
                        ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-xs'
                        : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${timerType === 'auto' ? 'border-accent-forest bg-accent-forest text-white' : 'border-border-warm'}`}>
                      {timerType === 'auto' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-text-charcoal font-display">Automatic (Recommended)</div>
                      <div className="text-[10px] text-text-soft mt-0.5 font-sans leading-normal">
                        Calculates optimal duration from settings
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimerType('custom')}
                    className={`p-3.5 rounded-xl border text-left flex items-start space-x-3 transition-all duration-200 cursor-pointer ${
                      timerType === 'custom'
                        ? 'bg-accent-forest/10 border-accent-forest text-accent-forest shadow-xs'
                        : 'bg-card-warm border border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${timerType === 'custom' ? 'border-accent-forest bg-accent-forest text-white' : 'border-border-warm'}`}>
                      {timerType === 'custom' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-text-charcoal font-display">Custom</div>
                      <div className="text-[10px] text-text-soft mt-0.5 font-sans leading-normal">
                        Manually choose session duration
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Automatic Mode Display */}
              {timerType === 'auto' && (
                <div className="p-4 bg-card-warm border border-border-warm rounded-xl space-y-2 animate-fade-in">
                  <label className="block text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">
                    Estimated Total Interview Time
                  </label>
                  <div className="text-xl font-extrabold text-accent-forest font-mono tracking-tight">
                    ≈ {estimatedDuration} minutes
                  </div>
                  <div className="text-[11px] text-text-soft leading-relaxed font-sans pt-1 border-t border-border-warm/50 space-y-1">
                    <div>Calculated automatically from:</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Question Count</li>
                      <li>Interview Format</li>
                      <li>Communication Mode</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Custom Mode Slider Display */}
              {timerType === 'custom' && (
                <div className="p-4 bg-card-warm border border-border-warm rounded-xl space-y-3.5 animate-fade-in">
                  <label className="block text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">
                    Total Interview Duration
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(Number(e.target.value))}
                      className="w-full h-1 bg-border-warm rounded-lg appearance-none cursor-pointer accent-accent-forest"
                    />
                    <span className="text-xs font-bold text-text-charcoal shrink-0 bg-bg-warm px-3 py-1.5 rounded-lg border border-border-warm font-mono">
                      {customDuration} min
                    </span>
                  </div>
                  <p className="text-[11px] text-text-soft leading-relaxed font-sans pt-1 border-t border-border-warm/50">
                    The timer allocates this total duration for the entire interview session, not each individual question.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-4 px-6 bg-accent-forest hover:bg-accent-forest/90 disabled:bg-accent-forest/40 text-white rounded-xl text-xs uppercase tracking-wider font-bold shadow-xs flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-95 border border-accent-forest/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Preparing Interview...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-white" />
                <span>Start Interview</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
