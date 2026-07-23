/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { UserProfile, InterviewSession, DashboardStats, InterviewQuestion, AnswerSubmission, OverallFeedback } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { API_BASE_URL } from '../lib/api';

interface AppContextType {
  user: any;
  profile: UserProfile | null;
  interviews: InterviewSession[];
  activeSession: InterviewSession | null;
  stats: DashboardStats;
  loading: boolean;
  evaluating: boolean;
  error: string | null;
  profileError: string | null;
  demoMode: boolean;
  isRecoveryMode: boolean;
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (newTheme: 'light' | 'dark' | 'system') => void;
  setIsRecoveryMode: (val: boolean) => void;
  launchDemoMode: () => void;
  clearError: () => void;
  retryLoadProfile: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  startNewSession: (
    role: string,
    subject: string,
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard',
    questionCount: number,
    mode: 'voice' | 'text',
    timeMode: 'no_limit' | 'timed',
    customDurationSeconds?: number,
    format?: 'mixed' | 'subjective' | 'mcq' | 'application'
  ) => Promise<InterviewSession>;
  submitAnswer: (
    questionId: string,
    userAnswer: string,
    selectedOptionIds?: string[],
    timeTakenSeconds?: number,
    transcriptionEdited?: boolean
  ) => Promise<InterviewSession | undefined>;
  finishSession: (sessionOverride?: InterviewSession) => Promise<InterviewSession | undefined>;
  cancelSession: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  refreshStats: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

type AuthActionContext = 'signup' | 'reset_password' | 'login' | 'resend_verification' | 'update_password';

// Helper function to map common auth errors to user-friendly messages
const mapAuthError = (message: string, context?: AuthActionContext): string => {
  if (!message) return "We couldn't process your request right now. Please try again in a few moments.";
  const msgLower = message.toLowerCase();
  
  if (
    msgLower.includes('created using google sign-in') ||
    msgLower.includes('google sign-in') ||
    msgLower.includes('google sign in') ||
    msgLower.includes('created using google')
  ) {
    return 'This account was created using Google Sign-In. Please continue using Sign in with Google.';
  }

  const isRateLimit = 
    msgLower.includes('rate limit') ||
    msgLower.includes('rate_limit') ||
    msgLower.includes('limit exceeded') ||
    msgLower.includes('over_email_send_rate_limit') ||
    msgLower.includes('too many requests') ||
    msgLower.includes('once every') ||
    msgLower.includes('security purposes');

  if (isRateLimit) {
    if (context === 'signup' || context === 'resend_verification') {
      return "You've requested verification emails too frequently. Please wait a few minutes before requesting another verification email.";
    }
    if (context === 'reset_password') {
      return "Too many reset requests\nYou've requested password reset emails too frequently. Please wait a few minutes before trying again.";
    }
    return "Too many requests. Please wait a few minutes before trying again.";
  }

  if (
    msgLower.includes('same password') ||
    msgLower.includes('should be different') ||
    msgLower.includes('different from') ||
    msgLower.includes('same_password') ||
    msgLower.includes('different password') ||
    msgLower.includes('same as current') ||
    msgLower.includes('same as old') ||
    msgLower.includes('must be different')
  ) {
    return 'Your new password must be different from your current password.';
  }

  if (
    msgLower.includes('expired') ||
    msgLower.includes('session missing') ||
    msgLower.includes('auth session') ||
    msgLower.includes('jwt') ||
    msgLower.includes('token') ||
    context === 'update_password'
  ) {
    if (
      msgLower.includes('expired') ||
      msgLower.includes('session missing') ||
      msgLower.includes('auth session') ||
      msgLower.includes('jwt') ||
      msgLower.includes('token') ||
      msgLower.includes('not found') ||
      context === 'update_password'
    ) {
      return 'This reset link has expired or has already been used.';
    }
  }

  if (
    msgLower.includes('different sign-in method') ||
    msgLower.includes('different sign in method') ||
    msgLower.includes('uses a different sign-in') ||
    msgLower.includes('uses google sign-in') ||
    msgLower.includes('created using google')
  ) {
    return 'This account uses a different sign-in method\nPlease sign in using the method you originally used to create your account.';
  }
  if (msgLower.includes('invalid login credentials') || msgLower.includes('invalid credentials') || msgLower.includes('invalid email')) {
    return 'Unable to sign in\nPlease check your email and password, or continue using the sign-in method you originally used.';
  }
  if (msgLower.includes('already registered') || msgLower.includes('user already exists') || msgLower.includes('already exists') || msgLower.includes('account already exists')) {
    return 'An account already exists\nPlease sign in using the method you originally used to create this account.\nIf you signed up with a password, you can use Forgot Password if needed.';
  }
  if (
    msgLower.includes('failed to fetch') ||
    msgLower.includes('network error') ||
    msgLower.includes('network_error') ||
    msgLower.includes('fetch error') ||
    msgLower.includes('internet')
  ) {
    return 'Something went wrong. Please check your internet connection and try again.';
  }
  if (msgLower.includes('email not confirmed') || msgLower.includes('confirm your email') || msgLower.includes('unconfirmed')) {
    return 'Please verify your email address. We sent a verification link to your inbox.';
  }
  if (msgLower.includes('signup is disabled') || msgLower.includes('signup_disabled')) {
    return 'Signups are currently disabled. Please contact the administrator or try again later.';
  }
  return "We couldn't process your request right now. Please try again in a few moments.";
};

// Helper function to map database profile (snake_case) to client UserProfile (camelCase)
const mapProfileFromDb = (dbProf: any): UserProfile => {
  return {
    id: dbProf.id,
    name: dbProf.name,
    email: dbProf.email,
    targetRole: dbProf.target_role || 'Frontend Engineer',
    preferredMode: dbProf.preferred_mode || 'voice',
    preferredVoice: dbProf.preferred_voice || 'default',
    preferredTheme: (dbProf.preferred_theme as 'light' | 'dark' | 'system') || 'system',
    streakDays: dbProf.streak_days || 0,
    lastActiveDate: dbProf.last_active_date,
    createdAt: dbProf.created_at,
    authProvider: dbProf.auth_provider
  };
};

// Helper function to map client UserProfile changes (camelCase) to database profile (snake_case)
const mapProfileToDb = (appProf: Partial<UserProfile>): any => {
  const dbPayload: any = {};
  if (appProf.id !== undefined) dbPayload.id = appProf.id;
  if (appProf.name !== undefined) dbPayload.name = appProf.name;
  if (appProf.email !== undefined) dbPayload.email = appProf.email;
  if (appProf.targetRole !== undefined) dbPayload.target_role = appProf.targetRole;
  if (appProf.preferredMode !== undefined) dbPayload.preferred_mode = appProf.preferredMode;
  if (appProf.preferredVoice !== undefined) dbPayload.preferred_voice = appProf.preferredVoice;
  if (appProf.preferredTheme !== undefined) dbPayload.preferred_theme = appProf.preferredTheme;
  if (appProf.streakDays !== undefined) dbPayload.streak_days = appProf.streakDays;
  if (appProf.lastActiveDate !== undefined) dbPayload.last_active_date = appProf.lastActiveDate;
  if (appProf.createdAt !== undefined) dbPayload.created_at = appProf.createdAt;
  if (appProf.authProvider !== undefined) dbPayload.auth_provider = appProf.authProvider;
  return dbPayload;
};

const DEFAULT_STATS: DashboardStats = {
  totalInterviews: 0,
  completedInterviews: 0,
  streakDays: 0,
  averageScore: 0,
  strongestSubject: 'N/A',
  weakestSubject: 'N/A',
  subjectScores: [],
  weeklyStreaks: [
    { day: 'Sun', completed: false },
    { day: 'Mon', completed: false },
    { day: 'Tue', completed: false },
    { day: 'Wed', completed: false },
    { day: 'Thu', completed: false },
    { day: 'Fri', completed: false },
    { day: 'Sat', completed: false }
  ],
  recommendations: [
    'Complete your first mock interview to activate AI suggestions!',
    'Set a target role in your Profile to tailor questions.'
  ]
};

const getWeeklyStreakMatrix = (list: InterviewSession[]): { day: string; completed: boolean }[] => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sun, 6 is Sat
  
