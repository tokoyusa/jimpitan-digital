
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const getSecret = (key: string): string => {
  if (typeof window === 'undefined') return '';
  
  // Ambil dari localStorage jika user input manual via UI Login
  const localManual = localStorage.getItem(`__manual_${key}`);
  if (localManual) return localManual.trim();

  // Ambil dari variabel environment (fallback)
  const viteEnv = (import.meta as any).env;
  if (viteEnv && viteEnv[key]) return viteEnv[key];

  if ((window as any).process?.env?.[key]) return (window as any).process.env[key];
  if ((window as any)[key]) return (window as any)[key];
  
  return '';
};

// Pastikan URL dan Key benar-benar valid dan tidak kosong
const rawUrl = getSecret('VITE_SUPABASE_URL') || getSecret('SUPABASE_URL');
const rawKey = getSecret('VITE_SUPABASE_ANON_KEY') || getSecret('SUPABASE_ANON_KEY');

export const isConfigured = Boolean(
  rawUrl && 
  rawUrl.startsWith('https://') && 
  rawKey && 
  rawKey.length > 20
);

// Mencegah blank dengan fallback URL dummy agar createClient tidak melempar error
const safeUrl = isConfigured ? rawUrl : 'https://placeholder-url.supabase.co';
const safeKey = isConfigured ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase = createClient(safeUrl, safeKey, {
  auth: { persistSession: false }
});

export const db = {
  getSettings: () => supabase.from('settings').select('*').maybeSingle(),
  getCitizens: () => supabase.from('citizens').select('*').order('display_order', { ascending: true }),
  getJimpitan: () => supabase.from('jimpitan_records').select('*').order('date', { ascending: false }),
  getMeetings: () => supabase.from('meetings').select('*').order('date', { ascending: false }),
  getAttendances: () => supabase.from('attendances').select('*').order('date', { ascending: false }),
  getUsers: () => supabase.from('users_app').select('*'),
  
  testConnection: async () => {
    if (!isConfigured) return false;
    try {
      const { error } = await supabase.from('settings').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
};
