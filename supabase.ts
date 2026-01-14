
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const getEnv = (key: string): string => {
  try {
    // Coba ambil dari process.env (Vercel)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
    // Fallback ke window.process
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
  } catch (e) {
    // Silent fail
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || '';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('API_KEY') || '';

export const isConfigured = supabaseUrl.length > 10 && supabaseAnonKey.length > 10;

// Gunakan URL dummy yang valid secara sintaks agar createClient tidak melempar error
const safeUrl = isConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = isConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase = createClient(safeUrl, safeKey);

export const db = {
  getSettings: () => supabase.from('settings').select('*').single(),
  getCitizens: () => supabase.from('citizens').select('*').order('display_order', { ascending: true }),
  getJimpitan: () => supabase.from('jimpitan_records').select('*').order('date', { ascending: false }),
  getMeetings: () => supabase.from('meetings').select('*').order('date', { ascending: false }),
  getAttendances: () => supabase.from('attendances').select('*').order('created_at', { ascending: false }),
  getUsers: () => supabase.from('users_app').select('*'),
  
  testConnection: async () => {
    if (!isConfigured) return false;
    try {
      const { data, error } = await supabase.from('settings').select('id').limit(1);
      return !error;
    } catch (e) {
      return false;
    }
  }
};
