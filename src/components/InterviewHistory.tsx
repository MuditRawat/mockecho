/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Filter, Calendar, Award, Trash2, ArrowRight, Eye, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { InterviewSession } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface InterviewHistoryProps {
  onViewSession: (id: string) => void;
  onBackToDashboard: () => void;
}

export const InterviewHistory: React.FC<InterviewHistoryProps> = ({
  onViewSession,
  onBackToDashboard,
}) => {
  const { interviews, deleteSession } = useApp();
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Filter States
  const [roleSearch, setRoleSearch] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedMode, setSelectedMode] = useState<string>('All');
  const [selectedScoreRange, setSelectedScoreRange] = useState<string>('All');
  const [sortByDate, setSortByDate] = useState<'newest' | 'oldest'>('newest');

  const subjects = ['All', 'React', 'JavaScript', 'System Design', 'Python', 'Database', 'Node.js', 'Data Structures'];

  const handleClearFilters = () => {
    setRoleSearch('');
    setSelectedSubject('All');
    setSelectedDifficulty('All');
    setSelectedMode('All');
    setSelectedScoreRange('All');
    setSortByDate('newest');
  };

  // Perform client-side filter and sort processing
  const filteredInterviews = interviews
    .filter((item: InterviewSession) => {
      // 1. Role filter
      if (roleSearch && !item.role.toLowerCase().includes(roleSearch.toLowerCase())) {
        return false;
      }
      // 2. Subject filter
      if (selectedSubject !== 'All' && item.subject !== selectedSubject) {
        return false;
      }
      // 3. Difficulty filter
      if (selectedDifficulty !== 'All' && item.difficulty !== selectedDifficulty.toLowerCase()) {
        return false;
      }
      // 4. Mode filter
      if (selectedMode !== 'All' && item.mode !== selectedMode.toLowerCase()) {
        return false;
      }
      // 5. Score range filter
      if (selectedScoreRange !== 'All' && item.status === 'completed' && item.overallFeedback) {
        const score = item.overallFeedback.averageScore;
        if (selectedScoreRange === 'expert' && score < 90) return false;
        if (selectedScoreRange === 'senior' && (score < 80 || score >= 90)) return false;
        if (selectedScoreRange === 'mid' && (score < 70 || score >= 80)) return false;
        if (selectedScoreRange === 'junior' && score >= 70) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortByDate === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'hard': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default: return 'bg-slate-500/10 text-text-soft border-border-warm';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-accent-forest';
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-accent-clay';
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16" id="history-container">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-charcoal tracking-tight font-serif-editorial italic">Practice Logs</h1>
          <p className="text-xs text-text-soft mt-1">Review, filter, and track your past mock interview sessions.</p>
        </div>
        <button
          onClick={onBackToDashboard}
          className="px-4.5 py-2.5 bg-card-warm border border-border-warm hover:bg-bg-warm text-text-charcoal text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-xs hover:shadow-sm active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Filter Tool Belt */}
      <div className="bg-card-warm border border-border-warm rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-charcoal flex items-center space-x-2 font-display uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4 text-accent-forest" />
            <span>Filter Practice Sessions</span>
          </h3>
          <button
            onClick={handleClearFilters}
            className="text-[10px] uppercase tracking-wider font-bold text-accent-forest hover:text-accent-forest/80 transition-colors duration-300 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* 1. Search by Target Role */}
          <div>
            <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono mb-1.5">
              Role Keyword
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-text-soft/60" />
              <input
                type="text"
                placeholder="e.g. Frontend"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-bg-warm/50 border border-border-warm rounded-xl text-xs text-text-charcoal placeholder-text-soft/30 focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all duration-300"
              />
            </div>
          </div>

          {/* 2. Practice Subject */}
          <div>
            <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono mb-1.5">
              Subject Area
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 bg-bg-warm/50 border border-border-warm rounded-xl text-xs text-text-charcoal focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all duration-300 cursor-pointer"
            >
              {subjects.map(sub => (
                <option key={sub} value={sub} className="bg-card-warm text-text-charcoal">{sub}</option>
              ))}
            </select>
          </div>

          {/* 3. Difficulty Level */}
          <div>
            <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono mb-1.5">
              Difficulty
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 bg-bg-warm/50 border border-border-warm rounded-xl text-xs text-text-charcoal focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all duration-300 cursor-pointer"
            >
              <option value="All" className="bg-card-warm text-text-charcoal">All Levels</option>
              <option value="Easy" className="bg-card-warm text-text-charcoal">Easy</option>
              <option value="Medium" className="bg-card-warm text-text-charcoal">Medium</option>
              <option value="Hard" className="bg-card-warm text-text-charcoal">Hard</option>
            </select>
          </div>

          {/* 4. Communication Mode */}
          <div>
            <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono mb-1.5">
              Input Mode
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full px-3 py-2 bg-bg-warm/50 border border-border-warm rounded-xl text-xs text-text-charcoal focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all duration-300 cursor-pointer"
            >
              <option value="All" className="bg-card-warm text-text-charcoal">All Modes</option>
              <option value="Voice" className="bg-card-warm text-text-charcoal">Voice Mode</option>
              <option value="Text" className="bg-card-warm text-text-charcoal">Text Mode</option>
            </select>
          </div>

          {/* 5. Score Scale Range */}
          <div>
            <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono mb-1.5">
              Score Band
            </label>
            <select
              value={selectedScoreRange}
              onChange={(e) => setSelectedScoreRange(e.target.value)}
              className="w-full px-3 py-2 bg-bg-warm/50 border border-border-warm rounded-xl text-xs text-text-charcoal focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest transition-all duration-300 cursor-pointer"
            >
              <option value="All" className="bg-card-warm text-text-charcoal">All Scores</option>
              <option value="expert" className="bg-card-warm text-text-charcoal">Distinction (≥90%)</option>
              <option value="senior" className="bg-card-warm text-text-charcoal">Strong Pass (80% - 89%)</option>
              <option value="mid" className="bg-card-warm text-text-charcoal">Competent (70% - 79%)</option>
              <option value="junior" className="bg-card-warm text-text-charcoal">Needs Practice (&lt;70%)</option>
            </select>
          </div>
        </div>

        {/* Sorting options bar */}
        <div className="flex items-center justify-between pt-3 text-[10px] font-mono border-t border-border-warm/50 uppercase tracking-wider">
          <div className="text-text-soft">
            {filteredInterviews.length === 1 ? '1 session found' : `${filteredInterviews.length} sessions found`}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-text-soft">Sort:</span>
            <button
              onClick={() => setSortByDate(sortByDate === 'newest' ? 'oldest' : 'newest')}
              className="font-bold text-accent-forest hover:text-accent-forest/80 flex items-center space-x-1 cursor-pointer transition-colors duration-300"
            >
              <span>{sortByDate === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Historical List */}
      {filteredInterviews.length === 0 ? (
        <div className="text-center py-16 bg-card-warm border border-border-warm rounded-2xl space-y-4 shadow-xs px-4">
          <Search className="w-10 h-10 text-text-soft/40 mx-auto" />
          <h3 className="text-base font-bold text-text-charcoal font-display">
            {interviews.length === 0 ? 'No Practice Sessions Yet' : 'No Matching Sessions'}
          </h3>
          <p className="text-text-soft max-w-sm mx-auto text-xs leading-relaxed font-sans">
            {interviews.length === 0
              ? 'Complete your first mock interview session to start building your personal practice log.'
              : 'No sessions match your filter criteria. Try resetting or adjusting your search filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredInterviews.map((item) => (
            <div
              key={item.id}
              className="bg-card-warm border border-border-warm rounded-2xl p-6 hover:border-accent-forest/20 hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-text-charcoal text-base font-display">{item.subject} Interview</span>
                  <span className="text-text-soft/40 font-mono text-xs">•</span>
                  <span className="text-xs text-text-soft font-semibold font-sans">{item.role}</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[10px] text-text-soft font-mono uppercase tracking-wider">
                  <span className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-accent-forest" />
                    {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getDifficultyColor(item.difficulty)}`}>
                    {item.difficulty}
                  </span>
                  <span className="bg-bg-warm px-2 py-0.5 border border-border-warm rounded text-[9px] text-text-charcoal font-bold">
                    {item.mode}
                  </span>
                </div>
              </div>

              {/* Score indicators & detail link */}
              <div className="flex items-center justify-between md:justify-end gap-6 border-t border-border-warm/50 md:border-none pt-4 md:pt-0">
                {item.status === 'completed' && item.overallFeedback ? (
                  <div className="text-left md:text-right">
                    <span className="text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono block mb-0.5">Overall Score</span>
                    <span className={`text-2xl font-extrabold block font-display ${getScoreColor(item.overallFeedback.averageScore)}`}>
                      {item.overallFeedback.averageScore}%
                    </span>
                  </div>
                ) : item.status === 'abandoned' ? (
                  <div className="text-left md:text-right">
                    <span className="text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono block mb-0.5">Status</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent-clay block bg-accent-clay/10 border border-accent-clay/20 px-2.5 py-1 rounded-lg">
                      Abandoned
                    </span>
                    <span className="text-[10px] font-medium text-text-soft font-mono block mt-1 text-center md:text-right">
                      {Object.keys(item.answers || {}).length} / {item.questionCount} questions
                    </span>
                  </div>
                ) : (
                  <div className="text-left md:text-right">
                    <span className="text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono block mb-0.5">Status</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 block bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-lg">
                      In Progress
                    </span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onViewSession(item.id)}
                    className="px-4 py-2 bg-accent-forest/5 hover:bg-accent-forest border border-accent-forest/10 hover:border-accent-forest hover:text-white text-accent-forest rounded-xl transition duration-300 group flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{item.status === 'abandoned' ? 'View Details' : 'View Report'}</span>
                  </button>
                  <button
                    onClick={() => setSessionToDelete(item.id)}
                    className="p-2 text-text-soft hover:text-accent-clay hover:bg-accent-clay/5 border border-transparent hover:border-accent-clay/10 rounded-xl transition-all duration-300 cursor-pointer active:scale-95"
                    title="Delete Practice Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DELETION CONFIRMATION DIALOG */}
      <DeleteConfirmModal
        isOpen={Boolean(sessionToDelete)}
        onCancel={() => setSessionToDelete(null)}
        onConfirm={async () => {
          if (sessionToDelete) {
            const id = sessionToDelete;
            setSessionToDelete(null);
            await deleteSession(id);
          }
        }}
        overlayId="history-delete-confirm-overlay"
        contentId="history-delete-confirm-content"
        cancelBtnId="history-delete-cancel-btn"
        confirmBtnId="history-delete-confirm-btn"
      />
    </div>
  );
};
