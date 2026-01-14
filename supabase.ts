
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * Mendeteksi environment variables dari berbagai kemungkinan scope.
 * Vercel biasanya menyuntikkan ini ke dalam process.env saat build.
 */
const getEnv = (key: string): string => {
  // @ts-ignore
  return (typeof process !== 'undefined' && process.env && process.env[key]) || 
         // @ts-ignore
         (typeof window !== 'undefined' && window.process?.env?.[key]) || 
         '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Inisialisasi client. 
// Jika URL tidak ada, gunakan placeholder agar tidak crash, tapi aplikasi akan tahu ini mode offline.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

export const isConfigured = !!supabaseUrl && supabaseUrl.includes('supabase.co');
