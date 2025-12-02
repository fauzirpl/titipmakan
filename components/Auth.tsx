
import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { User, UserRole } from '../types';
import { Button, Input, Card } from './ui';
import { ChefHat, Coffee, UserCircle } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [unitKerja, setUnitKerja] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.WORKER);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isLogin) {
        const user = await StorageService.login(email, password);
        if (user) {
          onLogin(user);
        } else {
          setError('Email atau password salah');
        }
      } else {
        if (!name || !email || !password || !unitKerja) {
          setError('Mohon lengkapi semua data');
          setIsLoading(false);
          return;
        }
        const user = await StorageService.register(name, email, password, role, unitKerja);
        onLogin(user);
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <ChefHat className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">e-Patuy</h1>
          <p className="text-gray-500">Pesan makan anti lupa-lupa club</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <Input 
                label="Nama Lengkap" 
                placeholder="Contoh: Budi Santoso"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input 
                label="Unit Kerja / Divisi" 
                placeholder="Contoh: Divisi IT / Lantai 2"
                value={unitKerja}
                onChange={(e) => setUnitKerja(e.target.value)}
              />
            </>
          )}
          
          <Input 
            label="Email" 
            type="email"
            placeholder="email@kantor.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          
          <Input 
            label="Password" 
            type="password"
            placeholder="******"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {!isLogin && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Peran</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole(UserRole.WORKER)}
                  className={`p-3 rounded-lg border text-center flex flex-col items-center justify-center gap-2 transition-all ${role === UserRole.WORKER ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <UserCircle size={24} />
                  <span className="text-sm font-medium">Karyawan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole(UserRole.OFFICE_BOY)}
                  className={`p-3 rounded-lg border text-center flex flex-col items-center justify-center gap-2 transition-all ${role === UserRole.OFFICE_BOY ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <Coffee size={24} />
                  <span className="text-sm font-medium">Pramu Bakti</span>
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-blue-600 font-medium hover:underline"
            >
              {isLogin ? 'Daftar sekarang' : 'Masuk disini'}
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};
