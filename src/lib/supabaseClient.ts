/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

// Read config from Vite meta env or standard process env
const getSupabaseUrl = (): string => {
  try {
    const metaUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.SUPABASE_URL;
    if (metaUrl) return metaUrl.trim();
  } catch (e) {}
  try {
    const procUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (procUrl) return procUrl.trim();
  } catch (e) {}
  return '';
};

const getSupabaseAnonKey = (): string => {
  try {
    const metaKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.SUPABASE_ANON_KEY;
    if (metaKey) return metaKey.trim();
  } catch (e) {}
  try {
    const procKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (procKey) return procKey.trim();
  } catch (e) {}
  return '';
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getSupabaseAnonKey();

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_URL !== '""' && 
  SUPABASE_URL !== 'undefined' &&
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY !== '""' &&
  SUPABASE_ANON_KEY !== 'undefined'
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createClient('https://missing-supabase-url.supabase.co', 'missing-supabase-anon-key');

if (!isSupabaseConfigured) {
  console.error(
    'Supabase credentials are NOT configured. Local Storage fallback has been disabled as requested. Please add SUPABASE_URL and SUPABASE_ANON_KEY in your AI Studio project Settings > Secrets.'
  );
}
