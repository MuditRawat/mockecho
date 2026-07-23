/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Mic, MicOff, Check, ArrowRight, Loader2, Volume2, VolumeX, AlertTriangle, RefreshCw } from 'lucide-react';
import { InterviewQuestion, MCQOption, InterviewSession } from '../types';
import { EvaluationLoading } from './EvaluationLoading';
import { getSelectedVoice, filterEnglishVoices, ensureVoicesLoaded, getVoicesSync } from '../utils/voiceUtils';

interface InterviewSessionProps {
  onSessionFinished: (completedSession?: InterviewSession) => void;
  onCancel: () => void;
}

export const InterviewSessionComponent: React.FC<InterviewSessionProps> = ({
  onSessionFinished,
  onCancel,
}) => {
  const { activeSession, profile, updateProfile, submitAnswer, finishSession, evaluating } = useApp();

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(activeSession?.totalDurationSeconds || 0);
  const [transcriptionEdited, setTranscriptionEdited] = useState<boolean>(false);

  // Speech & Voice States
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voicesReady, setVoicesReady] = useState<boolean>(false);

  // Microphone / STT states
  const [micGranted, setMicGranted] = useState<boolean>(false);
  const [micRequesting, setMicRequesting] = useState<boolean>(false);
  const [microphoneError, setMicrophoneError] = useState<boolean>(false);

  const [isAISpeaking, setIsAISpeaking] = useState<boolean>(false);
  const isAISpeakingRef = useRef<boolean>(false);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSTTSupported, setIsSTTSupported] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionMessage, setTransitionMessage] = useState<string>('');
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [completedSessionData, setCompletedSessionData] = useState<InterviewSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Timers & Speech Refs
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const lastSpokenTextRef = useRef<string | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const prevQuestionKeyRef = useRef<string | null>(null);

  const cancelSpeech = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (activeUtteranceRef.current) {
      activeUtteranceRef.current.onend = null;
      activeUtteranceRef.current.onerror = null;
      activeUtteranceRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    }
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
  };

  // Load browser speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setVoicesReady(true);
      return;
    }

    let isMounted = true;

    const loadVoices = (voicesList?: SpeechSynthesisVoice[]) => {
      if (!isMounted) return;
      const voices = voicesList || getVoicesSync();
      setAvailableVoices(voices);
      const englishVoices = filterEnglishVoices(voices);
      const voiceToUse = getSelectedVoice(englishVoices, profile?.preferredVoice);
      setSelectedVoice(voiceToUse);
      if (voices.length > 0) {
        setVoicesReady(true);
      }
    };

    // Load synchronously first if cached
    loadVoices();

    ensureVoicesLoaded().then((v) => {
      if (!isMounted) return;
      loadVoices(v);
      setVoicesReady(true);
    });

    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', () => loadVoices());
    } else {
      window.speechSynthesis.onvoiceschanged = () => loadVoices();
    }

    return () => {
      isMounted = false;
    };
  }, [profile?.preferredVoice]);

  // Handle microphone permissions ONLY for Voice Interview mode
  useEffect(() => {
    if (!activeSession || activeSession.mode !== 'voice') return;

    let active = true;

    const initMicrophonePermission = async () => {
      // First check permission status silently
      if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as any });
          if (!active) return;

          if (status.state === 'granted') {
            setMicGranted(true);
            setMicrophoneError(false);
            return;
          }
        } catch (e) {
          // Fall back to getUserMedia request
        }
      }

      // If not granted yet, prompt for access when starting the Voice Interview
      if (!active) return;
      setMicRequesting(true);
      setMicrophoneError(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close temporary stream track immediately after permission check
        stream.getTracks().forEach(track => track.stop());
        if (active) {
          setMicGranted(true);
          setMicrophoneError(false);
        }
      } catch (err) {
        console.error('Microphone permission error:', err);
        if (active) {
          setMicrophoneError(true);
          setMicGranted(false);
        }
      } finally {
        if (active) {
          setMicRequesting(false);
        }
      }
    };

    initMicrophonePermission();

    return () => {
      active = false;
    };
  }, [activeSession?.mode]);

  const requestMicrophoneExplicit = async () => {
    if (!activeSession || activeSession.mode !== 'voice') return;
    setMicRequesting(true);
    setMicrophoneError(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicGranted(true);
      setMicrophoneError(false);
    } catch (err) {
      console.error('Microphone permission error:', err);
      setMicrophoneError(true);
      setMicGranted(false);
    } finally {
      setMicRequesting(false);
    }
  };

  // Robust TTS implementation
  const speakText = (text: string, force: boolean = false, onEnd?: () => void, ignoreMute: boolean = false) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsAISpeaking(false);
      isAISpeakingRef.current = false;
      if (onEnd) onEnd();
      return;
    }

    if (activeSession?.mode !== 'voice' || (isMuted && !ignoreMute)) {
      setIsAISpeaking(false);
      isAISpeakingRef.current = false;
      if (onEnd) onEnd();
      return;
    }

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    if (activeUtteranceRef.current) {
      activeUtteranceRef.current.onend = null;
      activeUtteranceRef.current.onerror = null;
      activeUtteranceRef.current = null;
    }

    if (!force && lastSpokenTextRef.current === text && isAISpeakingRef.current) {
      if (onEnd) onEnd();
      return;
    }
    lastSpokenTextRef.current = text;

    setIsAISpeaking(true);
    isAISpeakingRef.current = true;

    const freshVoices = getVoicesSync();
    const voices = freshVoices.length > 0 ? freshVoices : availableVoices;
    const englishVoices = filterEnglishVoices(voices);
    const voiceToUse = getSelectedVoice(englishVoices, profile?.preferredVoice) || selectedVoice;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    if (voiceToUse) {
      utterance.voice = voiceToUse;
      setSelectedVoice(voiceToUse);
    }

    activeUtteranceRef.current = utterance;

    utterance.onend = () => {
      if (activeUtteranceRef.current === utterance) {
        activeUtteranceRef.current = null;
      }
      setIsAISpeaking(false);
      isAISpeakingRef.current = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted') {
        return;
      }
      console.warn('Speech synthesis utterance error:', e);
      if (activeUtteranceRef.current === utterance) {
        activeUtteranceRef.current = null;
      }
      setIsAISpeaking(false);
      isAISpeakingRef.current = false;
      if (onEnd) onEnd();
    };

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
  };

  const question: InterviewQuestion | undefined = activeSession?.questions[currentIdx];

  // Initialize browser Speech Recognition (STT) (Strictly conditional on Voice Mode)
  useEffect(() => {
    if (activeSession?.mode !== 'voice') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSTTSupported(false);
    } else {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setUserAnswer(prev => {
            const separator = prev ? ' ' : '';
            return prev + separator + finalTranscript.trim();
          });
        }
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
        recognitionRef.current = null;
      }
    };
  }, [activeSession?.mode]);

  // Handle global unmount & window unload cleanup
  useEffect(() => {
    const stopAllResources = () => {
      cancelSpeech();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
        recognitionRef.current = null;
      }
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };

    const handleWindowUnload = () => {
      stopAllResources();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };

    window.addEventListener('beforeunload', handleWindowUnload);
    window.addEventListener('pagehide', handleWindowUnload);
    window.addEventListener('unload', handleWindowUnload);

    return () => {
      stopAllResources();
      window.removeEventListener('beforeunload', handleWindowUnload);
      window.removeEventListener('pagehide', handleWindowUnload);
      window.removeEventListener('unload', handleWindowUnload);
    };
  }, []);

  // Reset scroll position instantly ONLY when moving to a new question key so every question starts from the top
  useLayoutEffect(() => {
    if (!activeSession || !question) return;
    
    const currentKey = `${activeSession.id}_${currentIdx}_${question.id}`;
    if (prevQuestionKeyRef.current !== currentKey) {
      prevQuestionKeyRef.current = currentKey;

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
      if (typeof document !== 'undefined') {
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;

        const mainElement = document.querySelector('main');
        if (mainElement) {
          mainElement.scrollTop = 0;
        }
        const sessionContainer = document.getElementById('interview-session-container');
        if (sessionContainer) {
          sessionContainer.scrollTop = 0;
          if (sessionContainer.parentElement) {
            sessionContainer.parentElement.scrollTop = 0;
          }
        }
      }
    }
  }, [activeSession?.id, currentIdx, question?.id]);

  // Reset inputs and handle question timer when question index changes
  useEffect(() => {
    if (!activeSession || !question) return;

    // Reset question inputs
    setUserAnswer('');
    setSelectedOptionIds([]);
    setTimeTaken(0);
    setTranscriptionEdited(false);

    // Stop ongoing recognition if any
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
    }

    // Track local time taken for this question
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    questionTimerRef.current = setInterval(() => {
      setTimeTaken(prev => prev + 1);
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentIdx, question?.id]);

  // Automatically speak the question when loaded, then start candidate recording automatically after speech completes
  useEffect(() => {
    if (!activeSession || !question) return;
    if (activeSession.mode !== 'voice') return;
    if (!voicesReady) return;

    // Speak the question
    speakText(question.questionText, true, () => {
      // After AI finishes speaking, automatically start candidate recording for subjective questions!
      if (activeSession.mode === 'voice' && question.type === 'subjective' && isSTTSupported && recognitionRef.current) {
        if (!isMuted && !isAISpeakingRef.current) {
          try {
            recognitionRef.current.start();
            setIsRecording(true);
          } catch (err) {
            console.error('Failed to auto-start speech recognition after question speech:', err);
          }
        }
      }
    });
  }, [currentIdx, question?.id, voicesReady, activeSession?.mode]);

  // Overall session timer
  useEffect(() => {
    if (activeSession?.timeMode === 'timed' && sessionTimeLeft > 0) {
      sessionTimerRef.current = setInterval(() => {
        setSessionTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(sessionTimerRef.current!);
            handleSessionExpiry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [activeSession]);

  const handleSessionExpiry = async () => {
    cancelSpeech();
    const completedSession = await finishSession();
    onSessionFinished(completedSession);
  };

  // Toggle Speech Recognition recording manually
  const toggleRecording = () => {
    if (!isSTTSupported || !recognitionRef.current || isAISpeakingRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Toggle speaker mute state
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (question) {
        if (isRecording && recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
          setIsRecording(false);
        }
        speakText(question.questionText, true, () => {
          if (activeSession?.mode === 'voice' && question.type === 'subjective' && isSTTSupported && recognitionRef.current) {
            if (!isMuted && !isAISpeakingRef.current) {
              try {
                recognitionRef.current.start();
                setIsRecording(true);
              } catch (err) {
                console.error('Failed to start speech recognition after unmute speech:', err);
              }
            }
          }
        });
      }
    } else {
      setIsMuted(true);
      cancelSpeech();
    }
  };

  // MCQ selections
  const handleOptionToggle = (optionId: string) => {
    if (!question) return;
    if (question.type === 'mcq_single') {
      setSelectedOptionIds([optionId]);
    } else {
      setSelectedOptionIds(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  // Submit response & handle question transitions
  const handleSubmitResponse = async () => {
    if (!activeSession || !question || isSubmitting || evaluating) return;

    setIsSubmitting(true);
    cancelSpeech();

    const startTime = Date.now();

    let answerText = userAnswer.trim();
    if (question.type === 'mcq_single' || question.type === 'mcq_multi') {
      const selectedOptions = question.options.filter(o => selectedOptionIds.includes(o.id));
      answerText = selectedOptions.map(o => o.text).join(', ');
    }

    try {
      const updatedSession = await submitAnswer(
        question.id,
        answerText,
        selectedOptionIds.length > 0 ? selectedOptionIds : undefined,
        timeTaken,
        transcriptionEdited
      );

      const isMCQ = question.type === 'mcq_single' || question.type === 'mcq_multi';
      if (isMCQ) {
        const elapsed = Date.now() - startTime;
        // Ultra-responsive, brief smoothing window (~400ms - 650ms) to prevent visual flashing while maintaining maximum responsiveness
        const targetDuration = 400 + Math.floor(Math.random() * 250);
        if (elapsed < targetDuration) {
          await new Promise(resolve => setTimeout(resolve, targetDuration - elapsed));
        }
      }

      if (currentIdx < activeSession.questionCount - 1) {
        cancelSpeech();
        setCurrentIdx(prev => prev + 1);
      } else {
        setIsFinishing(true);
        finishSession(updatedSession)
          .then((completedSession) => {
            setCompletedSessionData(completedSession || null);
          })
          .catch((err) => {
            console.error(err);
            setIsFinishing(false);
          });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  if (isFinishing) {
    return (
      <EvaluationLoading
        isReady={!!completedSessionData}
        onComplete={() => {
          cancelSpeech();
          setIsFinishing(false);
          onSessionFinished(completedSessionData || undefined);
        }}
      />
    );
  }

  if (!activeSession || !question) {
    return (
      <div className="text-center py-20 bg-card-warm border border-border-warm rounded-2xl shadow-sm">
        <p className="text-text-soft">Loading interview details...</p>
      </div>
    );
  }

  // Visual question transition panel
  if (isTransitioning) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-card-warm rounded-2xl border border-border-warm shadow-sm animate-pulse">
        <div className="w-16 h-16 bg-accent-forest/10 border border-accent-forest/20 rounded-full flex items-center justify-center text-accent-forest mb-6">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-text-charcoal font-serif-editorial italic tracking-tight">{transitionMessage}</h2>
        <p className="text-xs text-text-soft mt-2">Updating interview panel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12" id="interview-session-container">
      {/* Top Session Progress Bar */}
      <div className="flex items-center justify-between bg-card-warm px-5 py-4 rounded-2xl border border-border-warm shadow-sm flex-wrap gap-4">
        <div className="flex flex-col space-y-1.5 flex-1 min-w-[200px] max-w-[280px]">
          <div className="flex items-center space-x-2 font-mono text-[10px] uppercase tracking-wider text-text-soft">
            <span>
              Question {currentIdx + 1} of {activeSession.questionCount}
            </span>
            <span className="text-border-warm font-mono text-[10px]">•</span>
            <span className="text-xs text-text-charcoal font-semibold font-display truncate max-w-[120px]">{activeSession.subject}</span>
          </div>
          <div className="w-full h-1.5 bg-border-warm rounded-full overflow-hidden relative">
            <div
              className="h-full bg-accent-forest rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentIdx + 1) / activeSession.questionCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Timed countdown or counter */}
        <div className="flex items-center space-x-4">
          {activeSession.timeMode === 'timed' && (
            <div className={`flex items-center space-x-2 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all duration-300 ${
              sessionTimeLeft < 60
                ? 'text-accent-clay bg-accent-clay/10 border-accent-clay/35 animate-pulse'
                : 'text-text-soft bg-bg-warm/80 border-border-warm'
            }`}>
              <span>Remaining Time: {formatTime(sessionTimeLeft)}</span>
            </div>
          )}
          {activeSession.mode === 'voice' && (
            <button
              onClick={toggleMute}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-text-soft hover:text-text-charcoal hover:bg-bg-warm border border-border-warm rounded-lg transition-all cursor-pointer"
              title={isMuted ? 'Unmute Interviewer Voice' : 'Mute Interviewer Voice'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-text-soft/60" />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-text-soft/60 font-bold">Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-accent-forest" />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-accent-forest font-bold">Voice On</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider font-bold text-text-soft hover:text-accent-clay border border-border-warm hover:border-accent-clay/20 bg-card-warm rounded-lg transition-all cursor-pointer hover:shadow-xs active:scale-95"
          >
            Quit
          </button>
        </div>
      </div>

      {/* Compact Interview Configuration Info Bar */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="px-2.5 py-1 bg-card-warm border border-border-warm rounded-xl text-[11px] font-sans text-text-charcoal shadow-2xs flex items-center space-x-1.5">
          <span className="text-text-soft text-[10px] uppercase font-mono font-bold">Role:</span>
          <span className="font-semibold">{activeSession.role}</span>
        </span>
        <span className="px-2.5 py-1 bg-card-warm border border-border-warm rounded-xl text-[11px] font-sans text-text-charcoal shadow-2xs flex items-center space-x-1.5">
          <span className="text-text-soft text-[10px] uppercase font-mono font-bold">Subject:</span>
          <span className="font-semibold">{activeSession.subject}</span>
        </span>
        <span className="px-2.5 py-1 bg-card-warm border border-border-warm rounded-xl text-[11px] font-sans text-text-charcoal shadow-2xs flex items-center space-x-1.5">
          <span className="text-text-soft text-[10px] uppercase font-mono font-bold">Difficulty:</span>
          <span className="font-semibold">
            {activeSession.difficulty === 'mixed'
              ? 'Mixed'
              : activeSession.difficulty.charAt(0).toUpperCase() + activeSession.difficulty.slice(1)}
          </span>
        </span>
        <span className="px-2.5 py-1 bg-card-warm border border-border-warm rounded-xl text-[11px] font-sans text-text-charcoal shadow-2xs flex items-center space-x-1.5">
          <span className="text-text-soft text-[10px] uppercase font-mono font-bold">Format:</span>
          <span className="font-semibold">
            {activeSession.format === 'subjective'
              ? 'Subjective Only'
              : activeSession.format === 'mcq'
              ? 'MCQs Only'
              : activeSession.format === 'application'
              ? 'Application-Based'
              : 'Mixed Interview'}
          </span>
        </span>
        <span className="px-2.5 py-1 bg-card-warm border border-border-warm rounded-xl text-[11px] font-sans text-text-charcoal shadow-2xs flex items-center space-x-1.5">
          <span className="text-text-soft text-[10px] uppercase font-mono font-bold">Mode:</span>
          <span className="font-semibold">
            {activeSession.mode === 'voice' ? 'Voice Interview' : 'Text Interview'}
          </span>
        </span>
      </div>

      {/* Main Question Display Box */}
      <div className="bg-card-warm border border-border-warm rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className={`h-2 w-2 rounded-full ${isAISpeaking ? 'bg-accent-forest animate-pulse' : 'bg-text-soft/40'}`} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-accent-forest font-bold">
              AI Interviewer
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-text-charcoal tracking-tight leading-relaxed font-serif-editorial italic">
            {question.questionText}
          </h2>
          {activeSession.mode === 'voice' && (
            <button
              onClick={() => {
                const wasMuted = isMuted;
                if (wasMuted) {
                  setIsMuted(false);
                }
                if (isRecording && recognitionRef.current) {
                  try {
                    recognitionRef.current.stop();
                  } catch (e) {}
                  setIsRecording(false);
                }
                speakText(question.questionText, true, () => {
                  if (activeSession.mode === 'voice' && question.type === 'subjective' && isSTTSupported && recognitionRef.current) {
                    if (!isMuted && !isAISpeakingRef.current) {
                      try {
                        recognitionRef.current.start();
                        setIsRecording(true);
                      } catch (err) {
                        console.error('Failed to start speech recognition after replay:', err);
                      }
                    }
                  }
                }, wasMuted);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-bg-warm border border-border-warm rounded-lg text-[10px] font-bold uppercase tracking-wider text-text-charcoal hover:text-accent-forest hover:border-accent-forest/40 transition-all cursor-pointer shadow-3xs"
            >
              <Volume2 className="w-3.5 h-3.5 text-accent-forest" />
              <span>Replay Question</span>
            </button>
          )}
        </div>

        {/* Answer section */}
        {question.type === 'subjective' ? (
          <div className="space-y-4">
            {activeSession.mode === 'voice' && (
              <div className="space-y-3">
                {/* Microphone error banner if permission denied */}
                {microphoneError && (
                  <div className="p-4 bg-accent-clay/10 border border-accent-clay/30 rounded-xl space-y-2">
                    <p className="text-xs text-accent-clay font-medium leading-relaxed font-sans">
                      ⚠️ Microphone access is required for Voice Interview mode. Please check your browser or address bar settings to allow microphone permission.
                    </p>
                    <button
                      onClick={requestMicrophoneExplicit}
                      className="px-3.5 py-1.5 bg-accent-forest text-white text-[10px] uppercase font-mono font-bold rounded-lg hover:bg-accent-forest/90 transition cursor-pointer"
                    >
                      Retry Microphone Access
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-bg-warm/50 rounded-xl border border-border-warm">
                  <div className="flex items-center space-x-2 text-[11px]">
                    {micRequesting ? (
                      <span className="flex items-center text-text-soft font-mono text-[10px] uppercase tracking-wider space-x-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-forest" />
                        <span>Checking microphone access...</span>
                      </span>
                    ) : isAISpeaking ? (
                      <span className="flex items-center text-accent-forest font-mono text-[10px] uppercase tracking-wider space-x-2">
                        <span className="w-2 h-2 rounded-full bg-accent-forest animate-pulse" />
                        <span>AI Speaking...</span>
                        <span className="flex items-end space-x-0.5 ml-1 h-3">
                          <span className="soundwave-bar animate-soundwave-1 bg-accent-forest w-0.5 rounded-full min-h-1" />
                          <span className="soundwave-bar animate-soundwave-2 bg-accent-forest w-0.5 rounded-full min-h-1" />
                          <span className="soundwave-bar animate-soundwave-3 bg-accent-forest w-0.5 rounded-full min-h-1" />
                        </span>
                      </span>
                    ) : isSTTSupported ? (
                      <span className="flex items-center text-text-soft font-mono text-[10px] uppercase tracking-wider">
                        <span className={`w-2 h-2 rounded-full mr-2.5 ${isRecording ? 'bg-accent-clay animate-pulse shadow-xs' : 'bg-emerald-500'}`} />
                        {isRecording ? 'Listening to your response...' : 'Microphone Ready'}
                        {isRecording && (
                          <span className="flex items-end space-x-0.5 ml-3 h-4">
                            <span className="soundwave-bar animate-soundwave-1" />
                            <span className="soundwave-bar animate-soundwave-2" />
                            <span className="soundwave-bar animate-soundwave-3" />
                            <span className="soundwave-bar animate-soundwave-4" />
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-accent-clay flex items-center font-sans">
                        <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                        Speech recognition not supported in this browser. You can type your answer below.
                      </span>
                    )}
                  </div>

                  {isSTTSupported && !microphoneError && (
                    <button
                      onClick={toggleRecording}
                      disabled={evaluating || isAISpeaking}
                      className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider font-bold border transition-all duration-200 flex items-center space-x-2 cursor-pointer ${
                        isRecording
                          ? 'bg-accent-clay/10 border-accent-clay/30 text-accent-clay shadow-xs'
                          : isAISpeaking
                            ? 'bg-text-soft/10 border-border-warm text-text-soft/60 cursor-not-allowed'
                            : 'bg-accent-forest hover:bg-accent-forest/90 border-accent-forest text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>
                        {isRecording 
                          ? 'Stop Recording' 
                          : isAISpeaking 
                            ? 'AI Speaking...' 
                            : 'Start Recording'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Editable transcription text area */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">
                Your Answer Explanation
              </label>
              <textarea
                value={userAnswer}
                disabled={evaluating}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  setTranscriptionEdited(true);
                }}
                className="w-full h-40 p-4.5 bg-bg-warm/50 border border-border-warm rounded-xl text-text-charcoal placeholder-text-soft/40 focus:outline-none focus:ring-1 focus:ring-accent-forest text-sm leading-relaxed transition-all font-sans disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={
                  activeSession.mode === 'voice' && isSTTSupported
                    ? 'Articulate your solution verbally into the microphone, or type your answer directly here...'
                    : 'Type your comprehensive response to the question...'
                }
              />
              <div className="flex items-center justify-between text-[10px] text-text-soft font-mono mt-1.5 uppercase tracking-wider">
                <span>Characters: {userAnswer.length}</span>
                {transcriptionEdited && (
                  <span className="text-accent-forest font-bold">Modified transcription</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          // MCQ Selection Area
          <div className="space-y-4">
            <span className="block text-[10px] font-bold text-text-soft uppercase tracking-wider font-mono">
              Select {question.type === 'mcq_multi' ? 'all correct choices' : 'the single correct option'}
            </span>
            <div className="space-y-3">
              {question.options.map((option: MCQOption) => {
                const isSelected = selectedOptionIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionToggle(option.id)}
                    disabled={evaluating}
                    className={`w-full p-4.5 rounded-xl border text-left flex items-start space-x-3.5 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-accent-forest/10 border-accent-forest text-accent-forest font-semibold shadow-xs'
                        : 'bg-card-warm border border-border-warm text-text-charcoal hover:bg-bg-warm hover:border-border-warm/85'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-1 border flex items-center justify-center text-xs shrink-0 transition-all ${
                        isSelected
                          ? 'border-accent-forest bg-accent-forest text-white'
                          : 'border-border-warm bg-bg-warm/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                    </div>
                    <span className="text-xs leading-relaxed font-sans">{option.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit & Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border-warm">
          <div className="text-[10px] font-mono text-text-soft uppercase tracking-wider">
            Time taken: {formatTime(timeTaken)}
          </div>

           <button
            onClick={handleSubmitResponse}
            disabled={
              evaluating ||
              isSubmitting ||
              (question.type === 'subjective' && userAnswer.trim().length === 0) ||
              ((question.type === 'mcq_single' || question.type === 'mcq_multi') && selectedOptionIds.length === 0)
            }
            className="px-6 py-3 bg-accent-forest hover:bg-accent-forest/90 disabled:bg-accent-forest/40 disabled:text-text-soft text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center space-x-2 transition cursor-pointer active:scale-95 border border-accent-forest/10 shadow-xs"
          >
            {(evaluating || isSubmitting) ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>{currentIdx === activeSession.questionCount - 1 ? "Submitting..." : "AI scoring..."}</span>
              </>
            ) : (
              <>
                <span>{currentIdx === activeSession.questionCount - 1 ? "Submit Interview" : "Submit response"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
