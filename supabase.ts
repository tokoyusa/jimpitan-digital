
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Fungsi pencarian env variable yang lebih kuat
const getSecret = (key: string): string => {
  if (typeof window === 'undefined') return '';
  
  // 1. Coba dari process.env (Vite/CRA/Vercel)
  const processEnv = (window as any).process?.env?.[key] || (import.meta as any).env?.[key];
  if (processEnv) return processEnv;

  // 2. Coba dari window object langsung (Fallback jika di-inject manual)
  if ((window as any)[key]) return (window as any)[key];
  
  // 3. Coba dari API_KEY global (Standar platform)
  if (key === 'SUPABASE_ANON_KEY' && (window as any).API_KEY) return (window as any).API_KEY;
  if (key === 'API_KEY' && (window as any).API_KEY) return (window as any).API_KEY;

  return '';
};

// Pastikan urutan prioritas benar
const supabaseUrl = getSecret('VITE_SUPABASE_URL') || getSecret('SUPABASE_URL');
const supabaseAnonKey = getSecret('VITE_SUPABASE_ANON_KEY') || getSecret('SUPABASE_ANON_KEY') || getSecret('API_KEY');

// Indikator konfigurasi valid
export const isConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl.includes('supabase.co') && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 20
);

// Fallback untuk mencegah crash total jika belum dikonfigurasi
const finalUrl = isConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const finalKey = isConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase = createClient(finalUrl, finalKey);

export const db = {
  getSettings: () => supabase.from('settings').select('*').maybeSingle(),
  getCitizens: () => supabase.from('citizens').select('*').order('display_order', { ascending: true }),
  getJimpitan: () => supabase.from('jimpitan_records').select('*').order('date', { ascending: false }),
  getMeetings: () => supabase.from('meetings').select('*').order('date', { ascending: false }),
  getAttendances: () => supabase.from('attendances').select('*').order('created_at', { ascending: false }),
  getUsers: () => supabase.from('users_app').select('*'),
  
  testConnection: async () => {
    if (!isConfigured) return false;
    try {
      // Pengecekan versi paling sederhana ke tabel settings
      const { data, error } = await supabase.from('settings').select('id').limit(1);
      if (error) {
        console.error('Database connection test failed:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }
};
