
import React, { useState, useEffect, useCallback } from 'react';
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

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Persistence Login
  useEffect(() => {
    const savedSession = localStorage.getItem('jimpitan_v2_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.id) setCurrentUser(parsed);
      } catch (e) {
        localStorage.removeItem('jimpitan_v2_session');
      }
    }

    // PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('jimpitan_v2_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('jimpitan_v2_session');
  };

  // Load Data
  const loadAllData = useCallback(async () => {
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

      if (uRes.data) {
        setUsers(uRes.data.map((u: any) => ({
          id: u.id, username: u.username, password: u.password, role: u.role as UserRole, reguName: u.regu_name
        })));
      }

      if (jRes.data) setJimpitanData(jRes.data.map((j: any) => ({
        id: j.id, 
        citizenId: j.citizen_id, 
        citizenName: j.citizen_name, 
        amount: Number(j.amount) || 0,
        jimpitanPortion: Number(j.jimpitan_portion) || 0, 
        savingsPortion: Number(j.savings_portion) || 0,
        date: j.date, 
        reguName: j.regu_name, 
        isSent: j.is_sent, 
        isSaved: j.is_saved
      })));

      if (mRes.data) setMeetings(mRes.data.map((m: any) => ({
        id: m.id, agenda: m.agenda, date: m.date, minutesNumber: m.minutes_number, notes: m.notes
      })));

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
      console.warn("Load error:", e.message);
      setErrorStatus("Gagal sinkronisasi data.");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadAllData();
      setLoading(false);
      if (isConfigured) {
        const channel = supabase.channel('realtime_main')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => {
             loadAllData();
          })
          .subscribe();
        return () => { supabase.removeChannel(channel); };
      }
    };
    init();
  }, [loadAllData]);

  const handleSetAttendances = async (arg: Attendance[] | ((prev: Attendance[]) => Attendance[])) => {
    const newAttendances = typeof arg === 'function' ? arg(attendances) : arg;
    setAttendances(newAttendances);

    if (isConfigured && newAttendances.length > 0) {
      try {
        const payload = newAttendances.map(a => ({
          id: a.id,
          meeting_id: a.meetingId || 'ronda-harian',
          citizen_id: a.citizenId,
          status: a.status,
          reason: a.reason || '',
          date: a.date,
          regu_id: a.reguId || ''
        }));
        const { error } = await supabase.from('attendances').upsert(payload);
        if (error) setErrorStatus(`Gagal simpan absensi: ${error.message}`);
        else setErrorStatus(null);
      } catch (err: any) {
        console.error("Critical Sync Error:", err);
      }
    }
  };

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
          <p className="text-blue-800 font-bold text-xs uppercase tracking-widest animate-pulse">Menghubungkan...</p>
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
          
          {/* PWA Install Banner */}
          {showInstallBanner && (
            <div className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg text-lg">📲</div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight">Pasang Aplikasi</p>
                  <p className="text-[10px] text-blue-200">Akses lebih cepat & mudah dari layar utama</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleInstallClick}
                  className="bg-white text-blue-800 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95"
                >
                  Pasang
                </button>
                <button 
                  onClick={() => setShowInstallBanner(false)}
                  className="text-white/60 p-1.5"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {errorStatus && (
            <div className="bg-red-600 text-white text-[10px] font-bold py-1.5 px-4 text-center uppercase tracking-widest animate-pulse">
              ⚠️ {errorStatus}
            </div>
          )}

          <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full pb-10">
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
                setAttendances={handleSetAttendances}
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
                      id: j.id, 
                      citizen_id: j.citizenId, 
                      citizen_name: j.citizenName, 
                      amount: j.amount, 
                      jimpitan_portion: j.jimpitanPortion, 
                      savings_portion: j.savingsPortion, 
                      date: j.date, 
                      regu_name: j.reguName, 
                      is_sent: j.isSent, 
                      is_saved: j.isSaved
                    })));
                  }
                }}
                meetings={meetings} 
                attendances={attendances}
                setAttendances={handleSetAttendances}
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
          <footer className="py-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            aplikasi jimpitan v2.8 • YUSAPEDIA
          </footer>
        </>
      )}
    </div>
  );
};

export default App;
