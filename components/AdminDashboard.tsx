
import React, { useState, useMemo, useRef } from 'react';
import { Settings, User, UserRole, Citizen, JimpitanRecord, Meeting, Attendance } from '../types';
import { supabase, isConfigured } from '../supabase';

declare const XLSX: any;

interface AdminDashboardProps {
  settings: Settings;
  setSettings: (s: Settings) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  citizens: Citizen[];
  setCitizens: (c: Citizen[] | ((prev: Citizen[]) => Citizen[])) => Promise<void>;
  jimpitanData: JimpitanRecord[];
  meetings: Meeting[];
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  attendances: Attendance[];
  setAttendances: (a: Attendance[] | ((prev: Attendance[]) => Attendance[])) => Promise<void>;
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
  
  // State Manual Add Warga
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualWarga, setManualWarga] = useState({ name: '', reguId: '' });

  // State Detail Warga
  const [detailCitizen, setDetailCitizen] = useState<Citizen | null>(null);

  // State Rapat
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ agenda: '', date: new Date().toISOString().split('T')[0], notes: '' });

  // State Pengaturan Profil
  const [editSettings, setEditSettings] = useState<Settings>({ ...settings });

  // State Import Preview
  const [importPreview, setImportPreview] = useState<Citizen[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const [filterType, setFilterType] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [sortOrder, setSortOrder] = useState<'standar' | 'tab_desc' | 'alphabet'>('standar');
  const [isResetting, setIsResetting] = useState(false);
  const [newReguName, setNewReguName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aggregated Data for Overview
  const aggregatedData = useMemo(() => {
    const rawFiltered = jimpitanData.filter(item => {
      if (filterType === 'daily') return item.date === filterDate;
      if (filterType === 'monthly') return item.date.startsWith(filterMonth);
      if (filterType === 'yearly') return item.date.startsWith(filterYear);
      return true;
    });

    if (filterType === 'daily') return rawFiltered;

    const groups: Record<string, JimpitanRecord> = {};
    rawFiltered.forEach(item => {
      if (!groups[item.citizenId]) {
        groups[item.citizenId] = { ...item };
      } else {
        groups[item.citizenId].amount += item.amount;
        groups[item.citizenId].jimpitanPortion += item.jimpitanPortion;
        groups[item.citizenId].savingsPortion += item.savingsPortion;
      }
    });

    return Object.values(groups);
  }, [jimpitanData, filterType, filterDate, filterMonth, filterYear]);

  // Sort Data
  const sortedJimpitan = useMemo(() => {
    return [...aggregatedData].sort((a, b) => {
      switch (sortOrder) {
        case 'tab_desc': return b.savingsPortion - a.savingsPortion;
        case 'alphabet': return a.citizenName.localeCompare(b.citizenName);
        case 'standar':
        default:
          const citA = citizens.find(c => c.id === a.citizenId);
          const citB = citizens.find(c => c.id === b.citizenId);
          return (citA?.displayOrder ?? 9999) - (citB?.displayOrder ?? 9999);
      }
    });
  }, [aggregatedData, sortOrder, citizens]);

  const stats = useMemo(() => {
    return sortedJimpitan.reduce((acc, item) => {
      acc.total += item.amount;
      acc.jimpitan += item.jimpitanPortion;
      acc.savings += item.savingsPortion;
      return acc;
    }, { total: 0, jimpitan: 0, savings: 0 });
  }, [sortedJimpitan]);

  // Detail Logic for Citizen Modal
  const citizenDetailData = useMemo(() => {
    if (!detailCitizen) return null;
    const history = jimpitanData.filter(j => j.citizenId === detailCitizen.id).sort((a,b) => b.date.localeCompare(a.date));
    const attendanceHistory = attendances.filter(a => a.citizenId === detailCitizen.id).sort((a,b) => b.date.localeCompare(a.date));
    const totalSavings = history.reduce((sum, j) => sum + j.savingsPortion, 0);
    return { history, attendanceHistory, totalSavings };
  }, [detailCitizen, jimpitanData, attendances]);

  const handleSaveMeeting = async () => {
    if (!newMeeting.agenda || !newMeeting.date) return alert('Agenda dan Tanggal wajib diisi');
    const meeting: Meeting = {
      id: `mt-${Date.now()}`,
      agenda: newMeeting.agenda,
      date: newMeeting.date,
      notes: newMeeting.notes,
      minutesNumber: `MTN-${new Date(newMeeting.date).getFullYear()}-${Math.floor(Math.random() * 1000)}`
    };
    setMeetings(prev => [...prev, meeting]);
    setNewMeeting({ agenda: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setShowAddMeeting(false);
    alert('Rapat berhasil ditambahkan');
  };

  const handleUpdateSettings = async () => {
    setSettings(editSettings);
    alert('Pengaturan berhasil diperbarui');
  };

  const exportToCSV = () => {
    let periodInfo = filterType === 'daily' ? filterDate : filterType === 'monthly' ? filterMonth : filterYear;
    let csv = `LAPORAN JIMPITAN - ${settings.villageName}\nPeriode: ${periodInfo} (${filterType})\n\nNama Warga,Porsi Jimpitan,Porsi Tabungan,Total Iuran\n`;
    sortedJimpitan.forEach(item => {
      csv += `${item.citizenName},${item.jimpitanPortion},${item.savingsPortion},${item.amount}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_${filterType}_${periodInfo}.csv`;
    a.click();
  };

  const exportCitizensToExcel = () => {
    const dataToExport = citizens.map(c => ({
      "Nama Lengkap": c.name,
      "Regu": users.find(u => u.id === c.reguId)?.username || "Tanpa Regu",
      "Urutan Tampilan": c.displayOrder
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Warga");
    XLSX.writeFile(workbook, `Data_Warga_${settings.villageName.replace(/\s/g, '_')}.xlsx`);
  };

  const handleAddManualWarga = async () => {
    if (!manualWarga.name) return alert('Nama wajib diisi');
    const newCitizen: Citizen = {
      id: `c-man-${Date.now()}`,
      name: manualWarga.name,
      reguId: manualWarga.reguId || undefined,
      displayOrder: citizens.length + 1
    };
    await setCitizens([...citizens, newCitizen]);
    setManualWarga({ name: '', reguId: '' });
    setShowAddManual(false);
  };

  const handleResetData = async () => {
    if (!confirm('Hapus semua data transaksi?')) return;
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
    } catch { alert('Gagal'); } finally { setIsResetting(false); }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Tab Navigation */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['overview', 'regu', 'citizens', 'absensi', 'meetings', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600'}`}>
            {tab === 'overview' ? 'Ringkasan' : tab === 'regu' ? 'Regu' : tab === 'citizens' ? 'Data Warga' : tab === 'absensi' ? 'Absensi' : tab === 'meetings' ? 'Rapat' : 'Pengaturan'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jimpitan (Kas)</p><h2 className="text-2xl font-black text-blue-700">Rp {stats.jimpitan.toLocaleString()}</h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Tabungan Warga</p><h2 className="text-2xl font-black text-emerald-700">Rp {stats.savings.toLocaleString()}</h2></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Masuk</p><h2 className="text-2xl font-black text-slate-800">Rp {stats.total.toLocaleString()}</h2></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 bg-slate-50 border-b space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-800 uppercase text-sm">Laporan Kolektif</h3>
                <button onClick={exportToCSV} className="bg-emerald-600 text-white text-[10px] font-bold px-4 py-2 rounded-lg uppercase tracking-widest">Export CSV</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Durasi</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="w-full text-xs font-bold border rounded-xl px-3 py-2 bg-white outline-none">
                    <option value="daily">Harian</option>
                    <option value="monthly">Bulanan (Total)</option>
                    <option value="yearly">Tahunan (Total)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Waktu</label>
                  {filterType === 'daily' && <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full text-xs font-bold border rounded-xl px-3 py-2" />}
                  {filterType === 'monthly' && <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full text-xs font-bold border rounded-xl px-3 py-2" />}
                  {filterType === 'yearly' && <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full text-xs font-bold border rounded-xl px-3 py-2">{[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}</select>}
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Urutan</label>
                  <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="w-full text-xs font-bold border rounded-xl px-3 py-2 bg-white outline-none">
                    <option value="standar">Standar (Data Warga)</option>
                    <option value="tab_desc">Tabungan Terbanyak</option>
                    <option value="alphabet">Abjad Nama</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b">
                  <tr><th className="px-6 py-4">Warga</th><th className="px-6 py-4 text-right">Jimpitan</th><th className="px-6 py-4 text-right">Tabungan</th><th className="px-6 py-4 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y">
                  {sortedJimpitan.map((item, i) => (
                    <tr key={i} className="hover:bg-blue-50/30">
                      <td className="px-6 py-4 font-bold text-slate-700">{item.citizenName}</td>
                      <td className="px-6 py-4 text-right text-blue-600 font-medium">Rp {item.jimpitanPortion.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-black">Rp {item.savingsPortion.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-800">Rp {item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'citizens' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-3 justify-between bg-white p-4 rounded-2xl border shadow-sm">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowAddManual(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase shadow-md tracking-widest">+ Tambah Warga</button>
              <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase shadow-md tracking-widest">Import Excel</button>
              <button onClick={exportCitizensToExcel} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase shadow-md tracking-widest">Ekspor Excel</button>
              <input type="file" ref={fileInputRef} onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                  const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                  const workbook = XLSX.read(data, { type: 'array' });
                  const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                  const ts = Date.now();
                  const parsed = jsonData.map((row: any, i) => ({
                    id: `c-${ts}-${i}`,
                    name: row["Nama Lengkap"] || "",
                    displayOrder: parseInt(row["Urutan Tampilan"]) || (citizens.length + i + 1),
                    reguId: row["ID Regu"] || undefined
                  })).filter(c => c.name !== "");
                  setImportPreview(parsed as Citizen[]);
                };
                reader.readAsArrayBuffer(file);
              }} accept=".xlsx, .xls" className="hidden" />
            </div>
          </div>

          {showAddManual && (
            <div className="bg-white p-6 rounded-2xl border shadow-lg space-y-4">
              <h3 className="font-bold text-sm uppercase">Input Warga Baru</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={manualWarga.name} onChange={e => setManualWarga({...manualWarga, name: e.target.value})} placeholder="Nama Lengkap" className="px-4 py-2 border rounded-xl outline-none" />
                <select value={manualWarga.reguId} onChange={e => setManualWarga({...manualWarga, reguId: e.target.value})} className="px-4 py-2 border rounded-xl outline-none">
                  <option value="">Tanpa Regu</option>
                  {users.filter(u => u.role === UserRole.REGU).map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddManualWarga} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-xs font-bold">Simpan</button>
                <button onClick={() => setShowAddManual(false)} className="bg-slate-100 px-6 py-2 rounded-xl text-xs font-bold">Batal</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <tr><th className="px-6 py-3">Nama</th><th className="px-6 py-3">Regu Ronda</th><th className="px-6 py-3">Aksi</th></tr>
              </thead>
              <tbody className="divide-y">
                {citizens.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold">{c.name}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{users.find(u => u.id === c.reguId)?.username || '-'}</td>
                    <td className="px-6 py-4 space-x-2 flex items-center">
                      <button onClick={() => setDetailCitizen(c)} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold text-[10px] uppercase">Detail</button>
                      <button onClick={() => setCitizens(prev => Array.isArray(prev) ? prev.filter(x => x.id !== c.id) : [])} className="text-red-500 font-bold text-[10px] uppercase">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DETAIL WARGA */}
      {detailCitizen && citizenDetailData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 bg-blue-700 text-white flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black uppercase leading-tight">{detailCitizen.name}</h3>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-1">Status: Warga</p>
              </div>
              <button onClick={() => setDetailCitizen(null)} className="bg-blue-800/50 hover:bg-blue-900/50 p-2 rounded-xl transition-all">✕</button>
            </div>
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
              {/* Saldo Tabungan Card */}
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Saldo Tabungan</p>
                  <h4 className="text-3xl font-black text-emerald-700 mt-1">Rp {citizenDetailData.totalSavings.toLocaleString()}</h4>
                </div>
                <div className="text-3xl">💰</div>
              </div>

              {/* Riwayat Jimpitan */}
              <div>
                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Riwayat Jimpitan</h5>
                <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[9px] uppercase font-bold text-slate-400">
                      <tr><th className="p-3">Tanggal</th><th className="p-3 text-right">Jimpitan</th><th className="p-3 text-right">Tabungan</th><th className="p-3 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {citizenDetailData.history.slice(0, 10).map((h, i) => (
                        <tr key={i}>
                          <td className="p-3 font-mono text-slate-400">{h.date}</td>
                          <td className="p-3 text-right text-blue-600">Rp {h.jimpitanPortion.toLocaleString()}</td>
                          <td className="p-3 text-right text-emerald-600 font-bold">Rp {h.savingsPortion.toLocaleString()}</td>
                          <td className="p-3 text-right font-black">Rp {h.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {citizenDetailData.history.length === 0 && (
                        <tr><td colSpan={4} className="p-6 text-center italic text-slate-400">Belum ada transaksi</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Riwayat Absensi */}
              <div>
                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Riwayat Absensi Ronda</h5>
                <div className="space-y-2">
                  {citizenDetailData.attendanceHistory.slice(0, 10).map((a, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 border rounded-xl">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 font-mono">{a.date}</p>
                        <p className="text-xs font-bold text-slate-700">{a.meetingId === 'ronda-harian' ? 'Jaga Ronda Malam' : 'Pertemuan RT'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${a.status === 'HADIR' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {a.status === 'HADIR' ? 'HADIR' : a.status === 'TIDAK_HADIR' ? 'ALFA' : 'IZIN'}
                      </span>
                    </div>
                  ))}
                  {citizenDetailData.attendanceHistory.length === 0 && (
                    <p className="text-center py-4 text-xs italic text-slate-400">Belum ada riwayat absensi</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setDetailCitizen(null)} className="px-8 py-3 bg-slate-800 text-white rounded-xl text-xs font-black uppercase">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 uppercase text-sm">Manajemen Rapat RT</h3>
              <button onClick={() => setShowAddMeeting(true)} className="bg-blue-600 text-white text-[10px] font-bold px-4 py-2 rounded-lg uppercase tracking-widest">+ Tambah Rapat Baru</button>
            </div>

            {showAddMeeting && (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 space-y-4 animate-in slide-in-from-top duration-300">
                <h4 className="font-bold text-xs uppercase text-slate-500">Form Rapat Baru</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Tanggal Rapat</label>
                    <input type="date" value={newMeeting.date} onChange={e => setNewMeeting({...newMeeting, date: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Agenda Rapat</label>
                    <input type="text" placeholder="Contoh: Rapat Koordinasi Agustusan" value={newMeeting.agenda} onChange={e => setNewMeeting({...newMeeting, agenda: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">Hasil Rapat / Notulen</label>
                  <textarea rows={3} placeholder="Tuliskan ringkasan hasil rapat..." value={newMeeting.notes} onChange={e => setNewMeeting({...newMeeting, notes: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveMeeting} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase">Simpan Rapat</button>
                  <button onClick={() => setShowAddMeeting(false)} className="bg-white border px-6 py-2 rounded-xl text-xs font-bold uppercase text-slate-400">Batal</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic">Belum ada data rapat.</div>
              ) : (
                meetings.map(m => (
                  <div key={m.id} className="p-5 bg-white border rounded-2xl shadow-sm hover:border-blue-200 transition-all flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[9px] font-black uppercase">{m.date}</span>
                        <h4 className="font-bold text-slate-800">{m.agenda}</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{m.notes}</p>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">No. Notulen: {m.minutesNumber}</p>
                    </div>
                    <button onClick={() => setMeetings(prev => prev.filter(x => x.id !== m.id))} className="text-red-400 hover:text-red-600 p-2">✕</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border space-y-6">
            <h3 className="font-black text-slate-800 uppercase text-sm border-b pb-4">Pengaturan Profil Instansi</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Nama RT / Desa / Instansi</label>
                  <input type="text" value={editSettings.villageName} onChange={e => setEditSettings({...editSettings, villageName: e.target.value})} className="w-full px-4 py-2 border rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Alamat Lengkap</label>
                  <input type="text" value={editSettings.address} onChange={e => setEditSettings({...editSettings, address: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Nominal Jimpitan Standar (Rp)</label>
                <input type="number" value={editSettings.jimpitanNominal} onChange={e => setEditSettings({...editSettings, jimpitanNominal: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-xl font-black text-blue-600" />
              </div>
              <button onClick={handleUpdateSettings} className="w-full bg-blue-600 text-white font-black py-3 rounded-xl uppercase tracking-widest shadow-lg">Simpan Perubahan Profil</button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border text-center space-y-4">
             <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest">Zona Berbahaya</h3>
             <p className="text-[10px] text-slate-400 italic">Menghapus seluruh data transaksi, absensi, dan rapat dari database cloud.</p>
             <button onClick={handleResetData} disabled={isResetting} className="bg-red-50 text-red-600 border border-red-100 font-bold px-8 py-3 rounded-xl text-xs uppercase active:scale-95 transition-all w-full">{isResetting ? 'Sedang Memproses...' : 'Reset Seluruh Database'}</button>
          </div>
        </div>
      )}

      {activeTab === 'absensi' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b font-bold text-sm bg-slate-50 uppercase tracking-widest">Laporan Absensi Ronda Malam</div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b">
               <tr><th className="px-6 py-3">Tanggal</th><th className="px-6 py-3">Nama Warga</th><th className="px-6 py-3">Regu Jaga</th><th className="px-6 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y">
              {attendances.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-[11px] text-slate-400">{a.date}</td>
                  <td className="px-6 py-4 font-bold text-slate-700">{citizens.find(c => c.id === a.citizenId)?.name || 'Warga'}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-400">{users.find(u => u.id === a.reguId)?.username || '-'}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${a.status === 'HADIR' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'regu' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4 uppercase text-[10px] text-slate-400 tracking-widest">Regu Baru</h3>
            <div className="space-y-4">
              <input value={newReguName} onChange={e => setNewReguName(e.target.value)} placeholder="Nama Regu" className="w-full px-4 py-2 border rounded-xl outline-none" />
              <button onClick={() => { if(!newReguName) return; setUsers([...users, { id: `regu-${Date.now()}`, username: newReguName, password: 'regu123', role: UserRole.REGU, reguName: newReguName }]); setNewReguName(''); }} className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl uppercase text-xs">Simpan</button>
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            {users.filter(u => u.role === UserRole.REGU).map(r => (
              <div key={r.id} className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
                <h4 className="font-bold text-blue-700 uppercase tracking-tight">{r.username}</h4>
                <button onClick={() => setUsers(users.filter(u => u.id !== r.id))} className="text-red-500 text-[10px] font-bold uppercase">Hapus</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
