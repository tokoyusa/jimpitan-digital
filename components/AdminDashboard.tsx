
import React, { useState, useMemo } from 'react';
import { Settings, User, UserRole, Citizen, JimpitanRecord, Meeting, Attendance } from '../types';
import { supabase, isConfigured } from '../supabase';

interface AdminDashboardProps {
  settings: Settings;
  setSettings: (s: Settings) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  citizens: Citizen[];
  setCitizens: React.Dispatch<React.SetStateAction<Citizen[]>>;
  jimpitanData: JimpitanRecord[];
  meetings: Meeting[];
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  attendances: Attendance[];
  setAttendances: React.Dispatch<React.SetStateAction<Attendance[]>>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings, setSettings,
  users, setUsers,
  citizens, setCitizens,
  jimpitanData,
  meetings, setMeetings,
  attendances, setAttendances
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'regu' | 'citizens' | 'absensi' | 'meetings' | 'settings'>('overview');
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'default' | 'tab_desc' | 'tab_asc' | 'date_desc' | 'date_asc'>('date_desc');
  const [isResetting, setIsResetting] = useState(false);
  const [newReguName, setNewReguName] = useState('');

  // Perhitungan statistik (Jimpitan vs Tabungan)
  const stats = useMemo(() => {
    return jimpitanData.reduce((acc, item) => {
      const amt = Number(item.amount) || 0;
      const jPart = Number(item.jimpitanPortion) || Math.min(amt, settings.jimpitanNominal || 1000);
      const sPart = Number(item.savingsPortion) || Math.max(0, amt - jPart);
      acc.total += amt;
      acc.jimpitan += jPart;
      acc.savings += sPart;
      return acc;
    }, { total: 0, jimpitan: 0, savings: 0 });
  }, [jimpitanData, settings.jimpitanNominal]);

  // Perintah 2: Sorting Lanjutan (Urutan Dasar, Tabungan, Tanggal)
  const sortedJimpitan = useMemo(() => {
    return [...jimpitanData].sort((a, b) => {
      switch (sortOrder) {
        case 'tab_desc': {
          const sA = Number(a.savingsPortion) || Math.max(0, a.amount - settings.jimpitanNominal);
          const sB = Number(b.savingsPortion) || Math.max(0, b.amount - settings.jimpitanNominal);
          return sB - sA;
        }
        case 'tab_asc': {
          const sA = Number(a.savingsPortion) || Math.max(0, a.amount - settings.jimpitanNominal);
          const sB = Number(b.savingsPortion) || Math.max(0, b.amount - settings.jimpitanNominal);
          return sA - sB;
        }
        case 'date_desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date_asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'default':
        default:
          return 0; // Mengikuti urutan input asli (push order)
      }
    });
  }, [jimpitanData, sortOrder, settings.jimpitanNominal]);

