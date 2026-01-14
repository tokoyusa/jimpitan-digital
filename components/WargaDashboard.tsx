
import React, { useMemo, useState } from 'react';
import { Settings, JimpitanRecord, Meeting, Attendance, Citizen, User } from '../types';

interface WargaDashboardProps {
  user: User;
  settings: Settings;
  jimpitanData: JimpitanRecord[];
  meetings: Meeting[];
  attendances: Attendance[];
  citizens: Citizen[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const WargaDashboard: React.FC<WargaDashboardProps> = ({
  user, settings, jimpitanData, meetings, attendances, citizens, setUsers
}) => {
  const [activeTab, setActiveTab] = useState<'transparansi' | 'riwayat' | 'settings'>('transparansi');
  const [newPassword, setNewPassword] = useState('');

  // Personal jimpitan history
  const myHistory = useMemo(() => {
    return jimpitanData.filter(item => item.citizenName === user.username);
  }, [jimpitanData, user.username]);

  const totals = useMemo(() => {
    const totalCollected = jimpitanData.reduce((sum, item) => sum + item.amount, 0);
    const totalJimpitan = jimpitanData.reduce((sum, item) => sum + item.jimpitanPortion, 0);
    return { totalCollected, totalJimpitan };
  }, [jimpitanData]);

  const myTotals = useMemo(() => {
    const total = myHistory.reduce((sum, item) => sum + item.amount, 0);
    const savings = myHistory.reduce((sum, item) => sum + item.savingsPortion, 0);
    return { total, savings };
  }, [myHistory]);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, password: newPassword } : u));
    setNewPassword('');
    alert('Password berhasil diperbarui!');
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1 mb-4">
        <button 
          onClick={() => setActiveTab('transparansi')}
          className={`flex-1 py-2 rounded-lg font-bold transition-all text-sm ${activeTab === 'transparansi' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Transparansi
        </button>
        <button 
          onClick={() => setActiveTab('riwayat')}
          className={`flex-1 py-2 rounded-lg font-bold transition-all text-sm ${activeTab === 'riwayat' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Riwayat Saya
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 rounded-lg font-bold transition-all text-sm ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Profil
        </button>
      </div>

      {activeTab === 'transparansi' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-8 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold mb-2">Transparansi Dana {settings.villageName}</h2>
            <p className="text-blue-100 text-sm">{settings.address}</p>
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                <p className="text-xs uppercase tracking-wider text-blue-200 mb-1">Saldo Kas RT (Jimpitan)</p>
                <p className="text-xl font-bold text-white">Rp {totals.totalJimpitan.toLocaleString()}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                <p className="text-xs uppercase tracking-wider text-blue-200 mb-1">Total Tabungan Warga</p>
                <p className="text-xl font-bold text-white">Rp {(totals.totalCollected - totals.totalJimpitan).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-800">
              Informasi Rapat & Agenda
            </div>
            <div className="p-6">
              {meetings.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="italic">Belum ada agenda rapat terjadwal</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {meetings.map(m => (
                    <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-blue-800">{m.agenda}</h4>
                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{m.date}</span>
                      </div>
                      <p className="text-sm text-slate-600">{m.notes}</p>
                      <p className="text-xs text-slate-400 mt-2">Nomor Notulen: {m.minutesNumber}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'riwayat' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Iuran Saya</p>
              <p className="text-xl font-bold text-slate-800">Rp {myTotals.total.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-emerald-400 uppercase mb-1">Tabungan Saya</p>
              <p className="text-xl font-bold text-emerald-600">Rp {myTotals.savings.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-800">
              Riwayat Pembayaran {user.username}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-6 py-3">Tanggal</th>
                    <th className="px-6 py-3 text-right">Nominal</th>
                    <th className="px-6 py-3 text-right">Tabungan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myHistory.slice().reverse().map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">Rp {item.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-emerald-600">Rp {item.savingsPortion.toLocaleString()}</td>
                    </tr>
                  ))}
                  {myHistory.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">Anda belum memiliki riwayat pembayaran.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            Profil & Keamanan
          </h3>
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Nama Warga</p>
              <p className="font-bold text-slate-700">{user.username}</p>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4 border-t">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ganti Password Baru</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-blue-700 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-all">
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WargaDashboard;
