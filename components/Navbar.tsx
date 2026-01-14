
import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { isConfigured, db } from '../supabase';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  villageName: string;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, villageName }) => {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error' | 'offline'>('checking');

  const checkConnection = async () => {
    if (!isConfigured) {
      setDbStatus('offline');
      return;
    }
    
    const isOk = await db.testConnection();
    setDbStatus(isOk ? 'connected' : 'error');
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleConfigReset = () => {
    if (confirm('Atur ulang konfigurasi database?')) {
      localStorage.removeItem('__manual_SUPABASE_URL');
      localStorage.removeItem('__manual_SUPABASE_ANON_KEY');
      window.location.reload();
    }
  };

  return (
    <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg leading-tight tracking-tight">JIMPITAN DIGITAL</span>
              <button 
                onClick={handleConfigReset}
                className={`w-3 h-3 rounded-full border-2 border-white/30 transition-all duration-500 cursor-help ${
                  dbStatus === 'connected' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 
                  dbStatus === 'error' ? 'bg-red-500' : 
                  dbStatus === 'offline' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse' : 'bg-slate-400 animate-pulse'
                }`}
                title={dbStatus === 'connected' ? 'Terhubung ke Cloud' : 'Offline/Klik untuk Config'}
              />
            </div>
            <span className="text-[10px] text-blue-200 uppercase tracking-tighter font-medium">{villageName}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden xs:block">
              <p className="text-sm font-bold leading-none">{user.username}</p>
              <p className="text-[9px] uppercase tracking-widest text-blue-300 mt-1">{user.role}</p>
            </div>
            <button 
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
