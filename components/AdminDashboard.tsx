
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
  const [editMode, setEditMode] = useState<{ type: 'citizen' | 'regu', id: string } | null>(null);
  const [newReguName, setNewReguName] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  const sortedCitizens = useMemo(() => {
    return [...citizens].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [citizens]);

  // Perhitungan statistik dengan fallback agar tidak crash (Blank)
  const stats = useMemo(() => {
    const totalCollected = jimpitanData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalJimpitan = jimpitanData.reduce((sum, item) => sum + (Number(item.jimpitanPortion) || 0), 0);
    const totalSavings = jimpitanData.reduce((sum, item) => sum + (Number(item.savingsPortion) || 0), 0);
    return { totalCollected, totalJimpitan, totalSavings };
  }, [jimpitanData]);

  const handleResetData = async () => {
    if (!confirm("Hapus SELURUH data aplikasi secara permanen?")) return;
    if (!confirm("Konfirmasi Terakhir: Lanjutkan?")) return;
    setIsResetting(true);
    try {
      if (isConfigured) {
        await supabase.from('jimpitan_records').delete().neq('id', '000');
        await supabase.from('attendances').delete().neq('id', '000');
        await supabase.from('meetings').delete().neq('id', '000');
        await supabase.from('citizens').delete().neq('id', '000');
        await supabase.from('users_app').delete().eq('role', UserRole.WARGA);
      }
      setCitizens([]);
      setMeetings([]);
      setAttendances([]);
      setUsers(prev => prev.filter(u => u.role !== UserRole.WARGA));
      alert("Database Cloud berhasil dikosongkan.");
      window.location.reload();
    } catch (e) {
      alert("Gagal menghapus data.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteRegu = async (id: string) => {
    if (!confirm('Hapus regu ini?')) return;
    try {
      if (isConfigured) {
        await supabase.from('citizens').update({ regu_id: null }).eq('regu_id', id);
        await supabase.from('users_app').delete().eq('id', id);
      }
      setUsers(prev => prev.filter(u => u.id !== id));
      alert('Regu dihapus.');
    } catch (err) { alert('Gagal hapus regu.'); }
  };

  const handleDeleteCitizen = async (id: string) => {
    if (!confirm('Hapus warga dan seluruh riwayatnya?')) return;
    try {
      if (isConfigured) {
        await supabase.from('jimpitan_records').delete().eq('citizen_id', id);
        await supabase.from('attendances').delete().eq('citizen_id', id);
        await supabase.from('citizens').delete().eq('id', id);
        await supabase.from('users_app').delete().eq('id', `u-${id}`);
      }
      setCitizens(prev => prev.filter(c => c.id !== id));
      setUsers(prev => prev.filter(u => u.id !== `u-${id}`));
      alert('Warga berhasil dihapus.');
    } catch (err) { alert('Gagal hapus warga.'); }
  };

  const selectedCitizenData = useMemo(() => {
    if (!selectedCitizenId) return null;
    const citizen = citizens.find(c => c.id === selectedCitizenId);
    if (!citizen) return null;
    return {
      citizen,
      history: jimpitanData.filter(j => j.citizenId === citizen.id),
      absensi: attendances.filter(a => a.citizenId === citizen.id)
    };
  }, [selectedCitizenId, jimpitanData, attendances, citizens]);

  return (
    <div className="space-y-6 pb-20">
      {/* Navigation Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['overview', 'regu', 'citizens', 'absensi', 'meetings', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelectedCitizenId(null); setEditMode(null); }} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600'}`}>
            {tab === 'overview' ? 'Ringkasan' : tab === 'regu' ? 'Regu' : tab === 'citizens' ? 'Data Warga' : tab === 'absensi' ? 'Absensi' : tab === 'meetings' ? 'Rapat' : 'Pengaturan'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Masuk</p><h2 className="text-2xl font-bold">Rp {stats.totalCollected.toLocaleString()}</h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Kas RT (Jimpitan)</p><h2 className="text-2xl font-bold text-blue-700">Rp {stats.totalJimpitan.toLocaleString()}</h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Tabungan Warga</p><h2 className="text-2xl font-bold text-emerald-700">Rp {stats.totalSavings.toLocaleString()}</h2></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
             <div className="px-6 py-4 border-b font-bold text-sm bg-slate-50 uppercase tracking-widest">Riwayat Transaksi Jimpitan</div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                    <tr>
                      <th className="px-6 py-3">Tanggal</th>
                      <th className="px-6 py-3">Warga</th>
                      <th className="px-6 py-3">Regu</th>
                      <th className="px-6 py-3 text-right">Jimpitan</th>
                      <th className="px-6 py-3 text-right">Tabungan</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                   {jimpitanData.map(item => (
                     <tr key={item.id} className="hover:bg-slate-50">
                       <td className="px-6 py-4">{item.date}</td>
                       <td className="px-6 py-4 font-bold">{item.citizenName}</td>
                       <td className="px-6 py-4 text-xs font-medium text-slate-500">{item.reguName}</td>
                       <td className="px-6 py-4 text-right text-blue-600">Rp {(item.jimpitanPortion || 0).toLocaleString()}</td>
                       <td className="px-6 py-4 text-right text-emerald-600">Rp {(item.savingsPortion || 0).toLocaleString()}</td>
                       <td className="px-6 py-4 text-right font-black">Rp {item.amount.toLocaleString()}</td>
                     </tr>
                   ))}
                   {jimpitanData.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">Belum ada data.</td></tr>}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'regu' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4 uppercase text-[10px] text-slate-400 tracking-widest">{editMode?.type === 'regu' ? 'Edit Regu' : 'Tambah Regu'}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if(editMode?.type === 'regu') {
                const name = (e.currentTarget.elements.namedItem('editReguName') as HTMLInputElement).value;
                setUsers(users.map(u => u.id === editMode.id ? { ...u, username: name, reguName: name } : u));
                setEditMode(null);
              } else {
                const id = Date.now().toString();
                setUsers([...users, { id, username: newReguName, password: 'regu123', role: UserRole.REGU, reguName: newReguName }]);
                setNewReguName('');
              }
            }} className="space-y-4">
              <input name={editMode?.type === 'regu' ? "editReguName" : "reguName"} defaultValue={editMode?.type === 'regu' ? users.find(u => u.id === editMode.id)?.username : ''} placeholder="Nama Regu" className="w-full px-4 py-2 border rounded-xl" required onChange={e => !editMode && setNewReguName(e.target.value)} value={!editMode ? newReguName : undefined} />
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl">Simpan</button>
            </form>
          </div>
          <div className="md:col-span-2 space-y-4">
            {users.filter(u => u.role === UserRole.REGU).map(r => (
              <div key={r.id} className="bg-white p-5 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-blue-700 text-lg uppercase">{r.username}</h4>
                  <div className="flex gap-4">
                    <button onClick={() => setEditMode({ type: 'regu', id: r.id })} className="text-blue-500 text-xs font-bold uppercase">Edit</button>
                    <button onClick={() => handleDeleteRegu(r.id)} className="text-red-500 text-xs font-bold uppercase">Hapus</button>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                   <p className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Daftar Anggota Warga:</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
                <h3 className="font-bold mb-4 uppercase text-[10px] text-slate-400 tracking-widest">{editMode?.type === 'citizen' ? 'Edit Warga' : 'Tambah Warga'}</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const name = (form.elements.namedItem(editMode ? 'editName' : 'citizenName') as HTMLInputElement).value;
                  const rId = (form.elements.namedItem(editMode ? 'editReguId' : 'reguId') as HTMLSelectElement).value;
                  if(editMode) {
                    const order = parseInt((form.elements.namedItem('editOrder') as HTMLInputElement).value) || 0;
                    setCitizens(citizens.map(c => c.id === editMode.id ? { ...c, name, reguId: rId || undefined, displayOrder: order } : c));
                    setEditMode(null);
                  } else {
                    const id = Date.now().toString();
                    setCitizens([...citizens, { id, name, reguId: rId || undefined, displayOrder: citizens.length + 1 }]);
                    setUsers(prev => [...prev, { id: `u-${id}`, username: name, password: 'warga123', role: UserRole.WARGA }]);
                    form.reset();
                  }
                }} className="space-y-4">
                  {editMode && <input name="editOrder" type="number" placeholder="Urutan Display" defaultValue={citizens.find(c => c.id === editMode.id)?.displayOrder} className="w-full px-4 py-2 border rounded-xl" />}
                  <input name={editMode ? "editName" : "citizenName"} defaultValue={editMode ? citizens.find(c => c.id === editMode.id)?.name : ''} placeholder="Nama Lengkap" className="w-full px-4 py-2 border rounded-xl" required />
                  <select name={editMode ? "editReguId" : "reguId"} defaultValue={editMode ? citizens.find(c => c.id === editMode.id)?.reguId : ''} className="w-full px-4 py-2 border rounded-xl">
                    <option value="">-- Pilih Regu --</option>
                    {users.filter(u => u.role === UserRole.REGU).map(r => <option key={r.id} value={r.id}>{r.username}</option>)}
                  </select>
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl">Simpan</button>
                </form>
              </div>
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                    <tr><th className="px-6 py-3">No</th><th className="px-6 py-3">Nama</th><th className="px-6 py-3">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedCitizens.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-blue-600">{c.displayOrder || idx + 1}</td>
                        <td className="px-6 py-4 font-bold cursor-pointer hover:underline" onClick={() => setSelectedCitizenId(c.id)}>{c.name}</td>
                        <td className="px-6 py-4 flex gap-4">
                            <button onClick={() => setEditMode({ type: 'citizen', id: c.id })} className="text-blue-500 font-bold text-xs">EDIT</button>
                            <button onClick={() => handleDeleteCitizen(c.id)} className="text-red-500 font-bold text-xs">HAPUS</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-xl border">
              <button onClick={() => setSelectedCitizenId(null)} className="text-blue-600 font-bold mb-6 block text-sm">← KEMBALI KE DAFTAR</button>
              <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">{selectedCitizenData?.citizen.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-2xl p-5 bg-slate-50/50">
                  <h4 className="font-bold mb-4 uppercase text-[10px] text-blue-600 tracking-widest">Riwayat Pembayaran</h4>
                  <div className="max-h-60 overflow-y-auto divide-y">
                    {selectedCitizenData?.history.map(h => (
                      <div key={h.id} className="flex justify-between py-3 text-sm">
                        <span className="text-slate-500">{h.date}</span>
                        <div className="text-right font-bold">Rp {h.amount.toLocaleString()} <span className="text-[9px] block text-emerald-500">Tab: Rp {(h.savingsPortion || 0).toLocaleString()}</span></div>
                      </div>
                    ))}
                    {selectedCitizenData?.history.length === 0 && <p className="text-xs text-slate-400 italic py-4">Belum ada riwayat.</p>}
                  </div>
                </div>
                <div className="border rounded-2xl p-5 bg-slate-50/50">
                  <h4 className="font-bold mb-4 uppercase text-[10px] text-emerald-600 tracking-widest">Riwayat Absensi Ronda</h4>
                  <div className="max-h-60 overflow-y-auto divide-y">
                    {selectedCitizenData?.absensi.map(a => (
                      <div key={a.id} className="flex justify-between py-3 text-sm">
                        <span className="text-slate-500">{a.date}</span>
                        <span className={`font-bold ${a.status === 'HADIR' ? 'text-emerald-600' : 'text-red-500'}`}>{a.status === 'TIDAK_HADIR' ? 'ALFA' : a.status}</span>
                      </div>
                    ))}
                    {selectedCitizenData?.absensi.length === 0 && <p className="text-xs text-slate-400 italic py-4">Belum ada riwayat.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'absensi' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b font-bold text-sm bg-slate-50 uppercase tracking-widest">Laporan Absensi Ronda</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                 <tr><th className="px-6 py-3">Tanggal</th><th className="px-6 py-3">Nama</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Alasan</th></tr>
              </thead>
              <tbody className="divide-y">
                {attendances.map(a => (
                  <tr key={a.id}>
                    <td className="px-6 py-4">{a.date}</td>
                    <td className="px-6 py-4 font-bold">{citizens.find(c => c.id === a.citizenId)?.name || 'Warga'}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${a.status === 'HADIR' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span></td>
                    <td className="px-6 py-4 text-xs text-slate-500 italic">{a.reason || '-'}</td>
                  </tr>
                ))}
                {attendances.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">Belum ada data.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4 uppercase text-[10px] text-slate-400 tracking-widest">Agenda Rapat Baru</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const agenda = (form.elements.namedItem('agenda') as HTMLInputElement).value;
              const date = (form.elements.namedItem('mDate') as HTMLInputElement).value;
              const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
              setMeetings([...meetings, { id: Date.now().toString(), agenda, date, minutesNumber: `RT-${Date.now()}`, notes }]);
              form.reset();
            }} className="space-y-4">
              <input name="agenda" placeholder="Agenda Rapat" className="w-full px-4 py-2 border rounded-xl" required />
              <input name="mDate" type="date" className="w-full px-4 py-2 border rounded-xl" required />
              <textarea name="notes" placeholder="Hasil Keputusan" className="w-full px-4 py-2 border rounded-xl" rows={3} />
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl">Simpan Rapat</button>
            </form>
          </div>
          <div className="md:col-span-2 space-y-4">
            {meetings.map(m => (
              <div key={m.id} className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-blue-700 text-lg uppercase tracking-tight">{m.agenda}</h4>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold">{m.date}</span>
                </div>
                <p className="text-sm text-slate-600 mb-3">{m.notes}</p>
                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-mono">{m.minutesNumber}</span>
                  <button onClick={() => setMeetings(meetings.filter(x => x.id !== m.id))} className="text-red-500 text-[10px] font-bold">HAPUS</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border space-y-4">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pengaturan Lingkungan</h3>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Nama Desa / RT</label>
              <input value={settings.villageName} onChange={e => setSettings({...settings, villageName: e.target.value})} className="w-full px-4 py-2 border rounded-xl font-bold" />
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Alamat</label>
              <textarea value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full px-4 py-2 border rounded-xl" rows={2} />
              <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block ml-1">Iuran Jimpitan Tetap (Rp)</label>
              <input type="number" value={settings.jimpitanNominal} onChange={e => setSettings({...settings, jimpitanNominal: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-xl font-black text-blue-600" />
            </div>
          </div>
          <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
            <h3 className="font-bold text-red-800 mb-2 uppercase text-xs tracking-widest">Pembersihan Data</h3>
            <button onClick={handleResetData} disabled={isResetting} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all">
              {isResetting ? 'MENGHAPUS...' : 'RESET DATABASE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
