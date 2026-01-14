
import React, { useState, useMemo } from 'react';
import { User, UserRole } from '../types';

interface LoginViewProps {
  users: User[];
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const filteredUsersForDropdown = useMemo(() => {
    return users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.REGU);
  }, [users]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('Username atau Password salah');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 tracking-tight uppercase">JIMPITAN DIGITAL</h1>
          <p className="text-slate-500 mt-2 text-sm">Selamat datang, silakan masuk ke akun Anda</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Pilih Akun / Nama Regu</label>
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
              required
            >
              <option value="">-- Pilih Admin atau Regu --</option>
              {filteredUsersForDropdown.map(u => (
                <option key={u.id} value={u.username}>
                  {u.username} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-[0.98]"
          >
            Masuk Sekarang
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Informasi Akses</h3>
          <div className="grid grid-cols-1 gap-2 text-[10px] text-slate-500">
            <div className="bg-slate-50 p-2 rounded">
              <p>Admin: <strong>admin</strong> / Pass: <strong>password123</strong></p>
              <p className="mt-1 text-blue-600">Regu Baru: Password default <strong>regu123</strong></p>
              <p className="text-emerald-600">Warga: Masuk via Nama di Dashboard Admin / Pass: <strong>warga123</strong></p>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-8 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
        aplikasi dibuat oleh YUSAPEDIA 2026
      </footer>
    </div>
  );
};

export default LoginView;
