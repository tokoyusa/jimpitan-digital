
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

  useEffect(() => {
    if (!isConfigured) {
      setDbStatus('offline');
      return;
    }
    
    db.testConnection().then(connected => {
      setDbStatus(connected ? 'connected' : 'error');
    });
  }, []);

  return (
    <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg leading-tight tracking-tight">JIMPITAN DIGITAL</span>
              {/* Database Status Indicator */}
              <div 
                className={`w-2 h-2 rounded-full ${
                  dbStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 
                  dbStatus === 'error' ? 'bg-red-400' : 
                  dbStatus === 'offline' ? 'bg-amber-400' : 'bg-slate-400'
                }`}
                title={`Database: ${dbStatus}`}
              />
            </div>
            <span className="text-xs text-blue-100">{villageName}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user.username}</p>
              <p className="text-[10px] uppercase tracking-wider text-blue-200">{user.role}</p>
            </div>
            <button 
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
