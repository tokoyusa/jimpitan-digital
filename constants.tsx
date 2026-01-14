
import React from 'react';
import { UserRole, User, Settings, Citizen } from './types';

export const INITIAL_ADMIN: User = {
  id: 'admin-1',
  username: 'admin',
  password: 'password123',
  role: UserRole.ADMIN
};

export const DEFAULT_SETTINGS: Settings = {
  villageName: 'RT 01 / RW 02 Desa Maju Jaya',
  address: 'Jl. Merdeka No. 123',
  jimpitanNominal: 1000
};

export const INITIAL_CITIZENS: Citizen[] = [
  // Fixed missing displayOrder property for each initial citizen
  { id: '1', name: 'Budi Santoso', displayOrder: 1 },
  { id: '2', name: 'Siti Aminah', displayOrder: 2 },
  { id: '3', name: 'Agus Pratama', displayOrder: 3 },
  { id: '4', name: 'Dewi Lestari', displayOrder: 4 }
];

export const INITIAL_USERS: User[] = [
  INITIAL_ADMIN,
  { id: 'regu-1', username: 'Regu Melati', password: 'regu123', role: UserRole.REGU, reguName: 'Regu Melati' },
  { id: 'regu-2', username: 'Regu Mawar', password: 'regu123', role: UserRole.REGU, reguName: 'Regu Mawar' },
  { id: 'warga-1', username: 'warga', password: 'warga123', role: UserRole.WARGA }
];
