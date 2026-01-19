import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import MT5Config from './components/MT5Config';
import Dashboard from './components/Dashboard';
import { AppState, MT5Config as MT5ConfigType } from './types';
import { Key } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [mt5Config, setMt5Config] = useState<MT5ConfigType>({
    login: '',
    server: '',
    platform: 'MT5',
    isConnected: false
  });
  const [apiKeyReady, setApiKeyReady] = useState(false);

  // Check if an API key is already selected on mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          setApiKeyReady(true);
        }
      } catch (e) {
        console.error("Error checking API key:", e);
      }
    };
    checkApiKey();
  }, []);

  // Handler to open the AI Studio key selection dialog
  const handleSelectApiKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume selection successful to avoid race conditions per guidelines
      setApiKeyReady(true);
    } catch (e) {
      console.error("Error opening key selector:", e);
    }
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.LOGIN:
        return <Login setAppState={setAppState} />;
      case AppState.MT5_CONFIG:
        return <MT5Config setAppState={setAppState} setMt5Config={setMt5Config} />;
      case AppState.DASHBOARD:
        return <Dashboard mt5Config={mt5Config} setAppState={setAppState} />;
      default:
        return <Login setAppState={setAppState} />;
    }
  };

  return (
    <div className="antialiased text-gray-100">
      {/* API Key Selection UI - Required for Gemini 3 models */}
      {!apiKeyReady && (
        <div className="fixed top-4 left-4 z-[100] animate-in slide-in-from-left duration-300">
          <button 
            onClick={handleSelectApiKey}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm transition-all"
          >
            <Key className="w-4 h-4" />
            <span>تفعيل مفتاح API (مطلوب)</span>
          </button>
          <div className="mt-2 text-[10px] text-gray-500 max-w-[200px] bg-gray-900/80 p-2 rounded-lg border border-white/5">
            يجب اختيار مفتاح من مشروع GCP مفعل به الدفع (Billing).
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-400 underline block mt-1">وثائق الفواتير</a>
          </div>
        </div>
      )}
      {renderContent()}
    </div>
  );
};

export default App;