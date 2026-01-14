
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
  DEFAULT_SETTINGS 
} from './constants';
import { supabase, isConfigured, db } from './supabase';

// Views
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import ReguDashboard from './components/ReguDashboard';
import WargaDashboard from './components/WargaDashboard';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // States
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('jimpitan_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [jimpitanData, setJimpitanData] = useState<JimpitanRecord[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  // 1. Fetch data dari Supabase saat aplikasi dimuat
  useEffect(() => {
    const fetchData = async () => {
      if (!isConfigured) {
        setLoading(false);
        return;
      }

      try {
        const [
          { data: sData },
          { data: cData },
          { data: jData },
          { data: mData },
          { data: aData }
        ] = await Promise.all([
          db.getSettings(),
          db.getCitizens(),
          db.getJimpitan(),
          db.getMeetings(),
          db.getAttendances()
        ]);

        if (sData) setSettings(sData as any);
        if (cData) setCitizens(cData as any);
        if (jData) setJimpitanData(jData as any);
        if (mData) setMeetings(mData as any);
        if (aData) setAttendances(aData as any);
      } catch (error) {
        console.error("Error fetching database:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 2. Simpan users ke localStorage (User Auth tetap lokal untuk kemudahan akses demo)
  useEffect(() => {
    localStorage.setItem('jimpitan_users', JSON.stringify(users));
  }, [users]);

  // 3. Fungsi Sync untuk Admin (Update Database)
  const syncSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    if (isConfigured) {
      await supabase.from('settings').update(newSettings).eq('id', 'default');
    }
  };

  const syncCitizens = async (newCitizens: Citizen[]) => {
    setCitizens(newCitizens);
    // Logic untuk sync citizen ke DB bisa ditambahkan di AdminDashboard.tsx 
    // agar lebih efisien per aksi (Add/Delete)
  };

  const handleLogout = () => setCurrentUser(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Memuat Database...</p>
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
      
      {!isConfigured && (
        <div className="bg-amber-100 text-amber-800 text-[10px] text-center py-1 font-bold">
          MODE OFFLINE: SUPABASE BELUM DIKONFIGURASI DI VERCEL
        </div>
      )}

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full">
        {currentUser.role === UserRole.ADMIN && (
          <AdminDashboard 
            settings={settings}
            setSettings={syncSettings}
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
