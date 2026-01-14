
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
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [jimpitanData, setJimpitanData] = useState<JimpitanRecord[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  // 1. Fetch data dari Supabase saat aplikasi dimuat
  const loadDataFromDB = async () => {
    if (!isConfigured) {
      const savedUsers = localStorage.getItem('jimpitan_users');
      if (savedUsers) setUsers(JSON.parse(savedUsers));
      setLoading(false);
      return;
    }

    try {
      const [
        { data: sData },
        { data: cData },
        { data: jData },
        { data: mData },
        { data: aData },
        { data: uData }
      ] = await Promise.all([
        db.getSettings(),
        db.getCitizens(),
        db.getJimpitan(),
        db.getMeetings(),
        db.getAttendances(),
        supabase.from('users_app').select('*')
      ]);

      if (sData) setSettings(sData as any);
      if (cData) setCitizens(cData.map((c: any) => ({
        id: c.id,
        name: c.name,
        reguId: c.regu_id,
        displayOrder: c.display_order
      })));
      if (jData) setJimpitanData(jData as any);
      if (mData) setMeetings(mData as any);
      if (aData) setAttendances(aData as any);
      if (uData && uData.length > 0) setUsers(uData as any);
    } catch (error) {
      console.error("Error fetching database:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromDB();
  }, []);

  // Sync Wrappers
  const syncSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    if (isConfigured) {
      await supabase.from('settings').upsert({
        id: 'default',
        village_name: newSettings.villageName,
        address: newSettings.address,
        jimpitan_nominal: newSettings.jimpitanNominal
      });
    }
  };

  const syncUsers = async (arg: User[] | ((prev: User[]) => User[])) => {
    const newUsers = typeof arg === 'function' ? arg(users) : arg;
    setUsers(newUsers);
    if (isConfigured) {
      await supabase.from('users_app').upsert(newUsers);
    }
  };

  const syncCitizens = async (arg: Citizen[] | ((prev: Citizen[]) => Citizen[])) => {
    const newCitizens = typeof arg === 'function' ? arg(citizens) : arg;
    setCitizens(newCitizens);
    if (isConfigured) {
      const payload = newCitizens.map(c => ({
        id: c.id,
        name: c.name,
        regu_id: c.reguId,
        display_order: c.displayOrder
      }));
      await supabase.from('citizens').upsert(payload);
    }
  };

  const handleLogout = () => setCurrentUser(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium tracking-widest uppercase text-[10px]">Menyinkronkan Data...</p>
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
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full">
        {currentUser.role === UserRole.ADMIN && (
          <AdminDashboard 
            settings={settings} setSettings={syncSettings}
            users={users} setUsers={syncUsers}
            citizens={citizens} setCitizens={syncCitizens}
            jimpitanData={jimpitanData}
            meetings={meetings}
            setMeetings={async (m: any) => {
              const val = typeof m === 'function' ? m(meetings) : m;
              setMeetings(val);
              if(isConfigured) await supabase.from('meetings').upsert(val);
            }}
            attendances={attendances}
            setAttendances={async (a: any) => {
              const val = typeof a === 'function' ? a(attendances) : a;
              setAttendances(val);
              if(isConfigured) await supabase.from('attendances').upsert(val);
            }}
          />
        )}
        
        {currentUser.role === UserRole.REGU && (
          <ReguDashboard 
            user={currentUser} citizens={citizens} settings={settings}
            jimpitanData={jimpitanData}
            setJimpitanData={async (val: any) => {
              const newData = typeof val === 'function' ? val(jimpitanData) : val;
              setJimpitanData(newData);
              if(isConfigured) await supabase.from('jimpitan_records').upsert(newData);
            }}
            meetings={meetings} attendances={attendances}
            setAttendances={async (val: any) => {
              const newData = typeof val === 'function' ? val(attendances) : val;
              setAttendances(newData);
              if(isConfigured) await supabase.from('attendances').upsert(newData);
            }}
            users={users} setUsers={syncUsers}
          />
        )}
        
        {currentUser.role === UserRole.WARGA && (
          <WargaDashboard 
            user={currentUser} settings={settings} jimpitanData={jimpitanData}
            meetings={meetings} attendances={attendances}
            citizens={citizens} setUsers={syncUsers}
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
