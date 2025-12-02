import React, { useEffect } from 'react';
import { X, ImageOff } from 'lucide-react';

// Button
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' }> = ({ 
  children, className = '', variant = 'primary', ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400"
  };
  
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Input
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-3">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input 
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`} 
      {...props} 
    />
  </div>
);

// Card
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
    {title && <div className="px-4 py-3 border-b border-gray-100 font-semibold bg-gray-50">{title}</div>}
    <div className="p-4">{children}</div>
  </div>
);

// Badge
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    PROSES: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    ORDERED: 'bg-blue-100 text-blue-800 border-blue-200',
    PAID: 'bg-purple-100 text-purple-800 border-purple-200',
    SOLD: 'bg-red-100 text-red-800 border-red-200', // Changed color to red for "Habis"
    PICKED_UP: 'bg-orange-100 text-orange-800 border-orange-200',
    FINISH: 'bg-green-100 text-green-800 border-green-200',
  };

  const label: Record<string, string> = {
    PROSES: 'Diproses',
    ORDERED: 'Dipesan',
    PAID: 'Dibayar',
    SOLD: 'Stok Habis', // Changed label
    PICKED_UP: 'Diambil',
    FINISH: 'Selesai',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {label[status] || status}
    </span>
  );
};

// Toast Notification
export const Toast: React.FC<{ message: string; onClose: () => void; type?: 'info' | 'success' }> = ({ message, onClose, type = 'info' }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-green-600' : 'bg-blue-600';

  return (
    <div className={`fixed top-4 right-4 z-50 ${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-down max-w-sm`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
        <X size={16} />
      </button>
    </div>
  );
};

// Helper untuk mendapatkan gambar berdasarkan kata kunci
const getFoodImageUrl = (name: string, category: string): string => {
  const lowerName = name.toLowerCase();
  const lowerCat = category.toLowerCase();

  // Dictionary Kata Kunci -> URL Unsplash
  // Menggunakan ID foto spesifik agar konsisten dan valid
  if (lowerName.includes('nasi goreng')) return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80';
  if (lowerName.includes('nasi uduk') || lowerName.includes('nasi kuning')) return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80';
  if (lowerName.includes('nasi')) return 'https://images.unsplash.com/photo-1595955545772-268e6d2d614d?auto=format&fit=crop&w=400&q=80';
  
  if (lowerName.includes('mie') || lowerName.includes('bakso') || lowerName.includes('soto')) return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80';
  if (lowerName.includes('ayam') || lowerName.includes('bebek')) return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80';
  if (lowerName.includes('sate')) return 'https://images.unsplash.com/photo-1529563021893-cc83c914d5d3?auto=format&fit=crop&w=400&q=80';
  if (lowerName.includes('ikan') || lowerName.includes('lele')) return 'https://images.unsplash.com/photo-1535048633722-b5e3c8091894?auto=format&fit=crop&w=400&q=80';
  
  // Minuman
  if (lowerName.includes('kopi')) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80';
  if (lowerName.includes('teh') || lowerName.includes('es')) return 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&q=80';
  if (lowerName.includes('jus') || lowerName.includes('juice')) return 'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?auto=format&fit=crop&w=400&q=80';

  // Fallback Kategori
  if (lowerCat.includes('minum')) return 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80';
  if (lowerCat.includes('camilan') || lowerCat.includes('snack')) return 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=400&q=80';

  // Default Food
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80';
};

export const MenuImage: React.FC<{ name: string; category: string; className?: string }> = ({ name, category, className }) => {
  const src = getFoodImageUrl(name, category);
  return (
    <img 
      src={src} 
      alt={name}
      className={className}
      loading="lazy"
      onError={(e) => {
        // Fallback jika image gagal load
        (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Menu';
      }}
    />
  );
};