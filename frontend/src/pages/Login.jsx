import React, { useState } from 'react';
// Build Refresh: 2026-05-08 19:26
import api from '../utils/api';
import { startAuthentication } from '@simplewebauthn/browser';

export default function Login({ onLogin }) {
  const isSuperAdmin = window.location.pathname === '/super-admin';
  const savedCompany = localStorage.getItem('companyCode');
  const savedUserStr = localStorage.getItem('user');
  const lastLoginStr = localStorage.getItem('lastLoginInfo');
  
  let savedUsername = '';
  let lastCompany = '';
  let lastUser = '';
  
  if (savedUserStr) {
    try { savedUsername = JSON.parse(savedUserStr).username || ''; } catch(e){}
  }
  if (lastLoginStr) {
    try {
      const parsed = JSON.parse(lastLoginStr);
      lastCompany = parsed.companyCode || '';
      lastUser = parsed.username || '';
    } catch(e){}
  }

  const [companyCode, setCompanyCode] = useState(isSuperAdmin ? 'TJS1' : (savedCompany || lastCompany || ''));
  const [username, setUsername] = useState(savedUsername || lastUser || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = '/employees/login';
      const payload = { username, password, companyCode };
      const res = await api.post(endpoint, payload);
      const userData = res.data.user;
      const permissions = res.data.permissions || {};
      
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(userData));
      storage.setItem('companyCode', companyCode);
      storage.setItem('companyName', res.data.companyName || companyCode);
      storage.setItem('permissions', JSON.stringify(permissions));
      
      // 永遠記住最後一次登入的帳號與公司（方便登出後生物辨識使用）
      localStorage.setItem('lastLoginInfo', JSON.stringify({ username, companyCode }));
      
      window.location.reload();
    } catch (e) {
      const errorData = e.response?.data?.error;
      const errorMsg = typeof errorData === 'object' ? (errorData.message || JSON.stringify(errorData)) : (errorData || '登入失敗，請檢查帳號密碼');
      setError(errorMsg);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      // 支援一鍵登入：如果有填帳號公司，就帶上去縮小範圍；沒填也沒關係，後端會全域搜尋憑證
      const payload = {};
      if (username && companyCode) {
        payload.username = username;
        payload.companyCode = companyCode;
      }
      
      // Step 1: 取得挑戰碼
      const optionsRes = await api.post('/webauthn/login/start', payload);
      
      // Step 2: 呼叫瀏覽器原生 WebAuthn API（跳出 FaceID / 指紋，若沒帶帳號會跳出選擇清單）
      const assertion = await startAuthentication({ optionsJSON: optionsRes.data });

      // Step 3: 把簽章送後端驗證，帶入 challenge 讓後端核對
      const verifyRes = await api.post('/webauthn/login/finish', { 
        response: assertion,
        challenge: optionsRes.data.challenge
      });

      if (verifyRes.data.success) {
        const userData = verifyRes.data.user;
        const loggedCompanyCode = verifyRes.data.companyCode;
        
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(userData));
        storage.setItem('companyCode', loggedCompanyCode);
        storage.setItem('companyName', verifyRes.data.companyName || loggedCompanyCode);
        storage.setItem('permissions', JSON.stringify(verifyRes.data.permissions || {}));
        
        localStorage.setItem('lastLoginInfo', JSON.stringify({ username: userData.username, companyCode: loggedCompanyCode }));
        
        window.location.reload();
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('生物辨識已取消或逾時');
      } else {
        setError(err.response?.data?.error || '生物辨識登入失敗，請改用密碼登入');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isSuperAdmin ? 'bg-slate-900' : 'bg-gray-100'}`}>
      <div className={`max-w-md w-full rounded-2xl shadow-xl p-10 ${isSuperAdmin ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
        <div className="text-center mb-10">
          <h1 className={`text-3xl font-black mb-2 ${isSuperAdmin ? 'text-indigo-400' : 'text-indigo-900'}`}>
            {isSuperAdmin ? '中央系統總管登入' : '薪資管理系統'}
          </h1>
          <p className={`text-sm ${isSuperAdmin ? 'text-slate-400' : 'text-gray-500'}`}>
            {isSuperAdmin ? '超級管理員專屬維護通道' : '請輸入帳號密碼以繼續'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isSuperAdmin && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">公司代碼 (Company Code)</label>
              <input 
                type="text" 
                required 
                value={companyCode}
                onChange={e => setCompanyCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all uppercase"
                placeholder="例如: TJS"
              />
            </div>
          )}
          <div>
            <label className={`block text-sm font-bold mb-1 ${isSuperAdmin ? 'text-slate-300' : 'text-gray-700'}`}>帳號</label>
            <input 
              type="text" 
              required 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${isSuperAdmin ? 'bg-slate-700 border-slate-600 text-white focus:ring-indigo-500' : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`}
              placeholder={isSuperAdmin ? "超級管理員帳號" : "例如: A001"}
            />
          </div>
          <div>
            <label className={`block text-sm font-bold mb-1 ${isSuperAdmin ? 'text-slate-300' : 'text-gray-700'}`}>密碼</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${isSuperAdmin ? 'bg-slate-700 border-slate-600 text-white focus:ring-indigo-500' : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`}
              placeholder="請輸入密碼"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className={`text-sm font-bold ${isSuperAdmin ? 'text-slate-300' : 'text-gray-600'}`}>保持登入狀態</span>
            </label>
          </div>
          <button 
            type="submit"
            className={`w-full text-white font-black py-4 rounded-lg shadow-lg transform active:scale-95 transition-all ${isSuperAdmin ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}
          >
            {isSuperAdmin ? '總管登入' : '登入系統'}
          </button>
        </form>

        {/* 生物辨識登入按鈕 (僅限一般用戶) */}
        {!isSuperAdmin && (
          <div className="mt-4">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="mx-3 text-xs text-gray-400 font-bold">或</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              className="mt-4 w-full flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-indigo-300 text-slate-700 font-black py-4 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {biometricLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                  驗證中...
                </>
              ) : (
                <>
                  <span className="text-2xl">🔐</span>
                  FaceID / 指紋登入
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">需先在「個人設定」啟用此裝置</p>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          &copy; 2026 企業內部薪資與考勤系統
        </div>
      </div>
    </div>
  );
}
