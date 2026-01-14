
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

  const stats = useMemo(() => {
    const totalCollected = jimpitanData.reduce((sum, item) => sum + item.amount, 0);
    const totalJimpitan = jimpitanData.reduce((sum, item) => sum + (item.jimpitanPortion || 0), 0);
    const totalSavings = jimpitanData.reduce((sum, item) => sum + (item.savingsPortion || 0), 0);
    return { totalCollected, totalJimpitan, totalSavings };
  }, [jimpitanData]);

  // Handle Reset Database
  const handleResetData = async () => {
    if (!confirm("Hapus SELURUH data aplikasi secara permanen?")) return;
    if (!confirm("Sekali lagi: Data tidak bisa dikembalikan. Lanjutkan?")) return;
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
      alert("Gagal menghapus data di Cloud.");
    } finally {
      setIsResetting(false);
    }
  };

  // Handle Delete Regu
  const handleDeleteRegu = async (id: string) => {
    if (!confirm('Hapus regu ini? Akun login regu akan hilang.')) return;
    try {
      if (isConfigured) {
        await supabase.from('citizens').update({ regu_id: null }).eq('regu_id', id);
        await supabase.from('users_app').delete().eq('id', id);
      }
      setUsers(prev => prev.filter(u => u.id !== id));
      alert('Regu berhasil dihapus.');
    } catch (err) {
      alert('Error saat menghapus regu.');
    }
  };

  // Handle Delete Citizen (dengan pembersihan riwayat otomatis agar tidak error)
  const handleDeleteCitizen = async (id: string) => {
    if (!confirm('Hapus warga ini dan seluruh riwayat iurannya?')) return;
    try {
      if (isConfigured) {
        // Hapus data anak terlebih dahulu
        await supabase.from('jimpitan_records').delete().eq('citizen_id', id);
        await supabase.from('attendances').delete().eq('citizen_id', id);
        // Hapus data induk
        const { error } = await supabase.from('citizens').delete().eq('id', id);
        if (error) throw error;
        await supabase.from('users_app').delete().eq('id', `u-${id}`);
      }
      setCitizens(prev => prev.filter(c => c.id !== id));
      setUsers(prev => prev.filter(u => u.id !== `u-${id}`));
      alert('Warga berhasil dihapus.');
    } catch (err) {
      alert('Gagal menghapus warga. Pastikan database mengizinkan cascade delete.');
    }
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
      {/* Tab Navigation */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['overview', 'regu', 'citizens', 'absensi', 'meetings', 'settings'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => { setActiveTab(tab); setSelectedCitizenId(null); setEditMode(null); }} 
            className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600'}`}
          >
            {tab === 'overview' ? 'Ringkasan' : tab === 'regu' ? 'Regu' : tab === 'citizens' ? 'Data Warga' : tab === 'absensi' ? 'Absensi' : tab === 'meetings' ? 'Rapat' : 'Pengaturan'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Terkumpul</p>
              <h2 className="text-2xl font-bold">Rp {stats.totalCollected.toLocaleString()}</h2>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Kas RT (Jimpitan)</p>
              <h2 className="text-2xl font-bold text-blue-700">Rp {stats.totalJimpitan.toLocaleString()}</h2>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Tabungan Warga</p>
              <h2 className="text-2xl font-bold text-emerald-700">Rp {stats.totalSavings.toLocaleString()}</h2>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
             <div className="px-6 py-4 border-b font-bold text-sm bg-slate-50 uppercase tracking-widest">Riwayat Jimpitan Terbaru</div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b">
                    <tr>
                      <th className="px-6 py-3">Tanggal</th>
                      <th className="px-6 py-3">Nama Warga</th>
                      <th className="px-6 py-3">Regu</th>
                      <th className="px-6 py-3 text-right">Jimpitan</th>
                      <th className="px-6 py-3 text-right">Tabungan</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                   {jimpitanData.map(item => (
                     <tr key={item.id} className="hover:bg-slate-50">
                       <td className="px-6 py-4 whitespace-nowrap">{item.date}</td>
                       <td className="px-6 py-4 font-bold">{item.citizenName}</td>
                       <td className="px-6 py-4 text-xs font-medium text-slate-500 uppercase">{item.reguName}</td>
                       <td className="px-6 py-4 text-right text-blue-600 font-medium">Rp {item.jimpitanPortion.toLocaleString()}</td>
                       <td className="px-6 py-4 text-right text-emerald-600 font-medium">Rp {item.savingsPortion.toLocaleString()}</td>
                       <td className="px-6 py-4 text-right font-black text-slate-800">Rp {item.amount.toLocaleString()}</td>
                     </tr>
                   ))}
                   {jimpitanData.length === 0 && (
                     <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">Belum ada transaksi masuk.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'regu' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4 uppercase text-xs text-slate-400 tracking-widest">{editMode?.type === 'regu' ? 'Edit Regu' : 'Tambah Regu Baru'}</h3>
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
                alert('Regu ditambah (Pass: regu123)');
              }
            }} className="space-y-4">
              <input 
                name={editMode?.type === 'regu' ? "editReguName" : "reguName"} 
                defaultValue={editMode?.type === 'regu' ? users.find(u => u.id === editMode.id)?.username : ''} 
                placeholder="Masukkan Nama Regu" 
                className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                required 
                onChange={e => !editMode && setNewReguName(e.target.value)} 
                value={!editMode ? newReguName : undefined} 
              />
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all">
                {editMode ? 'UPDATE REGU' : 'SIMPAN REGU'}
              </button>
              {editMode && <button type="button" onClick={() => setEditMode(null)} className="w-full bg-slate-100 py-2 rounded-xl text-xs text-slate-500 font-bold">BATAL</button>}
            </form>
          </div>
          <div className="md:col-span-2 space-y-4">
            {users.filter(u => u.role === UserRole.REGU).map(r => (
              <div key={r.id} className="bg-white p-6 rounded-xl border shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-blue-700 text-lg uppercase tracking-tight">{r.username}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Password Login: regu123</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setEditMode({ type: 'regu', id: r.id })} className="text-blue-500 text-xs font-bold uppercase hover:underline">Edit</button>
                    <button onClick={() => handleDeleteRegu(r.id)} className="text-red-500 text-xs font-bold uppercase hover:underline">Hapus</button>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                   <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Anggota Warga ({citizens.filter(c => c.reguId === r.id).length}):</p>
                   <div className="flex flex-wrap gap-2">
                     {citizens.filter(c => c.reguId === r.id).map(c => (
                       <span key={c.id} className="bg-white px-2 py-1 rounded text-xs border font-medium text-slate-600">{c.name}</span>
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
                <h3 className="font-bold mb-4 uppercase text-xs text-slate-400 tracking-widest">{editMode?.type === 'citizen' ? 'Edit Warga' : 'Tambah Warga Baru'}</h3>
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
                  {editMode && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Urutan Display</label>
                      <input name="editOrder" type="number" defaultValue={citizens.find(c => c.id === editMode.id)?.displayOrder} className="w-full px-4 py-2 border rounded-xl" />
                    </div>
                  )}
                  <input name={editMode ? "editName" : "citizenName"} defaultValue={editMode ? citizens.find(c => c.id === editMode.id)?.name : ''} placeholder="Nama Lengkap Warga" className="w-full px-4 py-2 border rounded-xl" required />
                  <select name={editMode ? "editReguId" : "reguId"} defaultValue={editMode ? citizens.find(c => c.id === editMode.id)?.reguId : ''} className="w-full px-4 py-2 border rounded-xl">
                    <option value="">-- Tanpa Regu (Pilih Regu) --</option>
                    {users.filter(u => u.role === UserRole.REGU).map(r => <option key={r.id} value={r.id}>{r.username}</option>)}
                  </select>
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all">
                    {editMode ? 'UPDATE DATA WARGA' : 'TAMBAH WARGA'}
                  </button>
                  {editMode && <button type="button" onClick={() => setEditMode(null)} className="w-full bg-slate-100 py-2 rounded-xl text-xs font-bold text-slate-500">BATAL</button>}
                </form>
              </div>
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b">
                    <tr><th className="px-6 py-3">No</th><th className="px-6 py-3">Nama Lengkap</th><th className="px-6 py-3">Regu Pengambil</th><th className="px-6 py-3 text-center">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedCitizens.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-blue-600">{c.displayOrder || idx + 1}</td>
                        <td className="px-6 py-4 font-bold cursor-pointer hover:underline text-slate-800" onClick={() => setSelectedCitizenId(c.id)}>{c.name}</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500 uppercase">{users.find(u => u.id === c.reguId)?.username || '-'}</td>
                        <td className="px-6 py-4">
                            <div className="flex justify-center gap-4">
                              <button onClick={() => setEditMode({ type: 'citizen', id: c.id })} className="text-blue-500 font-bold text-xs uppercase hover:underline">Edit</button>
                              <button onClick={() => handleDeleteCitizen(c.id)} className="text-red-500 font-bold text-xs uppercase hover:underline">Hapus</button>
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-xl border animate-in fade-in slide-in-from-bottom-4">
              <button onClick={() => setSelectedCitizenId(null)} className="text-blue-600 font-black mb-6 flex items-center gap-2 text-sm uppercase">
                <span className="text-xl">←</span> KEMBALI KE DAFTAR WARGA
              </button>
              <div className="flex justify-between items-end mb-8 border-b pb-6">
                 <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">{selectedCitizenData?.citizen.name}</h2>
                    <p className="text-slate-500 font-medium">Regu: {users.find(u => u.id === selectedCitizenData?.citizen.reguId)?.username || 'Tanpa Regu'}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Tabungan</p>
                    <p className="text-2xl font-black text-emerald-600">Rp {selectedCitizenData?.history.reduce((s, r) => s + r.savingsPortion, 0).toLocaleString()}</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-black mb-3 uppercase text-xs text-blue-600 tracking-widest bg-blue-50 p-2 rounded inline-block">Riwayat Pembayaran Jimpitan</h4>
                  <div className="max-h-80 overflow-y-auto divide-y border rounded-xl">
                    {selectedCitizenData?.history.map(h => (
                      <div key={h.id} className="flex justify-between p-4 text-sm hover:bg-slate-50 transition-colors">
                        <span className="text-slate-500 font-medium">{h.date}</span>
                        <div className="text-right">
                           <p className="font-black text-slate-800">Rp {h.amount.toLocaleString()}</p>
                           <p className="text-[9px] text-emerald-500 font-bold">Tabungan: Rp {h.savingsPortion.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                    {selectedCitizenData?.history.length === 0 && <p className="p-8 text-center text-slate-400 italic text-sm">Belum ada riwayat pembayaran.</p>}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-black mb-3 uppercase text-xs text-emerald-600 tracking-widest bg-emerald-50 p-2 rounded inline-block">Riwayat Kehadiran Ronda</h4>
                  <div className="max-h-80 overflow-y-auto divide-y border rounded-xl">
                    {selectedCitizenData?.absensi.map(a => (
                      <div key={a.id} className="flex justify-between p-4 text-sm hover:bg-slate-50 transition-colors">
                        <span className="text-slate-500 font-medium">{a.date}</span>
                        <span className={`font-black uppercase text-xs ${a.status === 'HADIR' ? 'text-emerald-600' : 'text-red-500'}`}>{a.status}</span>
                      </div>
                    ))}
                    {selectedCitizenData?.absensi.length === 0 && <p className="p-8 text-center text-slate-400 italic text-sm">Belum ada riwayat absensi.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'absensi' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b font-bold text-sm bg-slate-50 uppercase tracking-widest">Laporan Absensi Ronda Terkini</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b">
                 <tr><th className="px-6 py-3">Tanggal</th><th className="px-6 py-3">Nama Warga</th><th className="px-6 py-3">Regu Ronda</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Keterangan</th></tr>
              </thead>
              <tbody className="divide-y">
                {attendances.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-500">{a.date}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{citizens.find(c => c.id === a.citizenId)?.name || 'Warga'}</td>
                    <td className="px-6 py-4 text-xs font-medium uppercase text-slate-400">{users.find(u => u.id === a.reguId)?.username || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${a.status === 'HADIR' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {a.status === 'TIDAK_HADIR' ? 'ALFA' : a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium italic">{a.reason || '-'}</td>
                  </tr>
                ))}
                {attendances.length === 0 && <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic uppercase font-bold tracking-widest opacity-50">Belum ada data absensi masuk.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4 uppercase text-xs text-slate-400 tracking-widest">Buat Agenda Rapat</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const agenda = (form.elements.namedItem('agenda') as HTMLInputElement).value;
              const date = (form.elements.namedItem('mDate') as HTMLInputElement).value;
              const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
              setMeetings([...meetings, { id: Date.now().toString(), agenda, date, minutesNumber: `NOTULEN-${Date.now()}`, notes }]);
              form.reset();
            }} className="space-y-4">
              <input name="agenda" placeholder="Agenda / Topik Rapat" className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
              <input name="mDate" type="date" className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
              <textarea name="notes" placeholder="Tulis hasil keputusan rapat atau catatan penting..." className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" rows={4} />
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs">SIMPAN AGENDA</button>
            </form>
          </div>
          <div className="md:col-span-2 space-y-4">
            {meetings.map(m => (
              <div key={m.id} className="bg-white p-6 rounded-xl border shadow-sm group hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-blue-700 text-xl tracking-tight uppercase">{m.agenda}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold uppercase tracking-widest">{m.date}</span>
                  </div>
                  <button onClick={() => setMeetings(meetings.filter(x => x.id !== m.id))} className="text-red-500 text-[10px] font-black uppercase hover:bg-red-50 p-2 rounded transition-colors">Hapus</button>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-blue-400">
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{m.notes}</p>
                </div>
                <div className="mt-4 flex justify-end">
                   <span className="text-[9px] text-slate-400 font-mono bg-white px-2 py-1 border rounded uppercase tracking-tighter">REF: {m.minutesNumber}</span>
                </div>
              </div>
            ))}
            {meetings.length === 0 && (
              <div className="bg-white p-20 rounded-2xl border border-dashed text-center">
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Belum ada agenda rapat yang tersimpan.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border space-y-4">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Identitas Lingkungan</h3>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block tracking-widest">Nama RT / Desa</label>
              <input value={settings.villageName} onChange={e => setSettings({...settings, villageName: e.target.value})} className="w-full px-4 py-3 border rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contoh: RT 01 / RW 05" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block tracking-widest">Alamat Lengkap</label>
              <textarea value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full px-4 py-3 border rounded-xl font-medium text-slate-600 outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Masukkan alamat lengkap wilayah..." />
            </div>
            <div className="pt-4 border-t">
               <label className="text-[10px] font-black text-blue-500 uppercase ml-1 mb-1 block tracking-widest">Nominal Jimpitan Tetap (Rp)</label>
               <input type="number" value={settings.jimpitanNominal} onChange={e => setSettings({...settings, jimpitanNominal: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 border rounded-xl font-black text-blue-600 text-lg" />
               <p className="text-[9px] text-slate-400 mt-2 font-bold italic">* Nilai ini akan membagi otomatis: Sisanya masuk ke Tabungan Warga.</p>
            </div>
          </div>
          <div className="bg-red-50 p-8 rounded-2xl border border-red-100 space-y-4">
            <h3 className="font-black text-red-800 uppercase text-xs tracking-widest">Zona Bahaya</h3>
            <p className="text-xs text-red-600 font-medium leading-relaxed">Gunakan fitur ini hanya jika ingin memulai periode baru. Seluruh data warga, iuran, absensi, dan rapat akan direset permanen di Cloud Supabase.</p>
            <button onClick={handleResetData} disabled={isResetting} className="w-full bg-red-600 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs">
              {isResetting ? 'SEDANG MENGHAPUS...' : 'RESET SELURUH DATABASE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
