
import { MenuItem, Order, Shop, User, UserRole } from '../types';

// KONFIGURASI URL API UNTUK VERCEL
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost 
  ? (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api'
  : '/api';

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Terjadi kesalahan' }));
    throw new Error(error.message || `Request gagal dengan status ${res.status}`);
  }
  return res.json();
};

const mapId = (item: any) => {
  if (!item) return item;
  const { _id, ...rest } = item;
  return { id: _id, ...rest };
};

const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

let isOfflineMode = false;

const safeFetch = async (url: string, options?: RequestInit) => {
  if (isOfflineMode) throw new Error("Offline Mode");
  try {
    const res = await fetch(url, options);
    return res;
  } catch (e) {
    console.warn("Gagal menghubungi server, beralih ke LocalStorage fallback.", e);
    isOfflineMode = true;
    throw e;
  }
};

export const StorageService = {
  // Auth & Users
  login: async (email: string, password: string): Promise<User | null> => {
    try {
      const res = await safeFetch(`${API_BASE}/login`, {
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
      const users = getLocal('kk_users');
      const user = users.find((u: User) => u.email === email && u.password === password);
      if (user) {
         localStorage.setItem('kk_current_user', JSON.stringify(user));
         return user;
      }
      return null;
    }
  },
  
  register: async (name: string, email: string, password: string, role: UserRole, unitKerja: string): Promise<User> => {
    try {
      const res = await safeFetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, unitKerja }),
      });
      const user = await handleResponse(res);
      const mappedUser = mapId(user);
      localStorage.setItem('kk_current_user', JSON.stringify(mappedUser));
      return mappedUser;
    } catch (e) {
      const newUser = { id: Date.now().toString(), name, email, password, role, unitKerja };
      const users = getLocal('kk_users');
      users.push(newUser);
      setLocal('kk_users', users);
      localStorage.setItem('kk_current_user', JSON.stringify(newUser));
      return newUser;
    }
  },

  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    try {
      const res = await safeFetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const user = await handleResponse(res);
      const mappedUser = mapId(user);
      // Update local storage if it's the current user
      const currentUser = StorageService.getCurrentUser();
      if (currentUser && currentUser.id === id) {
        localStorage.setItem('kk_current_user', JSON.stringify(mappedUser));
      }
      return mappedUser;
    } catch (e) {
      const users = getLocal('kk_users');
      const idx = users.findIndex((u: User) => u.id === id);
      if (idx > -1) {
        users[idx] = { ...users[idx], ...data };
        setLocal('kk_users', users);
        const currentUser = StorageService.getCurrentUser();
        if (currentUser && currentUser.id === id) {
             localStorage.setItem('kk_current_user', JSON.stringify(users[idx]));
        }
        return users[idx];
      }
      throw e;
    }
  },

  getUsersByRole: async (role: UserRole): Promise<User[]> => {
    try {
      const res = await safeFetch(`${API_BASE}/users?role=${role}`);
      const data = await handleResponse(res);
      return data.map(mapId);
    } catch (e) {
      const users = getLocal('kk_users');
      return users.filter((u: User) => u.role === role);
    }
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
      const res = await safeFetch(`${API_BASE}/shops`);
      const data = await handleResponse(res);
      return data.map(mapId);
    } catch (e) { return getLocal('kk_shops'); }
  },

  subscribeToShops: (callback: (shops: Shop[]) => void) => {
    const fetchShops = async () => {
      try {
        const res = await safeFetch(`${API_BASE}/shops`);
        if(res.ok) {
          const data = await res.json();
          callback(data.map(mapId));
          isOfflineMode = false;
        }
      } catch (e) { callback(getLocal('kk_shops')); }
    };
    fetchShops();
    const interval = setInterval(fetchShops, 3000);
    return () => clearInterval(interval);
  },

  saveShop: async (shop: Shop) => {
    const { id, ...data } = shop;
    try {
      if (id && !id.startsWith('temp')) {
        await safeFetch(`${API_BASE}/shops/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await safeFetch(`${API_BASE}/shops`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
    } catch (e) {
      let shops = getLocal('kk_shops');
      if (id) {
        shops = shops.map((s: Shop) => s.id === id ? { ...s, ...data } : s);
      } else {
        shops.push({ ...data, id: Date.now().toString() });
      }
      setLocal('kk_shops', shops);
    }
  },

  deleteShop: async (id: string) => {
    try {
      await safeFetch(`${API_BASE}/shops/${id}`, { method: 'DELETE' });
    } catch (e) {
      const shops = getLocal('kk_shops').filter((s: Shop) => s.id !== id);
      setLocal('kk_shops', shops);
    }
  },

  // Menus
  getMenus: async (): Promise<MenuItem[]> => {
    try {
      const res = await safeFetch(`${API_BASE}/menus`);
      const data = await handleResponse(res);
      return data.map(mapId);
    } catch (e) { return getLocal('kk_menus'); }
  },

  subscribeToMenus: (callback: (menus: MenuItem[]) => void) => {
    const fetchMenus = async () => {
      try {
        const res = await safeFetch(`${API_BASE}/menus`);
        if(res.ok) {
          const data = await res.json();
          callback(data.map(mapId));
        }
      } catch (e) { callback(getLocal('kk_menus')); }
    };
    fetchMenus();
    const interval = setInterval(fetchMenus, 3000);
    return () => clearInterval(interval);
  },

  saveMenu: async (menu: MenuItem) => {
    const { id, ...data } = menu;
    try {
      if (id && !id.startsWith('temp')) {
         await safeFetch(`${API_BASE}/menus/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
         await safeFetch(`${API_BASE}/menus`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
    } catch (e) {
      let menus = getLocal('kk_menus');
      if (id) {
        menus = menus.map((m: MenuItem) => m.id === id ? { ...m, ...data } : m);
      } else {
        menus.push({ ...data, id: Date.now().toString() });
      }
      setLocal('kk_menus', menus);
    }
  },

  deleteMenu: async (id: string) => {
    try {
      await safeFetch(`${API_BASE}/menus/${id}`, { method: 'DELETE' });
    } catch (e) {
       const menus = getLocal('kk_menus').filter((m: MenuItem) => m.id !== id);
       setLocal('kk_menus', menus);
    }
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    try {
      const res = await safeFetch(`${API_BASE}/orders`);
      const data = await handleResponse(res);
      return data.map(mapId);
    } catch (e) { return getLocal('kk_orders'); }
  },

  subscribeToOrders: (callback: (orders: Order[]) => void) => {
    const fetchOrders = async () => {
      try {
        const res = await safeFetch(`${API_BASE}/orders`);
        if(res.ok) {
          const data = await res.json();
          callback(data.map(mapId));
        }
      } catch (e) { callback(getLocal('kk_orders')); }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 2000);
    return () => clearInterval(interval);
  },

  saveOrder: async (order: Order) => {
    const { id, ...data } = order;
    try {
      if (id && !id.startsWith('temp') && id !== '') {
        await safeFetch(`${API_BASE}/orders/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await safeFetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
    } catch (e) {
      let orders = getLocal('kk_orders');
      if (id && id !== '') {
        orders = orders.map((o: Order) => o.id === id ? { ...o, ...data } : o);
      } else {
        orders.push({ ...data, id: Date.now().toString() });
      }
      setLocal('kk_orders', orders);
    }
  },
};
