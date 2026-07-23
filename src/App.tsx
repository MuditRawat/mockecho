/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { CreateInterview } from './components/CreateInterview';
import { InterviewSessionComponent } from './components/InterviewSession';
import { ResultsView } from './components/ResultsView';
import { InterviewHistory } from './components/InterviewHistory';
import { ProfileView } from './components/ProfileView';
import { Sparkles, LogOut, User, Menu, X, ArrowRight, LayoutDashboard, History, Settings, HelpCircle, GraduationCap, AlertCircle } from 'lucide-react';
import { InterviewSession } from './types';
import { MockEchoLogo, MockEchoLogoWithWordmark } from './components/MockEchoLogo';
import { motion, AnimatePresence } from 'motion/react';

type ViewState = 'dashboard' | 'create_interview' | 'interview_session' | 'results' | 'history' | 'profile';

function AppContent() {
  const { user, profile, activeSession, interviews, loading, error, profileError, retryLoadProfile, logout, cancelSession, demoMode, isRecoveryMode, setIsRecoveryMode, resolvedTheme, setTheme } = useApp();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);
  const [showAuth, setShowAuth] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (
        hash.includes('type=recovery') ||
        search.includes('type=recovery') ||
        search.includes('recovery=true') ||
        search.includes('verified=true') ||
        search.includes('verification_error') ||
        search.includes('error=') ||
        hash.includes('error=') ||
        hash.includes('access_token=') ||
        hash.includes('type=signup') ||
        hash.includes('type=invite') ||
        hash.includes('type=email_change') ||
        search.includes('error_code=') ||
        hash.includes('error_code=') ||
        search.includes('code=')
      ) {
        return true;
      }
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  useEffect(() => {
    if (isRecoveryMode) {
      setShowAuth(true);
    }
  }, [isRecoveryMode]);

  const isOAuthCallback = typeof window !== 'undefined' && (
    (window.location.pathname.includes('/auth/callback') || window.location.pathname === '/') &&
    (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) &&
    !window.location.hash.includes('type=signup') &&
    !window.location.hash.includes('type=invite') &&
    !window.location.hash.includes('type=recovery')
  );
  const isOAuthPopup = typeof window !== 'undefined' && Boolean(window.opener) && isOAuthCallback;

  // Automatically enforce Interview Session view if an active session exists
  useEffect(() => {
    if (activeSession) {
      setCurrentView('interview_session');
    }
  }, [activeSession]);

  // Protect browser reload/leave during active session and cancel speech synthesis immediately
  useEffect(() => {
    if (!activeSession) return;

    const stopAudioAndCleanUp = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      try {
        const cachedInterviewsStr = localStorage.getItem('mockecho_demo_interviews');
        if (cachedInterviewsStr) {
          const list = JSON.parse(cachedInterviewsStr);
          let updated = false;
          const newList = list.map((item: any) => {
            if (item.id === activeSession.id && item.status === 'in_progress') {
              updated = true;
              return { ...item, status: 'abandoned', completedAt: new Date().toISOString() };
            }
            return item;
          });
          if (updated) {
            localStorage.setItem('mockecho_demo_interviews', JSON.stringify(newList));
          }
        }
      } catch (e) {
        // ignore storage errors on unload
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      stopAudioAndCleanUp();
      e.preventDefault();
      e.returnValue = 'Your interview is not yet complete. If you leave now, it will be marked as Abandoned.';
      return e.returnValue;
    };

    const handleUnload = () => {
      stopAudioAndCleanUp();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [activeSession]);

  // Synchronize selectedSession with latest data from interviews list
  useEffect(() => {
    if (selectedSession) {
      const latest = interviews.find(x => x.id === selectedSession.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(selectedSession)) {
        setSelectedSession(latest);
      }
    }
  }, [interviews, selectedSession]);

  // If user opened password recovery link or token is active, force AuthPage in recovery mode
  if (isRecoveryMode) {
    return (
      <AuthPage
        onBackToLanding={() => {
          setIsRecoveryMode(false);
          if (typeof window !== 'undefined') {
            try {
              window.history.replaceState({}, document.title, '/');
            } catch (e) {
              // ignore
            }
          }
          setShowAuth(false);
        }}
        isRecoveryMode={true}
      />
    );
  }

  if (isOAuthPopup) {
    return (
      <div className="min-h-screen bg-bg-warm flex flex-col items-center justify-center text-center px-4" id="oauth-popup-container">
        <div className="p-4 bg-accent-forest/5 border border-border-warm rounded-full flex items-center justify-center text-accent-forest mb-4" id="oauth-popup-spinner">
          <MockEchoLogo size={36} animate={true} />
        </div>
        <div className="text-text-charcoal font-semibold tracking-tight text-lg font-sans" id="oauth-popup-title">
          Signing in...
        </div>
        <p className="text-text-soft text-sm mt-2 max-w-md leading-relaxed" id="oauth-popup-subtitle">
          Completing authentication...
        </p>
      </div>
    );
  }

  // Dashboard preparation loading screen: ONLY show when user is logged in and profile/data is loading
  if (loading && !error && !showAuth && user && !profile) {
    return (
      <div className="min-h-screen bg-bg-warm flex flex-col items-center justify-center text-center px-4" id="loading-screen-container">
        <div className="p-4 bg-accent-forest/5 border border-border-warm rounded-full flex items-center justify-center text-accent-forest mb-4" id="loading-spinner">
          <MockEchoLogo size={36} animate={true} />
        </div>
        <div className="text-text-charcoal font-semibold tracking-tight text-lg font-sans" id="loading-title">Setting up your account...</div>
        <p className="text-text-soft text-sm mt-2 max-w-md leading-relaxed" id="loading-subtitle">
          Preparing your interview dashboard. This will only take a moment.
        </p>
      </div>
    );
  }

  // Interview preparation loading screen
  if (loading && !error && !showAuth && user && currentView === 'create_interview') {
    return (
      <div className="min-h-screen bg-bg-warm flex flex-col items-center justify-center text-center px-4 animate-fade-in" id="interview-preparing-loading-screen">
        <div className="p-4 bg-accent-forest/5 border border-border-warm rounded-full flex items-center justify-center text-accent-forest mb-4">
          <MockEchoLogo size={36} animate={true} />
        </div>
        <div className="text-text-charcoal font-semibold tracking-tight text-lg font-sans">
          Preparing Your Interview...
        </div>
        <p className="text-text-soft text-sm mt-2 max-w-md leading-relaxed">
          Loading Interview Session...
        </p>
      </div>
    );
  }

  // Not logged in routing
  if (!user) {
    if (showAuth) {
      return <AuthPage onBackToLanding={() => setShowAuth(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  // Handle exiting active interview warning
  const handleExitClick = () => {
    if (activeSession) {
      setShowExitModal(true);
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleConfirmExit = () => {
    cancelSession();
    setShowExitModal(false);
    setCurrentView('dashboard');
  };

  const handleViewSessionDetails = (id: string) => {
    const sess = interviews.find(x => x.id === id);
    setSelectedSession(sess || null);
    setCurrentView('results');
  };

  const activeNavItemClass = "bg-accent-forest/10 border-l-[3px] border-accent-forest text-accent-forest px-4 py-3 flex items-center space-x-3 text-sm font-bold transition-all duration-300 shadow-xs/10";
  const inactiveNavItemClass = "text-text-soft hover:text-text-charcoal hover:bg-bg-warm/60 px-4 py-3 flex items-center space-x-3 text-sm font-medium border-l-[3px] border-transparent transition-all duration-300 hover:translate-x-1";

  return (
    <div className="h-screen bg-bg-warm text-text-charcoal flex flex-col font-sans selection:bg-accent-forest selection:text-white overflow-hidden" id="main-app-root">
      {/* 0. LOCAL DEMO MODE ALERT BANNER */}
      {demoMode && (
        <div className="bg-accent-clay/10 border-b border-accent-clay/20 text-accent-clay px-4 py-2.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 z-50 animate-fade-in" id="demo-mode-alert-banner">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-accent-clay shrink-0" />
            <span>
              <strong>Running in Local Demo Mode:</strong> Database keys are missing. Your progress is saved locally to your browser. To enable persistent cloud accounts, configure Supabase credentials under project <strong>Settings &gt; Secrets</strong>.
            </span>
          </div>
          <a 
            href="https://supabase.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline font-semibold hover:text-text-charcoal transition whitespace-nowrap"
          >
            Get Supabase Keys
          </a>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* 1. SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 bg-card-warm border-r border-border-warm shrink-0 h-full justify-between">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-6 border-b border-border-warm shrink-0">
            <MockEchoLogoWithWordmark size={24} wordmarkSizeClass="text-lg" />
          </div>

          {/* Navigation list */}
          <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
            <button
              onClick={() => {
                if (activeSession) { handleExitClick(); } else { setCurrentView('dashboard'); }
              }}
              className={currentView === 'dashboard' ? activeNavItemClass : inactiveNavItemClass}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                if (activeSession) { handleExitClick(); } else { setCurrentView('history'); }
              }}
              className={currentView === 'history' ? activeNavItemClass : inactiveNavItemClass}
            >
              <History className="w-4 h-4" />
              <span>Practice Logs</span>
            </button>

            <button
              onClick={() => {
                if (activeSession) { handleExitClick(); } else { setCurrentView('profile'); }
              }}
              className={currentView === 'profile' ? activeNavItemClass : inactiveNavItemClass}
            >
              <Settings className="w-4 h-4" />
              <span>Preferences</span>
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-border-warm space-y-3 shrink-0 mt-auto">
          <div className="flex items-center space-x-3 bg-bg-warm/50 p-3 rounded-xl border border-border-warm">
            <div className="w-8 h-8 rounded-full bg-accent-forest/10 text-accent-forest flex items-center justify-center font-bold text-xs shrink-0">
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="truncate text-xs flex-1">
              <div className="font-bold text-text-charcoal truncate">{profile?.name}</div>
              <div className="text-text-soft truncate">{profile?.email}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full py-2.5 px-3 bg-card-warm hover:bg-accent-clay/5 border border-border-warm hover:border-accent-clay/20 hover:text-accent-clay rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer text-text-soft"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE TOP BAR NAVIGATION */}
      <header className="md:hidden bg-card-warm border-b border-border-warm h-16 px-4 flex items-center justify-between z-40 sticky top-0">
        <MockEchoLogoWithWordmark size={20} wordmarkSizeClass="text-base" />

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-text-soft hover:text-text-charcoal hover:bg-bg-warm rounded-lg transition cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden fixed inset-x-0 top-16 bg-card-warm border-b border-border-warm py-4 px-3 space-y-1 z-30 shadow-md overflow-hidden"
          >
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (activeSession) { handleExitClick(); } else { setCurrentView('dashboard'); }
              }}
              className={`w-full text-left py-3 px-4 rounded-xl font-bold text-sm flex items-center space-x-3 transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-accent-forest/10 text-accent-forest'
                  : 'text-text-soft hover:bg-bg-warm hover:text-text-charcoal'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${currentView === 'dashboard' ? 'text-accent-forest' : 'text-text-soft'}`} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (activeSession) { handleExitClick(); } else { setCurrentView('history'); }
              }}
              className={`w-full text-left py-3 px-4 rounded-xl font-bold text-sm flex items-center space-x-3 transition-colors ${
                currentView === 'history'
                  ? 'bg-accent-forest/10 text-accent-forest'
                  : 'text-text-soft hover:bg-bg-warm hover:text-text-charcoal'
              }`}
            >
              <History className={`w-4 h-4 ${currentView === 'history' ? 'text-accent-forest' : 'text-text-soft'}`} />
              <span>Practice Logs</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (activeSession) { handleExitClick(); } else { setCurrentView('profile'); }
              }}
              className={`w-full text-left py-3 px-4 rounded-xl font-bold text-sm flex items-center space-x-3 transition-colors ${
                currentView === 'profile'
                  ? 'bg-accent-forest/10 text-accent-forest'
                  : 'text-text-soft hover:bg-bg-warm hover:text-text-charcoal'
              }`}
            >
              <Settings className={`w-4 h-4 ${currentView === 'profile' ? 'text-accent-forest' : 'text-text-soft'}`} />
              <span>Preferences</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full text-left py-3 px-4 rounded-xl hover:bg-accent-clay/5 text-accent-clay font-semibold text-sm flex items-center space-x-3 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. CORE VIEWS DISPLAY PORT */}
      <main className="flex-1 py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {profileError && (
          <div className="mb-6 p-4 bg-accent-clay/10 border border-accent-clay/20 rounded-xl flex items-start space-x-3 text-text-charcoal text-sm leading-relaxed" id="profile-error-banner">
            <AlertCircle className="w-5 h-5 shrink-0 text-accent-clay mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="font-semibold block text-text-charcoal">Database Synchronization Alert</span>
              <span className="text-text-soft">{profileError} Your authenticated session is active, but some custom stats/interviews may not load correctly.</span>
              <button
                onClick={retryLoadProfile}
                className="mt-2 px-3 py-1 bg-accent-clay/10 hover:bg-accent-clay/20 text-accent-clay font-semibold rounded-lg text-xs border border-accent-clay/20 transition cursor-pointer active:scale-95 block"
                id="retry-profile-load-button"
              >
                Retry loading data
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {currentView === 'dashboard' && (
              <Dashboard
                onStartNew={() => setCurrentView('create_interview')}
                onViewSession={handleViewSessionDetails}
                onViewHistory={() => setCurrentView('history')}
                onViewProfile={() => setCurrentView('profile')}
              />
            )}

            {currentView === 'create_interview' && (
              <CreateInterview
                onBackToDashboard={handleExitClick}
                onSessionStarted={() => setCurrentView('interview_session')}
              />
            )}

            {currentView === 'interview_session' && (
              <InterviewSessionComponent
                onSessionFinished={(completedSession) => {
                  setSelectedSession(completedSession || activeSession);
                  setCurrentView('results');
                }}
                onCancel={handleExitClick}
              />
            )}

            {currentView === 'results' && (
              selectedSession ? (
                <ResultsView
                  session={selectedSession}
                  onBackToDashboard={() => setCurrentView('dashboard')}
                  onBackToHistory={() => setCurrentView('history')}
                  onRetry={() => {
                    setSelectedSession(null);
                    setCurrentView('create_interview');
                  }}
                />
              ) : (
                <div className="text-center py-20 bg-card-warm border border-border-warm rounded-2xl space-y-4 shadow-sm max-w-md mx-auto animate-fade-in" id="report-not-found-container">
                  <div className="mx-auto h-12 w-12 bg-accent-clay/5 border border-accent-clay/10 text-accent-clay rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-text-charcoal font-serif-editorial italic tracking-tight">Report Not Found</h3>
                  <p className="text-text-soft text-sm leading-relaxed px-6">
                    This interview report could not be loaded.
                  </p>
                  <div className="pt-6 flex items-center justify-center space-x-3">
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="px-4.5 py-2.5 bg-accent-forest hover:bg-accent-forest/90 text-white text-xs uppercase tracking-wider font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-xs border border-accent-forest/10"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentView('history')}
                      className="px-4.5 py-2.5 bg-card-warm hover:bg-bg-warm text-text-charcoal border border-border-warm text-xs uppercase tracking-wider font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-xs"
                    >
                      Practice Logs
                    </button>
                  </div>
                </div>
              )
            )}

            {currentView === 'history' && (
              <InterviewHistory
                onViewSession={handleViewSessionDetails}
                onBackToDashboard={() => setCurrentView('dashboard')}
              />
            )}

            {currentView === 'profile' && (
              <ProfileView onBackToDashboard={() => setCurrentView('dashboard')} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 4. EXIT ACTIVE SESSION CONFIRMATION MODAL */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-text-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            id="confirm-leave-modal"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card-warm border border-border-warm rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl"
            >
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-text-charcoal font-serif-editorial italic">Leave Interview?</h3>
                <div className="text-sm text-text-soft space-y-3 leading-relaxed">
                  <p>Your interview is not yet complete.</p>
                  <p className="font-semibold text-accent-clay">If you leave now:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-text-soft">
                    <li>this interview will be marked as <strong className="text-accent-clay">Abandoned</strong></li>
                    <li>no evaluation report will be generated</li>
                    <li>this session will not contribute to your performance statistics</li>
                  </ul>
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 py-3 bg-bg-warm border border-border-warm hover:bg-border-warm/30 text-text-charcoal text-sm font-semibold rounded-xl transition cursor-pointer active:scale-95"
                >
                  Continue Interview
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 py-3 bg-accent-clay hover:bg-accent-clay/90 text-white text-sm font-semibold rounded-xl transition cursor-pointer active:scale-95"
                >
                  Leave Interview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
