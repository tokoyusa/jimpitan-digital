
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * Mendeteksi URL dan Key dari environment variable.
 * Fallback dummy hanya digunakan jika benar-benar tidak terdeteksi untuk mencegah crash.
 */
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Pastikan inisialisasi hanya menggunakan string yang valid
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
