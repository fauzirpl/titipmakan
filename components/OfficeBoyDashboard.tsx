import React, { useEffect, useState, useRef } from 'react';
import { MenuItem, Order, OrderStatus, Shop, User, OrderItem } from '../types';
import { StorageService } from '../services/storage';
import { Button, Card, Input, StatusBadge, Toast } from './ui';
import { ClipboardList, Store, Plus, Trash2, Edit2, Save, History, Bell, BarChart3, Check, X, Wallet, AlertTriangle } from 'lucide-react';

interface OfficeBoyDashboardProps {
  user: User;
}

export const OfficeBoyDashboard: React.FC<OfficeBoyDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'history' | 'manage'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [toast, setToast] = useState<{message: string, type?: 'info'|'success'} | null>(null);

  // Forms
  const [newShopName, setNewShopName] = useState('');
  const [newMenu, setNewMenu] = useState<Partial<MenuItem>>({ name: '', price: 0, category: 'Makanan' });
  const [selectedShopForMenu, setSelectedShopForMenu] = useState<string>('');

  // Edit States
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState('');
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);

  // Refs for tracking changes
  const prevOrderIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Subscribe without selection logic inside callback to avoid stale closure issues
    const unsubscribeShops = StorageService.subscribeToShops(setShops);
    const unsubscribeMenus = StorageService.subscribeToMenus(setMenus);
    const unsubscribeOrders = StorageService.subscribeToOrders((allOrders) => {
        setOrders(allOrders.sort((a, b) => b.timestamp - a.timestamp));
    });

    return () => {
        unsubscribeShops();
        unsubscribeMenus();
        unsubscribeOrders();
    };
  }, []);

  // Separate effect to handle default shop selection validation
  // This runs whenever shops or selection changes, ensuring we have fresh state
  useEffect(() => {
    if (shops.length > 0) {
      const exists = shops.find(s => s.id === selectedShopForMenu);
      // If currently selected shop doesn't exist (deleted or initial load), select the first one
      if (!exists) {
        setSelectedShopForMenu(shops[0].id);
      }
    }
  }, [shops, selectedShopForMenu]);

  // Notification Logic for New Orders
  useEffect(() => {
    if (isFirstLoad.current) {
      if (orders.length > 0) {
        orders.forEach(o => prevOrderIds.current.add(o.id));
        isFirstLoad.current = false;
      }
      return;
    }

    let hasNew = false;
    orders.forEach(order => {
      if (!prevOrderIds.current.has(order.id)) {
        hasNew = true;
        prevOrderIds.current.add(order.id);
        
        const msg = `Pesanan Baru dari ${order.workerName}!`;
        // In-app Toast
        setToast({ message: msg, type: 'info' });
        
        // Browser Notification
        if (Notification.permission === 'granted') {
           new Notification('KantinKantor - Pesanan Baru', {
            body: `${order.workerName} memesan ${order.items.length} item.`,
            icon: '/icon.png'
          });
        }
      }
    });
  }, [orders]);

  const updateOrderStatus = async (order: Order, newStatus: OrderStatus) => {
    const updatedOrder = { ...order, status: newStatus };
    await StorageService.saveOrder(updatedOrder);
    setToast({ message: `Status order ${order.workerName} diperbarui`, type: 'success' });
  };

  const toggleItemStatus = async (order: Order, itemIndex: number) => {
     const newItems = [...order.items];
     const currentStatus = newItems[itemIndex].status;
     
     // Toggle Status
     newItems[itemIndex].status = currentStatus === 'HABIS' ? 'OK' : 'HABIS';

     // Recalculate Total
     // Hitung ulang total hanya dari item yang TIDAK 'HABIS'
     const newTotal = newItems.reduce((acc, curr) => {
        if (curr.status === 'HABIS') return acc;
        return acc + (curr.price * curr.quantity);
     }, 0);

     const updatedOrder: Order = {
        ...order,
        items: newItems,
        totalAmount: newTotal
     };

     await StorageService.saveOrder(updatedOrder);
     setToast({ 
       message: newItems[itemIndex].status === 'HABIS' ? 'Item ditandai HABIS. Total harga dikurangi.' : 'Item tersedia kembali.', 
       type: 'info' 
     });
  };

  const addShop = async () => {
    if (!newShopName) return;
    const shop: Shop = { id: '', name: newShopName, isOpen: true }; // Firestore generates ID if empty or we handle it in service
    await StorageService.saveShop(shop);
    setNewShopName('');
    setToast({ message: 'Warung berhasil ditambah', type: 'success' });
  };

  const startEditingShop = (shop: Shop) => {
    setEditingShopId(shop.id);
    setEditingShopName(shop.name);
  };

  const cancelEditingShop = () => {
    setEditingShopId(null);
    setEditingShopName('');
  };

  const saveShopName = async () => {
    if (!editingShopId || !editingShopName.trim()) return;
    
    const shopToUpdate = shops.find(s => s.id === editingShopId);
    if (shopToUpdate) {
      await StorageService.saveShop({ ...shopToUpdate, name: editingShopName });
      setToast({ message: 'Nama warung diperbarui', type: 'success' });
      setEditingShopId(null);
      setEditingShopName('');
    }
  };

  const deleteShop = async (id: string) => {
    if (confirm('Yakin hapus warung ini? Menu didalamnya juga akan terhapus.')) {
      await StorageService.deleteShop(id);
      
      // Cleanup menus for this shop
      const shopMenus = menus.filter(m => m.shopId === id);
      shopMenus.forEach(async m => await StorageService.deleteMenu(m.id));
      
      setToast({ message: 'Warung dihapus', type: 'info' });
      
      // If deleted shop was selected, clear selection or select another
      if (selectedShopForMenu === id) {
        setSelectedShopForMenu(shops.find(s => s.id !== id)?.id || '');
      }
    }
  };

  // Menu Functions
  const startEditingMenu = (menu: MenuItem) => {
    setEditingMenuId(menu.id);
    setNewMenu({ name: menu.name, price: menu.price, category: menu.category });
  };

  const cancelEditingMenu = () => {
    setEditingMenuId(null);
    setNewMenu({ name: '', price: 0, category: 'Makanan' });
  };

  const saveMenu = async () => {
    if (!newMenu.name || !newMenu.price || !selectedShopForMenu) return;
    
    const menuPayload: MenuItem = {
      id: editingMenuId || '', // If ID exists, it updates. If empty, it creates.
      shopId: selectedShopForMenu,
      name: newMenu.name,
      price: Number(newMenu.price),
      category: newMenu.category || 'Makanan',
    };
    
    await StorageService.saveMenu(menuPayload);
    
    setNewMenu({ name: '', price: 0, category: 'Makanan' });
    setEditingMenuId(null);
    setToast({ message: editingMenuId ? 'Menu berhasil diperbarui' : 'Menu berhasil ditambah', type: 'success' });
  };

  const deleteMenu = async (id: string) => {
    if (confirm('Yakin ingin menghapus menu ini?')) {
      await StorageService.deleteMenu(id);
      if (editingMenuId === id) cancelEditingMenu();
      setToast({ message: 'Menu berhasil dihapus', type: 'info' });
    }
  };

  const statusFlow = [
    OrderStatus.PROSES,
    OrderStatus.ORDERED,
    OrderStatus.SOLD,
    OrderStatus.PICKED_UP,
    OrderStatus.FINISH
  ];

  const getNextStatus = (current: OrderStatus) => {
    const idx = statusFlow.indexOf(current);
    if (idx >= 0 && idx < statusFlow.length - 1) return statusFlow[idx + 1];
    return null;
  };

  // Split Active and History Orders
  // "Jika status sold, selesaikan orderan juga" -> Treat SOLD as a finished state in the view
  const activeOrders = orders.filter(o => o.status !== OrderStatus.FINISH && o.status !== OrderStatus.SOLD);
  const historyOrders = orders.filter(o => o.status === OrderStatus.FINISH || o.status === OrderStatus.SOLD);

  // Calculate Status Counts
  const statusCounts = activeOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate Total Revenue from History
  const totalRevenue = historyOrders.reduce((acc, order) => acc + order.totalAmount, 0);

  const statConfig: Record<string, { label: string, color: string, bg: string }> = {
    [OrderStatus.PROSES]: { label: 'Diproses', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
    [OrderStatus.ORDERED]: { label: 'Dipesan', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    [OrderStatus.PAID]: { label: 'Dibayar', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    [OrderStatus.SOLD]: { label: 'Terbeli', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    [OrderStatus.PICKED_UP]: { label: 'Diambil', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  };

  // Removed SOLD from active statuses list since it now moves to history
  const activeStatuses = [OrderStatus.PROSES, OrderStatus.ORDERED, OrderStatus.PAID, OrderStatus.PICKED_UP];

  return (
    <div className="max-w-6xl mx-auto p-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Panel Pramu Bakti</h2>
          <p className="text-gray-500">Kelola pesanan dan warung</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border shadow-sm w-full md:w-auto overflow-x-auto">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <ClipboardList size={16} /> Pesanan Aktif ({activeOrders.length})
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <History size={16} /> Riwayat
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'manage' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
             <div className="flex items-center justify-center gap-2">
              <Store size={16} /> Kelola Warung
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg flex items-center gap-3 text-sm mb-2">
             <Bell className="flex-shrink-0" size={18} />
             <span>Notifikasi aktif: Anda akan diberitahu jika ada pesanan baru masuk.</span>
           </div>

           {/* Status Summary Cards */}
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
            {activeStatuses.map(status => {
               const config = statConfig[status];
               const count = statusCounts[status] || 0;
               return (
                <div key={status} className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${config.bg} ${count > 0 ? 'opacity-100 shadow-sm' : 'opacity-60 bg-gray-50 border-gray-100'}`}>
                  <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${config.color}`}>{config.label}</span>
                  <span className={`text-2xl font-bold ${config.color}`}>{count}</span>
                </div>
               );
            })}
           </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeOrders.map(order => (
              <Card key={order.id} className="border-blue-100 shadow-md">
                <div className="flex justify-between items-start mb-3 border-b pb-2 border-gray-100">
                  <div>
                    <h3 className="font-bold text-gray-800">{order.workerName}</h3>
                    <div className="text-xs text-gray-500">Order #{order.id.slice(0, 6)}...</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-1">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => {
                    const shopName = shops.find(s => s.id === item.shopId)?.name;
                    const isHabis = item.status === 'HABIS';
                    return (
                      <div key={idx} className={`text-sm border rounded p-2 ${isHabis ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-transparent'}`}>
                         <div className="flex justify-between items-center">
                           <span className={`text-gray-700 ${isHabis ? 'line-through opacity-60' : ''}`}>
                             {item.quantity}x {item.name}
                             {shopName && <span className="text-xs text-gray-500 ml-1">({shopName})</span>}
                           </span>
                           {order.status === OrderStatus.PROSES && (
                             <button 
                               onClick={() => toggleItemStatus(order, idx)}
                               className={`px-2 py-0.5 text-xs rounded border transition-colors ${isHabis ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-500 hover:bg-gray-200'}`}
                               title={isHabis ? "Tandai Tersedia" : "Tandai Habis"}
                             >
                               {isHabis ? 'HABIS' : 'Ada?'}
                             </button>
                           )}
                         </div>
                         {item.notes && <div className="text-xs text-gray-500 italic ml-4">- {item.notes}</div>}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center mb-4 pt-2 border-t border-dashed border-gray-200">
                   <span className="text-sm text-gray-500">Total</span>
                   <span className="font-bold text-gray-900">Rp{order.totalAmount.toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select 
                    className="col-span-2 w-full p-2 text-sm border rounded bg-white"
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order, e.target.value as OrderStatus)}
                  >
                     {Object.values(OrderStatus).map(s => (
                       <option key={s} value={s}>{s}</option>
                     ))}
                  </select>
                  
                  {order.status !== OrderStatus.FINISH && order.status !== OrderStatus.PAID && order.status !== OrderStatus.SOLD && (
                    <Button 
                      onClick={() => updateOrderStatus(order, OrderStatus.PAID)}
                      variant="secondary"
                      className="text-xs py-1"
                    >
                      Tandai Dibayar
                    </Button>
                  )}
                  
                  {getNextStatus(order.status) && (
                     <Button 
                      onClick={() => updateOrderStatus(order, getNextStatus(order.status)!)}
                      className="col-span-2 text-xs py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Lanjut ke: {getNextStatus(order.status)}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            {activeOrders.length === 0 && (
              <p className="text-gray-500 col-span-full text-center py-10 bg-white rounded-lg border border-dashed">
                Tidak ada pesanan aktif saat ini.
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Pesanan Selesai</p>
                <p className="text-2xl font-bold text-gray-800">{historyOrders.length}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full text-green-600 border border-green-100">
                <Check size={24} />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Pendapatan</p>
                <p className="text-2xl font-bold text-blue-600">Rp{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full text-blue-600 border border-blue-100">
                <BarChart3 size={24} />
              </div>
            </div>
          </div>

          <Card title="Riwayat Pesanan Selesai & Terbeli (SOLD)">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Pemesan</th>
                    <th className="px-4 py-3">Detail Item</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyOrders.map(order => (
                    <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(order.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{order.workerName}</td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          {order.items.map((i, idx) => {
                             const shopName = shops.find(s => s.id === i.shopId)?.name;
                             const isHabis = i.status === 'HABIS';
                             return (
                               <div key={idx} className={`truncate ${isHabis ? 'text-red-400 line-through' : ''}`}>
                                 {i.quantity}x {i.name}
                                 {shopName && <span className="text-gray-400 text-xs ml-1">({shopName})</span>}
                                 {i.notes && <span className="text-gray-400 italic text-xs"> ({i.notes})</span>}
                                 {isHabis && <span className="text-red-500 text-xs font-bold no-underline ml-1"> (HABIS)</span>}
                               </div>
                             );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">Rp{order.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                  {historyOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada riwayat pesanan selesai.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shop List Column */}
          <div className="lg:col-span-1 space-y-6">
            <Card title="Tambah Warung">
              <div className="flex gap-2">
                <input 
                  className="flex-1 px-3 py-2 border rounded text-sm"
                  placeholder="Nama Warung..."
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                />
                <Button onClick={addShop} className="px-3"><Plus size={18}/></Button>
              </div>
            </Card>

            <div className="space-y-3">
              {shops.map(shop => (
                <div 
                  key={shop.id} 
                  onClick={() => {
                    // Only select if not editing shop name
                    if (editingShopId !== shop.id) {
                      setSelectedShopForMenu(shop.id);
                      cancelEditingMenu(); // Reset menu form when switching shops
                    }
                  }}
                  className={`p-4 rounded-lg border transition-all flex justify-between items-center ${selectedShopForMenu === shop.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-200 hover:border-blue-300'} ${editingShopId === shop.id ? 'bg-yellow-50 border-yellow-300' : 'cursor-pointer'}`}
                >
                  {editingShopId === shop.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input 
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={editingShopName}
                        onChange={(e) => setEditingShopName(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button onClick={(e) => { e.stopPropagation(); saveShopName(); }} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Simpan">
                        <Check size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); cancelEditingShop(); }} className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300" title="Batal">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{shop.name}</span>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); startEditingShop(shop); }} className="p-1.5 text-blue-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Edit Nama">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteShop(shop.id); }} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50" title="Hapus Warung">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {shops.length === 0 && <p className="text-sm text-gray-500 italic">Belum ada warung.</p>}
            </div>
          </div>

          {/* Menu Manager Column */}
          <div className="lg:col-span-2">
            {selectedShopForMenu ? (
              <Card title={`Menu: ${shops.find(s => s.id === selectedShopForMenu)?.name}`}>
                {/* Add/Edit Menu Form */}
                <div className="grid grid-cols-12 gap-2 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="col-span-12 mb-2 font-medium text-sm text-gray-700">
                    {editingMenuId ? 'Edit Menu' : 'Tambah Menu Baru'}
                  </div>
                  <div className="col-span-4">
                    <input 
                      className="w-full px-3 py-2 border rounded text-sm"
                      placeholder="Nama Menu"
                      value={newMenu.name}
                      onChange={(e) => setNewMenu({...newMenu, name: e.target.value})}
                    />
                  </div>
                  <div className="col-span-3">
                     <input 
                      className="w-full px-3 py-2 border rounded text-sm"
                      type="number"
                      placeholder="Harga"
                      value={newMenu.price || ''}
                      onChange={(e) => setNewMenu({...newMenu, price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="col-span-3">
                    <select 
                      className="w-full px-3 py-2 border rounded text-sm bg-white"
                      value={newMenu.category}
                      onChange={(e) => setNewMenu({...newMenu, category: e.target.value})}
                    >
                      <option value="Makanan">Makanan</option>
                      <option value="Minuman">Minuman</option>
                      <option value="Camilan">Camilan</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex gap-1">
                    {editingMenuId && (
                       <Button onClick={cancelEditingMenu} variant="secondary" className="w-full h-full flex items-center justify-center text-sm px-1">
                          <X size={16} />
                       </Button>
                    )}
                    <Button onClick={saveMenu} className="w-full h-full flex items-center justify-center text-sm">
                      <Save size={16} className="mr-1"/> {editingMenuId ? 'Update' : 'Simpan'}
                    </Button>
                  </div>
                </div>

                {/* Menu List Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">Menu</th>
                        <th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3">Harga</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menus.filter(m => m.shopId === selectedShopForMenu).map(menu => (
                        <tr key={menu.id} className={`border-b hover:bg-gray-50 ${editingMenuId === menu.id ? 'bg-blue-50' : 'bg-white'}`}>
                          <td className="px-4 py-3 font-medium text-gray-900">{menu.name}</td>
                          <td className="px-4 py-3">{menu.category}</td>
                          <td className="px-4 py-3">Rp{menu.price.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                             <div className="flex justify-end gap-2">
                                <button onClick={() => startEditingMenu(menu)} className="text-blue-500 hover:text-blue-700" title="Edit Menu">
                                     <Edit2 size={16} />
                                </button>
                                <button onClick={() => deleteMenu(menu.id)} className="text-red-500 hover:text-red-700" title="Hapus Menu">
                                  <Trash2 size={16} />
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                      {menus.filter(m => m.shopId === selectedShopForMenu).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-gray-400">Belum ada menu di warung ini.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg border border-dashed border-gray-300 text-gray-500">
                Pilih warung di sebelah kiri untuk kelola menu
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};