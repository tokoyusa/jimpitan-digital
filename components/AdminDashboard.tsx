
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
    const totalJimpitan = jimpitanData.reduce((sum, item) => sum + item.jimpitanPortion, 0);
    const totalSavings = jimpitanData.reduce((sum, item) => sum + item.savingsPortion, 0);
    return { totalCollected, totalJimpitan, totalSavings };
  }, [jimpitanData]);

  // RESET TOTAL (URUTAN SANGAT KETAT)
  const handleResetData = async () => {
    if (!confirm("Hapus SELURUH data aplikasi secara permanen?")) return;
    if (!confirm("Sekali lagi: Data tidak bisa dikembalikan. Lanjutkan?")) return;

    setIsResetting(true);
    try {
      if (isConfigured) {
        // Hapus dari tabel anak dulu (yang punya foreign key)
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
      alert("Gagal menghapus data di Cloud. Periksa koneksi atau jalankan SQL CASCADE.");
    } finally {
      setIsResetting(false);
    }
  };

  // HAPUS REGU
  const handleDeleteRegu = async (id: string) => {
    if (!confirm('Hapus regu ini? Akun login regu akan hilang.')) return;
    try {
      if (isConfigured) {
        // Lepaskan warga dari regu ini agar tidak error
        await supabase.from('citizens').update({ regu_id: null }).eq('regu_id', id);
        // Hapus user regu
        await supabase.from('users_app').delete().eq('id', id);
      }
      setUsers(prev => prev.filter(u => u.id !== id));
      alert('Regu berhasil dihapus.');
    } catch (err) {
      alert('Error saat menghapus regu.');
    }
  };

  // HAPUS WARGA (DENGAN MEMBERSIHKAN RIWAYAT DULU)
  const handleDeleteCitizen = async (id: string) => {
    if (!confirm('Hapus warga ini dan seluruh riwayat iurannya?')) return;
    try {
      if (isConfigured) {
        // PAKSA HAPUS ANAK DATA DULU (PENTING!)
        await supabase.from('jimpitan_records').delete().eq('citizen_id', id);
        await supabase.from('attendances').delete().eq('citizen_id', id);
        // BARU HAPUS DATA INDUK
        const { error } = await supabase.from('citizens').delete().eq('id', id);
        if (error) throw error;
        
        await supabase.from('users_app').delete().eq('id', `u-${id}`);
      }
      setCitizens(prev => prev.filter(c => c.id !== id));
      setUsers(prev => prev.filter(u => u.id !== `u-${id}`));
      alert('Warga berhasil dihapus.');
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus warga. Jalankan SQL Skema di Supabase agar sistem mengizinkan penghapusan.');
    }
  };

  const handleAddRegu = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Date.now().toString();
    const newRegu: User = { id, username: newReguName, password: 'regu123', role: UserRole.REGU, reguName: newReguName };
    setUsers([...users, newRegu]);
    setNewReguName('');
    alert('Regu ditambah (Pass: regu123)');
  };

  const handleEditRegu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMode) return;
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('editReguName') as HTMLInputElement).value;
    setUsers(users.map(u => u.id === editMode.id ? { ...u, username: name, reguName: name } : u));
    setEditMode(null);
  };

  const handleAddCitizen = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('citizenName') as HTMLInputElement).value;
    const reguId = (form.elements.namedItem('reguId') as HTMLSelectElement).value;
    const id = Date.now().toString();
    const newCitizen: Citizen = { id, name, reguId: reguId || undefined, displayOrder: citizens.length + 1 };
    setCitizens([...citizens, newCitizen]);
    const newAcc: User = { id: `u-${id}`, username: name, password: 'warga123', role: UserRole.WARGA };
    setUsers(prev => [...prev, newAcc]);
    form.reset();
  };

  const handleEditCitizen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMode) return;
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('editName') as HTMLInputElement).value;
    const reguId = (form.elements.namedItem('editReguId') as HTMLSelectElement).value;
    const order = parseInt((form.elements.namedItem('editOrder') as HTMLInputElement).value) || 0;
    setCitizens(citizens.map(c => c.id === editMode.id ? { ...c, name, reguId: reguId || undefined, displayOrder: order } : c));
    setUsers(users.map(u => u.id === `u-${editMode.id}` ? { ...u, username: name } : u));
    setEditMode(null);
  };

  const moveOrder = (index: number, direction: 'up' | 'down') => {
    const newCitizens = [...sortedCitizens];
    if (direction === 'up' && index > 0) {
      const temp = newCitizens[index].displayOrder;
      newCitizens[index].displayOrder = newCitizens[index - 1].displayOrder;
      newCitizens[index - 1].displayOrder = temp;
    } else if (direction === 'down' && index < newCitizens.length - 1) {
      const temp = newCitizens[index].displayOrder;
      newCitizens[index].displayOrder = newCitizens[index + 1].displayOrder;
      newCitizens[index + 1].displayOrder = temp;
    }
    setCitizens(newCitizens);
  };

  const selectedCitizenData = useMemo(() => {
    if (!selectedCitizenId) return null;
    const citizen = citizens.find(c => c.id === selectedCitizenId);
    if (!citizen) return null;
    const history = jimpitanData.filter(j => j.citizenId === citizen.id);
    return { citizen, history };
  }, [selectedCitizenId, jimpitanData, citizens]);

  return (
    <div className="space-y-6 pb-20">
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
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-xs font-bold text-slate-400">TOTAL</p><h2 className="text-2xl font-bold">Rp {stats.totalCollected.toLocaleString()}</h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-xs font-bold text-blue-400">KAS RT</p><h2 className="text-2xl font-bold text-blue-700">Rp {stats.totalJimpitan.toLocaleString()}</h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-xs font-bold text-emerald-400">TABUNGAN</p><h2 className="text-2xl font-bold text-emerald-700">Rp {stats.totalSavings.toLocaleString()}</h2></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
             <div className="px-6 py-4 border-b font-bold text-sm bg-slate-50 uppercase tracking-widest">Transaksi Terbaru</div>
             <table className="w-full text-left text-sm">
               <tbody className="divide-y">
                 {jimpitanData.slice(0, 10).map(item => (
                   <tr key={item.id} className="hover:bg-slate-50">
                     <td className="px-6 py-4">{item.date}</td>
                     <td className="px-6 py-4 font-bold">{item.citizenName}</td>
                     <td className="px-6 py-4 text-right font-black text-blue-600">Rp {item.amount.toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {activeTab === 'regu' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4 uppercase text-xs">{editMode?.type === 'regu' ? 'Edit Regu' : 'Tambah Regu'}</h3>
            <form onSubmit={editMode?.type === 'regu' ? handleEditRegu : handleAddRegu} className="space-y-4">
              <input name={editMode?.type === 'regu' ? "editReguName" : "reguName"} defaultValue={editMode?.type === 'regu' ? users.find(u => u.id === editMode.id)?.username : ''} placeholder="Nama Regu" className="w-full px-4 py-2 border rounded-xl" required onChange={e => !editMode && setNewReguName(e.target.value)} value={!editMode ? newReguName : undefined} />
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl">{editMode ? 'Update' : 'Simpan'}</button>
              {editMode && <button type="button" onClick={() => setEditMode(null)} className="w-full bg-slate-100 py-2 rounded-xl text-xs mt-2">Batal</button>}
            </form>
          </div>
          <div className="md:col-span-2 space-y-4">
            {users.filter(u => u.role === UserRole.REGU).map(r => (
              <div key={r.id} className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm">
                <div><h4 className="font-bold text-blue-700">{r.username}</h4><p className="text-[10px] text-slate-400">Pass default: regu123</p></div>
                <div className="flex gap-4">
                  <button onClick={() => setEditMode({ type: 'regu', id: r.id })} className="text-blue-500 text-xs font-bold uppercase">Edit</button>
                  <button onClick={() => handleDeleteRegu(r.id)} className="text-red-500 text-xs font-bold uppercase">Hapus</button>
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
                <h3 className="font-bold mb-4 uppercase text-xs">{editMode?.type === 'citizen' ? 'Edit Warga' : 'Tambah Warga'}</h3>
                <form onSubmit={editMode?.type === 'citizen' ? handleEditCitizen : handleAddCitizen} className="space-y-4">
                  {editMode && <input name="editOrder" type="number" placeholder="Urutan" defaultValue={citizens.find(c => c.id === editMode.id)?.displayOrder} className="w-full px-4 py-2 border rounded-xl" />}
                  <input name={editMode ? "editName" : "citizenName"} defaultValue={editMode ? citizens.find(c => c.id === editMode.id)?.name : ''} placeholder="Nama Warga" className="w-full px-4 py-2 border rounded-xl" required />
                  <select name={editMode ? "editReguId" : "reguId"} defaultValue={editMode ? citizens.find(c => c.id === editMode.id)?.reguId : ''} className="w-full px-4 py-2 border rounded-xl">
                    <option value="">-- Tanpa Regu --</option>
                    {users.filter(u => u.role === UserRole.REGU).map(r => <option key={r.id} value={r.id}>{r.username}</option>)}
                  </select>
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl">{editMode ? 'Update' : 'Tambah'}</button>
                  {editMode && <button type="button" onClick={() => setEditMode(null)} className="w-full bg-slate-100 py-2 rounded-xl text-xs">Batal</button>}
                </form>
              </div>
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                    <tr><th className="px-6 py-3">Urut</th><th className="px-6 py-3">Nama</th><th className="px-6 py-3">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedCitizens.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => moveOrder(idx, 'up')} className="p-1 hover:bg-slate-200 rounded">↑</button>
                            <span className="font-bold text-blue-600 px-1">{c.displayOrder}</span>
                            <button onClick={() => moveOrder(idx, 'down')} className="p-1 hover:bg-slate-200 rounded">↓</button>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold cursor-pointer" onClick={() => setSelectedCitizenId(c.id)}>{c.name}</td>
                        <td className="px-6 py-4">
                           <div className="flex gap-4">
                            <button onClick={() => setEditMode({ type: 'citizen', id: c.id })} className="text-blue-500 font-bold text-xs uppercase">Edit</button>
                            <button onClick={() => handleDeleteCitizen(c.id)} className="text-red-500 font-bold text-xs uppercase">Hapus</button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-xl border">
              <button onClick={() => setSelectedCitizenId(null)} className="text-blue-600 font-bold mb-4 uppercase text-xs">← Kembali</button>
              <h2 className="text-2xl font-bold mb-6 text-slate-800">{selectedCitizenData?.citizen.name}</h2>
              <div className="border rounded-xl p-4">
                <h4 className="font-bold mb-3 uppercase text-[10px] text-slate-400">Riwayat Pembayaran</h4>
                <div className="space-y-2">
                  {selectedCitizenData?.history.map(h => (
                    <div key={h.id} className="flex justify-between text-sm py-2 border-b">
                      <span className="text-slate-500">{h.date}</span>
                      <span className="font-bold">Rp {h.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {selectedCitizenData?.history.length === 0 && <p className="text-xs text-slate-400 italic py-4">Belum ada riwayat transaksi.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border space-y-4">
            <h3 className="text-xl font-bold">Pengaturan RT/Desa</h3>
            <input value={settings.villageName} onChange={e => setSettings({...settings, villageName: e.target.value})} className="w-full px-4 py-2 border rounded-xl" placeholder="Nama RT" />
            <textarea value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full px-4 py-2 border rounded-xl" placeholder="Alamat Lengkap" />
            <div className="pt-4 border-t">
               <label className="text-xs font-bold text-slate-400 block mb-1 uppercase">Target Jimpitan Kas (Rp)</label>
               <input type="number" value={settings.jimpitanNominal} onChange={e => setSettings({...settings, jimpitanNominal: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-xl font-bold text-blue-600" />
            </div>
          </div>
          <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
            <h3 className="font-bold text-red-800 mb-2 uppercase text-sm">Hapus Seluruh Data</h3>
            <p className="text-xs text-red-600 mb-6 font-medium">Ini akan membersihkan riwayat iuran dan daftar warga secara permanen dari Cloud.</p>
            <button onClick={handleResetData} disabled={isResetting} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all uppercase tracking-widest">{isResetting ? 'Sedang Menghapus...' : 'RESET SEKARANG'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
