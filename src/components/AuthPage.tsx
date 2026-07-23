/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Loader2, ArrowLeft, Mail, User, Lock, Play, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { MockEchoLogo } from './MockEchoLogo';

interface AuthPageProps {
  onBackToLanding: () => void;
  isRecoveryMode?: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBackToLanding, isRecoveryMode: propIsRecoveryMode }) => {
  const { user, signUp, login, resetPassword, updatePassword, signInWithGoogle, error, clearError, demoMode, launchDemoMode, isRecoveryMode: appIsRecoveryMode, setIsRecoveryMode, resolvedTheme, setTheme } = useApp();
  const isRecovery = propIsRecoveryMode || appIsRecoveryMode;

  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [isForgotPasswordSuccess, setIsForgotPasswordSuccess] = useState<boolean>(false);
  const [resetEmailSent, setResetEmailSent] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const isSessionExpiredError = (msg: string | null) => {
    if (!msg) return false;
    const m = msg.toLowerCase();
    return (
      m.includes('expired') ||
      m.includes('already been used') ||
      m.includes('session missing') ||
      m.includes('invalid link') ||
      m.includes('jwt') ||
      m.includes('not found') ||
      m.includes('reset link')
    );
  };

  const isRecoveryExpired = isRecovery && (!user || isSessionExpiredError(localError) || isSessionExpiredError(error));
  const showRecoveryForm = isRecovery && !!user && !isSessionExpiredError(localError) && !isSessionExpiredError(error);

  React.useEffect(() => {
    if (isRecoveryExpired) {
      setIsRecoveryMode(false);
      setIsSignUp(false);
      setIsForgotPassword(false);
      if (!localError) {
        setLocalError('This reset link has expired or has already been used.');
      }
    }
  }, [isRecoveryExpired, setIsRecoveryMode]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';

      if (params.get('verified') === 'true' || hash.includes('verified=true')) {
        setIsSignUp(false);
        setIsForgotPassword(false);
        setIsRecoveryMode(false);
        setSuccessMsg("Email verified successfully!\nYour account has been activated. Please sign in to continue your MockEcho interview preparation.");
        
        // Clean up the URL query parameter so it doesn't persist on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('verified');
        url.hash = '';
        window.history.replaceState({}, document.title, url.toString());
      } else if (
        params.get('verification_error') === 'expired' ||
        params.get('verification_error') === 'true' ||
        hash.includes('verification_error')
      ) {
        setIsSignUp(false);
        setIsForgotPassword(false);
        setIsRecoveryMode(false);
        setLocalError('This verification link has expired or has already been used.');
        
        const url = new URL(window.location.href);
        url.searchParams.delete('verification_error');
        url.hash = '';
        window.history.replaceState({}, document.title, url.toString());
      } else if (
        params.get('error') === 'expired' ||
        params.get('error') === 'access_denied' ||
        (hash.includes('type=recovery') && hash.includes('error='))
      ) {
        setIsSignUp(false);
        setIsForgotPassword(false);
        setIsRecoveryMode(false);
        setLocalError('This reset link has expired or has already been used.');
        
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        url.hash = '';
        window.history.replaceState({}, document.title, url.toString());
      }
    }
  }, [setIsRecoveryMode, loading]);

  const handleGoogleSignIn = async () => {
    clearError();
    setLocalError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setSuccessMsg(null);

    if (showRecoveryForm) {
      if (!password || !confirmPassword) {
        setLocalError('Please fill out both password fields.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }

      setLoading(true);
      try {
        await updatePassword(password);
        setIsForgotPassword(false);
        setIsSignUp(false);
        setIsForgotPasswordSuccess(false);
        setSuccessMsg('Password updated successfully! Please sign in with your new password.');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isForgotPassword) {
      if (!email) {
        setLocalError('Please enter your email address.');
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email);
        setResetEmailSent(email);
        setIsForgotPasswordSuccess(true);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isSignUp) {
      if (!email || !password || !confirmPassword || !name) {
        setLocalError('Please fill out all fields.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }

      setLoading(true);
      try {
        await signUp(email, password, name);
        setSuccessMsg('Account created successfully! We have sent a verification email to your address. Please verify your email to log in.');
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      if (!email || !password) {
        setLocalError('Please enter both email and password.');
        return;
      }

      setLoading(true);
      try {
        await login(email, password);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBackToHome = () => {
    setIsRecoveryMode(false);
    clearError();
    setLocalError(null);
    setSuccessMsg(null);
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState({}, document.title, '/');
      } catch (e) {
        // ignore
      }
    }
    onBackToLanding();
  };

  return (
    <div className={`min-h-screen w-full bg-bg-warm text-text-charcoal flex flex-col justify-start items-center pt-16 pb-12 sm:pt-20 sm:pb-16 md:pt-24 md:pb-20 lg:pt-28 lg:pb-24 xl:pt-24 xl:pb-20 px-4 sm:px-6 md:px-8 relative selection:bg-accent-forest selection:text-white`} id="auth-page-container">
      {/* Header back button & theme toggle */}
      <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10">
        <button
          type="button"
          onClick={handleBackToHome}
          className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-text-soft hover:text-text-charcoal transition group cursor-pointer"
          id="btn-back-to-home"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 text-text-soft hover:text-text-charcoal hover:bg-bg-warm border border-border-warm rounded-xl transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center shadow-xs"
          id="auth-theme-toggle-btn"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-accent-forest" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md sm:mx-auto md:max-w-3xl lg:max-w-4xl grid md:grid-cols-2 gap-5 md:gap-8 lg:gap-16 items-center">
        
        {/* Editorial Left Side - Brand and Content */}
        <div className="text-center md:text-left md:max-w-sm lg:max-w-sm mb-0">
          <div className="mx-auto md:mx-0 h-9 w-9 bg-accent-forest/5 border border-accent-forest/15 rounded-xl flex items-center justify-center text-accent-forest shadow-xs">
            <MockEchoLogo size={18} animate={true} />
          </div>
          <h2 className="mt-2.5 text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-text-charcoal font-serif-editorial italic" id="auth-heading">
            {showRecoveryForm
              ? 'Set New Password'
              : isForgotPassword 
                ? 'Reset Password' 
                : isSignUp 
                  ? 'Start Your Journey' 
                  : 'Welcome Back'}
          </h2>
          <p className="mt-1 text-xs text-text-soft animate-fade-in font-sans leading-relaxed" id="auth-subheading">
            {showRecoveryForm
              ? 'Enter your new password below to recover access to your practice profile.'
              : isForgotPassword 
                ? 'Enter your email below to recover access to your MockEcho account.' 
                : isSignUp 
                  ? 'Practice realistic technical interviews, receive AI-powered feedback, and build the confidence to explain your ideas clearly.' 
                  : 'Resume your interview preparation and continue building confidence for your next technical round.'}
          </p>

          {/* Premium editorial bullet highlights on tablet and desktop */}
          {isSignUp ? (
            <div className="hidden md:block mt-5 md:mt-3.5 lg:mt-3.5 space-y-3 md:space-y-2 lg:space-y-2 border-t border-border-warm/60 pt-4 md:pt-3 lg:pt-3 animate-fade-in text-left">
              <div className="flex items-start space-x-2.5 text-xs text-text-soft">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-forest mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-text-charcoal block mb-0.5 font-mono text-[10px] uppercase tracking-wider">Realistic Mock Interviews</span>
                  <p className="leading-normal text-text-soft/90">Practice coding, system design, and behavioral questions through interactive voice and text-based interview sessions.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2.5 text-xs text-text-soft">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-forest mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-text-charcoal block mb-0.5 font-mono text-[10px] uppercase tracking-wider">Actionable AI Feedback</span>
                  <p className="leading-normal text-text-soft/90">Improve your pacing, clarity, structure, and communication with detailed feedback after every response.</p>
                </div>
              </div>
            </div>
          ) : isForgotPassword || isRecovery ? (
            <div className="hidden md:block mt-5 md:mt-3.5 lg:mt-3.5 space-y-3 md:space-y-2 lg:space-y-2 border-t border-border-warm/60 pt-4 md:pt-3 lg:pt-3 animate-fade-in text-left">
              <div className="flex items-start space-x-2.5 text-xs text-text-soft">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-forest mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-text-charcoal block mb-0.5 font-mono text-[10px] uppercase tracking-wider">Secure Account Recovery</span>
                  <p className="leading-normal text-text-soft/90">We'll send password reset instructions to your registered email address so you can securely regain access to your MockEcho account.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2.5 text-xs text-text-soft">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-forest mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-text-charcoal block mb-0.5 font-mono text-[10px] uppercase tracking-wider">Continue Where You Left Off</span>
                  <p className="leading-normal text-text-soft/90">Your interview history, AI feedback, and practice progress are safely saved and will be waiting for you when you sign back in.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:block mt-5 md:mt-3.5 lg:mt-3.5 space-y-3 md:space-y-2 lg:space-y-2 border-t border-border-warm/60 pt-4 md:pt-3 lg:pt-3 animate-fade-in text-left">
              <div className="flex items-start space-x-2.5 text-xs text-text-soft">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-forest mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-text-charcoal block mb-0.5 font-mono text-[10px] uppercase tracking-wider">Continue Your Progress</span>
                  <p className="leading-normal text-text-soft/90">Review your practice sessions, improve your communication patterns, and sharpen the way you explain technical concepts.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2.5 text-xs text-text-soft">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-forest mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-text-charcoal block mb-0.5 font-mono text-[10px] uppercase tracking-wider">Practice With Purpose</span>
                  <p className="leading-normal text-text-soft/90">Train your technical explanations, speaking clarity, and interview confidence through realistic AI-powered mock interviews.</p>
                </div>
              </div>
            </div>
          )}

          {/* Warm, professional closing line */}
          <div className="hidden md:block border-t border-border-warm/60 pt-4 md:pt-3 lg:pt-3 animate-fade-in mt-6 md:mt-4 lg:mt-4">
            <p className="text-xs font-serif-editorial italic text-accent-forest font-semibold">
              {isForgotPassword || showRecoveryForm 
                ? "Get back to practicing with confidence."
                : isSignUp 
                  ? "Your next interview starts here." 
                  : "Ready when you are."}
            </p>
          </div>
        </div>

        {/* Right Side - Interactive Form Card */}
        <div className="mt-0 px-0">
          <div className="bg-card-warm py-5 px-5 sm:py-6 sm:px-8 md:py-4 md:px-6 lg:py-5 lg:px-6 shadow-sm border border-border-warm rounded-2xl">
            {isForgotPasswordSuccess ? (
              <div className="space-y-4 animate-fade-in text-center py-2" id="reset-password-success-container">
                <div className="mx-auto w-12 h-12 rounded-full bg-accent-forest/10 border border-accent-forest/20 flex items-center justify-center text-accent-forest">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-text-charcoal font-sans">Check your email</h3>
                  <p className="text-xs text-text-soft leading-relaxed max-w-xs mx-auto font-sans">
                    If an account exists for this email address, we've sent password reset instructions. Please check your inbox (and spam folder if necessary).
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordSuccess(false);
                      setIsForgotPassword(false);
                      clearError();
                      setLocalError(null);
                      setSuccessMsg(null);
                    }}
                    className="w-full py-2.5 px-4 bg-accent-forest hover:bg-accent-forest/90 text-white rounded-xl text-xs font-bold transition duration-300 cursor-pointer shadow-xs"
                    id="btn-return-signin-after-reset"
                  >
                    Return to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-3 md:space-y-2 lg:space-y-2.5" onSubmit={handleSubmit} id="auth-form">
                {(localError || error) && (() => {
                  const errText = (localError || error || '').toLowerCase();
                  const isRateLimitErr = errText.includes('frequently') || errText.includes('too many') || errText.includes('limit');
                  const isVerificationLinkErr = !isRateLimitErr && errText.includes('verification link');
                  const isResetLinkErr = !isRateLimitErr && (isRecovery || errText.includes('reset link') || (errText.includes('expired') && !errText.includes('verification')));
                  const isAccountExistsErr = !isRateLimitErr && (errText.includes('account already exists') || errText.includes('already registered') || errText.includes('already exists'));
                  const isDifferentMethodErr = !isRateLimitErr && (errText.includes('different sign-in method') || errText.includes('different sign in method') || errText.includes('different method'));
                  const isGoogleAccountErr = !isRateLimitErr && !isAccountExistsErr && !isDifferentMethodErr && (errText.includes('google sign-in account') || errText.includes('associated with a google') || errText.includes('uses google sign-in'));

                  return (
                    <div className="p-3 bg-accent-clay/5 border border-accent-clay/20 text-accent-clay rounded-xl text-xs leading-relaxed font-sans space-y-1.5" id="auth-error-banner">
                      {(localError || error)?.includes('\n') ? (
                        (localError || error)!.split('\n').map((line, idx) => (
                          <p key={idx} className={idx === 0 ? 'font-bold text-sm text-accent-clay font-sans mb-0.5' : 'text-text-soft font-sans'}>
                            {line}
                          </p>
                        ))
                      ) : (
                        <p>{localError || error}</p>
                      )}

                      {isRateLimitErr && (
                        <div className="pt-1 flex flex-wrap items-center gap-2 border-t border-accent-clay/15 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              clearError();
                              setLocalError(null);
                              setIsSignUp(false);
                              setIsForgotPassword(false);
                            }}
                            className="inline-flex items-center text-accent-forest hover:text-accent-forest/80 font-bold underline transition duration-200 cursor-pointer text-xs"
                            id="btn-rate-limit-return-signin"
                          >
                            Return to Sign In
                          </button>
                        </div>
                      )}

                      {isResetLinkErr && (
                        <div className="pt-0.5 border-t border-accent-clay/15 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              clearError();
                              setLocalError(null);
                              setIsRecoveryMode(false);
                              setIsForgotPassword(true);
                            }}
                            className="inline-flex items-center text-accent-forest hover:text-accent-forest/80 font-bold underline transition duration-200 cursor-pointer text-xs"
                            id="btn-request-new-reset-link"
                          >
                            Request a new password reset link
                          </button>
                        </div>
                      )}

                      {isVerificationLinkErr && (
                        <div className="pt-0.5 flex flex-wrap items-center gap-2 border-t border-accent-clay/15 mt-1">
                          {!isSignUp ? (
                            <button
                              type="button"
                              onClick={() => {
                                clearError();
                                setLocalError(null);
                                setIsSignUp(true);
                                setIsForgotPassword(false);
                              }}
                              className="inline-flex items-center text-accent-forest hover:text-accent-forest/80 font-bold underline transition duration-200 cursor-pointer text-xs"
                              id="btn-request-new-verification"
                            >
                              Sign up for a new account
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                clearError();
                                setLocalError(null);
                                setIsSignUp(false);
                                setIsForgotPassword(false);
                              }}
                              className="inline-flex items-center text-accent-forest hover:text-accent-forest/80 font-bold underline transition duration-200 cursor-pointer text-xs"
                              id="btn-switch-to-signin-err"
                            >
                              Sign In
                            </button>
                          )}
                        </div>
                      )}

                      {isAccountExistsErr && (
                        <div className="pt-0.5 flex flex-wrap items-center gap-2 border-t border-accent-clay/15 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              clearError();
                              setLocalError(null);
                              setIsSignUp(false);
                              setIsForgotPassword(false);
                            }}
                            className="inline-flex items-center text-accent-forest hover:text-accent-forest/80 font-bold underline transition duration-200 cursor-pointer text-xs"
                            id="btn-account-exists-signin"
                          >
                            Sign In
                          </button>
                          <span className="text-text-soft/40">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              clearError();
                              setLocalError(null);
                              setIsSignUp(false);
                              setIsForgotPassword(true);
                            }}
                            className="inline-flex items-center text-accent-forest hover:text-accent-forest/80 font-bold underline transition duration-200 cursor-pointer text-xs"
                            id="btn-account-exists-forgot-password"
                          >
                            Forgot Password
                          </button>
                        </div>
                      )}

                      {isDifferentMethodErr && (
                        <div className="pt-0.5 flex flex-wrap items-center gap-2 border-t border-accent-clay/15 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              clearError();
                              setLocalError(null);
                              setIsSignUp(false);
                              setIsForgotPassword(false);
                            }}
                            className="inline-flex items-center text-accent-forest hover:text-accent-forest/80 font-bold underline transition duration-200 cursor-pointer text-xs"
                            id="btn-different-method-signin"
                          >
                            Sign In
                          </button>
                        </div>
                      )}

                      {isGoogleAccountErr && (
                        <div className="pt-0.5 flex flex-wrap items-center gap-2 border-t border-accent-clay/15 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              clearError();
                              setLocalError(null);
                              setIsSignUp(false);
                              setIsForgotPassword(false);
                            }}
                            className="inline-flex items-center text-accent-forest hover:text-accent-forest/80 font-bold underline transition duration-200 cursor-pointer text-xs"
                            id="btn-google-account-switch-signin"
                          >
                            Sign In
                          </button>
                          <span className="text-text-soft/40">•</span>
                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="inline-flex items-center text-accent-forest hover:text-accent-forest/80 font-bold underline transition duration-200 cursor-pointer text-xs"
                            id="btn-google-account-signin"
                          >
                            Sign in with Google
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {successMsg && (
                  <div className="p-3 bg-accent-forest/5 border border-accent-forest/20 text-accent-forest rounded-xl text-xs leading-relaxed font-sans space-y-1" id="auth-success-banner">
                    {successMsg.includes('\n') ? (
                      successMsg.split('\n').map((line, idx) => (
                        <p key={idx} className={idx === 0 ? 'font-bold text-sm' : ''}>
                          {line}
                        </p>
                      ))
                    ) : (
                      <p>{successMsg}</p>
                    )}
                  </div>
                )}

                {isSignUp && !isForgotPassword && !isRecovery && (
                  <div>
                    <label htmlFor="name" className="block text-[10px] font-bold text-text-soft uppercase tracking-wider mb-0.5 font-mono">
                      Full Name
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-soft">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        id="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-9.5 pr-3.5 py-2 bg-bg-warm/50 border border-border-warm rounded-xl text-text-charcoal placeholder-text-soft/40 focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest hover:border-border-warm/85 text-sm transition-all duration-300 font-sans shadow-xs focus:shadow-sm"
                        placeholder="Steve Rogers"
                      />
                    </div>
                  </div>
                )}

                {!showRecoveryForm && (
                  <div>
                    <label htmlFor="email" className="block text-[10px] font-bold text-text-soft uppercase tracking-wider mb-0.5 font-mono">
                      Email address
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-soft">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-9.5 pr-3.5 py-2 bg-bg-warm/50 border border-border-warm rounded-xl text-text-charcoal placeholder-text-soft/40 focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest hover:border-border-warm/85 text-sm transition-all duration-300 font-sans shadow-xs focus:shadow-sm"
                        placeholder="name@company.com"
                      />
                    </div>
                  </div>
                )}

                {(!isForgotPassword || showRecoveryForm) && (
                  <div>
                    <label htmlFor="password" className="block text-[10px] font-bold text-text-soft uppercase tracking-wider mb-0.5 font-mono">
                      {showRecoveryForm ? 'New Password' : 'Password'}
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-soft">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-9.5 pr-10 py-2 bg-bg-warm/50 border border-border-warm rounded-xl text-text-charcoal placeholder-text-soft/40 focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest hover:border-border-warm/85 text-sm transition-all duration-300 font-sans shadow-xs focus:shadow-sm"
                        placeholder="••••••••"
                      />
                      {password.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-soft hover:text-text-charcoal focus:outline-none transition-colors cursor-pointer"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          id="btn-toggle-password-visibility"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {(isSignUp || showRecoveryForm) && !isForgotPassword && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-[10px] font-bold text-text-soft uppercase tracking-wider mb-0.5 font-mono">
                      {showRecoveryForm ? 'Confirm New Password' : 'Confirm Password'}
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-soft">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-9.5 pr-10 py-2 bg-bg-warm/50 border border-border-warm rounded-xl text-text-charcoal placeholder-text-soft/40 focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest hover:border-border-warm/85 text-sm transition-all duration-300 font-sans shadow-xs focus:shadow-sm"
                        placeholder="••••••••"
                      />
                      {confirmPassword.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-soft hover:text-text-charcoal focus:outline-none transition-colors cursor-pointer"
                          tabIndex={-1}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          id="btn-toggle-confirm-password-visibility"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!isForgotPassword && !isSignUp && !showRecoveryForm && (
                  <div className="flex items-center justify-end text-xs pt-1 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        clearError();
                        setLocalError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-accent-clay hover:text-accent-clay/80 font-semibold transition duration-200 cursor-pointer hover:underline py-0.5 px-1 -mr-1"
                      id="btn-forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 md:landscape:py-2 px-4 bg-accent-forest hover:bg-accent-forest/90 disabled:bg-accent-forest/40 text-white rounded-xl text-sm font-bold shadow-xs border border-accent-forest/10 flex items-center justify-center space-x-2 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                    id="btn-auth-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>
                        {showRecoveryForm ? 'Update Password' : isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In'}
                      </span>
                    )}
                  </button>
                </div>

                {demoMode && !showRecoveryForm && (
                  <div className="pt-1.5 border-t border-border-warm flex flex-col items-center space-y-1 md:landscape:space-y-0.5 lg:space-y-0.5">
                    <span className="text-[10px] text-text-soft font-sans">
                      Sandbox Mode:
                    </span>
                    <button
                      type="button"
                      onClick={launchDemoMode}
                      className="w-full py-1.5 px-2.5 bg-accent-clay hover:bg-accent-clay/90 text-white rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 transition-all duration-300 active:scale-95 cursor-pointer shadow-2xs border border-accent-clay/10"
                    >
                      <Play className="w-3 h-3 fill-white animate-pulse" />
                      <span>Launch Local Demo</span>
                    </button>
                  </div>
                )}

                {!isForgotPassword && !showRecoveryForm && (
                  <>
                    <div className="relative flex items-center justify-center my-2 md:landscape:my-1.5 lg:my-1.5">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-border-warm"></div>
                      </div>
                      <div className="relative flex justify-center text-[9px] font-mono uppercase tracking-wider px-2 bg-card-warm text-text-soft">
                        Or continue with
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full py-2.5 md:landscape:py-2 px-4 bg-card-warm hover:bg-bg-warm border border-border-warm hover:border-border-warm/85 text-text-charcoal hover:text-text-charcoal rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                      id="btn-google-signin"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      <span>Google</span>
                    </button>
                  </>
                )}
              </form>
            )}

            {!showRecoveryForm && !isForgotPasswordSuccess && (
              <div className="border-t border-border-warm text-center text-xs text-text-soft mt-3 md:landscape:mt-2.5 lg:mt-2.5 pt-3 md:landscape:pt-2.5 lg:pt-2.5">
                {isForgotPassword ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      clearError();
                      setLocalError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-accent-forest hover:text-accent-forest/80 font-semibold cursor-pointer"
                    id="btn-return-login"
                  >
                    Return to Login
                  </button>
                ) : isSignUp ? (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false);
                        clearError();
                        setLocalError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-accent-forest hover:text-accent-forest/80 font-semibold cursor-pointer"
                      id="btn-toggle-login"
                    >
                      Log In
                    </button>
                  </span>
                ) : (
                  <span>
                    New to MockEcho?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(true);
                        clearError();
                        setLocalError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-accent-forest hover:text-accent-forest/80 font-semibold cursor-pointer"
                      id="btn-toggle-signup"
                    >
                      Sign Up Free
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
