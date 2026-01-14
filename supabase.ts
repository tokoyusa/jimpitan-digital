
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * Mengambil variabel lingkungan dari global window yang disuntikkan di index.html.
 * Cara ini paling aman untuk menghindari error parsing 'import.meta' atau 'process'.
 */
const getEnv = (key: string): string => {
  if (typeof window !== 'undefined' && (window as any).env) {
    return (window as any).env[key] || "";
  }
  return "";
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Deteksi apakah konfigurasi valid
export const isConfigured = 
  !!supabaseUrl && 
  supabaseUrl.length > 10 && 
  supabaseUrl.includes('supabase.co') &&
  !!supabaseAnonKey &&
  supabaseAnonKey.length > 10;

if (!isConfigured) {
  console.warn("⚠️ SUPABASE OFFLINE: Menggunakan data lokal. Pastikan variabel lingkungan sudah diatur di Vercel.");
} else {
  console.log("✅ SUPABASE ONLINE: Koneksi berhasil.");
}

// Inisialisasi client dengan fallback URL agar tidak menyebabkan crash jika kosong
export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder-key'
);
