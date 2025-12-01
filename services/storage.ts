import { MenuItem, Order, Shop, User, UserRole } from '../types';

const API_BASE = 'http://localhost:5000/api';

// Helper untuk menghandle response
const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Terjadi kesalahan' }));
    throw new Error(error.message || `Request gagal dengan status ${res.status}`);
  }
  return res.json();
};

// Helper untuk mapping _id (MongoDB) ke id (Frontend)
const mapId = (item: any) => {
  if (!item) return item;
  const { _id, ...rest } = item;
  return { id: _id, ...rest };
};

export const StorageService = {
  // Auth
  login: async (email: string, password: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (res.status === 401) return null;
      
      const user = await handleResponse(res);
      const mappedUser = mapId(user);
      localStorage.setItem('kk_current_user', JSON.stringify(mappedUser));
      return mappedUser;
    } catch (e) {
      console.error("Login error", e);
      return null;
    }
  },
  
  register: async (name: string, email: string, password: string, role: UserRole): Promise<User> => {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });
    const user = await handleResponse(res);
    const mappedUser = mapId(user);
    localStorage.setItem('kk_current_user', JSON.stringify(mappedUser));
    return mappedUser;
  },

  logout: () => {
    localStorage.removeItem('kk_current_user');
  },

  getCurrentUser: (): User | null => {
    const u = localStorage.getItem('kk_current_user');
    return u ? JSON.parse(u) : null;
  },

  // Shops
  getShops: async (): Promise<Shop[]> => {
    try {
      const res = await fetch(`${API_BASE}/shops`);
      const data = await handleResponse(res);
      return data.map(mapId);
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  // Menggunakan Polling untuk simulasi Real-time pada MongoDB standar
  subscribeToShops: (callback: (shops: Shop[]) => void) => {
    const fetchShops = async () => {
      try {
        const res = await fetch(`${API_BASE}/shops`);
        if(res.ok) {
          const data = await res.json();
          callback(data.map(mapId));
        }
      } catch (e) { /* silent fail on connection lost */ }
    };
    
    fetchShops(); // Initial fetch
    const interval = setInterval(fetchShops, 3000); // Poll every 3s
    return () => clearInterval(interval);
  },

  saveShop: async (shop: Shop) => {
    const { id, ...data } = shop;
    if (id && !id.startsWith('temp')) { // Update
      await fetch(`${API_BASE}/shops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else { // Create
      await fetch(`${API_BASE}/shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
  },

  deleteShop: async (id: string) => {
    await fetch(`${API_BASE}/shops/${id}`, { method: 'DELETE' });
  },

  // Menus
  getMenus: async (): Promise<MenuItem[]> => {
    try {
      const res = await fetch(`${API_BASE}/menus`);
      const data = await handleResponse(res);
      return data.map(mapId);
    } catch (e) { return []; }
  },

  subscribeToMenus: (callback: (menus: MenuItem[]) => void) => {
    const fetchMenus = async () => {
      try {
        const res = await fetch(`${API_BASE}/menus`);
        if(res.ok) {
          const data = await res.json();
          callback(data.map(mapId));
        }
      } catch (e) { }
    };
    fetchMenus();
    const interval = setInterval(fetchMenus, 3000);
    return () => clearInterval(interval);
  },

  saveMenu: async (menu: MenuItem) => {
    const { id, ...data } = menu;
    if (id && !id.startsWith('temp')) {
       await fetch(`${API_BASE}/menus/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
       await fetch(`${API_BASE}/menus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
  },

  deleteMenu: async (id: string) => {
    await fetch(`${API_BASE}/menus/${id}`, { method: 'DELETE' });
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      const data = await handleResponse(res);
      return data.map(mapId);
    } catch (e) { return []; }
  },

  subscribeToOrders: (callback: (orders: Order[]) => void) => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders`);
        if(res.ok) {
          const data = await res.json();
          callback(data.map(mapId));
        }
      } catch (e) { }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 2000); // Faster poll for orders
    return () => clearInterval(interval);
  },

  saveOrder: async (order: Order) => {
    const { id, ...data } = order;
    if (id && !id.startsWith('temp') && id !== '') {
      await fetch(`${API_BASE}/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
  },
};
