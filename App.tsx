
import React, { useState, useEffect, useMemo } from 'react';
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

// Views
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import ReguDashboard from './components/ReguDashboard';
import WargaDashboard from './components/WargaDashboard';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('jimpitan_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('jimpitan_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [citizens, setCitizens] = useState<Citizen[]>(() => {
    const saved = localStorage.getItem('jimpitan_citizens');
    return saved ? JSON.parse(saved) : INITIAL_CITIZENS;
  });
  const [jimpitanData, setJimpitanData] = useState<JimpitanRecord[]>(() => {
    const saved = localStorage.getItem('jimpitan_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    const saved = localStorage.getItem('jimpitan_meetings');
    return saved ? JSON.parse(saved) : [];
  });
  const [attendances, setAttendances] = useState<Attendance[]>(() => {
    const saved = localStorage.getItem('jimpitan_attendances');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('jimpitan_users', JSON.stringify(users));
    localStorage.setItem('jimpitan_settings', JSON.stringify(settings));
    localStorage.setItem('jimpitan_citizens', JSON.stringify(citizens));
    localStorage.setItem('jimpitan_records', JSON.stringify(jimpitanData));
    localStorage.setItem('jimpitan_meetings', JSON.stringify(meetings));
    localStorage.setItem('jimpitan_attendances', JSON.stringify(attendances));
  }, [users, settings, citizens, jimpitanData, meetings, attendances]);

  const handleLogout = () => setCurrentUser(null);

  if (!currentUser) {
    return <LoginView users={users} onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={currentUser} onLogout={handleLogout} villageName={settings.villageName} />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full">
        {currentUser.role === UserRole.ADMIN && (
          <AdminDashboard 
            settings={settings}
            setSettings={setSettings}
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

      <footer className="py-6 text-center text-slate-400 text-xs font-medium">
        aplikasi dibuat oleh YUSAPEDIA 2026
      </footer>
    </div>
  );
};

export default App;
