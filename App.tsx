
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

  // 1. LOGIN PERSISTENCE: Cek localStorage saat aplikasi dimuat
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
      // Ambil data secara individual agar tidak crash jika salah satu tabel belum ada
      const { data: sData } = await db.getSettings();
      if (sData) setSettings({
        villageName: sData.village_name || DEFAULT_SETTINGS.villageName,
        address: sData.address || DEFAULT_SETTINGS.address,
        jimpitanNominal: sData.jimpitan_nominal || DEFAULT_SETTINGS.jimpitanNominal
      });

      const { data: cData } = await db.getCitizens();
      if (cData) setCitizens(cData.map((c: any) => ({
        id: c.id, name: c.name, reguId: c.regu_id, displayOrder: c.display_order
      })));

      const { data: uData } = await db.getUsers();
      if (uData && uData.length > 0) {
        setUsers(uData.map((u: any) => ({
          id: u.id, username: u.username, password: u.password, role: u.role as UserRole, reguName: u.regu_name
        })));
      }

      const { data: jData } = await db.getJimpitan();
      if (jData) setJimpitanData(jData.map((j: any) => ({
        id: j.id, citizenId: j.citizen_id, citizenName: j.citizen_name, amount: j.amount,
        jimpitanPortion: j.jimpitan_portion, savingsPortion: j.savings_portion,
        date: j.date, reguName: j.regu_name, isSent: j.is_sent, isSaved: j.is_saved
      })));

      const { data: mData } = await db.getMeetings();
      if (mData) setMeetings(mData.map((m: any) => ({
        id: m.id, agenda: m.agenda, date: m.date, minutesNumber: m.minutes_number, notes: m.notes
      })));

      const { data: aData } = await db.getAttendances();
      if (aData) setAttendances(aData.map((a: any) => ({
        id: a.id, meetingId: a.meeting_id, citizenId: a.citizen_id, status: a.status,
        reason: a.reason, date: a.date, reguId: a.regu_id
      })));

      setErrorStatus(null);
    } catch (e: any) {
      console.warn("DB Load Error:", e.message);
      setErrorStatus("Beberapa data gagal dimuat dari cloud.");
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadAllData();
      setLoading(false);

      if (isConfigured) {
        const channel = supabase.channel('realtime_all')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => loadAllData())
          .subscribe();
        return () => { supabase.removeChannel(channel); };
      }
    };
    init();
  }, []);

  const syncSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    if (isConfigured) {
      await supabase.from('settings').upsert({
        id: 'default', village_name: newSettings.villageName,
        address: newSettings.address, jimpitan_nominal: newSettings.jimpitanNominal
      });
    }
  };

  const syncUsers = async (arg: any) => {
    const newUsers = typeof arg === 'function' ? arg(users) : arg;
    setUsers(newUsers);
    if (isConfigured) {
      await supabase.from('users_app').upsert(newUsers.map((u: any) => ({
        id: u.id, username: u.username, password: u.password, role: u.role, regu_name: u.reguName
      })));
    }
  };

  const syncCitizens = async (arg: any) => {
    const newCitizens = typeof arg === 'function' ? arg(citizens) : arg;
    setCitizens(newCitizens);
    if (isConfigured) {
      await supabase.from('citizens').upsert(newCitizens.map((c: any) => ({
        id: c.id, name: c.name, regu_id: c.reguId, display_order: c.displayOrder
      })));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-800 font-bold text-[10px] uppercase tracking-widest animate-pulse">Menghubungkan Jimpitan Digital...</p>
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
            {errorStatus && isConfigured && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[10px] font-bold">
                ⚠️ PERHATIAN: Sinkronisasi database cloud tertunda. Pastikan Schema SQL sudah di-setup di Supabase.
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
                  if(isConfigured) {
                    await supabase.from('attendances').upsert(val.map((item: any) => ({
                      id: item.id, meeting_id: item.meetingId, citizen_id: item.citizenId, status: item.status, reason: item.reason, date: item.date, regu_id: item.reguId
                    })));
                  }
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
                meetings={meetings} attendances={attendances}
                setAttendances={async (val: any) => {
                  const newData = typeof val === 'function' ? val(attendances) : val;
                  setAttendances(newData);
                  if(isConfigured) {
                    // FIX: Pastikan mengirimkan kolom yang sesuai dengan database
                    await supabase.from('attendances').upsert(newData.map((item: any) => ({
                      id: item.id, 
                      meeting_id: item.meetingId, 
                      citizen_id: item.citizenId, 
                      status: item.status, 
                      reason: item.reason, 
                      date: item.date, 
                      regu_id: item.reguId
                    })));
                  }
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
            aplikasi jimpitan v2.1 • YUSAPEDIA
          </footer>
        </>
      )}
    </div>
  );
};

export default App;
