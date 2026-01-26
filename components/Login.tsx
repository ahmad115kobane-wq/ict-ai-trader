import React, { useState } from 'react';
import { Key, Lock, User } from 'lucide-react';
import { AppState } from '../types';

interface LoginProps {
  setAppState: (state: AppState) => void;
}

const Login: React.FC<LoginProps> = ({ setAppState }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth delay
    setTimeout(() => {
      setLoading(false);
      setAppState(AppState.MT5_CONFIG);
    }, 1000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 bg-[url('https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-opacity-90" dir="rtl">
      <div className="w-full max-w-md p-8 bg-gray-950/80 backdrop-blur-md rounded-2xl border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
            <Key className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-white font-sans">أهلاً بعودتك</h1>
          <p className="text-gray-400">سجل الدخول للمتداول الذكي ICT AI</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">اسم المستخدم</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="text" 
                defaultValue="trader_01"
                className="w-full bg-gray-900 border border-gray-700 text-white pr-10 pl-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="password" 
                defaultValue="password123"
                className="w-full bg-gray-900 border border-gray-700 text-white pr-10 pl-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3 rounded-lg shadow-lg transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;