
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
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [jimpitanData, setJimpitanData] = useState<JimpitanRecord[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  const loadAllData = async () => {
    if (!isConfigured) return;
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
        db.getUsers()
      ]);

      if (sData) setSettings({
        villageName: sData.village_name,
        address: sData.address,
        jimpitanNominal: sData.jimpitan_nominal
      });
      
      if (cData) setCitizens(cData.map((c: any) => ({
        id: c.id,
        name: c.name,
        reguId: c.regu_id,
        displayOrder: c.display_order
      })));

      if (uData && uData.length > 0) {
        setUsers(uData.map((u: any) => ({
          id: u.id,
          username: u.username,
          password: u.password,
          role: u.role as UserRole,
          regu_name: u.regu_name
        })));
      }

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
        isSaved: j.is_saved
      })));

      if (mData) setMeetings(mData.map((m: any) => ({
        id: m.id,
        agenda: m.agenda,
        date: m.date,
        minutes_number: m.minutes_number,
        notes: m.notes
      })));

      if (aData) setAttendances(aData as any);
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      setShowConfigModal(true);
    }

    const init = async () => {
      await loadAllData();
      setLoading(false);

      if (isConfigured) {
        const channel = supabase
          .channel('db_changes')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => {
            loadAllData();
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };
    init();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    });
  }, []);

  const handleManualConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const url = formData.get('url') as string;
    const key = formData.get('key') as string;
    
    if (url && key) {
      localStorage.setItem('__manual_SUPABASE_URL', url);
      localStorage.setItem('__manual_SUPABASE_ANON_KEY', key);
      window.location.reload();
    }
  };

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
      const payload = newUsers.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        role: u.role,
        regu_name: u.reguName
      }));
      await supabase.from('users_app').upsert(payload);
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

  if (loading && isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Sinkronisasi Cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Manual Config Modal for emergency */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-blue-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Konfigurasi Database</h2>
            <p className="text-slate-500 text-sm mb-6">Database (Titik Kuning) belum terdeteksi. Silakan masukkan URL & Key Supabase Anda.</p>
            <form onSubmit={handleManualConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Supabase URL</label>
                <input name="url" placeholder="https://xyz.supabase.co" className="w-full px-4 py-3 border rounded-xl text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Anon Key (API Key)</label>
                <textarea name="key" rows={3} placeholder="eyJhbG..." className="w-full px-4 py-3 border rounded-xl text-sm" required />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg">Hubungkan Sekarang</button>
              <button type="button" onClick={() => setShowConfigModal(false)} className="w-full text-slate-400 text-xs py-2">Lanjutkan Offline (Hanya Demo)</button>
            </form>
          </div>
        </div>
      )}

      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-[100] bg-blue-700 text-white p-4 rounded-2xl shadow-2xl border border-blue-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="icon" className="w-6 h-6" />
            </div>
            <div><p className="font-bold text-sm">Instal Aplikasi?</p></div>
          </div>
          <button onClick={() => setShowInstallBanner(false)} className="bg-white text-blue-700 px-4 py-1 rounded-lg text-xs font-bold uppercase">Instal</button>
        </div>
      )}

      {!currentUser ? (
        <LoginView users={users} onLogin={setCurrentUser} />
      ) : (
        <>
          <Navbar user={currentUser} onLogout={() => setCurrentUser(null)} villageName={settings.villageName} />
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
                  if(isConfigured) {
                    await supabase.from('meetings').upsert(val.map((item: any) => ({
                      id: item.id,
                      agenda: item.agenda,
                      date: item.date,
                      minutes_number: item.minutesNumber,
                      notes: item.notes
                    })));
                  }
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
        </>
      )}
    </div>
  );
};

export default App;
