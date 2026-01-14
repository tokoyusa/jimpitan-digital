
import React, { useState, useMemo } from 'react';
import { Settings, User, UserRole, Citizen, JimpitanRecord, Meeting, Attendance } from '../types';

interface AdminDashboardProps {
  settings: Settings;
  setSettings: (s: Settings) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  citizens: Citizen[];
  // Fixed: Corrected the type definition for setCitizens which had an extra closing bracket and type usage error
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
  
  // State filter download
  const [downloadPeriod, setDownloadPeriod] = useState<'all' | 'month' | 'year'>('all');
  const [sortCriteria, setSortCriteria] = useState<'order' | 'jimpitan_desc' | 'jimpitan_asc' | 'savings_desc' | 'savings_asc'>('order');

  const sortedCitizens = useMemo(() => {
    return [...citizens].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [citizens]);

  const stats = useMemo(() => {
    const totalCollected = jimpitanData.reduce((sum, item) => sum + item.amount, 0);
    const totalJimpitan = jimpitanData.reduce((sum, item) => sum + item.jimpitanPortion, 0);
    const totalSavings = jimpitanData.reduce((sum, item) => sum + item.savingsPortion, 0);
    return { totalCollected, totalJimpitan, totalSavings };
  }, [jimpitanData]);

  const downloadOverviewCSV = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter data berdasarkan periode
    const filteredData = jimpitanData.filter(item => {
      const d = new Date(item.date);
      if (downloadPeriod === 'month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (downloadPeriod === 'year') return d.getFullYear() === currentYear;
      return true;
    });

    // Hitung agregat per warga
    let reportList = sortedCitizens.map(c => {
      const history = filteredData.filter(j => j.citizenId === c.id);
      const jTotal = history.reduce((s, r) => s + r.jimpitanPortion, 0);
      const sTotal = history.reduce((s, r) => s + r.savingsPortion, 0);
      return { ...c, jTotal, sTotal, total: jTotal + sTotal };
    });

    // Sortir berdasarkan kriteria
    if (sortCriteria === 'jimpitan_desc') reportList.sort((a, b) => b.jTotal - a.jTotal);
    else if (sortCriteria === 'jimpitan_asc') reportList.sort((a, b) => a.jTotal - b.jTotal);
    else if (sortCriteria === 'savings_desc') reportList.sort((a, b) => b.sTotal - a.sTotal);
    else if (sortCriteria === 'savings_asc') reportList.sort((a, b) => a.sTotal - b.sTotal);
    // 'order' menggunakan urutan default sortedCitizens yang sudah dipetakan

    let csv = `REKAPITULASI JIMPITAN WARGA\nDesa: ${settings.villageName}\nPeriode: ${downloadPeriod.toUpperCase()}\n\n`;
    csv += "Urutan,Nama Warga,Total Jimpitan,Total Tabungan,Total Keseluruhan\n";
    
    reportList.forEach((r, idx) => {
      csv += `${r.displayOrder},${r.name},${r.jTotal},${r.sTotal},${r.total}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Jimpitan_${downloadPeriod}_${sortCriteria}.csv`;
    a.click();
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

  const groupedAttendances = useMemo(() => {
    const groups: Record<string, Attendance[]> = {};
    attendances.forEach(a => {
      const regu = users.find(u => u.id === (a as any).reguId)?.username || 'Umum';
      const date = (a as any).date || 'Tanpa Tanggal';
      const key = `${regu} - ${date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return groups;
  }, [attendances, users]);

  // Regu Management
  const handleAddRegu = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Date.now().toString();
    const newRegu: User = { id, username: newReguName, password: 'regu123', role: UserRole.REGU, reguName: newReguName };
    setUsers([...users, newRegu]);
    setNewReguName('');
    alert('Regu berhasil ditambah! Akun: ' + newReguName + ' / pass: regu123');
  };

  const handleEditRegu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMode) return;
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('editReguName') as HTMLInputElement).value;
    setUsers(users.map(u => u.id === editMode.id ? { ...u, username: name, reguName: name } : u));
    setEditMode(null);
    alert('Nama regu diperbarui.');
  };

  const handleDeleteRegu = (id: string) => {
    if (confirm('Hapus regu ini? Akun login regu juga akan terhapus.')) {
      setUsers(users.filter(u => u.id !== id));
      setCitizens(citizens.map(c => c.reguId === id ? { ...c, reguId: undefined } : c));
    }
  };

  // Citizen Management
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
    alert(`Warga ${name} berhasil ditambah.`);
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
    alert('Data warga diperbarui.');
  };

  const handleDeleteCitizen = (id: string) => {
    if (confirm('Hapus warga ini? Data akun juga akan dihapus.')) {
      setCitizens(citizens.filter(c => c.id !== id));
      setUsers(users.filter(u => u.id !== `u-${id}`));
    }
  };

  const addMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const agenda = (form.elements.namedItem('agenda') as HTMLInputElement).value;
    const date = (form.elements.namedItem('meetingDate') as HTMLInputElement).value;
    const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
    const newM: Meeting = { id: Date.now().toString(), agenda, date, notes, minutesNumber: `MTG-${Date.now()}` };
    setMeetings([...meetings, newM]);
    form.reset();
    alert('Agenda rapat disimpan.');
  };

  const selectedCitizenData = useMemo(() => {
    if (!selectedCitizenId) return null;
    const citizen = citizens.find(c => c.id === selectedCitizenId);
    if (!citizen) return null;
    const history = jimpitanData.filter(j => j.citizenId === citizen.id);
    const attHistory = attendances.filter(a => a.citizenId === citizen.id);
    const totalSavings = history.reduce((s, r) => s + r.savingsPortion, 0);
    return { citizen, history, attHistory, totalSavings };
  }, [selectedCitizenId, jimpitanData, attendances, citizens]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['overview', 'regu', 'citizens', 'absensi', 'meetings', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelectedCitizenId(null); setEditMode(null); }} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600'}`}>
            {tab === 'overview' ? 'Ringkasan' : tab === 'regu' ? 'Regu' : tab === 'citizens' ? 'Data Warga' : tab === 'absensi' ? 'Absensi' : tab === 'meetings' ? 'Rapat' : 'Pengaturan'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
            <h3 className="font-bold text-lg">Download Laporan Berdasarkan Urutan Warga</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Periode</label>
                <select value={downloadPeriod} onChange={e => setDownloadPeriod(e.target.value as any)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                  <option value="all">Semua Waktu</option>
                  <option value="month">Bulan Ini</option>
                  <option value="year">Tahun Ini</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Urutkan Berdasarkan</label>
                <select value={sortCriteria} onChange={e => setDownloadPeriod(e.target.value as any)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                  <option value="order">Urutan Warga (Default)</option>
                  <option value="jimpitan_desc">Jimpitan Terbanyak</option>
                  <option value="jimpitan_asc">Jimpitan Terendah</option>
                  <option value="savings_desc">Tabungan Terbanyak</option>
                  <option value="savings_asc">Tabungan Terendah</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={downloadOverviewCSV} className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors">Download Rekap (CSV)</button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Keseluruhan</p><h2 className="text-2xl font-bold">Rp {stats.totalCollected.toLocaleString()}</h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-xs font-bold text-blue-400 uppercase mb-1">Dana Jimpitan RT</p><h2 className="text-2xl font-bold text-blue-700">Rp {stats.totalJimpitan.toLocaleString()}</h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-xs font-bold text-emerald-400 uppercase mb-1">Tabungan Warga</p><h2 className="text-2xl font-bold text-emerald-700">Rp {stats.totalSavings.toLocaleString()}</h2></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b font-bold text-sm">Laporan Transaksi Terbaru</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50"><tr><th className="px-6 py-3">Tgl</th><th className="px-6 py-3">Warga</th><th className="px-6 py-3 text-right">Total</th><th className="px-6 py-3 text-right text-blue-600">Jimpitan</th><th className="px-6 py-3 text-right text-emerald-600">Tabungan</th></tr></thead>
                <tbody className="divide-y">
                  {jimpitanData.slice(-15).reverse().map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">{item.date}</td>
                      <td className="px-6 py-4 font-medium">{item.citizenName}</td>
                      <td className="px-6 py-4 text-right font-bold">Rp {item.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">Rp {item.jimpitanPortion.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">Rp {item.savingsPortion.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'regu' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4">{editMode?.type === 'regu' ? 'Edit Regu' : 'Tambah Regu Baru'}</h3>
            {editMode?.type === 'regu' ? (
              <form onSubmit={handleEditRegu} className="space-y-4">
                <input name="editReguName" defaultValue={users.find(u => u.id === editMode.id)?.username} className="w-full px-4 py-2 border rounded-xl" required />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-sm">Update</button>
                  <button type="button" onClick={() => setEditMode(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-xl text-sm">Batal</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddRegu} className="space-y-4">
                <input value={newReguName} onChange={e => setNewReguName(e.target.value)} placeholder="Nama Regu" className="w-full px-4 py-2 border rounded-xl" required />
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl">Simpan Regu</button>
              </form>
            )}
          </div>
          <div className="md:col-span-2 space-y-4">
            {users.filter(u => u.role === UserRole.REGU).map(r => (
              <div key={r.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-blue-700">{r.username}</h4>
                  <div className="flex gap-3">
                    <button onClick={() => setEditMode({ type: 'regu', id: r.id })} className="text-blue-500 text-xs font-bold">Edit</button>
                    <button onClick={() => handleDeleteRegu(r.id)} className="text-red-500 text-xs font-bold">Hapus</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Daftar Anggota:</p>
                  <div className="flex flex-wrap gap-2">
                    {citizens.filter(c => c.reguId === r.id).map(c => (
                      <span key={c.id} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">{c.name}</span>
                    ))}
                    {citizens.filter(c => c.reguId === r.id).length === 0 && <span className="text-[10px] text-slate-300 italic">Belum ada anggota</span>}
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
                <h3 className="font-bold mb-4">{editMode?.type === 'citizen' ? 'Edit Warga' : 'Tambah Warga'}</h3>
                {editMode?.type === 'citizen' ? (
                  <form onSubmit={handleEditCitizen} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Urutan</label>
                      <input name="editOrder" type="number" defaultValue={citizens.find(c => c.id === editMode.id)?.displayOrder} className="w-full px-4 py-2 border rounded-xl" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Nama Warga</label>
                      <input name="editName" defaultValue={citizens.find(c => c.id === editMode.id)?.name} className="w-full px-4 py-2 border rounded-xl" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Pilih Regu</label>
                      <select name="editReguId" defaultValue={citizens.find(c => c.id === editMode.id)?.reguId || ""} className="w-full px-4 py-2 border rounded-xl">
                        <option value="">-- Tanpa Regu --</option>
                        {users.filter(u => u.role === UserRole.REGU).map(r => <option key={r.id} value={r.id}>{r.username}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-sm">Update</button>
                      <button type="button" onClick={() => setEditMode(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-xl text-sm">Batal</button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleAddCitizen} className="space-y-4">
                    <input name="citizenName" placeholder="Nama Warga" className="w-full px-4 py-2 border rounded-xl" required />
                    <select name="reguId" className="w-full px-4 py-2 border rounded-xl">
                      <option value="">-- Tanpa Regu --</option>
                      {users.filter(u => u.role === UserRole.REGU).map(r => <option key={r.id} value={r.id}>{r.username}</option>)}
                    </select>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl">Tambah Warga</button>
                  </form>
                )}
              </div>
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b font-bold bg-slate-50 flex justify-between items-center">
                  <span>Daftar Warga (List)</span>
                  <span className="text-[10px] text-slate-400 uppercase">Gunakan Tombol ↑↓ Untuk Urutan</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] uppercase text-slate-500">
                        <th className="px-6 py-3 w-16 text-center">No</th>
                        <th className="px-6 py-3 w-20 text-center">Urutan</th>
                        <th className="px-6 py-3">Nama Warga</th>
                        <th className="px-6 py-3">Regu</th>
                        <th className="px-6 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedCitizens.map((c, index) => (
                        <tr key={c.id} className="hover:bg-slate-50 group">
                          <td className="px-6 py-4 font-bold text-slate-300 text-center">{index + 1}</td>
                          <td className="px-6 py-4 text-center">
                             <div className="flex flex-col gap-1 items-center">
                               <button onClick={() => moveOrder(index, 'up')} className={`p-1 hover:bg-slate-200 rounded ${index === 0 ? 'invisible' : ''}`}>↑</button>
                               <span className="font-bold text-blue-600">{c.displayOrder}</span>
                               <button onClick={() => moveOrder(index, 'down')} className={`p-1 hover:bg-slate-200 rounded ${index === sortedCitizens.length - 1 ? 'invisible' : ''}`}>↓</button>
                             </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800 cursor-pointer hover:text-blue-600" onClick={() => setSelectedCitizenId(c.id)}>{c.name}</td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold uppercase">
                              {users.find(u => u.id === c.reguId)?.username || 'UMUM'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditMode({ type: 'citizen', id: c.id })} className="text-blue-500 font-bold text-xs">Edit</button>
                              <button onClick={() => handleDeleteCitizen(c.id)} className="text-red-500 font-bold text-xs">Hapus</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : selectedCitizenData && (
            <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
              <div className="bg-blue-600 text-white p-6">
                <button onClick={() => setSelectedCitizenId(null)} className="text-xs font-bold mb-2">← Kembali</button>
                <h2 className="text-2xl font-bold">{selectedCitizenData.citizen.name}</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border text-center font-bold">
                    <p className="text-[10px] text-slate-400 uppercase">Jimpitan</p>
                    <p>Rp {selectedCitizenData.history.reduce((s, r) => s + r.jimpitanPortion, 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center font-bold">
                    <p className="text-[10px] text-emerald-400 uppercase">Tabungan</p>
                    <p className="text-emerald-700">Rp {selectedCitizenData.totalSavings.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase">Riwayat Pembayaran</h4>
                    <div className="overflow-x-auto border rounded-xl max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 sticky top-0"><tr><th className="p-3">Tanggal</th><th className="p-3 text-right">Jimpitan</th><th className="p-3 text-right">Tabungan</th></tr></thead>
                        <tbody className="divide-y">{selectedCitizenData.history.slice().reverse().map(h => (<tr key={h.id}><td className="p-3">{h.date}</td><td className="p-3 text-right">Rp {h.jimpitanPortion.toLocaleString()}</td><td className="p-3 text-right font-bold text-emerald-600">Rp {h.savingsPortion.toLocaleString()}</td></tr>))}</tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase">Riwayat Absensi</h4>
                    <div className="overflow-x-auto border rounded-xl max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 sticky top-0"><tr><th className="p-3">Tanggal</th><th className="p-3">Status</th><th className="p-3">Alasan</th></tr></thead>
                        <tbody className="divide-y">
                          {selectedCitizenData.attHistory.slice().reverse().map(a => (
                            <tr key={a.id}>
                              <td className="p-3">{(a as any).date || 'N/A'}</td>
                              <td className="p-3 font-bold"><span className={a.status === 'HADIR' ? 'text-emerald-600' : 'text-red-500'}>{a.status}</span></td>
                              <td className="p-3 text-slate-400 italic">{a.reason || '-'}</td>
                            </tr>
                          ))}
                          {selectedCitizenData.attHistory.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-slate-400 italic">Belum ada riwayat absen</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'absensi' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="font-bold mb-6">Riwayat Absensi Ronda</h3>
          <div className="space-y-6">
            {Object.entries(groupedAttendances).reverse().map(([key, list]) => (
              <div key={key} className="border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 px-4 py-2 font-bold text-xs flex justify-between"><span>{key}</span><span>{(list as Attendance[]).length} Orang</span></div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(list as Attendance[]).map(a => (
                    <div key={a.id} className="p-2 bg-white rounded border flex justify-between items-center text-[10px]">
                      <span>{citizens.find(c => c.id === a.citizenId)?.name}</span>
                      <span className={`px-2 rounded font-bold ${a.status === 'HADIR' ? 'text-emerald-600' : 'text-red-600'}`}>{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4">Input Agenda Rapat</h3>
            <form onSubmit={addMeeting} className="space-y-4">
              <input name="agenda" placeholder="Judul Rapat" className="w-full px-4 py-2 border rounded-xl" required />
              <input name="meetingDate" type="date" className="w-full px-4 py-2 border rounded-xl" required />
              <textarea name="notes" placeholder="Catatan/Hasil Rapat" className="w-full px-4 py-2 border rounded-xl" rows={3}></textarea>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl">Simpan Rapat</button>
            </form>
          </div>
          <div className="md:col-span-2 space-y-4">
            {meetings.slice().reverse().map(m => (
              <div key={m.id} className="bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-blue-700">{m.agenda}</h4><span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{m.date}</span></div>
                <p className="text-xs text-slate-600">{m.notes}</p>
                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">No: {m.minutesNumber}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border space-y-6">
          <h3 className="text-xl font-bold">Pengaturan Lingkungan</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-bold text-slate-400">Nama RT/RW/Desa</label><input value={settings.villageName} onChange={e => setSettings({...settings, villageName: e.target.value})} className="w-full px-4 py-2 border rounded-xl" /></div>
            <div><label className="text-xs font-bold text-slate-400">Alamat</label><textarea value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full px-4 py-2 border rounded-xl" /></div>
            <div><label className="text-xs font-bold text-slate-400">Nominal Jimpitan Kas (Rp)</label><input type="number" value={settings.jimpitanNominal} onChange={e => setSettings({...settings, jimpitanNominal: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-xl font-bold text-blue-600" /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
