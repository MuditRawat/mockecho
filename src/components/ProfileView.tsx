/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, Target, Save, Loader2, ArrowLeft, RefreshCw, CheckCircle2, Sun, Moon, Laptop, Play, ChevronDown, RotateCcw, X } from 'lucide-react';
import { getDefaultVoice, getSelectedVoice, filterEnglishVoices, ensureVoicesLoaded, getVoicesSync } from '../utils/voiceUtils';

interface ProfileViewProps {
  onBackToDashboard: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onBackToDashboard }) => {
  const { profile, updateProfile, theme, setTheme } = useApp();
  const [name, setName] = useState<string>(profile?.name || '');
  const [targetRole, setTargetRole] = useState<string>(profile?.targetRole || '');
  const [preferredMode, setPreferredMode] = useState<'voice' | 'text'>(profile?.preferredMode || 'voice');
  const [preferredTheme, setPreferredTheme] = useState<'light' | 'dark' | 'system'>(profile?.preferredTheme || theme);
  const [preferredVoice, setPreferredVoice] = useState<string>(profile?.preferredVoice || 'default');

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);

  useEffect(() => {
    setPreferredTheme(profile?.preferredTheme || theme);
    if (profile?.preferredVoice) {
      setPreferredVoice(profile.preferredVoice);
    }
  }, [profile?.preferredTheme, profile?.preferredVoice, theme]);

  // Load browser speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    let isMounted = true;
    const loadVoices = (vList?: SpeechSynthesisVoice[]) => {
      if (!isMounted) return;
      const voices = vList || window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    ensureVoicesLoaded().then(v => {
      if (!isMounted) return;
      loadVoices(v);
    });

    window.speechSynthesis.onvoiceschanged = () => loadVoices();

    return () => {
      isMounted = false;
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const handlePreviewVoice = (voiceNameOverride?: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    setIsPreviewing(true);

    const freshVoices = getVoicesSync();
    const voicesToUse = freshVoices.length > 0 ? freshVoices : availableVoices;
    const englishVoices = filterEnglishVoices(voicesToUse);

    const voiceName = typeof voiceNameOverride === 'string' ? voiceNameOverride : preferredVoice;
    const voiceToUse = getSelectedVoice(englishVoices, voiceName);
    const sampleText = "Hello, I will be your AI interviewer today. Let's begin your interview.";

    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.rate = 0.95;
    if (voiceToUse) {
      utterance.voice = voiceToUse;
    }

    utterance.onend = () => {
      setIsPreviewing(false);
    };

    utterance.onerror = () => {
      setIsPreviewing(false);
    };

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceChange = (newVoiceName: string) => {
    setPreferredVoice(newVoiceName);
    handlePreviewVoice(newVoiceName);
  };

  const handleConfirmReset = async () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPreviewing(false);
    setShowResetModal(false);

    const defaultRole = 'Frontend Engineer';
    const defaultMode = 'voice';
    const defaultTheme = 'system';
    const defaultVoice = 'default';

    setTargetRole(defaultRole);
    setPreferredMode(defaultMode);
    setPreferredTheme(defaultTheme);
    setPreferredVoice(defaultVoice);
    setTheme(defaultTheme);

    try {
      await updateProfile({
        targetRole: defaultRole,
        preferredMode: defaultMode,
        preferredTheme: defaultTheme,
        preferredVoice: defaultVoice,
      });
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to reset preferences:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      setTheme(preferredTheme);
      await updateProfile({
        name,
        targetRole,
        preferredMode,
        preferredTheme,
        preferredVoice,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-12" id="profile-container">
      {/* Back Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBackToDashboard}
          className="p-2.5 bg-card-warm border border-border-warm rounded-xl hover:bg-bg-warm text-text-soft hover:text-text-charcoal transition-all duration-300 cursor-pointer shadow-xs active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-text-charcoal tracking-tight font-serif-editorial italic">Account Preferences</h1>
          <p className="text-xs text-text-soft mt-1">Manage your target role, interview mode, and voice settings.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-card-warm border border-border-warm rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs leading-relaxed flex items-center space-x-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Preferences updated successfully!</span>
          </div>
        )}

        {resetSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs leading-relaxed flex items-center space-x-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Preferences restored to default settings.</span>
          </div>
        )}

        {/* Name and email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono">
              Full Name
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-soft/60">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 bg-bg-warm/50 border border-border-warm rounded-xl text-text-charcoal placeholder-text-soft/30 focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest text-xs transition-all duration-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={profile?.email || ''}
              className="block w-full px-4 py-3 bg-bg-warm/50 border border-border-warm text-text-soft/60 rounded-xl text-xs cursor-not-allowed"
            />
          </div>
        </div>

        {/* Target role */}
        <div className="space-y-2">
          <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono">
            Target Job Role
          </label>
          <div className="relative rounded-xl shadow-xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-soft/60">
              <Target className="h-4 w-4" />
            </div>
            <input
              type="text"
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="block w-full pl-10 pr-4 py-3 bg-bg-warm/50 border border-border-warm rounded-xl text-text-charcoal placeholder-text-soft/30 focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest text-xs transition-all duration-300"
              placeholder="e.g. Frontend Engineer, Fullstack Architect"
            />
          </div>
          <span className="text-[10px] text-text-soft block mt-1 font-mono">
            Your target role is used to tailor question context and interview scenarios to your career path.
          </span>
        </div>

        {/* Voice Preference */}
        {(() => {
          const englishVoices = filterEnglishVoices(availableVoices);
          const isVoiceAvailableInCurrentBrowser = preferredVoice === 'default' || englishVoices.some(v => v.name === preferredVoice);
          const effectiveDropdownValue = isVoiceAvailableInCurrentBrowser ? preferredVoice : 'default';
          const activeVoice = getSelectedVoice(englishVoices, preferredVoice);

          return (
            <div className="space-y-3 pt-5 border-t border-border-warm">
              <div className="flex items-center justify-between">
                <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono">
                  AI Interviewer Voice Preference
                </label>
                {englishVoices.length === 0 && (
                  <span className="text-[10px] text-text-soft font-mono animate-pulse">
                    Detecting browser voices...
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <select
                    value={effectiveDropdownValue}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="block w-full pl-4 pr-10 py-3 bg-bg-warm/80 border border-border-warm rounded-xl text-text-charcoal focus:outline-none focus:ring-2 focus:ring-accent-forest/25 focus:border-accent-forest text-xs font-sans cursor-pointer appearance-none shadow-2xs transition-all duration-200"
                  >
                    <option value="default" className="bg-card-warm text-text-charcoal font-medium py-1">
                      Default AI Voice ({getDefaultVoice(englishVoices)?.name || 'Auto-Detected'})
                    </option>
                    {englishVoices.map((v) => (
                      <option
                        key={`${v.name}-${v.lang}`}
                        value={v.name}
                        className="bg-card-warm text-text-charcoal font-sans font-normal py-1"
                      >
                        {v.name} {v.lang ? `(${v.lang})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-text-soft/70">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePreviewVoice()}
                  disabled={isPreviewing}
                  className="px-4 py-3 bg-bg-warm border border-border-warm hover:bg-border-warm/40 text-text-charcoal text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-95 shrink-0 disabled:opacity-50"
                >
                  {isPreviewing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-forest" />
                      <span>Previewing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-accent-forest fill-accent-forest" />
                      <span>Preview Voice</span>
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-1">
                {!isVoiceAvailableInCurrentBrowser && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-sans font-medium">
                    Note: Saved voice "{preferredVoice}" is unavailable in this browser. Automatically using active browser fallback: <strong>{activeVoice?.name || 'Default'}</strong>.
                  </span>
                )}
                <span className="text-[10px] text-text-soft block font-mono">
                  Selected voice will be used for all AI spoken questions during Voice Interviews.
                </span>
              </div>
            </div>
          );
        })()}

        {/* Default mode preferences */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 border-t border-border-warm">
          <div className="space-y-2">
            <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono">
              Default Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['voice', 'text'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreferredMode(mode)}
                  className={`py-2.5 px-3 border rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all duration-300 cursor-pointer active:scale-95 ${
                    preferredMode === mode
                      ? 'bg-accent-forest/10 border-accent-forest text-accent-forest font-bold shadow-xs'
                      : 'bg-card-warm border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
                  }`}
                >
                  {mode} Mode
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[9px] font-bold text-text-soft uppercase tracking-wider font-mono">
              Interface Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'system', label: 'System', icon: Laptop },
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const newT = item.id as 'light' | 'dark' | 'system';
                    setPreferredTheme(newT);
                    setTheme(newT);
                  }}
                  className={`py-2.5 px-2 border rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all duration-300 cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5 ${
                    preferredTheme === item.id
                      ? 'bg-accent-forest/10 border-accent-forest text-accent-forest font-bold shadow-xs'
                      : 'bg-card-warm border-border-warm text-text-soft hover:bg-bg-warm hover:text-text-charcoal hover:border-accent-forest/20'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit & Reset Actions */}
        <div className="pt-5 border-t border-border-warm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-accent-forest hover:bg-accent-forest/90 disabled:bg-accent-forest/40 text-white rounded-xl text-xs uppercase tracking-wider font-bold shadow-xs hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2 transition-all duration-300 border border-accent-forest/10 cursor-pointer active:scale-95"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Saving changes...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Preferences</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="w-full sm:w-auto px-4 py-3 bg-bg-warm border border-border-warm hover:bg-border-warm/40 text-text-soft hover:text-text-charcoal rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
        </div>
      </form>

      {/* Confirmation Dialog for Reset Preferences */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card-warm border border-border-warm rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-charcoal font-serif-editorial">Reset Preferences?</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-text-soft hover:text-text-charcoal p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-soft leading-relaxed">
              This will restore all settings to their default values. Your interview history and account data will not be affected.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2.5 bg-bg-warm border border-border-warm hover:bg-border-warm/40 text-text-charcoal rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                Reset Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
