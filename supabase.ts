
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const getSecret = (key: string): string => {
  if (typeof window === 'undefined') return '';
  
  // 1. Coba cari di process.env (Vercel/Node)
  const env = (window as any).process?.env;
  if (env && env[key]) return env[key];

  // 2. Coba cari di import.meta.env (Vite)
  try {
    const viteEnv = (import.meta as any).env;
    if (viteEnv && viteEnv[key]) return viteEnv[key];
  } catch (e) {}

  // 3. Coba cari di window object langsung
  if ((window as any)[key]) return (window as any)[key];
  
  // 4. Khusus untuk API_KEY yang sering diinjeksi platform
  if (key === 'SUPABASE_ANON_KEY' || key === 'VITE_SUPABASE_ANON_KEY') {
    if ((window as any).API_KEY) return (window as any).API_KEY;
  }

  // 5. Cek LocalStorage (untuk input manual jika env gagal)
  const local = localStorage.getItem(`__manual_${key}`);
  if (local) return local;

  return '';
};

export const supabaseUrl = getSecret('VITE_SUPABASE_URL') || getSecret('SUPABASE_URL');
export const supabaseAnonKey = getSecret('VITE_SUPABASE_ANON_KEY') || getSecret('SUPABASE_ANON_KEY') || getSecret('API_KEY');

export const isConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 20
);

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
      const { error } = await supabase.from('settings').select('id').limit(1);
      return !error;
    } catch (e) {
      return false;
    }
  }
};
