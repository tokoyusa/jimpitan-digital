
import React, { useState, useMemo, useRef } from 'react';
import { User, Citizen, JimpitanRecord, Settings, Meeting, Attendance } from '../types';

interface ReguDashboardProps {
  user: User;
  citizens: Citizen[];
  settings: Settings;
  jimpitanData: JimpitanRecord[];
  setJimpitanData: React.Dispatch<React.SetStateAction<JimpitanRecord[]>>;
  meetings: Meeting[];
  attendances: Attendance[];
  setAttendances: (val: Attendance[] | ((prev: Attendance[]) => Attendance[])) => Promise<void>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

declare const html2canvas: any;

const ReguDashboard: React.FC<ReguDashboardProps> = ({ 
  user, citizens, settings, jimpitanData, setJimpitanData, meetings, attendances, setAttendances, users, setUsers
}) => {
  const [activeTab, setActiveTab] = useState<'jimpitan' | 'absensi' | 'settings'>('jimpitan');
  const [jimpitanDate, setJimpitanDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionInputs, setSessionInputs] = useState<Record<string, number>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [lastSavedRecords, setLastSavedRecords] = useState<JimpitanRecord[]>([]);
  const [tempAttendance, setTempAttendance] = useState<Record<string, { status: 'HADIR' | 'TIDAK_HADIR' | 'IZIN', reason?: string }>>({});
  const [newPassword, setNewPassword] = useState('');
  
  const reportRef = useRef<HTMLDivElement>(null);

  const allOrderedCitizens = useMemo(() => {
    return [...citizens].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [citizens]);

  const myReguMembers = useMemo(() => {
    return citizens
      .filter(c => c.reguId === user.id)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [citizens, user.id]);

  const handleInputChange = (citizenId: string, value: string) => {
    setSessionInputs(prev => ({ ...prev, [citizenId]: parseInt(value) || 0 }));
    setIsSaved(false);
  };

  const handleSaveJimpitan = () => {
    if (allOrderedCitizens.length === 0) return alert('Tidak ada data warga.');
    
    const currentRecords: JimpitanRecord[] = allOrderedCitizens.map((citizen) => {
      const numAmount = sessionInputs[citizen.id] || 0;
      const jPortion = Math.min(numAmount, settings.jimpitanNominal);
      const sPortion = Math.max(0, numAmount - settings.jimpitanNominal);

      return {
        id: `rec-${jimpitanDate}-${citizen.id}`,
        citizenId: citizen.id,
        citizenName: citizen.name,
        amount: numAmount,
        jimpitanPortion: jPortion,
        savingsPortion: sPortion,
        date: jimpitanDate,
        reguName: user.username,
        isSent: false,
        isSaved: true
      };
    });

    setLastSavedRecords(currentRecords);
    setIsSaved(true);
  };

  const handleSendToAdmin = async () => {
    if (!isSaved) return alert('Simpan data dahulu.');
    
    await setJimpitanData(prev => {
      const newBatchIds = new Set(lastSavedRecords.map(r => `${r.date}-${r.citizenId}`));
      const filteredPrev = prev.filter(p => !newBatchIds.has(`${p.date}-${p.citizenId}`));
      return [...filteredPrev, ...lastSavedRecords.map(r => ({ ...r, isSent: true }))];
    });

    setSessionInputs({});
    setIsSaved(false);
    alert('Data Jimpitan terkirim ke Admin!');
  };

  const downloadCSV = () => {
    let csv = `LAPORAN JIMPITAN DIGITAL\nRegu: ${user.username}\nTanggal: ${jimpitanDate}\n\n`;
    csv += "Nomor,Nama Warga,Nominal\n";
    lastSavedRecords.forEach((r, i) => {
      csv += `${i+1},${r.citizenName},${r.amount}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jimpitan_${user.username}_${jimpitanDate}.csv`;
    a.click();
  };

  const downloadAsImage = async (ext: 'png' | 'jpg') => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current);
    const link = document.createElement('a');
    link.download = `Laporan_${user.username}_${jimpitanDate}.${ext}`;
    link.href = canvas.toDataURL(ext === 'png' ? 'image/png' : 'image/jpeg');
    link.click();
  };

  const handleAttendanceSubmit = async () => {
    const entries = Object.entries(tempAttendance);
    if (entries.length === 0) return alert('Isi absensi dahulu.');
    
    const newAtt: Attendance[] = entries.map(([cid, data]) => {
      const attendanceData = data as { status: 'HADIR' | 'TIDAK_HADIR' | 'IZIN', reason?: string };
      return {
        // Gunakan ID unik yang stabil agar logika 'menimpa' di App.tsx berjalan
        id: `att-${jimpitanDate}-${cid}`, 
        meetingId: 'ronda-harian',
        citizenId: cid,
        status: attendanceData.status,
        reason: attendanceData.reason || '',
        date: jimpitanDate,
        reguId: user.id
      };
    });

    // Kirim ke fungsi sinkronisasi di App.tsx
    try {
      await setAttendances(prev => {
        // Hapus entri lama dengan tanggal & warga yang sama (Upsert manual logic)
        const newKeys = new Set(newAtt.map(a => `${a.date}-${a.citizenId}`));
        const filteredPrev = prev.filter(p => !newKeys.has(`${p.date}-${p.citizenId}`));
        return [...filteredPrev, ...newAtt];
      });
      setTempAttendance({});
      alert('Absensi ronda berhasil dikirim ke Admin.');
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim absensi. Pastikan koneksi stabil.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-xl shadow-sm border p-1">
        <button onClick={() => setActiveTab('jimpitan')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${activeTab === 'jimpitan' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Jimpitan</button>
        <button onClick={() => setActiveTab('absensi')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${activeTab === 'absensi' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Absensi</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Profil</button>
      </div>

      {activeTab === 'jimpitan' && (
        <div className="space-y-6">
          <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold uppercase">Input Jimpitan {user.username}</h2>
            <input type="date" value={jimpitanDate} onChange={(e) => setJimpitanDate(e.target.value)} className="mt-4 bg-blue-700 border-none text-white rounded-lg px-4 py-2 w-full outline-none" />
          </div>

          {!isSaved ? (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="divide-y">
                {allOrderedCitizens.map((c, index) => (
                  <div key={c.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-300 w-4">{c.displayOrder || index + 1}</span>
                      <span className="font-medium">{c.name}</span>
                    </div>
                    <input type="number" placeholder="Rp 0" value={sessionInputs[c.id] || ''} onChange={(e) => handleInputChange(c.id, e.target.value)} className="w-32 px-3 py-2 border rounded-xl text-right font-bold" />
                  </div>
                ))}
                {allOrderedCitizens.length === 0 && (
                  <div className="p-8 text-center text-slate-400 italic">Belum ada data warga.</div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t">
                <button onClick={handleSaveJimpitan} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md">Simpan & Lihat Laporan</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-2xl shadow-xl border overflow-x-auto" ref={reportRef}>
                <div className="text-center border-b-2 border-slate-800 pb-4 mb-6 min-w-[300px]">
                  <h1 className="text-xl font-bold uppercase">LAPORAN JIMPITAN WARGA</h1>
                  <p className="text-sm font-semibold">{settings.villageName}</p>
                </div>
                <div className="flex justify-between mb-4 text-xs font-bold min-w-[300px]">
                  <p>REGU: {user.username}</p>
                  <p>TANGGAL: {jimpitanDate}</p>
                </div>
                <table className="w-full text-xs border-collapse border border-slate-800 min-w-[300px]">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-800 p-2">No</th>
                      <th className="border border-slate-800 p-2 text-left">Nama Warga</th>
                      <th className="border border-slate-800 p-2 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastSavedRecords.map((r, i) => (
                      <tr key={r.id}>
                        <td className="border border-slate-800 p-2 text-center">{i+1}</td>
                        <td className="border border-slate-800 p-2">{r.citizenName}</td>
                        <td className="border border-slate-800 p-2 text-right font-bold">Rp {r.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={2} className="border border-slate-800 p-2 text-center uppercase">Total Keseluruhan</td>
                      <td className="border border-slate-800 p-2 text-right">Rp {lastSavedRecords.reduce((s, r) => s + r.amount, 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <button onClick={downloadCSV} className="bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors">CSV</button>
                <button onClick={() => downloadAsImage('png')} className="bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">PNG</button>
                <button onClick={() => downloadAsImage('jpg')} className="bg-slate-700 text-white py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">JPG</button>
              </div>
              
              <button onClick={handleSendToAdmin} className="w-full bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-blue-800 transition-all">KIRIM KE ADMIN</button>
              <button onClick={() => setIsSaved(false)} className="w-full text-slate-500 font-bold hover:text-slate-700 transition-colors py-2">Edit Kembali</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'absensi' && (
        <div className="space-y-6">
          <div className="bg-emerald-600 text-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold uppercase">Absensi Ronda {user.username}</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border divide-y">
            {myReguMembers.map(c => (
              <div key={c.id} className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold">{c.name}</span>
                  <div className="flex gap-1">
                    {(['HADIR', 'TIDAK_HADIR', 'IZIN'] as const).map(s => (
                      <button key={s} onClick={() => setTempAttendance(prev => ({ ...prev, [c.id]: { ...prev[c.id], status: s } }))} className={`px-2 py-1 text-[10px] font-bold rounded border ${tempAttendance[c.id]?.status === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>{s === 'TIDAK_HADIR' ? 'ALFA' : s}</button>
                    ))}
                  </div>
                </div>
                {(tempAttendance[c.id]?.status === 'TIDAK_HADIR' || tempAttendance[c.id]?.status === 'IZIN') && (
                  <input type="text" placeholder="Alasan ketidakhadiran..." value={tempAttendance[c.id]?.reason || ''} onChange={(e) => setTempAttendance(prev => ({ ...prev, [c.id]: { ...prev[c.id], reason: e.target.value } }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500" />
                )}
              </div>
            ))}
            {myReguMembers.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic">Belum ada anggota regu yang terdaftar (Atur anggota di Admin).</div>
            )}
            <div className="p-6 bg-slate-50">
              <button onClick={handleAttendanceSubmit} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors">KIRIM ABSENSI KE ADMIN</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 className="font-bold mb-4">Pengaturan Profil Regu</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nama Regu</label>
              <div className="px-4 py-2 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-100">{user.username}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Ganti Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Masukkan password baru" className="w-full px-4 py-2 border rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button onClick={() => { 
              if(!newPassword) return alert('Password tidak boleh kosong');
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, password: newPassword } : u));
              setNewPassword('');
              alert('Password berhasil diperbarui!');
            }} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200">Update Password</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReguDashboard;
