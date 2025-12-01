import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { User, UserRole } from './types';
import { Auth } from './components/Auth';
import { WorkerDashboard } from './components/WorkerDashboard';
import { OfficeBoyDashboard } from './components/OfficeBoyDashboard';
import { LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = StorageService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    StorageService.logout();
    setCurrentUser(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg font-bold text-lg">KK</div>
              <span className="font-semibold text-gray-800">e-Patuy</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 ml-2">
                {currentUser.role === UserRole.WORKER ? 'Mode Karyawan' : 'Mode Pramu Bakti'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
                <div className="text-xs text-gray-500">{currentUser.email}</div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                title="Keluar"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="py-6">
        {currentUser.role === UserRole.WORKER ? (
          <WorkerDashboard user={currentUser} />
        ) : (
          <OfficeBoyDashboard user={currentUser} />
        )}
      </main>
    </div>
  );
};

export default App;