import React, { useEffect, useState, useRef } from 'react';
import { MenuItem, Order, OrderStatus, Shop, User, CartItem, UserRole } from '../types';
import { StorageService } from '../services/storage';
import { Button, Card, StatusBadge, Toast, MenuImage, Input } from './ui';
import { ShoppingCart, Store, Plus, Minus, Edit, UserCheck, Wallet, AlertCircle, CheckCircle, UserCog } from 'lucide-react';

interface WorkerDashboardProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ user, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'history' | 'profile'>('menu');
  const [shops, setShops] = useState<Shop[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type?: 'info'|'success'|'danger'} | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // PB Selection & Payment
  const [availableObs, setAvailableObs] = useState<User[]>([]);
  const [selectedObId, setSelectedObId] = useState<string>(user.preferredObId || '');
  const [saveAsDefaultOb, setSaveAsDefaultOb] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentTargetOrder, setPaymentTargetOrder] = useState<Order | null>(null);
  const [paymentObInfo, setPaymentObInfo] = useState<User | null>(null);

  // Profile Edit State
  const [profileName, setProfileName] = useState(user.name);
  const [profileUnit, setProfileUnit] = useState(user.unitKerja || '');
  const [profilePreferredOb, setProfilePreferredOb] = useState(user.preferredObId || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Refs
  const prevOrdersRef = useRef<Order[]>([]);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Fetch available PBs
    StorageService.getUsersByRole(UserRole.OFFICE_BOY).then(obs => {
      setAvailableObs(obs);
      // If user has a preference, select it for cart default
      if (user.preferredObId && obs.find(ob => ob.id === user.preferredObId)) {
        setSelectedObId(user.preferredObId);
      } else if (obs.length > 0 && !selectedObId) {
        setSelectedObId(obs[0].id);
      }
    });

    const unsubscribeShops = StorageService.subscribeToShops(setShops);
    const unsubscribeMenus = StorageService.subscribeToMenus(setMenus);
    const unsubscribeOrders = StorageService.subscribeToOrders((allOrders) => {
      const userOrders = allOrders.filter(o => o.workerId === user.id).sort((a, b) => b.timestamp - a.timestamp);
      setMyOrders(userOrders);
    });

    return () => {
      unsubscribeShops();
      unsubscribeMenus();
      unsubscribeOrders();
    };
  }, [user.id, user.preferredObId]);

  useEffect(() => {
    // Sync profile state when user prop updates
    setProfileName(user.name);
    setProfileUnit(user.unitKerja || '');
    setProfilePreferredOb(user.preferredObId || '');
  }, [user]);

  useEffect(() => {
    if (isFirstLoad.current) {
      if (myOrders.length > 0) {
        prevOrdersRef.current = myOrders;
        isFirstLoad.current = false;
      }
      return;
    }

    myOrders.forEach(order => {
      const prevOrder = prevOrdersRef.current.find(p => p.id === order.id);
      
      if (prevOrder && prevOrder.status !== order.status) {
        const statusMsg = order.status === OrderStatus.SOLD ? 'Stok Habis / Dibatalkan' : order.status;
        const msg = `Status pesanan #${order.id.slice(0, 4)}... berubah menjadi: ${statusMsg}`;
        setToast({ message: msg, type: 'success' });
        if (Notification.permission === 'granted') {
          new Notification('Update Pesanan KantinKantor', { body: msg, icon: '/icon.png' });
        }
      }

      if (prevOrder) {
        order.items.forEach((item, idx) => {
           const prevItem = prevOrder.items[idx];
           if (prevItem && prevItem.status !== item.status && item.status === 'HABIS') {
              setToast({ message: `Maaf, menu ${item.name} habis!`, type: 'info' });
           }
        });
      }
    });

    prevOrdersRef.current = myOrders;
  }, [myOrders]);

  const addToCart = (menu: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.menuId === menu.id);
      if (existing) {
        return prev.map(item => item.menuId === menu.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...menu, menuId: menu.id, quantity: 1, notes: '', status: 'OK' }];
    });
  };

  const updateQuantity = (menuId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.menuId === menuId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updateCartNote = (menuId: string, note: string) => {
    setCart(prev => prev.map(item => {
      if (item.menuId === menuId) {
        return { ...item, notes: note };
      }
      return item;
    }));
  };

  const handleEditOrder = (order: Order) => {
    if (cart.length > 0 && !confirm('Keranjang Anda tidak kosong. Edit pesanan akan menimpa isi keranjang. Lanjutkan?')) {
      return;
    }

    const itemsForCart: CartItem[] = order.items.map(item => ({
      ...item,
      shopId: item.shopId || shops[0]?.id || '',
    }));

    setCart(itemsForCart);
    setEditingOrderId(order.id);
    setActiveTab('menu');
    
    // Set selected OB based on previous order
    if (order.assignedObId) {
       setSelectedObId(order.assignedObId);
    }

    setToast({ message: `Mengedit pesanan #${order.id.slice(0, 4)}. Silahkan update menu.`, type: 'info' });
  };

  const cancelEditOrder = () => {
    setEditingOrderId(null);
    setCart([]);
    setToast({ message: 'Mode edit dibatalkan.', type: 'info' });
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    if (!selectedObId) {
      alert("Mohon pilih Pramu Bakti terlebih dahulu.");
      return;
    }

    // Save preference if checked
    if (saveAsDefaultOb && selectedObId !== user.preferredObId) {
       const updated = await StorageService.updateUser(user.id, { preferredObId: selectedObId });
       onUserUpdate(updated);
    }

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const selectedOb = availableObs.find(ob => ob.id === selectedObId);
    
    const orderPayload: Order = {
      id: editingOrderId || '', 
      workerId: user.id,
      workerName: user.name,
      workerUnit: user.unitKerja || '-', // Use latest unit from props
      items: cart,
      totalAmount,
      status: OrderStatus.PROSES,
      timestamp: Date.now(),
      assignedObId: selectedObId,
      assignedObName: selectedOb?.name || 'Unknown'
    };

    await StorageService.saveOrder(orderPayload);
    
    setCart([]);
    setEditingOrderId(null);
    setActiveTab('history');
    setToast({ message: editingOrderId ? 'Pesanan berhasil diperbarui!' : 'Pesanan berhasil dibuat!', type: 'success' });
  };

  const handleOpenPayment = (order: Order) => {
     const ob = availableObs.find(u => u.id === order.assignedObId);
     setPaymentObInfo(ob || null);
     setPaymentTargetOrder(order);
     setShowPaymentModal(true);
  };

  const markAsPaid = async () => {
    if (!paymentTargetOrder) return;
    try {
      const updatedOrder = { ...paymentTargetOrder, status: OrderStatus.PAID };
      await StorageService.saveOrder(updatedOrder);
      setToast({ message: 'Pembayaran dikonfirmasi! Pramu Bakti akan diberitahu.', type: 'success' });
      setShowPaymentModal(false);
    } catch (error) {
      setToast({ message: 'Gagal mengupdate status pembayaran.', type: 'info' });
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const updated = await StorageService.updateUser(user.id, {
        name: profileName,
        unitKerja: profileUnit,
        preferredObId: profilePreferredOb
      });
      onUserUpdate(updated);
      setToast({ message: 'Profil berhasil disimpan.', type: 'success' });
      // Update local cart selection if changed
      if (profilePreferredOb) setSelectedObId(profilePreferredOb);
    } catch (e) {
      setToast({ message: 'Gagal menyimpan profil.', type: 'danger' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const filteredMenus = selectedShopId 
    ? menus.filter(m => m.shopId === selectedShopId) 
    : menus;

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      {toast && <Toast message={toast.message} type={toast.type || 'info'} onClose={() => setToast(null)} />}
      
      {/* Payment Modal */}
      {showPaymentModal && paymentTargetOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <Card className="w-full max-w-md animate-fade-in-up" title="Info Pembayaran">
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                   Silahkan transfer ke Pramu Bakti yang bertugas: <strong>{paymentTargetOrder.assignedObName}</strong>
                </div>
                
                <div className="border p-3 rounded bg-gray-50">
                   <p className="text-xs text-gray-500 mb-1">Total Tagihan</p>
                   <p className="text-xl font-bold text-gray-900">Rp{paymentTargetOrder.totalAmount.toLocaleString()}</p>
                </div>

                <div className="border p-3 rounded bg-gray-50">
                   <p className="text-xs text-gray-500 mb-1">Info Rekening / E-Wallet</p>
                   <p className="font-medium text-gray-800 whitespace-pre-wrap">
                      {paymentObInfo?.paymentInfo || "Belum ada info pembayaran. Silahkan hubungi petugas."}
                   </p>
                </div>

                <div className="flex gap-2 mt-4">
                   <Button onClick={() => setShowPaymentModal(false)} variant="secondary" className="flex-1">Tutup</Button>
                   <Button onClick={markAsPaid} className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2">
                      <CheckCircle size={18} /> Saya Sudah Transfer
                   </Button>
                </div>
              </div>
           </Card>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Halo, {user.name}</h2>
          <p className="text-sm text-gray-500">{user.unitKerja}</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border shadow-sm">
          <button 
            onClick={() => setActiveTab('menu')}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'menu' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Menu
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Riwayat
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            title="Profil Saya"
          >
            <UserCog size={16} /> <span className="hidden sm:inline">Profil</span>
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <Card title="Profil Saya" className="max-w-lg mx-auto">
          <div className="space-y-4">
            <Input 
              label="Nama Lengkap" 
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
            />
            
            <Input 
              label="Unit Kerja / Divisi" 
              value={profileUnit}
              onChange={(e) => setProfileUnit(e.target.value)}
              placeholder="Contoh: Divisi IT / Lantai 2"
            />
            <p className="text-xs text-gray-500 -mt-2 mb-2">Info ini akan muncul di pesanan agar Pramu Bakti mudah mengantar makanan.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pramu Bakti Langganan</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profilePreferredOb}
                onChange={(e) => setProfilePreferredOb(e.target.value)}
              >
                <option value="">-- Pilih Pramu Bakti --</option>
                {availableObs.map(ob => (
                  <option key={ob.id} value={ob.id}>{ob.name} {ob.unitKerja ? `(${ob.unitKerja})` : ''}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Pilihan ini akan otomatis terpilih saat Anda memesan.</p>
            </div>

            <div className="pt-4 border-t">
              <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full">
                {isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'menu' && (
        <>
          {editingOrderId && (
             <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
               <span className="text-sm font-medium">Anda sedang mengedit Pesanan #{editingOrderId.slice(0, 6)}</span>
               <button onClick={cancelEditOrder} className="text-xs underline font-bold hover:text-yellow-900">Batalkan Edit</button>
             </div>
          )}

          {/* Shop Filter */}
          <div className="flex overflow-x-auto gap-2 mb-6 pb-2 hide-scrollbar">
            <button 
              onClick={() => setSelectedShopId(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${!selectedShopId ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              Semua
            </button>
            {shops.map(shop => (
              <button
                key={shop.id}
                onClick={() => setSelectedShopId(shop.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${selectedShopId === shop.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                {shop.name}
              </button>
            ))}
          </div>

          {/* Menu List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
            {filteredMenus.map(menu => {
              const shopName = shops.find(s => s.id === menu.shopId)?.name || 'Unknown Shop';
              return (
                <Card key={menu.id} className="hover:shadow-md transition-shadow flex flex-col h-full">
                  <div className="h-40 bg-gray-200 mb-3 rounded-lg overflow-hidden relative">
                    <MenuImage 
                      name={menu.name} 
                      category={menu.category} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight">{menu.name}</h3>
                      <span className="font-bold text-blue-600 text-sm whitespace-nowrap ml-2">Rp{menu.price.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                      <Store size={12} /> {shopName}
                    </p>
                  </div>
                  <Button onClick={() => addToCart(menu)} className="w-full text-sm py-1.5 mt-auto">
                    + Tambah
                  </Button>
                </Card>
              );
            })}
          </div>

          {/* Sticky Cart Button */}
          {cart.length > 0 && (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 z-40">
              <div className="bg-gray-900 text-white rounded-xl shadow-xl p-4">
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                  <span className="font-semibold flex items-center gap-2">
                    <ShoppingCart size={18} /> {editingOrderId ? 'Update Pesanan' : 'Keranjang'} ({cart.length})
                  </span>
                  <button onClick={() => setCart([])} className="text-gray-400 hover:text-white text-xs">Kosongkan</button>
                </div>
                
                <div className="max-h-48 overflow-y-auto mb-3 space-y-3 pr-1">
                  {cart.map(item => (
                    <div key={item.menuId} className="flex flex-col gap-1 border-b border-gray-800 pb-2 last:border-0">
                      <div className="flex justify-between items-start text-sm">
                        <div className="flex-1 truncate pr-2 font-medium">{item.name}</div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateQuantity(item.menuId, -1)} className="p-1 hover:bg-gray-700 rounded"><Minus size={14}/></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.menuId, 1)} className="p-1 hover:bg-gray-700 rounded"><Plus size={14}/></button>
                        </div>
                        <div className="w-20 text-right font-mono text-gray-300">{(item.price * item.quantity).toLocaleString()}</div>
                      </div>
                      <input 
                        type="text"
                        placeholder="Catatan..."
                        className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none w-full"
                        value={item.notes || ''}
                        onChange={(e) => updateCartNote(item.menuId, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {/* PB Selection */}
                <div className="mb-3 pt-2 border-t border-gray-700">
                  <label className="text-xs text-gray-400 block mb-1">Pilih Pramu Bakti</label>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                      value={selectedObId}
                      onChange={(e) => setSelectedObId(e.target.value)}
                    >
                      <option value="" disabled>-- Pilih Petugas --</option>
                      {availableObs.map(ob => (
                        <option key={ob.id} value={ob.id}>{ob.name} {ob.unitKerja ? `(${ob.unitKerja})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                     <input 
                      type="checkbox" 
                      id="saveOb" 
                      className="rounded bg-gray-700 border-gray-600"
                      checked={saveAsDefaultOb}
                      onChange={(e) => setSaveAsDefaultOb(e.target.checked)}
                     />
                     <label htmlFor="saveOb" className="text-xs text-gray-400 cursor-pointer">Simpan sebagai default</label>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                  <div>
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="font-bold text-lg">Rp{cartTotal.toLocaleString()}</div>
                  </div>
                  <Button onClick={placeOrder} className="bg-blue-500 hover:bg-blue-400 text-white">
                    {editingOrderId ? 'Simpan Perubahan' : 'Pesan Sekarang'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {myOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-500">Belum ada pesanan. Yuk pesan makan!</div>
          ) : (
            myOrders.map(order => (
              <Card key={order.id} className={`border-l-4 ${order.status === OrderStatus.FINISH ? 'border-l-green-500' : order.status === OrderStatus.SOLD ? 'border-l-red-500 opacity-90' : 'border-l-blue-500'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">{new Date(order.timestamp).toLocaleString('id-ID')}</div>
                    <div className="flex flex-wrap items-center gap-2">
                       <h3 className="font-semibold text-gray-900">Order #{order.id.slice(0, 6)}...</h3>
                       <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          <UserCheck size={10} className="mr-1"/> {order.assignedObName}
                       </div>
                       {order.status === OrderStatus.PROSES && (
                         <button 
                           onClick={() => handleEditOrder(order)}
                           className="text-xs flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100"
                         >
                           <Edit size={10} /> Edit
                         </button>
                       )}
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="space-y-2 mb-3">
                  {order.items.map((item, idx) => {
                    const shopName = shops.find(s => s.id === item.shopId)?.name;
                    const isHabis = item.status === 'HABIS';
                    
                    return (
                      <div key={idx} className={`text-sm p-2 rounded ${isHabis ? 'bg-red-50' : ''}`}>
                        <div className="flex justify-between">
                          <span className={isHabis ? 'text-gray-400 line-through' : 'text-gray-700'}>
                            {item.quantity}x {item.name}
                            {shopName && <span className="text-xs text-gray-500 ml-1">({shopName})</span>}
                          </span>
                          <span className={isHabis ? 'text-gray-400 line-through' : ''}>
                             Rp{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500 italic ml-4">
                             {item.notes && <span>- Catatan: {item.notes}</span>}
                          </div>
                          {isHabis && (
                             <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                               <AlertCircle size={10} /> MAAF HABIS
                             </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Total Bayar</span>
                  <div className="flex items-center gap-2">
                     <span className="text-lg font-bold text-blue-600">Rp{order.totalAmount.toLocaleString()}</span>
                     {(order.status === OrderStatus.ORDERED || order.status === OrderStatus.PROSES || order.status === OrderStatus.PICKED_UP) && (
                        <Button 
                          onClick={() => handleOpenPayment(order)}
                          className="px-2 py-1 text-xs flex items-center gap-1 bg-green-600 hover:bg-green-700"
                        >
                           <Wallet size={12} /> Bayar / Info
                        </Button>
                     )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};