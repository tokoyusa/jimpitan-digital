
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * Fungsi deteksi key yang lebih kuat.
 * Beberapa platform menyimpan di import.meta.env, 
 * yang lain di process.env (lewat inject).
 */
const getEnv = (key: string) => {
  // 1. Coba Vite / ESM standard
  if (typeof (import.meta as any) !== 'undefined' && (import.meta as any).env?.[key]) {
    return (import.meta as any).env[key];
  }
  // 2. Coba global process (biasa di inject oleh builder/hosting)
  if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
    return (window as any).process.env[key];
  }
  // 3. Fallback ke window global (jika di-inject manual via script)
  if (typeof window !== 'undefined' && (window as any)[key]) {
    return (window as any)[key];
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Log untuk debugging (Hapus jika sudah produksi)
console.log("Supabase Config Check:", { 
  urlExists: !!supabaseUrl, 
  keyExists: !!supabaseAnonKey 
});

export const isConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

const placeholderUrl = 'https://placeholder-project.supabase.co';
const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase = createClient(
  isConfigured ? supabaseUrl : placeholderUrl,
  isConfigured ? supabaseAnonKey : placeholderKey
);

export const db = {
  getSettings: () => supabase.from('settings').select('*').single(),
  getCitizens: () => supabase.from('citizens').select('*').order('display_order', { ascending: true }),
  getJimpitan: () => supabase.from('jimpitan_records').select('*').order('date', { ascending: false }),
  getMeetings: () => supabase.from('meetings').select('*').order('date', { ascending: false }),
  getAttendances: () => supabase.from('attendances').select('*').order('created_at', { ascending: false }),
  updateSettings: (newSettings: any) => supabase.from('settings').update(newSettings).eq('id', 'default'),
  
  // Fungsi tes koneksi
  testConnection: async () => {
    try {
      const { data, error } = await supabase.from('settings').select('id').limit(1);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Supabase connection failed:", e);
      return false;
    }
  }
};
