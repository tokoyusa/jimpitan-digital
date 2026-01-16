
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
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [jimpitanData, setJimpitanData] = useState<JimpitanRecord[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  // 1. LOGIN PERSISTENCE: Memastikan session tetap ada setelah refresh
  useEffect(() => {
    const savedSession = localStorage.getItem('jimpitan_v2_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
        }
      } catch (e) {
        localStorage.removeItem('jimpitan_v2_session');
      }
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('jimpitan_v2_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('jimpitan_v2_session');
  };

  const loadAllData = async () => {
    if (!isConfigured) return;
    try {
      const [sRes, cRes, uRes, jRes, mRes, aRes] = await Promise.all([
        db.getSettings(),
        db.getCitizens(),
        db.getUsers(),
        db.getJimpitan(),
        db.getMeetings(),
        db.getAttendances()
      ]);

      if (sRes.data) setSettings({
        villageName: sRes.data.village_name || DEFAULT_SETTINGS.villageName,
        address: sRes.data.address || DEFAULT_SETTINGS.address,
        jimpitanNominal: sRes.data.jimpitan_nominal || DEFAULT_SETTINGS.jimpitanNominal
      });

      if (cRes.data) setCitizens(cRes.data.map((c: any) => ({
        id: c.id, name: c.name, reguId: c.regu_id, displayOrder: c.display_order
      })));

      if (uRes.data && uRes.data.length > 0) {
        setUsers(uRes.data.map((u: any) => ({
          id: u.id, username: u.username, password: u.password, role: u.role as UserRole, reguName: u.regu_name
        })));
      }

      if (jRes.data) setJimpitanData(jRes.data.map((j: any) => ({
        id: j.id, citizenId: j.citizen_id, citizenName: j.citizen_name, amount: j.amount,
        jimpitanPortion: j.jimpitan_portion, savings_portion: j.savings_portion,
        date: j.date, reguName: j.regu_name, isSent: j.is_sent, isSaved: j.is_saved
      })));

      if (mRes.data) setMeetings(mRes.data.map((m: any) => ({
        id: m.id, agenda: m.agenda, date: m.date, minutesNumber: m.minutes_number, notes: m.notes
      })));

      // CRITICAL FIX: Memastikan reguId terambil dari kolom database regu_id
      if (aRes.data) setAttendances(aRes.data.map((a: any) => ({
        id: a.id, 
        meetingId: a.meeting_id, 
        citizenId: a.citizen_id, 
        status: a.status,
        reason: a.reason, 
        date: a.date, 
        reguId: a.regu_id 
      })));

      setErrorStatus(null);
    } catch (e: any) {
      console.warn("DB Load Error:", e.message);
      setErrorStatus("Sinkronisasi cloud tertunda. Cek SQL Editor Supabase.");
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadAllData();
      setLoading(false);

      if (isConfigured) {
        const channel = supabase.channel('realtime_all_v2')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => loadAllData())
          .subscribe();
        return () => { supabase.removeChannel(channel); };
      }
    };
    init();
  }, []);

  // Helpers for syncing
  const syncAttendances = async (val: Attendance[]) => {
    if (!isConfigured) return;
    try {
      // Map data dari variabel frontend ke kolom database backend secara eksplisit
      const toUpsert = val.map(a => ({
        id: a.id,
        meeting_id: a.meetingId,
        citizen_id: a.citizenId,
        status: a.status,
        reason: a.reason || '',
        date: a.date,
        regu_id: a.reguId // Pastikan dikirim ke kolom regu_id di Supabase
      }));
      
      const { error } = await supabase.from('attendances').upsert(toUpsert);
      if (error) throw error;
    } catch (err) {
      console.error("Sync Attendances Error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-800 font-bold text-[10px] uppercase tracking-widest animate-pulse">Menghubungkan Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {!currentUser ? (
        <LoginView users={users} onLogin={handleLogin} />
      ) : (
        <>
          <Navbar user={currentUser} onLogout={handleLogout} villageName={settings.villageName} />
          <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full">
            {errorStatus && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[10px] font-bold animate-bounce">
                ⚠️ DATA TIDAK TERSIMPAN: Tabel 'attendances' atau kolom 'regu_id' tidak ditemukan. Jalankan SQL Script di Supabase.
              </div>
            )}

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
                  if(isConfigured) {
                    await supabase.from('meetings').upsert(val.map((item: any) => ({
                      id: item.id, agenda: item.agenda, date: item.date, minutes_number: item.minutesNumber, notes: item.notes
                    })));
                  }
                }}
                attendances={attendances}
                setAttendances={async (a: any) => {
                  const val = typeof a === 'function' ? a(attendances) : a;
                  setAttendances(val);
                  await syncAttendances(val);
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
                  if(isConfigured) {
                    await supabase.from('jimpitan_records').upsert(newData.map((j: any) => ({
                      id: j.id, citizen_id: j.citizenId, citizen_name: j.citizenName, amount: j.amount, jimpitan_portion: j.jimpitanPortion, savings_portion: j.savingsPortion, date: j.date, regu_name: j.reguName, is_sent: j.isSent, is_saved: j.isSaved
                    })));
                  }
                }}
                meetings={meetings} 
                attendances={attendances}
                setAttendances={async (val: any) => {
                  const newData = typeof val === 'function' ? val(attendances) : val;
                  setAttendances(newData);
                  await syncAttendances(newData);
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
            aplikasi jimpitan v2.2 • YUSAPEDIA
          </footer>
        </>
      )}
    </div>
  );

  // Re-define sync functions that were missing or incorrectly placed
  async function syncSettings(newSettings: Settings) {
    setSettings(newSettings);
    if (isConfigured) {
      await supabase.from('settings').upsert({
        id: 'default', village_name: newSettings.villageName,
        address: newSettings.address, jimpitan_nominal: newSettings.jimpitanNominal
      });
    }
  }

  async function syncUsers(arg: any) {
    const newUsers = typeof arg === 'function' ? arg(users) : arg;
    setUsers(newUsers);
    if (isConfigured) {
      await supabase.from('users_app').upsert(newUsers.map((u: any) => ({
        id: u.id, username: u.username, password: u.password, role: u.role, regu_name: u.reguName
      })));
    }
  }

  async function syncCitizens(arg: any) {
    const newCitizens = typeof arg === 'function' ? arg(citizens) : arg;
    setCitizens(newCitizens);
    if (isConfigured) {
      await supabase.from('citizens').upsert(newCitizens.map((c: any) => ({
        id: c.id, name: c.name, regu_id: c.reguId, display_order: c.displayOrder
      })));
    }
  }
};

export default App;