  const exportToCSV = () => {
    let csv = `LAPORAN KEUANGAN JIMPITAN - ${settings.villageName}\n`;
    csv += `Tanggal Export: ${new Date().toLocaleDateString()}\n`;
    csv += `Mode Urutan: ${sortOrder}\n\n`;
    csv += "Tanggal,Nama Warga,Regu,Porsi Jimpitan,Porsi Tabungan,Total Iuran\n";
    
    sortedJimpitan.forEach(item => {
      const jPart = Number(item.jimpitanPortion) || Math.min(item.amount, settings.jimpitanNominal);
      const sPart = Number(item.savingsPortion) || Math.max(0, item.amount - settings.jimpitanNominal);
      csv += `${item.date},${item.citizenName},${item.reguName},${jPart},${sPart},${item.amount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Jimpitan_${sortOrder}.csv`;
    a.click();
  };

  const selectedCitizenInfo = useMemo(() => {
    if (!selectedCitizenId) return null;
    const citizen = citizens.find(c => c.id === selectedCitizenId);
    return {
      citizen,
      history: jimpitanData.filter(j => j.citizenId === selectedCitizenId),
      absensi: attendances.filter(a => a.citizenId === selectedCitizenId)
    };
  }, [selectedCitizenId, jimpitanData, attendances, citizens]);

  const handleResetData = async () => {
    if (!confirm('PERINGATAN! Seluruh data transaksi, absensi, dan rapat akan dihapus permanen. Lanjutkan?')) return;
    
    setIsResetting(true);
    try {
      if (isConfigured) {
        await Promise.all([
          supabase.from('jimpitan_records').delete().neq('id', '0'),
          supabase.from('attendances').delete().neq('id', '0'),
          supabase.from('meetings').delete().neq('id', '0')
        ]);
      }
      window.location.reload();
    } catch (error) {
      console.error("Reset Error:", error);
      alert('Gagal menghapus data. Periksa koneksi internet.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['overview', 'regu', 'citizens', 'absensi', 'meetings', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelectedCitizenId(null); }} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600'}`}>
            {tab === 'overview' ? 'Ringkasan' : tab === 'regu' ? 'Regu' : tab === 'citizens' ? 'Data Warga' : tab === 'absensi' ? 'Absensi' : tab === 'meetings' ? 'Rapat' : 'Pengaturan'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kas RT (Jimpitan)</p><h2 className="text-2xl font-black text-blue-700">Rp {stats.jimpitan.toLocaleString()}</h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Tabungan Warga</p><h2 className="text-2xl font-black text-emerald-700">Rp {stats.savings.toLocaleString()}</h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Keseluruhan</p><h2 className="text-2xl font-black text-slate-800">Rp {stats.total.toLocaleString()}</h2></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
             <div className="px-6 py-4 border-b flex flex-wrap gap-2 justify-between items-center bg-slate-50">
               <span className="font-bold text-sm uppercase tracking-widest">Log Transaksi Keseluruhan</span>
               <div className="flex gap-2">
                 <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="text-[10px] border rounded px-2 py-1 outline-none font-bold bg-white">
                   <option value="date_desc">Tanggal: Terbaru</option>
                   <option value="date_asc">Tanggal: Terlama</option>
                   <option value="tab_desc">Tabungan: Tertinggi</option>
                   <option value="tab_asc">Tabungan: Terendah</option>
                   <option value="default">Urutan Dasar</option>
                 </select>
                 <button onClick={exportToCSV} className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-widest">Export CSV</button>
               </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b">
                    <tr>
                      <th className="px-6 py-3">Warga</th>
                      <th className="px-6 py-3 text-right">Jimpitan (1k)</th>
                      <th className="px-6 py-3 text-right">Tabungan</th>
                      <th className="px-6 py-3 text-right font-black">Total</th>
                      <th className="px-6 py-3">Tanggal</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                   {sortedJimpitan.map(item => {
                     const jPart = Number(item.jimpitanPortion) || Math.min(item.amount, settings.jimpitanNominal);
                     const sPart = Number(item.savingsPortion) || Math.max(0, item.amount - settings.jimpitanNominal);
                     return (
                       <tr key={item.id} className="hover:bg-slate-50">
                         <td className="px-6 py-4 font-bold text-slate-700">{item.citizenName}</td>
                         <td className="px-6 py-4 text-right text-blue-600 font-medium">Rp {jPart.toLocaleString()}</td>
                         <td className="px-6 py-4 text-right text-emerald-600 font-bold">Rp {sPart.toLocaleString()}</td>
                         <td className="px-6 py-4 text-right font-black">Rp {item.amount.toLocaleString()}</td>
                         <td className="px-6 py-4 text-[10px] font-mono text-slate-400">{item.date}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'regu' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4 uppercase text-[10px] text-slate-400 tracking-widest">Tambah Regu Baru</h3>
            <div className="space-y-4">
              <input value={newReguName} onChange={e => setNewReguName(e.target.value)} placeholder="Nama Regu" className="w-full px-4 py-2 border rounded-xl outline-none" />
              <button onClick={() => {
                if(!newReguName) return;
                const id = Date.now().toString();
                setUsers([...users, { id, username: newReguName, password: 'regu123', role: UserRole.REGU, reguName: newReguName }]);
                setNewReguName('');
              }} className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl uppercase text-xs tracking-widest">Simpan Regu</button>
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            {users.filter(u => u.role === UserRole.REGU).map(r => (
              <div key={r.id} className="bg-white p-5 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-blue-700 text-lg uppercase">{r.username}</h4>
                  <button onClick={() => setUsers(users.filter(u => u.id !== r.id))} className="text-red-500 text-[10px] font-bold border border-red-100 px-2 py-1 rounded">HAPUS</button>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                   <p className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Anggota Terdaftar:</p>
                   <div className="flex flex-wrap gap-2">
                     {citizens.filter(c => c.reguId === r.id).map(c => (
                       <span key={c.id} className="bg-white px-2 py-1 rounded text-[11px] border text-slate-600 font-medium">{c.name}</span>
                     ))}
                     {citizens.filter(c => c.reguId === r.id).length === 0 && <span className="text-xs italic text-slate-400">Belum ada anggota.</span>}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'citizens' && (
        <div className="space-y-6">
          {!selectedCitizenId ? (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
               <div className="px-6 py-4 border-b bg-slate-50 font-bold text-sm uppercase tracking-widest">Data Seluruh Warga</div>
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                    <tr><th className="px-6 py-3">Nama</th><th className="px-6 py-3">Regu Ronda</th><th className="px-6 py-3">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {citizens.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold cursor-pointer text-blue-600 hover:underline" onClick={() => setSelectedCitizenId(c.id)}>{c.name}</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{users.find(u => u.id === c.reguId)?.username || '-'}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => setCitizens(citizens.filter(x => x.id !== c.id))} className="text-red-500 font-bold text-[10px] uppercase">Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-xl border">
              <button onClick={() => setSelectedCitizenId(null)} className="text-blue-600 font-bold mb-6 block text-xs uppercase tracking-widest">← Kembali ke Daftar</button>
              <h2 className="text-2xl font-black mb-6 uppercase tracking-tight text-slate-800">{selectedCitizenInfo?.citizen?.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-2xl p-5 bg-slate-50/50 shadow-inner">
                  <h4 className="font-bold mb-4 uppercase text-[10px] text-blue-600 tracking-widest">Riwayat Iuran</h4>
                  <div className="max-h-60 overflow-y-auto divide-y">
                    {selectedCitizenInfo?.history.map(h => (
                      <div key={h.id} className="flex justify-between py-3 text-sm">
                        <span className="text-slate-500 font-mono text-xs">{h.date}</span>
                        <div className="text-right font-bold">Rp {h.amount.toLocaleString()} <span className="text-[9px] block text-emerald-500 font-bold">Tab: Rp {(Number(h.savingsPortion) || 0).toLocaleString()}</span></div>
                      </div>
                    ))}
                    {selectedCitizenInfo?.history.length === 0 && <p className="text-xs py-4 text-slate-400 italic">Belum ada data iuran.</p>}
                  </div>
                </div>
                <div className="border rounded-2xl p-5 bg-slate-50/50 shadow-inner">
                  <h4 className="font-bold mb-4 uppercase text-[10px] text-emerald-600 tracking-widest">Riwayat Absensi Ronda</h4>
                  <div className="max-h-60 overflow-y-auto divide-y">
                    {selectedCitizenInfo?.absensi.map(a => (
                      <div key={a.id} className="flex justify-between py-3 text-sm">
                        <span className="text-slate-500 font-mono text-xs">{a.date}</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${a.status === 'HADIR' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.status === 'TIDAK_HADIR' ? 'ALFA' : a.status}</span>
                      </div>
                    ))}
                    {selectedCitizenInfo?.absensi.length === 0 && <p className="text-xs py-4 text-slate-400 italic">Belum ada data absensi.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'absensi' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b font-bold text-sm bg-slate-50 uppercase tracking-widest">Laporan Absensi (Update dari Regu)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b">
                 <tr><th className="px-6 py-3">Tanggal</th><th className="px-6 py-3">Nama</th><th className="px-6 py-3">Regu</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Keterangan</th></tr>
              </thead>
              <tbody className="divide-y">
                {attendances.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400">{a.date}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{citizens.find(c => c.id === a.citizenId)?.name || 'Warga'}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{users.find(u => u.id === a.reguId)?.username || '-'}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${a.status === 'HADIR' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.status === 'TIDAK_HADIR' ? 'ALFA' : a.status}</span></td>
                    <td className="px-6 py-4 text-xs text-slate-500 italic">{a.reason || '-'}</td>
                  </tr>
                ))}
                {attendances.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic font-medium">Data absensi dari REGU belum masuk.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4 uppercase text-[10px] text-slate-400 tracking-widest">Buat Agenda Rapat</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const agenda = (f.elements.namedItem('agenda') as HTMLInputElement).value;
              const date = (f.elements.namedItem('mDate') as HTMLInputElement).value;
              const notes = (f.elements.namedItem('notes') as HTMLTextAreaElement).value;
              setMeetings([...meetings, { id: Date.now().toString(), agenda, date, minutesNumber: `RT-${Date.now()}`, notes }]);
              f.reset();
            }} className="space-y-4">
              <input name="agenda" placeholder="Agenda Rapat" className="w-full px-4 py-2 border rounded-xl" required />
              <input name="mDate" type="date" className="w-full px-4 py-2 border rounded-xl" required />
              <textarea name="notes" placeholder="Hasil Keputusan..." className="w-full px-4 py-2 border rounded-xl" rows={3} />
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl uppercase text-xs tracking-widest">Simpan Agenda</button>
            </form>
          </div>
          <div className="md:col-span-2 space-y-4">
            {meetings.map(m => (
              <div key={m.id} className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-blue-700 text-lg uppercase tracking-tight">{m.agenda}</h4>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold">{m.date}</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{m.notes}</p>
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-mono">Ref: {m.minutesNumber}</span>
                  <button onClick={() => setMeetings(meetings.filter(x => x.id !== m.id))} className="text-red-500 text-[10px] font-bold uppercase">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border space-y-5">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pengaturan Profil Lingkungan</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1 mb-1">Nama Desa / RT / RW</label>
                <input value={settings.villageName} onChange={e => setSettings({...settings, villageName: e.target.value})} className="w-full px-4 py-3 border rounded-xl font-bold bg-slate-50 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1 mb-1">Alamat Lengkap Lingkungan</label>
                <textarea value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full px-4 py-3 border rounded-xl font-medium bg-slate-50 focus:bg-white transition-all" rows={3} placeholder="Masukkan alamat lengkap..." />
              </div>
              <div>
                <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block ml-1 mb-1">Nominal Jimpitan Tetap (Rp)</label>
                <input type="number" value={settings.jimpitanNominal} onChange={e => setSettings({...settings, jimpitanNominal: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 border rounded-xl font-black text-blue-600 bg-blue-50/30" />
                <p className="text-[10px] text-slate-400 mt-1">* Sisa dari total iuran yang dibayar akan masuk ke TABUNGAN warga.</p>
              </div>
              <button onClick={() => alert('Pengaturan Profil Tersimpan!')} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg">Simpan Perubahan Profil</button>
            </div>
          </div>
          
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-4">Zona Berbahaya</p>
            <button onClick={handleResetData} disabled={isResetting} className="bg-red-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest">
              {isResetting ? 'MENGHAPUS...' : 'RESET SELURUH DATABASE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
