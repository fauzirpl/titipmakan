
export enum UserRole {
  WORKER = 'WORKER',
  OFFICE_BOY = 'OFFICE_BOY',
}

export enum OrderStatus {
  PROSES = 'PROSES',       // Baru masuk
  ORDERED = 'ORDERED',     // Sudah dipesan ke warung
  PAID = 'PAID',           // Sudah dibayar talangan/cash
  SOLD = 'SOLD',           // Stok Habis / Tidak Tersedia (Cancelled)
  PICKED_UP = 'PICKED_UP', // Sudah diambil OB
  FINISH = 'FINISH',       // Sudah diantar ke pemesan
}

export type ItemStatus = 'OK' | 'HABIS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  // New Fields
  phoneNumber?: string;     // No WA untuk Pramu Bakti
  paymentInfo?: string;     // Info Rekening/E-wallet untuk Pramu Bakti
  preferredObId?: string;   // ID Pramu Bakti favorit (untuk Karyawan)
  unitKerja?: string;       // Unit Kerja / Divisi / Lantai
}

export interface MenuItem {
  id: string;
  shopId: string;
  name: string;
  price: number;
  description?: string;
  category: string;
}

export interface Shop {
  id: string;
  name: string;
  address?: string; // Alamat Warung
  isOpen: boolean;
}

export interface OrderItem {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  shopId?: string;
  status?: ItemStatus;
}

export interface Order {
  id: string;
  workerId: string;
  workerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  timestamp: number;
  notes?: string;
  // New Fields
  assignedObId?: string;   // ID Pramu Bakti yang menangani
  assignedObName?: string; // Nama Pramu Bakti snapshot
  workerUnit?: string;     // Unit Kerja Pemesan (Snapshot)
}

export interface CartItem extends OrderItem {
  shopId: string;
}