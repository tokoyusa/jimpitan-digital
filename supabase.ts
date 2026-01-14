
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Mengambil URL dan Key dari Environment Variables (Vite/ESM style)
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

/**
 * Cek apakah konfigurasi sudah tersedia.
 * Jika string kosong, kita tidak boleh memanggil createClient dengan argumen tersebut 
 * karena akan memicu "Uncaught Error: supabaseUrl is required".
 */
export const isConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

/**
 * Inisialisasi client Supabase dengan pengamanan.
 * Jika belum dikonfigurasi, kita gunakan placeholder yang valid secara sintaksis 
 * agar tidak crash saat inisialisasi modul.
 */
const placeholderUrl = 'https://placeholder-project.supabase.co';
const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase = createClient(
  isConfigured ? supabaseUrl : placeholderUrl,
  isConfigured ? supabaseAnonKey : placeholderKey
);

/**
 * Helper untuk mengambil data awal dari Supabase.
 * Method ini hanya akan dipanggil jika isConfigured bernilai true di App.tsx.
 */
export const db = {
  getSettings: () => supabase.from('settings').select('*').single(),
  getCitizens: () => supabase.from('citizens').select('*').order('display_order', { ascending: true }),
  getJimpitan: () => supabase.from('jimpitan_records').select('*').order('date', { ascending: false }),
  getMeetings: () => supabase.from('meetings').select('*').order('date', { ascending: false }),
  getAttendances: () => supabase.from('attendances').select('*').order('created_at', { ascending: false }),
};
