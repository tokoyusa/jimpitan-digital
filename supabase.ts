
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const getEnv = (key: string) => {
  if (typeof (import.meta as any) !== 'undefined' && (import.meta as any).env?.[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
    return (window as any).process.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

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
  getUsers: () => supabase.from('users_app').select('*'),
  
  testConnection: async () => {
    try {
      const { data, error } = await supabase.from('settings').select('id').limit(1);
      if (error) return false;
      return true;
    } catch (e) {
      return false;
    }
  }
};
