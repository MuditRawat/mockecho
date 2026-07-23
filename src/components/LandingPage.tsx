/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Terminal, Award, Zap, ArrowRight, Play, Check, HelpCircle, Users, MessageSquare, ChevronDown, ArrowUp, Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MockEchoLogoWithWordmark } from './MockEchoLogo';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { demoMode, launchDemoMode, resolvedTheme, setTheme } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const howItWorksRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Show the button when scrolled down 600px
      if (window.scrollY > 600) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  };

  const handleScrollToHowItWorks = () => {
    if (howItWorksRef.current) {
      const rect = howItWorksRef.current.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      // Sticky header height is 64px (h-16). Offset by 64px so "The Blueprint" section heading starts immediately below the navbar.
      const offsetPosition = absoluteTop - 64;
      window.scrollTo({
        top: offsetPosition,
        behavior: reducedMotion ? 'auto' : 'smooth'
      });
    }
  };

  const faqs = [
    {
      q: "How does the voice simulation work?",
      a: "Our system reads questions using natural Web Speech synthesis to simulate a real interviewer. When you speak, we use high-accuracy speech recognition to transcribe your answers. You can edit the text before submitting it for final evaluation."
    },
    {
      q: "Can I practice without speaking out loud?",
      a: "Yes. Every practice session supports both voice and keyboard inputs. If you are in a quiet environment, you can type your responses and still receive the same deep, multi-dimensional analytical scoring."
    },
    {
      q: "What technical domains are supported?",
      a: "We generate panels tailored specifically for Frontend, Backend, Full-Stack, System Design, DevOps, and Mobile Engineering tracks across Junior, Mid, and Senior difficulty levels."
    },
    {
      q: "Is my microphone audio stored on any servers?",
      a: "Never. Your voice is transcribed directly in your browser using the local standard Web Speech API. We only evaluate the resulting text transcript, ensuring your voice data remains completely private."
    }
  ];

  const targetAudiences = [
    {
      role: "Software Engineers",
      desc: "Learn to discuss system trade-offs, architecture decisions, and code performance cleanly with confidence."
    },
    {
      role: "Placement Prep & Grads",
      desc: "Bridge the gap between academic theory and the practical, structured communication styles expected at top companies."
    },
    {
      role: "Contractors & Consultants",
      desc: "Sharpen your client-facing technical articulation to secure high-value projects and pass screening calls."
    }
  ];

  return (
    <div className="min-h-screen bg-bg-warm text-text-charcoal selection:bg-accent-forest selection:text-white overflow-x-hidden" id="landing-page-container">
      {/* Navigation */}
      <nav className="border-b border-border-warm bg-card-warm/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <MockEchoLogoWithWordmark size={24} wordmarkSizeClass="text-lg" />
          <div className="flex items-center space-x-3">
            {/* Theme Toggle Control */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 text-text-soft hover:text-text-charcoal hover:bg-bg-warm border border-border-warm rounded-xl transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center shadow-xs"
              id="landing-theme-toggle-btn"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-accent-forest" />
              )}
            </button>

            {demoMode ? (
              <button
                onClick={launchDemoMode}
                className="px-4.5 py-2 bg-accent-clay hover:bg-accent-clay/90 text-white text-xs font-semibold rounded-lg transition-all duration-300 shadow-sm active:scale-95 cursor-pointer flex items-center space-x-1.5 border border-accent-clay/10 hover:shadow-md hover:-translate-y-0.5"
                id="nav-demo-btn"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Launch Demo</span>
              </button>
            ) : (
              <button
                onClick={onGetStarted}
                className="px-4.5 py-2 bg-accent-forest hover:bg-accent-forest/90 text-white text-xs font-semibold rounded-lg transition-all duration-300 shadow-sm active:scale-95 cursor-pointer border border-accent-forest/10 hover:shadow-md hover:-translate-y-0.5"
                id="nav-signin-btn"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-10 pb-12 sm:pt-14 sm:pb-16 md:pt-16 md:pb-20 lg:pt-20 lg:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border border-accent-forest/20 bg-accent-forest/5 text-accent-forest text-[11px] font-mono uppercase tracking-wider mb-5 sm:mb-6"
          >
            <Zap className="w-3.5 h-3.5 text-accent-forest animate-pulse" />
            <span>Interactive Voice & Concept Arena</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl tracking-tight text-text-charcoal mb-4 sm:mb-5 leading-[1.15] max-w-3xl mx-auto font-serif-editorial italic font-medium"
          >
            Practice the Art of the{' '}
            <span className="text-accent-forest not-italic">
              Technical Explanation
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base md:text-lg text-text-soft max-w-xl sm:max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed font-sans"
          >
            Most candidates fail tech interviews not because they lack coding skills, but because they struggle to explain their thinking. MockEcho helps you practice speaking clearly under pressure.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto sm:max-w-none"
          >
            {demoMode ? (
              <button
                onClick={launchDemoMode}
                className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-3.5 bg-accent-clay hover:bg-accent-clay/90 text-white text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center space-x-2.5 group active:scale-95 cursor-pointer border border-accent-clay/10 hover:shadow-md hover:-translate-y-0.5"
                id="hero-demo-btn"
              >
                <Play className="w-4 h-4 fill-white animate-pulse" />
                <span>Launch Free Practice Panel</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            ) : (
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-3.5 bg-accent-forest hover:bg-accent-forest/90 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center space-x-2 group active:scale-95 cursor-pointer border border-accent-forest/10 hover:shadow-md hover:-translate-y-0.5"
                id="hero-start-btn"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            )}
            <button
              onClick={handleScrollToHowItWorks}
              className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-3.5 bg-card-warm hover:bg-bg-warm text-text-charcoal text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 border border-border-warm flex items-center justify-center shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-95"
            >
              How It Works
            </button>
          </motion.div>
        </div>
      </header>

      {/* Why Practice Matters Section */}
      <section id="why-practice" className="py-20 bg-card-warm border-t border-border-warm relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-[10px] font-bold text-accent-forest uppercase tracking-wider block font-mono mb-3">The Art of Technical Articulation</span>
          <h2 className="text-3xl sm:text-4xl tracking-tight text-text-charcoal mb-6 font-serif-editorial italic font-medium">
            Communication is half the battle.
          </h2>
          <div className="space-y-6 text-text-soft text-sm sm:text-base leading-relaxed max-w-3xl mx-auto font-sans">
            <p>
              In a technical interview, solving the puzzle is only the baseline. Interviewers are actively evaluating how you handle ambiguity, how you structure your explanations, and how cleanly you communicate trade-offs.
            </p>
            <p className="font-medium text-text-charcoal">
              Reading answers silently on study platforms creates a false sense of security. MockEcho shifts your prep from passive reading to vocal, structured delivery.
            </p>
          </div>
        </div>
      </section>

      {/* Bento Feature Grid */}
      <section id="features" className="py-24 bg-bg-warm/50 border-t border-border-warm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-[10px] font-bold text-accent-forest uppercase tracking-wider block font-mono mb-3">Robust Capabilities</span>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-text-charcoal mb-4 font-serif-editorial italic font-medium">
              Simulated High-Stakes Evaluation
            </h2>
            <p className="text-text-soft text-sm leading-relaxed">
              We focus on the metrics that real interviewers note down during structural panel review sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-card-warm border border-border-warm hover:border-accent-forest/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="p-3 bg-accent-forest/5 rounded-xl text-accent-forest w-12 h-12 flex items-center justify-center mb-6 border border-accent-forest/10 group-hover:bg-accent-forest/10 transition-colors">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-text-charcoal mb-3">Immersive Audio Panels</h3>
                <p className="text-text-soft text-xs sm:text-sm leading-relaxed font-sans">
                  Train your oral presentation. Questions are spoken aloud by the simulator, prompting you to vocalize responses. We capture your words and let you review the transcript before submission.
                </p>
              </div>
              <span className="text-[10px] font-mono text-text-soft mt-8 tracking-wider uppercase">Local Voice Synthesis</span>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-card-warm border border-border-warm hover:border-accent-forest/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="p-3 bg-accent-forest/5 rounded-xl text-accent-forest w-12 h-12 flex items-center justify-center mb-6 border border-accent-forest/10 group-hover:bg-accent-forest/10 transition-colors">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-text-charcoal mb-3">Hybrid Formats</h3>
                <p className="text-text-soft text-xs sm:text-sm leading-relaxed font-sans">
                  Navigate through complex subjective architectural briefs, single-correct conceptual questions, and multi-correct scenario challenges that match modern tech interviews.
                </p>
              </div>
              <span className="text-[10px] font-mono text-text-soft mt-8 tracking-wider uppercase">Structured Challenges</span>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-card-warm border border-border-warm hover:border-accent-forest/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="p-3 bg-accent-forest/5 rounded-xl text-accent-forest w-12 h-12 flex items-center justify-center mb-6 border border-accent-forest/10 group-hover:bg-accent-forest/10 transition-colors">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-text-charcoal mb-3">Multi-Dimensional Scoring</h3>
                <p className="text-text-soft text-xs sm:text-sm leading-relaxed font-sans">
                  Get scored immediately on technical accuracy, verbal clarity, completeness, and delivery confidence. Follow precise, customized guidance to address weak spots.
                </p>
              </div>
              <span className="text-[10px] font-mono text-text-soft mt-8 tracking-wider uppercase">Four-Vector Metrics</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why MockEcho? (The Competitive Edge) */}
      <section id="why-mockecho" className="py-24 bg-card-warm border-t border-border-warm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[10px] font-bold text-accent-forest uppercase tracking-wider block font-mono mb-3">A Smarter Approach</span>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-text-charcoal mb-4 font-serif-editorial italic font-medium">
              Why Practice on MockEcho?
            </h2>
            <p className="text-text-soft text-sm leading-relaxed">
              Watching videos and reading solutions isn't enough when you're the one in the hot seat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="p-5 bg-bg-warm/40 border border-border-warm rounded-2xl space-y-2">
                <h4 className="text-sm font-bold text-text-charcoal flex items-center space-x-2">
                  <span className="text-accent-clay font-bold text-xs">✕</span>
                  <span>Typical Study Platforms</span>
                </h4>
                <p className="text-xs text-text-soft leading-relaxed font-sans">
                  Focus entirely on raw coding challenges and memorization. They leave you silent, unprepared for verbal questions or dynamic team design reviews.
                </p>
              </div>

              <div className="p-5 bg-bg-warm/40 border border-border-warm rounded-2xl space-y-2">
                <h4 className="text-sm font-bold text-text-charcoal flex items-center space-x-2">
                  <span className="text-accent-clay font-bold text-xs">✕</span>
                  <span>Video Tutorials & YouTube</span>
                </h4>
                <p className="text-xs text-text-soft leading-relaxed font-sans">
                  Passive listening feels productive but doesn't build muscle memory. When asked a sudden architectural question under pressure, the mind still blanks.
                </p>
              </div>

              <div className="p-5 bg-accent-forest/5 border border-accent-forest/15 rounded-2xl space-y-2">
                <h4 className="text-sm font-bold text-accent-forest flex items-center space-x-2">
                  <Check className="w-4 h-4 text-accent-forest" />
                  <span>The MockEcho Arena</span>
                </h4>
                <p className="text-xs text-text-soft leading-relaxed font-sans">
                  Forces active generation of technical phrasing. You practice real delivery, adjust on transcription feedback, and receive targeted coaching to polish your professional vocabulary.
                </p>
              </div>
            </div>

            {/* Visual representation card */}
            <div className="p-8 bg-bg-warm/60 border border-border-warm rounded-3xl space-y-6 flex flex-col justify-between h-full shadow-inner">
              <div className="space-y-3">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent-forest/10 border border-accent-forest/10 text-accent-forest text-[10px] font-mono uppercase tracking-wider">
                  <span>Simulated Session Metrics</span>
                </div>
                <h3 className="text-lg font-bold text-text-charcoal font-serif-editorial italic">The Evaluation Feedback Loop</h3>
                <p className="text-text-soft text-xs leading-relaxed font-sans">
                  Our system evaluates conversational context, architectural trade-offs, and communication tone, mapping exact professional gaps that standard platforms miss entirely.
                </p>
              </div>

              <div className="pt-4 border-t border-border-warm space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-soft font-mono">Accuracy & Integrity</span>
                  <span className="font-semibold text-accent-forest">94%</span>
                </div>
                <div className="w-full h-1.5 bg-border-warm rounded-full overflow-hidden">
                  <div className="w-[94%] h-full bg-accent-forest rounded-full" />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-soft font-mono">Completeness Matrix</span>
                  <span className="font-semibold text-accent-forest">88%</span>
                </div>
                <div className="w-full h-1.5 bg-border-warm rounded-full overflow-hidden">
                  <div className="w-[88%] h-full bg-accent-forest rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who is it For? Section */}
      <section className="py-24 bg-bg-warm/30 border-t border-border-warm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[10px] font-bold text-accent-forest uppercase tracking-wider block font-mono mb-3">Target Audience</span>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-text-charcoal mb-4 font-serif-editorial italic font-medium">
              Built for Ambitious Engineers
            </h2>
            <p className="text-text-soft text-sm leading-relaxed">
              Whether you are landing your first role or stepping into high-visibility leadership.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {targetAudiences.map((aud, idx) => (
              <div key={idx} className="p-6 bg-card-warm border border-border-warm rounded-2xl space-y-4 shadow-sm hover:border-accent-forest/15 transition-all hover:shadow-md duration-300">
                <div className="p-2.5 bg-accent-forest/5 text-accent-forest rounded-xl w-10 h-10 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-text-charcoal">{aud.role}</h3>
                <p className="text-text-soft text-xs leading-relaxed font-sans">
                  {aud.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works / Technical Workflow */}
      <section id="how-it-works" className="py-24 bg-card-warm border-t border-border-warm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span ref={howItWorksRef} className="text-[10px] font-bold text-accent-forest uppercase tracking-wider block font-mono mb-3">The Blueprint</span>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-text-charcoal mb-4 font-serif-editorial italic font-medium">
              Three Steps to Verbal Readiness
            </h2>
            <p className="text-text-soft text-sm leading-relaxed">
              Build high-quality technical speaking habits with our simple, highly-focused workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-bg-warm/40 border border-border-warm hover:border-accent-forest/20 transition-all duration-300 flex flex-col space-y-5">
              <div className="w-8 h-8 rounded-lg bg-accent-forest/5 border border-accent-forest/10 flex items-center justify-center text-accent-forest text-xs font-bold font-mono">
                01
              </div>
              <h3 className="text-base font-bold text-text-charcoal">Tailor Your Target Role</h3>
              <p className="text-text-soft text-xs leading-relaxed font-sans">
                Select your track (Frontend, Backend, etc.) and difficulty setting. We generate specific subjective prompts modeled around questions asked by leading engineering panels.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-bg-warm/40 border border-border-warm hover:border-accent-forest/20 transition-all duration-300 flex flex-col space-y-5">
              <div className="w-8 h-8 rounded-lg bg-accent-forest/5 border border-accent-forest/10 flex items-center justify-center text-accent-forest text-xs font-bold font-mono">
                02
              </div>
              <h3 className="text-base font-bold text-text-charcoal">Explain It Out Loud</h3>
              <p className="text-text-soft text-xs leading-relaxed font-sans">
                Experience natural panel pacing. Answer verbally using the microphone to capture your precise phrasing, or switch to typing if you are practicing on the move.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-bg-warm/40 border border-border-warm hover:border-accent-forest/20 transition-all duration-300 flex flex-col space-y-5">
              <div className="w-8 h-8 rounded-lg bg-accent-forest/5 border border-accent-forest/10 flex items-center justify-center text-accent-forest text-xs font-bold font-mono">
                03
              </div>
              <h3 className="text-base font-bold text-text-charcoal">Refine with Expert Analysis</h3>
              <p className="text-text-soft text-xs leading-relaxed font-sans">
                Analyze ratings across communication, accuracy, completeness, and confidence. Read precise recommendations to fix vocabulary or structural logic before your real panel meets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-24 bg-bg-warm/40 border-t border-border-warm relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold text-accent-forest uppercase tracking-wider block font-mono mb-3">FAQ</span>
            <h2 className="text-3xl tracking-tight text-text-charcoal font-serif-editorial italic font-medium">
              Common Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-card-warm border border-border-warm rounded-2xl overflow-hidden shadow-xs hover:border-accent-forest/15 hover:shadow-sm transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer select-none focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center space-x-3 text-text-charcoal">
                      <HelpCircle className="w-4 h-4 text-accent-forest shrink-0" />
                      <span className="text-sm font-bold leading-tight">{faq.q}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-text-soft transition-transform duration-300 shrink-0 ${
                        isOpen ? 'rotate-180 text-accent-forest' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 border-t border-border-warm/30">
                          <p className="text-xs sm:text-sm text-text-soft leading-relaxed pl-7 font-sans">
                            {faq.a}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-24 bg-card-warm border-t border-border-warm relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl tracking-tight text-text-charcoal font-serif-editorial italic font-medium max-w-2xl mx-auto leading-snug">
            Are you ready to speak clearly under pressure?
          </h2>
          <p className="text-text-soft text-sm max-w-md mx-auto font-sans leading-relaxed">
            Start sharpening your verbal technical communication today. Experience a free mock panel with instant analytics.
          </p>

          <div className="pt-2">
            {demoMode ? (
              <button
                onClick={launchDemoMode}
                className="mx-auto px-8 py-4 bg-accent-clay hover:bg-accent-clay/90 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center space-x-2.5 group cursor-pointer border border-accent-clay/10"
                id="hero-demo-btn-bottom"
              >
                <Play className="w-4 h-4 fill-white animate-pulse" />
                <span>Launch Interactive Demo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            ) : (
              <button
                onClick={onGetStarted}
                className="mx-auto px-8 py-4 bg-accent-forest hover:bg-accent-forest/90 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center space-x-2 group cursor-pointer border border-accent-forest/10"
                id="hero-start-btn-bottom"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-warm bg-card-warm py-12 text-center text-[11px] text-text-soft font-mono tracking-wider uppercase">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center space-y-4">
          <MockEchoLogoWithWordmark size={22} animate={false} wordmarkSizeClass="text-sm" />
          <div className="space-y-1">
            <div className="text-[10px] text-text-soft/80">The Technical Mock Panel Simulator</div>
            <div>© 2026 MockEcho. All rights reserved.</div>
          </div>
        </div>
      </footer>

      {/* Premium Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            onClick={handleScrollToTop}
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.85, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.85, y: reducedMotion ? 0 : 8 }}
            transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 p-3 bg-card-warm text-text-charcoal border border-border-warm rounded-full shadow-md hover:shadow-lg hover:bg-bg-warm hover:-translate-y-0.5 transition-all duration-300 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-forest/30 focus:ring-offset-2 flex items-center justify-center group"
            aria-label="Back to top"
            title="Back to top"
          >
            <ArrowUp className="w-5 h-5 text-text-charcoal group-hover:text-accent-forest transition-colors duration-300" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

