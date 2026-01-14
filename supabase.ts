
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * Mengambil environment variables. 
 * Memberikan fallback URL dummy agar inisialisasi createClient tidak crash saat build/load awal.
 */
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Inisialisasi client. 
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* 
  PANDUAN SETUP SUPABASE:
  1. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diatur di Environment Variables Hosting (Vercel).
  2. Gunakan SQL Editor di Supabase untuk menjalankan perintah CREATE TABLE yang ada di komentar file sebelumnya.
*/
