
import React, { useState, useEffect } from 'react';
import { 
  User, 
  UserRole, 
  Settings, 
  Citizen, 
  JimpitanRecord, 
  Meeting, 
  Attendance 
} from './types';
import { 
  INITIAL_USERS, 
  DEFAULT_SETTINGS, 
  INITIAL_CITIZENS 
} from './constants';
import { supabase } from './supabase';

// Views
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import ReguDashboard from './components/ReguDashboard';
import WargaDashboard from './components/WargaDashboard';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [citizens, setCitizens] = useState<Citizen[]>(INITIAL_CITIZENS);
  const [jimpitanData, setJimpitanData] = useState<JimpitanRecord[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  // Logika pengecekan yang lebih kuat untuk environment variable
  const isSupabaseConfigured = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_URL.includes('supabase.co'));

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      console.warn("Koneksi Supabase tidak terdeteksi atau URL tidak valid.");
      setIsLoading(false);
      return;
    }

    try {
      const { data: sData } = await supabase.from('settings').select('*').single();
      if (sData) setSettings({
        villageName: sData.village_name,
        address: sData.address,
        jimpitanNominal: sData.jimpitan_nominal
      });

      const { data: uData } = await supabase.from('users').select('*');
      if (uData && uData.length > 0) setUsers(uData.map((u: any) => ({
        id: u.id,
        username: u.username,
        password: u.password,
        role: u.role as UserRole,
        reguName: u.regu_name
      })));

      const { data: cData } = await supabase.from('citizens').select('*').order('display_order', { ascending: true });
      if (cData && cData.length > 0) setCitizens(cData.map((c: any) => ({
        id: c.id,
        name: c.name,
        reguId: c.regu_id,
        displayOrder: c.display_order
      })));

      const { data: jData } = await supabase.from('jimpitan_records').select('*').order('date', { ascending: false });
      if (jData) setJimpitanData(jData.map((j: any) => ({
        id: j.id,
        citizenId: j.citizen_id,
        citizenName: j.citizen_name,
        amount: j.amount,
        jimpitanPortion: j.jimpitan_portion,
        savingsPortion: j.savings_portion,
        date: j.date,
        reguName: j.regu_name,
        isSent: j.is_sent,
        isSaved: true
      })));

      const { data: mData } = await supabase.from('meetings').select('*').order('date', { ascending: false });
      if (mData) setMeetings(mData.map((m: any) => ({
        id: m.id,
        agenda: m.agenda,
        date: m.date,
        minutesNumber: m.minutes_number,
        notes: m.notes
      })));

      const { data: aData } = await supabase.from('attendances').select('*');
      if (aData) setAttendances(aData.map((a: any) => ({
        id: a.id,
        meetingId: a.meeting_id,
        citizenId: a.citizen_id,
        status: a.status,
        reason: a.reason,
        date: a.date,
        reguId: a.regu_id
      })));
    } catch (error) {
      console.error("Gagal sinkronisasi data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    if (isSupabaseConfigured) {
      const channels = supabase.channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channels);
      };
    }
  }, [isSupabaseConfigured]);

  const handleLogout = () => setCurrentUser(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Menghubungkan ke Cloud...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView users={users} onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={currentUser} onLogout={handleLogout} villageName={settings.villageName} />
      
      {!isSupabaseConfigured && (
        <div className="bg-amber-100 text-amber-800 text-[10px] py-1 text-center font-bold uppercase">
          Mode Offline: Environment Variables Supabase Belum Terbaca
        </div>
      )}

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full">
        {currentUser.role === UserRole.ADMIN && (
          <AdminDashboard 
            settings={settings}
            setSettings={async (s) => {
               setSettings(s);
               if (isSupabaseConfigured) {
                 await supabase.from('settings').update({
                   village_name: s.villageName,
                   address: s.address,
                   jimpitan_nominal: s.jimpitanNominal
                 }).eq('id', 1);
               }
            }}
            users={users}
            setUsers={setUsers}
            citizens={citizens}
            setCitizens={setCitizens}
            jimpitanData={jimpitanData}
            meetings={meetings}
            setMeetings={setMeetings}
            attendances={attendances}
            setAttendances={setAttendances}
          />
        )}
        
        {currentUser.role === UserRole.REGU && (
          <ReguDashboard 
            user={currentUser}
            citizens={citizens}
            settings={settings}
            jimpitanData={jimpitanData}
            setJimpitanData={setJimpitanData}
            meetings={meetings}
            attendances={attendances}
            setAttendances={setAttendances}
            users={users}
            setUsers={setUsers}
          />
        )}
        
        {currentUser.role === UserRole.WARGA && (
          <WargaDashboard 
            user={currentUser}
            settings={settings}
            jimpitanData={jimpitanData}
            meetings={meetings}
            attendances={attendances}
            citizens={citizens}
            setUsers={setUsers}
          />
        )}
      </main>

      <footer className="py-6 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
        aplikasi dibuat oleh YUSAPEDIA 2026
      </footer>
    </div>
  );
};

export default App;
