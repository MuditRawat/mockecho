/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Play, Award, Zap, BookOpen, Clock, Trash2, Calendar, Target, ChevronRight } from 'lucide-react';
import { InterviewSession } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface DashboardProps {
  onStartNew: () => void;
  onViewSession: (id: string) => void;
  onViewHistory: () => void;
  onViewProfile: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartNew,
  onViewSession,
  onViewHistory,
  onViewProfile,
}) => {
  const { profile, stats, interviews, deleteSession } = useApp();
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Find recent 3 interviews to display
  const recentInterviews = [...interviews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'hard': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default: return 'bg-slate-500/10 text-text-soft border-border-warm';
    }
  };

  const isSingleSubjectOrInterview = stats.completedInterviews === 1 || (stats.completedInterviews > 1 && stats.weakestSubject === 'Needs 2+ Topics');
  const hasOnlyOneSubject = stats.completedInterviews > 0 && stats.weakestSubject === 'Needs 2+ Topics';

  const strongestSubjectLabel = stats.completedInterviews === 0
    ? 'Strongest Subject'
    : (isSingleSubjectOrInterview ? 'Current Focus' : 'Strongest Subject');

  const strongestSubjectSubtext = stats.completedInterviews === 0
    ? 'Complete 1 session to track'
    : (isSingleSubjectOrInterview ? 'Practice other topics to compare' : 'Top performing topic');

  const weakestSubjectLabel = stats.completedInterviews === 0
    ? 'Needs Study'
    : (hasOnlyOneSubject ? 'Next Focus' : 'Needs Study');

  const weakestSubjectDisplay = stats.completedInterviews === 0
    ? 'Not Started'
    : (hasOnlyOneSubject ? stats.strongestSubject : stats.weakestSubject);

  const weakestSubjectSubtext = stats.completedInterviews === 0
    ? 'Complete 2+ sessions to unlock'
    : (hasOnlyOneSubject ? 'Continue practicing this topic' : 'Focus area for improvement');

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-view-wrapper">
      {/* Banner/Header */}
      <div className="relative overflow-hidden rounded-2xl bg-card-warm p-8 sm:p-10 border border-border-warm shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-extrabold text-text-charcoal tracking-tight font-serif-editorial italic">
            Welcome back, {profile?.name || 'Candidate'}!
          </h1>
          <p className="mt-3 text-text-soft leading-relaxed text-sm font-sans">
            Targeting <span className="text-text-charcoal font-semibold underline decoration-accent-forest/80 decoration-2 underline-offset-4">{profile?.targetRole || 'Software Engineer'}</span>. {stats.completedInterviews === 0 ? 'Start your first mock interview to benchmark your technical skills and receive instant AI feedback.' : 'Your practice progress is being tracked. Start a mock interview today to refine your technical responses.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={onStartNew}
              className="px-6 py-3 bg-accent-forest hover:bg-accent-forest/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center space-x-2 shadow-xs cursor-pointer active:scale-95 border border-accent-forest/10"
              id="dash-start-btn"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start New Interview</span>
            </button>
            <button
              onClick={onViewProfile}
              className="px-6 py-3 bg-card-warm hover:bg-bg-warm border border-border-warm text-text-charcoal font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer"
            >
              Customize Experience
            </button>
          </div>
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Streak card */}
        <div className="p-6 bg-card-warm border border-border-warm hover:-translate-y-1 hover:border-accent-forest/30 hover:shadow-md transition-all duration-300 rounded-2xl flex items-center justify-between group shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-soft uppercase tracking-wider block font-mono">Current Streak</span>
            <span className="text-2xl font-extrabold text-text-charcoal block">{stats.streakDays} {stats.streakDays === 1 ? 'Day' : 'Days'}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
              <Zap className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
              {stats.streakDays > 0 ? 'Keep it going!' : 'Start practicing to build streak'}
            </span>
          </div>
          <div className="p-3 bg-accent-forest/5 text-accent-forest rounded-xl border border-accent-forest/10 group-hover:bg-accent-forest/10 transition-all duration-300">
            <Zap className="w-5 h-5 fill-current" />
          </div>
        </div>

        {/* Avg Score card */}
        <div className="p-6 bg-card-warm border border-border-warm hover:-translate-y-1 hover:border-accent-forest/30 hover:shadow-md transition-all duration-300 rounded-2xl flex items-center justify-between group shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-soft uppercase tracking-wider block font-mono">Average Score</span>
            <span className="text-2xl font-extrabold text-text-charcoal block">{stats.completedInterviews === 0 ? '—' : `${stats.averageScore}%`}</span>
            <span className="text-[10px] text-text-soft font-medium block">
              {stats.completedInterviews === 0 ? 'No completed sessions yet' : `Over ${stats.completedInterviews} completed session${stats.completedInterviews === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className="p-3 bg-accent-forest/5 text-accent-forest rounded-xl border border-accent-forest/10 group-hover:bg-accent-forest/10 transition-all duration-300">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Strongest subject */}
        <div className="p-6 bg-card-warm border border-border-warm hover:-translate-y-1 hover:border-accent-forest/30 hover:shadow-md transition-all duration-300 rounded-2xl flex items-center justify-between group shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-soft uppercase tracking-wider block font-mono">{strongestSubjectLabel}</span>
            <span className="text-xl font-bold text-accent-forest truncate max-w-[170px] block">
              {stats.completedInterviews === 0 ? 'Not Started' : stats.strongestSubject}
            </span>
            <span className="text-[10px] text-text-soft font-medium block">
              {strongestSubjectSubtext}
            </span>
          </div>
          <div className="p-3 bg-accent-forest/5 text-accent-forest rounded-xl border border-accent-forest/10 group-hover:bg-accent-forest/10 transition-all duration-300">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Weakest subject */}
        <div className="p-6 bg-card-warm border border-border-warm hover:-translate-y-1 hover:border-accent-clay/30 hover:shadow-md transition-all duration-300 rounded-2xl flex items-center justify-between group shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-soft uppercase tracking-wider block font-mono">{weakestSubjectLabel}</span>
            <span className="text-xl font-bold text-accent-clay truncate max-w-[170px] block">
              {weakestSubjectDisplay}
            </span>
            <span className="text-[10px] text-text-soft font-medium block">
              {weakestSubjectSubtext}
            </span>
          </div>
          <div className="p-3 bg-accent-clay/5 text-accent-clay rounded-xl border border-accent-clay/10 group-hover:bg-accent-clay/10 transition-all duration-300">
            <Target className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main content split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Charts & Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Card */}
          {stats.subjectScores.length > 0 && (
            <div className="p-6 bg-card-warm border border-border-warm rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-text-charcoal mb-6">Performance By Subject</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.subjectScores}>
                    <XAxis dataKey="subject" stroke="var(--color-text-soft-val)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-text-soft-val)" fontSize={10} domain={[0, 100]} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-card-warm-val)', borderColor: 'var(--color-border-warm-val)', borderRadius: '12px', color: 'var(--color-text-charcoal-val)', fontSize: '12px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      cursor={{ fill: 'rgba(78, 163, 128, 0.08)' }}
                    />
                    <Bar dataKey="score" fill="var(--color-accent-forest-val)" radius={[6, 6, 0, 0]} barSize={28} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* AI Insights / Recommendations */}
          <div className="p-6 bg-card-warm border border-border-warm rounded-2xl shadow-sm">
            <div className="flex items-center space-x-2.5 mb-6">
              <div className="p-1.5 bg-accent-forest/5 text-accent-forest border border-accent-forest/10 rounded-lg">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-text-charcoal font-serif-editorial italic">Personalized Study Recommendations</h3>
            </div>
            <div className="space-y-3">
              {stats.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start space-x-3.5 p-4 bg-bg-warm/40 rounded-xl border border-border-warm hover:border-accent-forest/15 hover:bg-card-warm hover:-translate-y-0.5 hover:shadow-xs transition-all duration-300">
                  <div className="w-1.5 h-1.5 bg-accent-forest rounded-full mt-2 shrink-0" />
                  <p className="text-xs text-text-soft leading-relaxed font-sans">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Recent Sessions */}
        <div className="space-y-6">
          {/* Streak Matrix */}
          <div className="p-6 bg-card-warm border border-border-warm rounded-2xl shadow-sm">
            <h3 className="text-base font-bold text-text-charcoal mb-4">Weekly Practice Activity</h3>
            <div className="flex items-center justify-between gap-1">
              {stats.weeklyStreaks.map((dayObj, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <span className="text-[9px] font-mono font-bold text-text-soft mb-2">{dayObj.day}</span>
                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                      dayObj.completed
                        ? 'bg-accent-forest/10 border-accent-forest text-accent-forest font-extrabold text-sm shadow-xs'
                        : 'bg-bg-warm/50 border-border-warm text-text-soft/30 text-xs'
                    }`}
                  >
                    {dayObj.completed ? '✓' : '•'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent sessions list */}
          <div className="p-6 bg-card-warm border border-border-warm rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-charcoal">Recent Interviews</h3>
              <button
                onClick={onViewHistory}
                className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-forest hover:text-accent-forest/80 transition flex items-center cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            {recentInterviews.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-border-warm rounded-xl space-y-3">
                <p className="text-xs text-text-soft font-sans">No mock sessions completed yet.</p>
                <button
                  onClick={onStartNew}
                  className="inline-flex items-center px-3 py-1.5 bg-accent-forest/10 hover:bg-accent-forest/20 text-accent-forest font-bold rounded-lg text-[10px] uppercase tracking-wider transition duration-200 cursor-pointer"
                >
                  <Play className="w-3 h-3 mr-1 fill-current" />
                  <span>Start Interview</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInterviews.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-4 bg-bg-warm/20 hover:bg-card-warm rounded-xl border border-border-warm hover:border-accent-forest/20 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 group relative"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => onViewSession(sess.id)}
                        className="cursor-pointer space-y-1.5 pr-6 flex-1"
                      >
                        <div className="font-semibold text-xs text-text-charcoal group-hover:text-accent-forest transition-colors line-clamp-1">
                          {sess.subject} Panel
                        </div>
                        <div className="text-[10px] text-text-soft flex items-center space-x-1.5 font-mono uppercase tracking-wider">
                          <span className={`px-1.5 py-0.5 rounded border ${getDifficultyColor(sess.difficulty)} font-bold`}>
                            {sess.difficulty}
                          </span>
                          <span>•</span>
                          <span className="text-text-soft">{sess.mode}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSessionToDelete(sess.id)}
                        className="text-text-soft hover:text-accent-clay p-1 hover:bg-bg-warm rounded-md transition cursor-pointer"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {sess.status === 'completed' && sess.overallFeedback && (
                      <div className="mt-3.5 pt-3.5 border-t border-border-warm flex items-center justify-between text-[11px] font-mono tracking-wider text-text-soft uppercase">
                        <span>Report Grade:</span>
                        <span className="font-bold text-accent-forest text-xs">
                          {sess.overallFeedback.averageScore}%
                        </span>
                      </div>
                    )}

                    {sess.status === 'abandoned' && (
                      <div className="mt-3.5 pt-3.5 border-t border-border-warm flex items-center justify-between text-[11px] font-mono tracking-wider text-text-soft uppercase">
                        <span className="font-bold text-accent-clay bg-accent-clay/10 border border-accent-clay/20 px-2 py-0.5 rounded text-[10px]">Abandoned</span>
                        <span className="text-[10px] font-bold text-text-soft">
                          {Object.keys(sess.answers || {}).length} / {sess.questionCount} Questions Completed
                        </span>
                      </div>
                    )}

                    {sess.status === 'in_progress' && (
                      <div className="mt-3.5 pt-3.5 border-t border-border-warm flex items-center justify-between text-xs text-accent-clay">
                        <span className="font-mono text-[10px] uppercase tracking-wider">In Progress</span>
                        <button
                          onClick={() => onViewSession(sess.id)}
                          className="px-2.5 py-1 bg-accent-clay/10 hover:bg-accent-clay/20 text-accent-clay rounded-lg font-bold text-[10px] uppercase tracking-wider border border-accent-clay/20 cursor-pointer"
                        >
                          Resume
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
        overlayId="dashboard-delete-confirm-overlay"
        contentId="dashboard-delete-confirm-content"
        cancelBtnId="dashboard-delete-cancel-btn"
        confirmBtnId="dashboard-delete-confirm-btn"
      />
    </div>
  );
};
