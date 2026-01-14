
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const getEnv = (key: string): string => {
  try {
    // 1. Coba ambil dari process.env (Vercel Backend/Build Time)
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key] as string;
    }
    // 2. Coba ambil dari window.process (Injected by some hosts)
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
    // 3. Coba akses global variable jika ada fallback manual
    if (typeof window !== 'undefined' && (window as any)[key]) {
      return (window as any)[key];
    }
  } catch (e) {
    console.warn(`Error accessing env ${key}:`, e);
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || '';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('API_KEY') || '';

// Validasi minimal panjang string untuk memastikan key bukan dummy/kosong
export const isConfigured = supabaseUrl.length > 15 && supabaseAnonKey.length > 20;

const safeUrl = isConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co';
const safeKey = isConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

// Singleton instance
export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

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
      // Mencoba query ringan untuk verifikasi koneksi real-time
      const { error } = await supabase.from('settings').select('id').limit(1).single();
      if (error && error.code === 'PGRST116') return true; // Data kosong tapi koneksi sukses
      return !error;
    } catch (e) {
      return false;
    }
  }
};
