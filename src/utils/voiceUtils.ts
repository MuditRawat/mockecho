/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let cachedVoices: SpeechSynthesisVoice[] = [];

export const updateCachedVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const v = window.speechSynthesis.getVoices();
    if (v && v.length > 0) {
      cachedVoices = v;
    }
  }
  return cachedVoices;
};

// Eagerly populate voices on module import
if (typeof window !== 'undefined' && window.speechSynthesis) {
  updateCachedVoices();
  if (typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', updateCachedVoices);
  } else {
    window.speechSynthesis.onvoiceschanged = updateCachedVoices;
  }
}

export const getVoicesSync = (): SpeechSynthesisVoice[] => {
  if (cachedVoices.length > 0) return cachedVoices;
  return updateCachedVoices();
};

export const getDefaultVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  const voiceList = voices && voices.length > 0 ? voices : getVoicesSync();
  if (!voiceList || voiceList.length === 0) return null;

  // Priority 1: Microsoft Neerja (if available in browser)
  const neerja = voiceList.find(v => v.name.toLowerCase().includes('neerja'));
  if (neerja) return neerja;

  // Priority 2: System Default Voice or first available voice
  return voiceList.find(v => v.default) || voiceList[0] || null;
};

export const filterEnglishVoices = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] => {
  if (!voices || voices.length === 0) return [];

  const englishVoices = voices.filter(v => {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    return lang.startsWith('en') || lang === 'en' || name.includes('english');
  });

  // If browser has voices but none explicitly tagged as English, fallback to all voices to avoid empty list
  return englishVoices.length > 0 ? englishVoices : voices;
};

export const getSelectedVoice = (
  voices: SpeechSynthesisVoice[],
  preferredVoiceName?: string
): SpeechSynthesisVoice | null => {
  if (!voices || voices.length === 0) return null;

  if (preferredVoiceName && preferredVoiceName !== 'default') {
    // 1. Exact match
    let found = voices.find(v => v.name === preferredVoiceName);
    if (found) return found;

    // 2. Case-insensitive exact match
    const pLower = preferredVoiceName.toLowerCase().trim();
    found = voices.find(v => v.name.toLowerCase().trim() === pLower);
    if (found) return found;

    // 3. Substring / partial match
    found = voices.find(v => {
      const vLower = v.name.toLowerCase();
      return vLower.includes(pLower) || pLower.includes(vLower);
    });
    if (found) return found;

    // 4. Token match for multi-word names (e.g., "Microsoft Neerja")
    const nameTokens = pLower.split(/[-–—()]/).map(s => s.trim()).filter(s => s.length > 2);
    for (const token of nameTokens) {
      if (!['english', 'united', 'states', 'kingdom', 'india', 'natural'].includes(token)) {
        found = voices.find(v => v.name.toLowerCase().includes(token));
        if (found) return found;
      }
    }
  }

  return getDefaultVoice(voices);
};

export const ensureVoicesLoaded = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const current = getVoicesSync();
    if (current && current.length > 0) {
      resolve(current);
      return;
    }

    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve(getVoicesSync());
    };

    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
    } else {
      window.speechSynthesis.onvoiceschanged = finish;
    }

    // Fallback timer (150ms)
    setTimeout(finish, 150);
  });
};

export interface ResolvedVoiceInfo {
  voice: SpeechSynthesisVoice | null;
  isFallback: boolean;
  resolvedVoiceName: string;
}

export const resolveActiveVoiceInfo = (
  voices: SpeechSynthesisVoice[],
  preferredVoiceName?: string
): ResolvedVoiceInfo => {
  const englishVoices = filterEnglishVoices(voices);
  if (!englishVoices || englishVoices.length === 0) {
    return { voice: null, isFallback: false, resolvedVoiceName: 'default' };
  }

  if (preferredVoiceName && preferredVoiceName !== 'default') {
    const found = englishVoices.find(v => v.name === preferredVoiceName);
    if (found) {
      return { voice: found, isFallback: false, resolvedVoiceName: found.name };
    }
  }

  const fallback = getDefaultVoice(englishVoices);
  return {
    voice: fallback,
    isFallback: Boolean(preferredVoiceName && preferredVoiceName !== 'default'),
    resolvedVoiceName: fallback ? fallback.name : 'default'
  };
};

export interface VoiceGroup {
  label: string;
  voices: SpeechSynthesisVoice[];
}

export const getGroupedVoices = (voices: SpeechSynthesisVoice[]): VoiceGroup[] => {
  if (!voices || voices.length === 0) return [];

  const enIN: SpeechSynthesisVoice[] = [];
  const enUS: SpeechSynthesisVoice[] = [];
  const enGB: SpeechSynthesisVoice[] = [];
  const others: SpeechSynthesisVoice[] = [];

  voices.forEach(v => {
    const l = v.lang.toLowerCase();
    const n = v.name.toLowerCase();

    if (l === 'en-in' || l.startsWith('en-in') || n.includes('india') || n.includes('indian')) {
      enIN.push(v);
    } else if (l === 'en-us' || l.startsWith('en-us') || n.includes('united states') || n.includes('us english')) {
      enUS.push(v);
    } else if (l === 'en-gb' || l.startsWith('en-gb') || n.includes('united kingdom') || n.includes('uk english') || n.includes('great britain')) {
      enGB.push(v);
    } else {
      others.push(v);
    }
  });

  const sortFn = (a: SpeechSynthesisVoice, b: SpeechSynthesisVoice) => a.name.localeCompare(b.name);

  enIN.sort(sortFn);
  enUS.sort(sortFn);
  enGB.sort(sortFn);
  others.sort(sortFn);

  const groups: VoiceGroup[] = [];
  if (enIN.length > 0) groups.push({ label: 'English (India)', voices: enIN });
  if (enUS.length > 0) groups.push({ label: 'English (United States)', voices: enUS });
  if (enGB.length > 0) groups.push({ label: 'English (United Kingdom)', voices: enGB });
  if (others.length > 0) groups.push({ label: 'Other Languages', voices: others });

  return groups;
};
