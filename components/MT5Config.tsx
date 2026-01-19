import React, { useState } from 'react';
import { Server, ShieldCheck, Globe, Network, Cpu, Briefcase } from 'lucide-react';
import { AppState, MT5Config as MT5ConfigType } from '../types';
import { connectToMT5Bridge } from '../services/mt5Service';

interface MT5ConfigProps {
  setAppState: (state: AppState) => void;
  setMt5Config: (config: MT5ConfigType) => void;
}

const MT5Config: React.FC<MT5ConfigProps> = ({ setAppState, setMt5Config }) => {
  const [loading, setLoading] = useState(false);
  const [useBridge, setUseBridge] = useState(false);
  const [formData, setFormData] = useState({
    login: '50123456',
    password: '',
    server: 'MetaQuotes-Demo',
    platform: 'MT4',
    accountType: 'DEMO',
    apiUrl: 'http://localhost:8000',
    apiToken: ''
  });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const config: MT5ConfigType = {
      login: formData.login,
      server: formData.server,
      password: formData.password,
      platform: formData.platform as 'MT5' | 'MT4',
      accountType: formData.accountType as 'DEMO' | 'REAL',
      isConnected: false, // Will set true after check
      apiUrl: useBridge ? formData.apiUrl : undefined,
      apiToken: useBridge ? formData.apiToken : undefined
    };

    const isConnected = await connectToMT5Bridge(config);
    
    setMt5Config({
      ...config,
      isConnected
    });
    
    setLoading(false);
    setAppState(AppState.DASHBOARD);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4" dir="rtl">
      <div className="w-full max-w-3xl bg-gray-950 border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Globe className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">ربط حساب التداول</h2>
            <p className="text-gray-400 text-sm">اتصال API بمنصة ميتاتريدر 4</p>
          </div>
        </div>

        <form onSubmit={handleConnect} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Connection Type Toggle */}
          <div className="md:col-span-2 bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className={`w-5 h-5 ${useBridge ? 'text-emerald-400' : 'text-gray-500'}`} />
              <div>
                <span className="block text-sm font-semibold text-white">استخدام جسر التداول (Bridge API)</span>
                <span className="text-xs text-gray-400">للاتصال عبر MetaApi أو خادم محلي</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseBridge(!useBridge)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${useBridge ? 'bg-emerald-600' : 'bg-gray-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${useBridge ? '-translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 font-medium">المنصة</label>
              <div className="flex gap-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, platform: 'MT4'})}
                  className={`flex-1 py-2 rounded-lg border ${formData.platform === 'MT4' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-gray-700 bg-gray-900 text-gray-500'}`}
                >
                  MetaTrader 4
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, platform: 'MT5'})}
                  className={`flex-1 py-2 rounded-lg border ${formData.platform === 'MT5' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-gray-700 bg-gray-900 text-gray-500'}`}
                >
                  MetaTrader 5
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 font-medium">نوع الحساب</label>
              <div className="flex gap-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, accountType: 'DEMO'})}
                  className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 ${formData.accountType === 'DEMO' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 bg-gray-900 text-gray-500'}`}
                >
                  <Briefcase className="w-3 h-3"/> تجريبي (Demo)
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, accountType: 'REAL'})}
                  className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 ${formData.accountType === 'REAL' ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-gray-700 bg-gray-900 text-gray-500'}`}
                >
                  <ShieldCheck className="w-3 h-3"/> حقيقي (Real)
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <div>
              <label className="text-sm text-gray-400 font-medium">رقم الحساب (Login ID)</label>
              <input 
                type="text" 
                value={formData.login}
                onChange={(e) => setFormData({...formData, login: e.target.value})}
                className="w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 focus:border-emerald-500 outline-none"
              />
            </div>
            
             <div>
              <label className="text-sm text-gray-400 font-medium">الخادم (Server)</label>
              <div className="relative mt-2">
                <Server className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={formData.server}
                  onChange={(e) => setFormData({...formData, server: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pr-10 pl-4 py-2.5 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 font-medium">كلمة المرور</label>
              <div className="relative mt-2">
                <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="كلمة مرور الحساب"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pr-10 pl-4 py-2.5 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {useBridge && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/50 p-4 rounded-xl border border-dashed border-gray-700">
               <div>
                <label className="text-sm text-gray-400 font-medium">رابط الجسر (Bridge API URL)</label>
                <div className="relative mt-2">
                  <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    value={formData.apiUrl}
                    onChange={(e) => setFormData({...formData, apiUrl: e.target.value})}
                    placeholder="https://api.metaapi.cloud/v1/..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pr-10 pl-4 py-2.5 focus:border-blue-500 outline-none text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 font-medium">رمز الوصول (Token)</label>
                <div className="relative mt-2">
                  <Cpu className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    value={formData.apiToken}
                    onChange={(e) => setFormData({...formData, apiToken: e.target.value})}
                    placeholder="auth-token-xyz"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pr-10 pl-4 py-2.5 focus:border-blue-500 outline-none text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2 mt-4">
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  formData.accountType === 'REAL' 
                  ? 'bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 shadow-rose-900/20' 
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  جاري الاتصال...
                </>
              ) : (
                `اتصال بحساب ${formData.accountType === 'REAL' ? 'حقيقي' : 'تجريبي'}`
              )}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4">
              {useBridge ? 'تم تفعيل الاتصال الآمن عبر الجسر الخارجي.' : 'وضع المحاكاة: لا يوجد مخاطرة بأموال حقيقية.'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MT5Config;