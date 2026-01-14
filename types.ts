
export enum UserRole {
  ADMIN = 'ADMIN',
  REGU = 'REGU',
  WARGA = 'WARGA'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  reguName?: string;
}

export interface Settings {
  villageName: string;
  address: string;
  jimpitanNominal: number; // Fixed amount in Rupiah, e.g. 1000
}

export interface Citizen {
  id: string;
  name: string;
  reguId?: string; // Links citizen to a User with role REGU
  displayOrder: number; // For manual ordering by Admin
}

export interface JimpitanRecord {
  id: string;
  citizenId: string;
  citizenName: string;
  amount: number;
  jimpitanPortion: number;
  savingsPortion: number;
  date: string;
  reguName: string;
  isSent: boolean;
  isSaved: boolean;
}

export interface Meeting {
  id: string;
  agenda: string;
  date: string;
  minutesNumber: string;
  notes: string;
}

export interface Attendance {
  id: string;
  meetingId: string;
  citizenId: string;
  status: 'HADIR' | 'TIDAK_HADIR' | 'IZIN';
  reason?: string;
  // Fix: Added missing date and reguId properties used in Dashboards
  date: string;
  reguId?: string;
}