
const getEnv = (key: string): string => {
  if (typeof window !== 'undefined' && (window as any).env) {
    return (window as any).env[key] || "";
  }
  return "";
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

export const isConfigured = 
  !!supabaseUrl && 
  supabaseUrl.length > 10 && 
  supabaseUrl.includes('supabase.co');

// Gunakan library dari window yang dimuat di index.html
const supabaseLib = (window as any).supabase;

export const supabase = isConfigured 
  ? supabaseLib.createClient(supabaseUrl, supabaseAnonKey)
  : { 
      from: () => ({ 
        select: () => ({ single: () => Promise.resolve({ data: null }), order: () => Promise.resolve({ data: [] }) }),
        insert: () => Promise.resolve({ data: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null }) })
      }),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
      removeChannel: () => {}
    } as any;
