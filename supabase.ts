
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Gunakan environment variables di Vercel/Hosting
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* 
  STRUKTUR SQL UNTUK SUPABASE (Jalankan di SQL Editor Supabase):

  -- Tabel Settings
  CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    village_name TEXT,
    address TEXT,
    jimpitan_nominal INTEGER
  );

  -- Tabel Users
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    regu_name TEXT
  );

  -- Tabel Citizens
  CREATE TABLE citizens (
    id TEXT PRIMARY KEY,
    name TEXT,
    regu_id TEXT REFERENCES users(id),
    display_order INTEGER
  );

  -- Tabel Jimpitan Records
  CREATE TABLE jimpitan_records (
    id TEXT PRIMARY KEY,
    citizen_id TEXT REFERENCES citizens(id),
    citizen_name TEXT,
    amount INTEGER,
    jimpitan_portion INTEGER,
    savings_portion INTEGER,
    date DATE,
    regu_name TEXT,
    is_sent BOOLEAN DEFAULT false
  );

  -- Tabel Meetings
  CREATE TABLE meetings (
    id TEXT PRIMARY KEY,
    agenda TEXT,
    date DATE,
    minutes_number TEXT,
    notes TEXT
  );

  -- Tabel Attendances
  CREATE TABLE attendances (
    id TEXT PRIMARY KEY,
    meeting_id TEXT,
    citizen_id TEXT,
    status TEXT,
    reason TEXT,
    date DATE,
    regu_id TEXT
  );
*/
