
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * Mendeteksi variabel lingkungan dengan cara yang paling aman untuk browser.
 */
const getEnv = (key: string): string => {
  try {
    // 1. Cek window.env (disuntikkan via index.html) - PRIORITAS UTAMA
    if (typeof window !== 'undefined' && (window as any).env && (window as any).env[key]) {
      return (window as any).env[key];
    }
    
    // 2. Cek import.meta.env (jika ada compiler)
    // Safely access import.meta['env'] to avoid TypeScript property existence errors on ImportMeta
    const meta = (import.meta as any);
    if (meta && meta.env && meta.env[key]) {
      return meta.env[key];
    }
    
    // 3. Cek process.env global
    if (typeof process !== 'undefined' && process.env && (process.env as any)[key]) {
      return (process.env as any)[key];
    }

    // 4. Cek window.process.env
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process?.env?.[key];
    }
  } catch (e) {
    console.warn(`Gagal mengakses env key: ${key}`, e);
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Log status untuk debugging di console browser
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Konfigurasi Supabase belum terdeteksi. Pastikan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY sudah diset di Vercel Dashboard.");
} else {
  console.log("✅ Supabase terhubung menggunakan variabel lingkungan.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

// Validasi apakah URL benar-benar menunjuk ke Supabase
export const isConfigured = !!supabaseUrl && supabaseUrl.includes('supabase.co') && !!supabaseAnonKey && supabaseAnonKey !== 'placeholder';
