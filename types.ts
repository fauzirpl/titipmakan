export enum UserRole {
  WORKER = 'WORKER',
  OFFICE_BOY = 'OFFICE_BOY',
}

export enum OrderStatus {
  PROSES = 'PROSES',       // Baru masuk
  ORDERED = 'ORDERED',     // Sudah dipesan ke warung
  PAID = 'PAID',           // Sudah dibayar talangan/cash
  SOLD = 'SOLD',           // Barang sudah dibeli/ada
  PICKED_UP = 'PICKED_UP', // Sudah diambil OB
  FINISH = 'FINISH',       // Sudah diantar ke pemesan
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // In real app, hash this. Here plain for demo.
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
  isOpen: boolean;
}

export interface OrderItem {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  workerId: string;
  workerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  timestamp: number; // Tanggal pesanan (Unix Timestamp)
  notes?: string;
}

export interface CartItem extends OrderItem {
  shopId: string;
}