  // Find Sunday of the current week (local time)
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - currentDayOfWeek);
  
  return days.map((day, idx) => {
    const targetDate = new Date(sunday);
    targetDate.setDate(sunday.getDate() + idx);
    const targetDateString = targetDate.toDateString();
    
    // Check if at least one session exists on this day (any status)
    const completed = list.some(sess => {
      if (!sess.createdAt) return false;
      const sessDate = new Date(sess.createdAt);
      return sessDate.toDateString() === targetDateString;
    });
    
    return { day, completed };
  });
};

const getDynamicStreak = (list: InterviewSession[]): number => {
  if (list.length === 0) return 0;
  
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const practiceDates = new Set<string>();
  list.forEach(sess => {
    if (sess.createdAt) {
      const d = new Date(sess.createdAt);
      practiceDates.add(getLocalDateString(d));
    }
  });

  if (practiceDates.size === 0) return 0;

  let streak = 0;
  const checkDate = new Date();
  const todayStr = getLocalDateString(checkDate);
  const yesterday = new Date(checkDate);
  yesterday.setDate(checkDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  if (practiceDates.has(todayStr)) {
    while (practiceDates.has(getLocalDateString(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else if (practiceDates.has(yesterdayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
    while (practiceDates.has(getLocalDateString(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }
  
  return streak;
};

const getRedirectOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') {
    return window.location.origin;
  }
  const envUrl = (process.env as any).VITE_APP_URL || (process.env as any).APP_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/$/, ''); // strip trailing slash
  }
  return '';
};

const sanitizeAbandonedSessions = (list: InterviewSession[]): { sanitizedList: InterviewSession[]; hasChanges: boolean } => {
  let hasChanges = false;
  const sanitizedList = list.map(item => {
    if (item.status === 'in_progress') {
      hasChanges = true;
      return {
        ...item,
        status: 'abandoned' as const,
        completedAt: item.completedAt || new Date().toISOString()
      };
    }
    return item;
  });
  return { sanitizedList, hasChanges };
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      const isExplicit = localStorage.getItem('mockecho_theme_explicit') === 'true';
      const stored = localStorage.getItem('mockecho_theme');
      if (isExplicit && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        return stored;
      }
    }
    return 'system';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handler);
      return () => (mediaQuery as any).removeListener(handler);
    }
  }, []);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return hash.includes('type=recovery') || search.includes('type=recovery') || search.includes('recovery=true');
  });

  const demoMode = !isSupabaseConfigured;

  const launchDemoMode = () => {
    localStorage.setItem('mockecho_demo_launched', 'true');
    const defaultProf: UserProfile = {
      id: 'demo-user',
      name: 'Demo Candidate',
      email: 'demo@mockecho.ai',
      targetRole: 'Frontend Engineer',
      preferredMode: 'voice',
      preferredVoice: 'default',
      preferredTheme: 'system',
      streakDays: 0,
      createdAt: new Date().toISOString()
    };
    const cachedProfile = localStorage.getItem('mockecho_demo_profile');
    const activeProfile: UserProfile = cachedProfile ? JSON.parse(cachedProfile) : defaultProf;
    activeProfile.preferredTheme = activeProfile.preferredTheme || 'system';
    setProfile(activeProfile);

    const cachedInterviews = localStorage.getItem('mockecho_demo_interviews');
    const rawInterviews = cachedInterviews ? JSON.parse(cachedInterviews) : [];
    const { sanitizedList: interviewList, hasChanges } = sanitizeAbandonedSessions(rawInterviews);
    if (hasChanges) {
      localStorage.setItem('mockecho_demo_interviews', JSON.stringify(interviewList));
    }
    setInterviews(interviewList);

    setUser({
      id: 'demo-user',
      email: 'demo@mockecho.ai',
      user_metadata: { name: activeProfile.name }
    });
    calculateDashboardStats(activeProfile, interviewList);
  };

  const loadedUserIdRef = useRef<string | null>(null);

  const clearError = () => setError(null);

  // Monitor Supabase Auth state changes
  useEffect(() => {
    let subscription: any = null;

    const initAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          // Setup Local Demo Mode state
          const defaultProf: UserProfile = {
            id: 'demo-user',
            name: 'Demo Candidate',
            email: 'demo@mockecho.ai',
            targetRole: 'Frontend Engineer',
            preferredMode: 'voice',
            preferredVoice: 'default',
            preferredTheme: 'system',
            streakDays: 0,
            createdAt: new Date().toISOString()
          };

          const cachedProfile = localStorage.getItem('mockecho_demo_profile');
          const activeProfile: UserProfile = cachedProfile ? JSON.parse(cachedProfile) : defaultProf;
          activeProfile.preferredTheme = activeProfile.preferredTheme || 'system';
          setProfile(activeProfile);

          const cachedInterviews = localStorage.getItem('mockecho_demo_interviews');
          const rawInterviews = cachedInterviews ? JSON.parse(cachedInterviews) : [];
          const { sanitizedList: interviewList, hasChanges } = sanitizeAbandonedSessions(rawInterviews);
          if (hasChanges) {
            localStorage.setItem('mockecho_demo_interviews', JSON.stringify(interviewList));
          }
          setInterviews(interviewList);

          const hasLaunchedDemo = localStorage.getItem('mockecho_demo_launched') === 'true';
          if (hasLaunchedDemo) {
            setUser({
              id: 'demo-user',
              email: 'demo@mockecho.ai',
              user_metadata: { name: activeProfile.name }
            });
          } else {
            setUser(null);
          }

          calculateDashboardStats(activeProfile, interviewList);
          setLoading(false);
          return;
        }

        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const isVerifiedRedirect = params?.get('verified') === 'true';

        const currentHash = typeof window !== 'undefined' ? window.location.hash : '';
        const currentSearch = typeof window !== 'undefined' ? window.location.search : '';

        // Check if authentication link returned an error (e.g. expired OTP or token)
        const isAuthErrorLink = (currentHash.includes('error=') || currentSearch.includes('error=')) &&
          (currentHash.includes('otp_expired') || currentHash.includes('access_denied') || currentHash.includes('token_expired') || currentSearch.includes('otp_expired') || currentSearch.includes('expired') || currentSearch.includes('error='));

        if (isAuthErrorLink) {
          const isRecovery = currentHash.includes('type=recovery') || currentSearch.includes('type=recovery');
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.hash = '';
            if (isRecovery) {
              url.searchParams.set('error', 'expired');
            } else {
              url.searchParams.set('verification_error', 'expired');
            }
            window.history.replaceState({}, document.title, url.toString());
          }
          setIsRecoveryMode(false);
          setLoading(false);
          return;
        }

        // Check if this is an email confirmation callback.
        // It has type=signup, type=invite, or type=email_change explicitly in the hash, and is NOT a Google OAuth or recovery flow
        const isEmailVerificationCallback = typeof window !== 'undefined' && (
          (window.location.pathname.includes('/auth/callback') || window.location.pathname === '/') && 
          window.location.hash.includes('access_token=') &&
          (window.location.hash.includes('type=signup') || window.location.hash.includes('type=invite') || window.location.hash.includes('type=email_change')) &&
          !window.location.hash.includes('type=recovery')
        );

        if (isEmailVerificationCallback) {
          let verificationFailed = false;
          try {
            const { error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
              console.error("Email verification error:", sessionError);
              verificationFailed = true;
            }
          } catch (err) {
            console.error("Error during verification callback:", err);
            verificationFailed = true;
          }

          // Force complete sign-out of any lingering or existing user session
          await supabase.auth.signOut();
          loadedUserIdRef.current = null;
          setUser(null);
          setProfile(null);
          setInterviews([]);

          if (verificationFailed) {
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.hash = '';
              url.searchParams.set('verification_error', 'expired');
              window.history.replaceState({}, document.title, url.toString());
            }
            setIsRecoveryMode(false);
            setLoading(false);
            return;
          }

          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.hash = '';
            url.searchParams.set('verified', 'true');
            window.history.replaceState({}, document.title, url.toString());
          }
          setIsRecoveryMode(false);
          setLoading(false);
          return;
        }

        // Check if this is an OAuth callback loading in the client-side SPA (implicit flow with hash fragment)
        const isOAuthCallback = typeof window !== 'undefined' && (
          (window.location.pathname.includes('/auth/callback') || window.location.pathname === '/') &&
          (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) &&
          !window.location.hash.includes('type=signup') &&
          !window.location.hash.includes('type=invite') &&
          !window.location.hash.includes('type=recovery')
        );

        const isOAuthPopup = typeof window !== 'undefined' && Boolean(window.opener) && isOAuthCallback;

        if (isOAuthPopup) {
          console.log("App running in Google OAuth popup. isOAuthCallback:", isOAuthCallback);
          if (isOAuthCallback) {
            try {
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
              if (session?.user && window.opener) {
                console.log("OAuth session established in popup. Communicating session to main window...");
                window.opener.postMessage({
                  type: 'SUPABASE_OAUTH_SUCCESS',
                  session: session
                }, '*');
                setTimeout(() => {
                  window.close();
                }, 500);
                return;
              } else if (sessionError || !session) {
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'SUPABASE_OAUTH_FAILURE',
                    error: sessionError?.message || 'Failed to retrieve session.'
                  }, '*');
                  setTimeout(() => {
                    window.close();
                  }, 500);
                  return;
                }
              }
            } catch (err: any) {
              console.error("Error retrieving session in OAuth popup:", err);
              if (window.opener) {
                window.opener.postMessage({
                  type: 'SUPABASE_OAUTH_FAILURE',
                  error: err.message || 'OAuth error occurred.'
                }, '*');
                setTimeout(() => {
                  window.close();
                }, 500);
                return;
              }
            }
          }
          // If in a popup, do not run standard main-window listeners or fetches
          setLoading(false);
          return;
        }

        if (isOAuthCallback && !isOAuthPopup) {
          console.log("Detected OAuth implicit callback in main window (no opener).");
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            await loadUserProfileAndData(session.user);
            setLoading(false);
            return;
          }
        }

        if (isVerifiedRedirect) {
          await supabase.auth.signOut();
          loadedUserIdRef.current = null;
          setUser(null);
          setProfile(null);
          setInterviews([]);
          setLoading(false);

          const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Only log in if the user explicitly performed a SIGNED_IN action (e.g., entered password on Sign In form)
            if (event === 'SIGNED_IN' && session?.user) {
              const isDifferentUser = loadedUserIdRef.current !== session.user.id;
              setUser(session.user);
              if (isDifferentUser) {
                await loadUserProfileAndData(session.user);
              }
            } else if (event === 'SIGNED_OUT' || !session?.user) {
              loadedUserIdRef.current = null;
              setUser(null);
              setProfile(null);
              setInterviews([]);
              setLoading(false);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('mockecho_theme');
                localStorage.removeItem('mockecho_theme_explicit');
              }
            }
          });
          subscription = data.subscription;
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const isRecoveryUrl = typeof window !== 'undefined' && (
          window.location.hash.includes('type=recovery') ||
          window.location.search.includes('type=recovery')
        );

        if (isRecoveryUrl || isRecoveryMode) {
          console.log("Password recovery session detected on init.");
          setIsRecoveryMode(true);
          setUser(session?.user || null);
          setLoading(false);
        } else if (session?.user) {
          setUser(session.user);
          await loadUserProfileAndData(session.user);
        } else {
          setLoading(false);
        }

        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'PASSWORD_RECOVERY' || (session && (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')))) {
            console.log("Password recovery event/token detected in onAuthStateChange.");
            setIsRecoveryMode(true);
            setUser(session?.user || null);
            setLoading(false);
            return;
          }

          if (session?.user) {
            const isDifferentUser = loadedUserIdRef.current !== session.user.id;
            setUser(session.user);
            if (isDifferentUser || event === 'USER_UPDATED') {
              await loadUserProfileAndData(session.user);
            }
          } else {
            loadedUserIdRef.current = null;
            setUser(null);
            setProfile(null);
            setInterviews([]);
            setLoading(false);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('mockecho_theme');
              localStorage.removeItem('mockecho_theme_explicit');
            }
          }
        });
        subscription = data.subscription;
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        setError(err.message || 'Auth initialization failed.');
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Listen for popup postMessage events for Google OAuth flow completion
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      const redirectOrigin = getRedirectOrigin();
      // Accept message if it comes from the same site, local dev, or standard preview domain
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        origin !== window.location.origin &&
        origin !== redirectOrigin
      ) {
        return;
      }

      if (event.data?.type === 'SUPABASE_OAUTH_SUCCESS') {
        const session = event.data.session;
        if (session) {
          setLoading(true);
          try {
            if (!isSupabaseConfigured) {
              // Simulated Google Login fallback
              const userEmail = session.user.email || 'candidate@example.com';
              const userName = session.user.user_metadata?.name || userEmail.split('@')[0];
              
              localStorage.setItem('mockecho_demo_launched', 'true');
              
              const defaultProf: UserProfile = {
                id: 'demo-user',
                name: userName,
                email: userEmail,
                targetRole: 'Frontend Engineer',
                preferredMode: 'voice',
                preferredVoice: 'default',
                preferredTheme: 'system',
                streakDays: 0,
                createdAt: new Date().toISOString()
              };
              
              const cachedProfile = localStorage.getItem('mockecho_demo_profile');
              const activeProfile: UserProfile = cachedProfile ? JSON.parse(cachedProfile) : defaultProf;
              activeProfile.name = userName;
              activeProfile.email = userEmail;
              
              setProfile(activeProfile);
              localStorage.setItem('mockecho_demo_profile', JSON.stringify(activeProfile));
              
              const cachedInterviews = localStorage.getItem('mockecho_demo_interviews');
              const rawInterviews = cachedInterviews ? JSON.parse(cachedInterviews) : [];
              const { sanitizedList: interviewList, hasChanges } = sanitizeAbandonedSessions(rawInterviews);
              if (hasChanges) {
                localStorage.setItem('mockecho_demo_interviews', JSON.stringify(interviewList));
              }
              setInterviews(interviewList);
              
              setUser({
                id: 'demo-user',
                email: userEmail,
                user_metadata: { name: userName }
              });
              
              calculateDashboardStats(activeProfile, interviewList);
              setLoading(false);
              return;
            }

            const { error: setSessionError } = await supabase.auth.setSession(session);
            if (setSessionError) throw setSessionError;
            // setSession triggers the onAuthStateChange automatically, handling loading and auth state updates
          } catch (err: any) {
            console.error('Error setting session:', err);
            setError(err.message || 'Failed to initialize session from Google login.');
            setLoading(false);
          }
        }
      } else if (event.data?.type === 'SUPABASE_OAUTH_FAILURE') {
        setError(event.data.error || 'Google login was cancelled or failed.');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Fetch or create profile & interviews from Supabase
  const loadUserProfileAndData = async (authUser: any) => {
    try {
      loadedUserIdRef.current = authUser.id;
      setProfileError(null);
      setLoading(true);
      
      // Define a default fallback profile record in case database is unreachable or profile is not found
      const defaultProf: UserProfile = {
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        targetRole: 'Frontend Engineer',
        preferredMode: 'voice',
        preferredVoice: 'default',
        preferredTheme: 'system',
        streakDays: 0,
        createdAt: new Date().toISOString()
      };

      let activeProfile: UserProfile = defaultProf;

      // 1. Fetch Profile from Supabase
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profError || !prof) {
        // If not found in Cloud, attempt to create the profile record.
        // It's possible the database trigger 'handle_new_user' is running in parallel.
        const dbPayload = mapProfileToDb(defaultProf);

        const { data: insertedProf, error: insertError } = await supabase
          .from('profiles')
          .insert(dbPayload)
          .select()
          .single();

        if (insertError) {
          // If insert fails (e.g., due to a duplicate key violation because the trigger ran simultaneously),
          // attempt to refetch the profile record one more time.
          console.warn('Insert failed, checking if profile was created by database trigger or parallel flow:', insertError);
          const { data: refetchedProf, error: refetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (!refetchError && refetchedProf) {
            console.log('Successfully loaded profile created by database trigger.');
            activeProfile = mapProfileFromDb(refetchedProf);
            // Force system theme for newly created profiles if it defaulted to dark
            if (activeProfile.preferredTheme === 'dark') {
              activeProfile.preferredTheme = 'system';
              if (isSupabaseConfigured && authUser && authUser.id !== 'demo-user') {
                supabase.from('profiles').update({ preferred_theme: 'system' }).eq('id', authUser.id).then(() => {});
              }
            }
          } else {
            console.warn('Failed to refetch profile, falling back to local default profile:', refetchError);
            activeProfile = defaultProf;
          }
        } else {
          activeProfile = mapProfileFromDb(insertedProf);
        }
      } else {
        activeProfile = mapProfileFromDb(prof);
      }

      // Migration for existing accounts that inherited default 'dark' without explicit user choice
      const isExplicit = typeof window !== 'undefined' && localStorage.getItem('mockecho_theme_explicit') === 'true';
      if (!isExplicit && activeProfile?.preferredTheme === 'dark') {
        activeProfile.preferredTheme = 'system';
        if (isSupabaseConfigured && authUser && authUser.id !== 'demo-user') {
          supabase.from('profiles').update({ preferred_theme: 'system' }).eq('id', authUser.id).then(() => {});
        }
      }

      setProfile(activeProfile);
      if (activeProfile?.preferredTheme) {
        setThemeState(activeProfile.preferredTheme);
        if (typeof window !== 'undefined') {
          localStorage.setItem('mockecho_theme', activeProfile.preferredTheme);
        }
      }

      // 2. Fetch interviews list from Supabase
      const { data: list, error: listError } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', authUser.id);

      let interviewList: InterviewSession[] = [];
      if (!listError && list) {
        // Map camelCase fields from snake_case database response
        interviewList = list.map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          role: item.role,
          subject: item.subject,
          difficulty: item.difficulty,
          questionCount: item.question_count,
          mode: item.mode,
          timeMode: item.time_mode,
          totalDurationSeconds: item.total_duration_seconds,
          status: item.status,
          questions: item.questions,
          answers: item.answers,
          overallFeedback: item.overall_feedback,
          createdAt: item.created_at,
          completedAt: item.completed_at
        }));
      } else if (listError) {
        console.warn('Failed to fetch interviews list from server, using empty list:', listError);
      }

      const { sanitizedList: finalInterviewList, hasChanges } = sanitizeAbandonedSessions(interviewList);
      if (hasChanges) {
        finalInterviewList.forEach(item => {
          if (item.status === 'abandoned') {
            supabase.from('interviews')
              .update({ status: 'abandoned', completed_at: item.completedAt })
              .eq('id', item.id)
              .eq('status', 'in_progress')
              .then(() => {});
          }
        });
      }

      setInterviews(finalInterviewList);
      calculateDashboardStats(activeProfile, finalInterviewList);
    } catch (err: any) {
      console.error('Error loading user profile or interview data:', err);
      setProfileError(err.message || 'Failed to load user profile or interview data from the server.');
      
      // Ensure we do not block authentication or show a fatal error to already signed-in users.
      // We fall back to a default empty/local state in-memory (never saved back to DB automatically).
      const fallbackProf: UserProfile = {
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        targetRole: 'Frontend Engineer',
        preferredMode: 'voice',
        preferredVoice: 'default',
        preferredTheme: 'system',
        streakDays: 0,
        createdAt: new Date().toISOString()
      };
      setProfile(fallbackProf);
      setInterviews([]);
      calculateDashboardStats(fallbackProf, []);
    } finally {
      setLoading(false);
    }
  };

  // Stats compiler based on live Supabase entries
  const calculateDashboardStats = (userProf: UserProfile, list: InterviewSession[]) => {
    const completedList = list.filter(x => x.status === 'completed');
    const dynamicStreak = getDynamicStreak(list);
    const weeklyStreaks = getWeeklyStreakMatrix(list);
    
    if (completedList.length === 0) {
      setStats({
        totalInterviews: 0,
        completedInterviews: 0,
        streakDays: dynamicStreak,
        averageScore: 0,
        strongestSubject: 'N/A',
        weakestSubject: 'N/A',
        subjectScores: [],
        weeklyStreaks,
        recommendations: [
          'Complete your first mock interview to activate AI suggestions!',
          'Set a target role in your Profile to tailor questions.'
        ]
      });
      return;
    }

    let totalScore = 0;
    const subjMap: Record<string, { sum: number; count: number }> = {};

    completedList.forEach(sess => {
      const score = sess.overallFeedback?.averageScore || 0;
      totalScore += score;

      const subj = sess.subject;
      if (!subjMap[subj]) {
        subjMap[subj] = { sum: 0, count: 0 };
      }
      subjMap[subj].sum += score;
      subjMap[subj].count += 1;
    });

    const subjectScores = Object.entries(subjMap).map(([subject, data]) => ({
      subject,
      score: Math.round(data.sum / data.count)
    }));

    const sortedSubjs = [...subjectScores].sort((a, b) => b.score - a.score);
    const strongestSubject = sortedSubjs[0]?.subject || 'N/A';
    const weakestSubject = sortedSubjs.length > 1 ? sortedSubjs[sortedSubjs.length - 1]?.subject : 'Needs 2+ Topics';

    const recommendations: string[] = [];
    if (sortedSubjs.length === 1) {
      recommendations.push(`Great start with ${strongestSubject}! Try practicing a second subject to unlock comparison insights.`);
    } else if (sortedSubjs.length > 1) {
      const weakest = sortedSubjs[sortedSubjs.length - 1];
      if (weakest && weakest.score < 85) {
        recommendations.push(`Your performance in ${weakest.subject} is currently at ${weakest.score}%. Focus on ${weakest.subject} questions in your next session.`);
      } else {
        recommendations.push(`Strong performance across subjects! Challenge yourself with Hard-level ${strongestSubject} questions.`);
      }
    }
    
    if (dynamicStreak < 3) {
      recommendations.push('Create a daily habit! Practicing just 10 minutes a day maintains your streak and builds muscle memory.');
    } else {
      recommendations.push(`Impressive! You are on a ${dynamicStreak}-day interview streak. Continue tomorrow to secure your rank.`);
    }
    recommendations.push('Try enabling Voice Mode to practice real-time speech articulation, clarity, and pacing.');

    setStats({
      totalInterviews: completedList.length,
      completedInterviews: completedList.length,
      streakDays: dynamicStreak,
      averageScore: Math.round(totalScore / completedList.length),
      strongestSubject,
      weakestSubject,
      subjectScores,
      weeklyStreaks,
      recommendations
    });
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isSupabaseConfigured) {
        // Query profiles table to check if account already exists with this email
        const { data: prof } = await supabase
          .from('profiles')
          .select('auth_provider')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (prof) {
          throw new Error('An account already exists\nAn account with this email address already exists. Please sign in using the method you originally used to create your account. If you created your account using a password, you can also use Forgot Password if needed.');
        }
      }

      const originUrl = getRedirectOrigin();
      const redirectUrl = `${originUrl}/auth/callback`;
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name },
          emailRedirectTo: redirectUrl
        }
      });
      if (error) throw error;

      // When email is already registered in Supabase auth with confirmation enabled, identities array is empty
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('An account already exists\nAn account with this email address already exists. Please sign in using the method you originally used to create your account. If you created your account using a password, you can also use Forgot Password if needed.');
      }
    } catch (err: any) {
      setError(mapAuthError(err.message || 'Signup failed.', 'signup'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (error) throw error;
    } catch (err: any) {
      setError(mapAuthError(err.message || 'Login failed.', 'login'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (emailToReset: string) => {
    setError(null);
    const cleanEmail = emailToReset.trim().toLowerCase();

    try {
      if (isSupabaseConfigured) {
        // Query profiles table to check if account was created with Google Sign-In
        const { data: prof } = await supabase
          .from('profiles')
          .select('auth_provider')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (prof && prof.auth_provider === 'google') {
          throw new Error('This account uses a different sign-in method\nPlease sign in using the method you originally used to create your account.');
        }

        const originUrl = getRedirectOrigin();
        const redirectUrl = `${originUrl}/auth/callback?type=recovery`;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl
        });

        if (error) {
          if (
            error.message?.toLowerCase().includes('sso') ||
            error.message?.toLowerCase().includes('google') ||
            error.message?.toLowerCase().includes('oauth')
          ) {
            throw new Error('This account uses a different sign-in method\nPlease sign in using the method you originally used to create your account.');
          }
          throw error;
        }
      } else {
        const isGoogleDemo = localStorage.getItem(`google_user_${cleanEmail}`) === 'true';
        if (isGoogleDemo) {
          throw new Error('This account uses a different sign-in method\nPlease sign in using the method you originally used to create your account.');
        }
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (err: any) {
      const friendlyMsg = mapAuthError(err.message || 'Password reset request failed.', 'reset_password');
      setError(friendlyMsg);
      throw err;
    }
  };

  const updatePassword = async (newPassword: string) => {
    setError(null);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        await supabase.auth.signOut();
      } else {
        await new Promise(r => setTimeout(r, 400));
      }
      setIsRecoveryMode(false);
      setUser(null);
      setProfile(null);

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('type');
        url.searchParams.delete('recovery');
        url.hash = '';
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (err: any) {
      const friendlyMsg = mapAuthError(err.message || 'Failed to update password.', 'update_password');
      setError(friendlyMsg);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    // Open OAuth popup window SYNCHRONOUSLY to completely bypass Chrome/Safari popup blockers.
    const popup = window.open(
      'about:blank',
      'google_oauth_popup',
      'width=600,height=700,status=no,resizable=yes,scrollbars=yes'
    );

    if (!popup) {
      setLoading(false);
      throw new Error('Popup blocked. Please allow popups for this site to log in with Google.');
    }

    try {
      // If Supabase is NOT configured (demo/sandbox mode), run simulated Google Login popup!
      if (!isSupabaseConfigured) {
        popup.document.open();
        popup.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Sign in - Google Accounts</title>
              <style>
                body {
                  font-family: "Google Sans", Roboto, Arial, sans-serif;
                  background-color: #ffffff;
                  color: #202124;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  padding: 16px;
                  box-sizing: border-box;
                }
                .card {
                  border: 1px solid #dadce0;
                  border-radius: 8px;
                  width: 360px;
                  padding: 40px;
                  text-align: center;
                  box-sizing: border-box;
                }
                .logo {
                  display: flex;
                  justify-content: center;
                  margin-bottom: 16px;
                }
                h1 {
                  font-size: 24px;
                  font-weight: 400;
                  margin: 0 0 8px 0;
                  color: #202124;
                }
                p {
                  font-size: 16px;
                  color: #5f6368;
                  margin: 0 0 24px 0;
                }
                .input-group {
                  text-align: left;
                  margin-bottom: 20px;
                }
                label {
                  display: block;
                  font-size: 12px;
                  font-weight: 500;
                  color: #1a73e8;
                  margin-bottom: 6px;
                }
                input {
                  width: 100%;
                  padding: 12px;
                  border: 1px solid #dadce0;
                  border-radius: 4px;
                  font-size: 14px;
                  box-sizing: border-box;
                  transition: border-color 0.15s;
                }
                input:focus {
                  outline: none;
                  border-color: #1a73e8;
                }
                .buttons {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-top: 32px;
                }
                .btn-text {
                  color: #1a73e8;
                  font-weight: 500;
                  font-size: 14px;
                  background: none;
                  border: none;
                  cursor: pointer;
                  padding: 0;
                }
                .btn-primary {
                  background-color: #1a73e8;
                  color: #ffffff;
                  border: none;
                  border-radius: 4px;
                  padding: 10px 24px;
                  font-weight: 500;
                  font-size: 14px;
                  cursor: pointer;
                  transition: background-color 0.15s;
                }
                .btn-primary:hover {
                  background-color: #1557b0;
                }
                .error {
                  color: #d93025;
                  font-size: 12px;
                  margin-top: 4px;
                  text-align: left;
                }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="logo">
                  <svg width="74" height="24" viewBox="0 0 74 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.24 10.96V14.12H14.86C14.62 15.4 13.56 17.84 10.82 19.76C8.46 21.4 5.34 22.36 1.22 22.36C-5.18 22.36 -10.3 17.24 -10.3 10.84C-10.3 4.44 -5.18 -0.679999 1.22 -0.679999C4.86 -0.679999 7.3 0.76 8.7 2.1L11.2 4.6C9.6 3.06 7.42 1.48 4.22 1.48C-1.8 1.48 -6.74 6.44 -6.74 12.46C-6.74 18.48 -1.8 23.44 4.22 23.44C10.5 23.44 14.68 19.06 14.68 12.76C14.68 12.02 14.6 11.5 14.48 10.96H9.24Z" fill="#4285F4"/>
                  </svg>
                </div>
                <h1>Sign in</h1>
                <p>with your Google Account</p>
                <form id="loginForm">
                  <div class="input-group">
                    <input type="email" id="email" placeholder="Email or phone" required value="candidate@example.com">
                    <div id="error" class="error"></div>
                  </div>
                  <div class="buttons">
                    <button type="button" class="btn-text">Create account</button>
                    <button type="submit" class="btn-primary">Next</button>
                  </div>
                </form>
              </div>
              <script>
                document.getElementById('loginForm').addEventListener('submit', function(e) {
                  e.preventDefault();
                  const email = document.getElementById('email').value;
                  if (!email) return;
                  
                  const mockSession = {
                    access_token: 'mock-google-token',
                    user: {
                      id: 'demo-user',
                      email: email,
                      user_metadata: {
                        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
                        avatar_url: ''
                      }
                    }
                  };
                  
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'SUPABASE_OAUTH_SUCCESS',
                      session: mockSession
                    }, '*');
                    window.close();
                  }
                });
              </script>
            </body>
          </html>
        `);
        popup.document.close();
        setLoading(false);
        return;
      }

      // If Supabase is configured, trigger actual Google OAuth flow
      const originUrl = getRedirectOrigin();
      const redirectUrl = `${originUrl}/auth/callback`;
      console.log("Supabase OAuth Initiated. redirectTo:", redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true
        }
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No authentication URL returned from Supabase.');

      // Redirect the synchronously opened popup window to the real Google OAuth URL
      popup.location.href = data.url;

      // Monitor popup close event
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          setLoading(currentLoading => {
            if (currentLoading) {
              console.log("Google OAuth popup closed by user before completion.");
              setError('Google login was cancelled.');
              return false;
            }
            return currentLoading;
          });
        }
      }, 1000);
    } catch (err: any) {
      if (popup) {
        try {
          popup.close();
        } catch (e) {}
      }
      setError(mapAuthError(err.message || 'Google login failed.', 'login'));
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      if (demoMode) {
        localStorage.removeItem('mockecho_demo_launched');
        setUser(null);
        setProfile(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mockecho_theme');
          localStorage.removeItem('mockecho_theme_explicit');
        }
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
      setInterviews([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mockecho_theme');
        localStorage.removeItem('mockecho_theme_explicit');
      }
    } catch (err: any) {
      setError(err.message || 'Logout failed.');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    setError(null);
    try {
      if (updates.preferredTheme !== undefined && typeof window !== 'undefined') {
        localStorage.setItem('mockecho_theme_explicit', 'true');
      }
      if (demoMode) {
        const newProf = { ...profile, ...updates };
        setProfile(newProf);
        localStorage.setItem('mockecho_demo_profile', JSON.stringify(newProf));
        calculateDashboardStats(newProf, interviews);
        return;
      }
      const dbPayload = mapProfileToDb(updates);
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(dbPayload)
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      const newProf = data ? mapProfileFromDb(data) : { ...profile, ...updates };
      setProfile(newProf);
      calculateDashboardStats(newProf, interviews);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile changes.');
      throw err;
    }
  };

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mockecho_theme', newTheme);
      localStorage.setItem('mockecho_theme_explicit', 'true');
    }
    if (profile) {
      const updatedProfile = { ...profile, preferredTheme: newTheme };
      setProfile(updatedProfile);
      if (isSupabaseConfigured && user && user.id !== 'demo-user') {
        updateProfile({ preferredTheme: newTheme }).catch(() => {});
      }
    }
  };

  const refreshStats = () => {
    if (profile) calculateDashboardStats(profile, interviews);
  };

  const startNewSession = async (
    role: string,
    subject: string,
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard',
    questionCount: number,
    mode: 'voice' | 'text',
    timeMode: 'no_limit' | 'timed',
    customDurationSeconds?: number,
    format?: 'mixed' | 'subjective' | 'mcq' | 'application'
  ): Promise<InterviewSession> => {
    if (!profile) throw new Error('Please login to start an interview.');
    setLoading(true);
    setError(null);
    try {
      // Gather recent question texts to avoid repeating questions in new sessions
      const previousQuestions = interviews
        .flatMap(s => s.questions || [])
        .map(q => q.questionText)
        .filter((text): text is string => Boolean(text) && typeof text === 'string')
        .slice(-30);

      // 1. Generate questions from Gemini AI
      const res = await fetch(`${API_BASE_URL}/api/generate-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          subject,
          difficulty,
          questionCount,
          format,
          previousQuestions,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate interview questions.');
      }

      const { questions } = await res.json();
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid question set received. Please try again.');
      }

      let totalDurationSeconds: number | undefined = undefined;
      if (timeMode === 'timed') {
        if (customDurationSeconds && customDurationSeconds > 0) {
          totalDurationSeconds = customDurationSeconds;
        } else {
          totalDurationSeconds = questions.reduce((sum, q) => sum + (q.suggestedDuration || 120), 0);
        }
      }

      // 2. Setup Session Object
      const newSession: InterviewSession = {
        id: `sess_${Date.now()}`,
        userId: profile.id,
        role,
        subject,
        difficulty,
        format,
        questionCount,
        mode,
        timeMode,
        totalDurationSeconds,
        questions,
        answers: {},
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // 3. Write to Database
      const dbPayload = {
        id: newSession.id,
        user_id: profile.id,
        role: newSession.role,
        subject: newSession.subject,
        difficulty: newSession.difficulty,
        question_count: newSession.questionCount,
        mode: newSession.mode,
        time_mode: newSession.timeMode,
        total_duration_seconds: newSession.totalDurationSeconds,
        status: newSession.status,
        questions: newSession.questions,
        answers: newSession.answers,
        created_at: newSession.createdAt
      };

      if (demoMode) {
        setActiveSession(newSession);
        const updatedList = [newSession, ...interviews];
        setInterviews(updatedList);
        localStorage.setItem('mockecho_demo_interviews', JSON.stringify(updatedList));
        calculateDashboardStats(profile, updatedList);
        return newSession;
      }

      await supabase.from('interviews').insert(dbPayload);

      // 4. Update memory cache state
      setActiveSession(newSession);
      const updatedList = [newSession, ...interviews];
      setInterviews(updatedList);
      calculateDashboardStats(profile, updatedList);

      return newSession;
    } catch (err: any) {
      setError(err.message || 'Failed to prepare interview session.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (
    questionId: string,
    userAnswer: string,
    selectedOptionIds?: string[],
    timeTakenSeconds: number = 30,
    transcriptionEdited: boolean = false
  ): Promise<InterviewSession | undefined> => {
    if (!activeSession || !profile) return;
    setEvaluating(true);
    setError(null);

    try {
      const question = activeSession.questions.find(q => q.id === questionId);
      if (!question) throw new Error('Question not found in active session.');

      // 1. Grade response via Gemini AI on server
      const res = await fetch(`${API_BASE_URL}/api/evaluate-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          userAnswer: question.type === 'subjective' ? userAnswer : (selectedOptionIds || [userAnswer]),
          timeTakenSeconds
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to evaluate your answer.');
      }

      const { feedback } = await res.json();

      const submission: AnswerSubmission = {
        questionId,
        userAnswer,
        selectedOptionIds,
        timeTakenSeconds,
        transcriptionEdited,
        feedback,
      };

      const updatedSession: InterviewSession = {
        ...activeSession,
        status: 'in_progress',
        answers: {
          ...activeSession.answers,
          [questionId]: submission,
        },
      };

      if (demoMode) {
        setActiveSession(updatedSession);
        const updatedList = interviews.map(x => x.id === activeSession.id ? updatedSession : x);
        setInterviews(updatedList);
        localStorage.setItem('mockecho_demo_interviews', JSON.stringify(updatedList));
        calculateDashboardStats(profile, updatedList);
        return updatedSession;
      }

      // Update Database
      await supabase
        .from('interviews')
        .update({
          status: 'in_progress',
          answers: updatedSession.answers
        })
        .eq('id', activeSession.id);

      setActiveSession(updatedSession);
      const updatedList = interviews.map(x => x.id === activeSession.id ? updatedSession : x);
      setInterviews(updatedList);
      calculateDashboardStats(profile, updatedList);
      return updatedSession;
    } catch (err: any) {
      setError(err.message || 'Failed to record answer.');
      throw err;
    } finally {
      setEvaluating(false);
    }
  };

  const finishSession = async (sessionOverride?: InterviewSession) => {
    const sessionToFinish = sessionOverride || activeSession;
    if (!sessionToFinish || !profile) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Compile final metrics via backend
      const res = await fetch(`${API_BASE_URL}/api/evaluate-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: sessionToFinish.role,
          subject: sessionToFinish.subject,
          difficulty: sessionToFinish.difficulty,
          questions: sessionToFinish.questions,
          answers: sessionToFinish.answers,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create overall report.');
      }

      const { overallFeedback } = await res.json();
      const completedAt = new Date().toISOString();

      const finalSession: InterviewSession = {
        ...sessionToFinish,
        status: 'completed',
        completedAt,
        overallFeedback,
      };

      const today = completedAt.split('T')[0];
      let newStreak = profile.streakDays;
      if (profile.lastActiveDate !== today) {
        if (profile.lastActiveDate) {
          const lastDate = new Date(profile.lastActiveDate);
          const currDate = new Date(today);
          const diffDays = Math.ceil(Math.abs(currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
      }

      if (demoMode) {
        setActiveSession(null);
        const updatedList = interviews.map(x => x.id === sessionToFinish.id ? finalSession : x);
        setInterviews(updatedList);
        localStorage.setItem('mockecho_demo_interviews', JSON.stringify(updatedList));
        
        const updatedProfile = { ...profile, streakDays: newStreak, lastActiveDate: today };
        setProfile(updatedProfile);
        localStorage.setItem('mockecho_demo_profile', JSON.stringify(updatedProfile));
        calculateDashboardStats(updatedProfile, updatedList);
        return finalSession;
      }

      // 2. Update Database
      await supabase
        .from('interviews')
        .update({
          status: 'completed',
          completed_at: completedAt,
          overall_feedback: overallFeedback,
          answers: finalSession.answers
        })
        .eq('id', sessionToFinish.id);

      // Update streak count in profiles table
      if (profile.lastActiveDate !== today) {
        await supabase
          .from('profiles')
          .update({
            streak_days: newStreak,
            last_active_date: today
          })
          .eq('id', profile.id);
      }

      setActiveSession(null);
      const updatedList = interviews.map(x => x.id === sessionToFinish.id ? finalSession : x);
      setInterviews(updatedList);
      
      const updatedProfile = { ...profile, streakDays: newStreak, lastActiveDate: today };
      setProfile(updatedProfile);
      calculateDashboardStats(updatedProfile, updatedList);
      return finalSession;
    } catch (err: any) {
      setError(err.message || 'Failed to wrap up interview.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const retryLoadProfile = async () => {
    if (user) {
      await loadUserProfileAndData(user);
    }
  };

  const cancelSession = async () => {
    if (!activeSession) return;
    
    const abandonedSession: InterviewSession = {
      ...activeSession,
      status: 'abandoned',
      completedAt: new Date().toISOString(),
    };

    try {
      if (demoMode) {
        const updatedList = interviews.map(x => x.id === activeSession.id ? abandonedSession : x);
        setInterviews(updatedList);
        localStorage.setItem('mockecho_demo_interviews', JSON.stringify(updatedList));
        if (profile) calculateDashboardStats(profile, updatedList);
      } else {
        await supabase
          .from('interviews')
          .update({
            status: 'abandoned',
            completed_at: abandonedSession.completedAt,
          })
          .eq('id', activeSession.id);
        const updatedList = interviews.map(x => x.id === activeSession.id ? abandonedSession : x);
        setInterviews(updatedList);
        if (profile) calculateDashboardStats(profile, updatedList);
      }
    } catch (err: any) {
      console.error('Failed to mark session as abandoned:', err);
    } finally {
      setActiveSession(null);
    }
  };

  const deleteSession = async (id: string) => {
    setError(null);
    try {
      const updatedList = interviews.filter(x => x.id !== id);
      const dynamicStreak = getDynamicStreak(updatedList);
      
      let maxDateStr: string | null = null;
      let maxDateTime = 0;
      const getLocalDateString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      updatedList.forEach(sess => {
        if (sess.createdAt) {
          const d = new Date(sess.createdAt);
          const dateStr = getLocalDateString(d);
          const time = d.getTime();
          if (time > maxDateTime) {
            maxDateTime = time;
            maxDateStr = dateStr;
          }
        }
      });

      if (demoMode) {
        setInterviews(updatedList);
        localStorage.setItem('mockecho_demo_interviews', JSON.stringify(updatedList));
        if (profile) {
          const updatedProfile = { 
            ...profile, 
            streakDays: dynamicStreak, 
            lastActiveDate: maxDateStr || undefined 
          };
          setProfile(updatedProfile);
          localStorage.setItem('mockecho_demo_profile', JSON.stringify(updatedProfile));
          calculateDashboardStats(updatedProfile, updatedList);
        }
        return;
      }

      await supabase.from('interviews').delete().eq('id', id);
      if (profile) {
        await supabase
          .from('profiles')
          .update({
            streak_days: dynamicStreak,
            last_active_date: maxDateStr
          })
          .eq('id', profile.id);
        
        const updatedProfile = { 
          ...profile, 
          streakDays: dynamicStreak, 
          lastActiveDate: maxDateStr || undefined 
        };
        setProfile(updatedProfile);
        setInterviews(updatedList);
        calculateDashboardStats(updatedProfile, updatedList);
      } else {
        setInterviews(updatedList);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete interview history record.');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        interviews,
        activeSession,
        stats,
        loading,
        evaluating,
        error,
        profileError,
        isRecoveryMode,
        theme,
        resolvedTheme,
        setTheme,
        setIsRecoveryMode,
        clearError,
        retryLoadProfile,
        signUp,
        login,
        resetPassword,
        updatePassword,
        signInWithGoogle,
        logout,
        updateProfile,
        startNewSession,
        submitAnswer,
        finishSession,
        cancelSession,
        deleteSession,
        refreshStats,
        demoMode,
        launchDemoMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside an AppProvider.');
  }
  return context;
};
