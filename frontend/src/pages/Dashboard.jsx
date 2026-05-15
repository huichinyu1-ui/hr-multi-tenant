import React, { useState, useEffect } from 'react';
import { 
  MapPin, Clock, Sun, Moon, RefreshCw, AlertTriangle, Fingerprint, Trash2, Plus
} from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { usePermission } from '../contexts/PermissionContext';
import { startRegistration } from '@simplewebauthn/browser';

export default function Dashboard() {
  const { addToast } = useToast();
  const { hasPermission } = usePermission();
  const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState({ lat: null, lng: null, loading: false, error: null });
  const [distance, setDistance] = useState(null);
  const [punchLoading, setPunchLoading] = useState(null);
  const [todayData, setTodayData] = useState({ record: null, workShift: null });
  const [config, setConfig] = useState({ lat: 25.033976, lng: 121.564421, radius: 500, enabled: true });
  const [companyName] = useState(() => 
    sessionStorage.getItem('companyName') || localStorage.getItem('companyName') || '人事薪資系統'
  );
  
  // WebAuthn States
  const [credentials, setCredentials] = useState([]);
  const [deviceName, setDeviceName] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchSettings();
    fetchTodayRecord();
    fetchCredentials();
    return () => clearInterval(timer);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/metadata?type=SYSTEM_SETTING');
      if (res.data && res.data.length > 0) {
        const cfg = {};
        res.data.forEach(s => cfg[s.label] = s.value);
        setConfig({
          lat: parseFloat(cfg.company_lat) || 25.033976,
          lng: parseFloat(cfg.company_lng) || 121.564421,
          radius: parseFloat(cfg.punch_radius_meters) || 500,
          enabled: cfg.punch_enabled === 'true'
        });
      }
    } catch (e) { console.error('Failed to fetch settings'); }
  };

  const fetchTodayRecord = async () => {
    try {
      const res = await api.get('/attendances/today-record');
      setTodayData(res.data);
    } catch (e) { console.error('Failed to fetch today record'); }
  };

  // WebAuthn Functions
  const fetchCredentials = async () => {
    try {
      const res = await api.get('/webauthn/credentials');
      setCredentials(res.data);
    } catch (e) {
      // 靜默失敗（員工可能尚未登入或無權限)
    }
  };

  const handleRegisterDevice = async () => {
    setRegisterLoading(true);
    try {
      // Step 1: 取得挑戰碼
      const optionsRes = await api.post('/webauthn/register/start');
      // Step 2: 呼叫瀏覽器原生 WebAuthn
      const attResp = await startRegistration({ optionsJSON: optionsRes.data });
      // Step 3: 送後端完成驗證
      await api.post('/webauthn/register/finish', { response: attResp, deviceName: deviceName || '我的設備' });
      addToast('設備綁定成功！', 'success');
      setDeviceName('');
      fetchCredentials();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        addToast('已取消設備綁定', 'warning');
      } else {
        addToast(err.response?.data?.error || '設備綁定失敗', 'error');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDeleteCredential = async (id, name) => {
    if (!window.confirm(`確定要移除「${name}」這台設備嗎？移除後該設備將無法使用生物辨識登入。`)) return;
    try {
      await api.delete(`/webauthn/credentials/${id}`);
      addToast('設備已移除', 'success');
      fetchCredentials();
    } catch (e) {
      addToast('移除失敗', 'error');
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 5) return '晚安';
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  };

  const getCurrentLocationPromise = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS UNAVAILABLE'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(new Error('GPS ERROR')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const dPhi = (lat2-lat1) * Math.PI/180;
    const dLambda = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLambda/2) * Math.sin(dLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getLocationManual = async () => {
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    try {
      const coords = await getCurrentLocationPromise();
      const { latitude, longitude } = coords;
      setLocation({ lat: latitude, lng: longitude, loading: false, error: null });
      const dist = calculateDistance(latitude, longitude, config.lat, config.lng);
      setDistance(Math.round(dist));
      addToast('定位已更新', 'success');
    } catch (err) {
      setLocation(prev => ({ ...prev, loading: false, error: err.message }));
      addToast(err.message, 'error');
    }
  };

  const handlePunch = async (type) => {
    setPunchLoading(type);
    try {
      const coords = await getCurrentLocationPromise();
      const { latitude, longitude } = coords;
      const dist = calculateDistance(latitude, longitude, config.lat, config.lng);
      setDistance(Math.round(dist));

      if (dist > config.radius) {
        addToast(`超出範圍 (${Math.round(dist)}m)`, 'error');
        setPunchLoading(null);
        return;
      }

      const res = await api.post('/attendances/punch', {
        lat: latitude, lng: longitude, type
      });
      addToast(res.data.message, 'success');
      fetchTodayRecord();
    } catch (err) {
      addToast('打卡失敗', 'error');
    } finally {
      setPunchLoading(null);
    }
  };

  const canPunch = hasPermission('ATT', 'canPunch');

  const getStatusLabel = (status) => {
    switch (status) {
      case 'NORMAL': return '正常';
      case 'LATE': return '遲到';
      case 'EARLY_LEAVE': return '早退';
      default: return '已記錄';
    }
  };

  return (
    <div className="max-w-6xl mx-auto min-h-[calc(100vh-100px)] p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-1000">
      
      {/* Primary Section: Identity, Time and Punch Buttons */}
      <div className="flex flex-col gap-6">
        
        {/* Top Banner: Time & Identity */}
        <div className="bg-[#0f172a] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1 md:space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-[10px] md:text-xs font-bold tracking-widest uppercase mb-2 md:mb-4">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                {companyName}
              </div>
              <h1 className="text-3xl md:text-6xl font-black tracking-tighter leading-none">
                {getGreeting()}，<span className="text-slate-400">{user.name}</span>
              </h1>
            </div>

            <div className="space-y-1 md:text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Current Time</p>
              <div className="flex items-baseline md:justify-end gap-2 md:gap-4">
                <span className="text-5xl md:text-8xl font-black tracking-tighter tabular-nums bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
                <span className="text-xl md:text-3xl font-black text-slate-600 tabular-nums">
                  :{currentTime.getSeconds().toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-800/20 rounded-full blur-[80px]" />
        </div>

        {/* Punch Buttons Section - NOW AT THE TOP */}
        <div className="grid grid-cols-2 gap-4 md:gap-8">
          {/* Punch In */}
          <button 
            onClick={() => handlePunch('IN')}
            disabled={!!punchLoading || !config.enabled || !canPunch}
            className={`relative group overflow-hidden min-h-[140px] md:min-h-[220px] rounded-[2rem] md:rounded-[3rem] shadow-xl md:shadow-2xl flex flex-col items-center justify-center p-4 md:p-8 transition-all active:scale-95 ${
              todayData.record?.clock_in 
                ? 'bg-white border-2 md:border-4 border-emerald-500 text-emerald-600' 
                : 'bg-gradient-to-br from-slate-800 to-slate-900 text-white'
            }`}
          >
            <div className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center mb-3 md:mb-6 shadow-lg ${
              todayData.record?.clock_in ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'
            }`}>
              {punchLoading === 'IN' ? <RefreshCw className="animate-spin" size={20}/> : <Sun size={24} className="md:w-9 md:h-9"/>}
            </div>
            <span className="text-xl md:text-4xl font-black tracking-tighter mb-1 md:mb-2">上班打卡</span>
            <div className="flex flex-col items-center gap-1 md:gap-2">
              <span className="text-sm md:text-2xl font-black tabular-nums opacity-60">
                {todayData.record?.clock_in || 'READY'}
              </span>
              {todayData.record?.clock_in && (
                <span className="px-2 md:px-4 py-0.5 md:py-1 bg-emerald-500 text-white text-[8px] md:text-xs font-black rounded-full uppercase tracking-widest">
                  {getStatusLabel(todayData.record.clock_in_status)}
                </span>
              )}
            </div>
          </button>

          {/* Punch Out */}
          <button 
            onClick={() => handlePunch('OUT')}
            disabled={!!punchLoading || !config.enabled || !canPunch}
            className={`relative group overflow-hidden min-h-[140px] md:min-h-[220px] rounded-[2rem] md:rounded-[3rem] shadow-xl md:shadow-2xl flex flex-col items-center justify-center p-4 md:p-8 transition-all active:scale-95 ${
              todayData.record?.clock_out 
                ? 'bg-white border-2 md:border-4 border-rose-500 text-rose-600' 
                : 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white'
            }`}
          >
            <div className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center mb-3 md:mb-6 shadow-lg ${
              todayData.record?.clock_out ? 'bg-rose-500 text-white' : 'bg-white/20 text-white backdrop-blur-md'
            }`}>
              {punchLoading === 'OUT' ? <RefreshCw className="animate-spin" size={20}/> : <Moon size={24} className="md:w-9 md:h-9"/>}
            </div>
            <span className="text-xl md:text-4xl font-black tracking-tighter mb-1 md:mb-2">下班打卡</span>
            <div className="flex flex-col items-center gap-1 md:gap-2">
              <span className="text-sm md:text-2xl font-black tabular-nums opacity-60">
                {todayData.record?.clock_out || 'READY'}
              </span>
              {todayData.record?.clock_out && (
                <span className="px-2 md:px-4 py-0.5 md:py-1 bg-rose-500 text-white text-[8px] md:text-xs font-black rounded-full uppercase tracking-widest">
                  {getStatusLabel(todayData.record.clock_out_status)}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Secondary Section: Status & Location (Moved below) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Location Card */}
        <div className="md:col-span-7 bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-xl flex flex-col justify-center space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-800 shadow-inner border border-slate-100">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">定位狀態</p>
                <p className="text-base md:text-lg font-black text-slate-800">
                  {distance ? `距公司 ${distance}m` : '搜尋定位中...'}
                </p>
              </div>
            </div>
            <button 
              onClick={getLocationManual} 
              disabled={location.loading}
              className="p-2 md:p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 active:scale-90 transition-all border border-slate-100"
            >
              <RefreshCw size={18} className={location.loading ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
            distance <= config.radius 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
              : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}>
            {distance <= config.radius ? <Clock size={18}/> : <AlertTriangle size={18}/>}
            <span className="text-xs md:text-sm font-black">
              {distance <= config.radius ? '已進入打卡範圍' : '尚未進入打卡範圍'}
            </span>
          </div>
        </div>

        {/* Shift Info Card */}
        <div className="md:col-span-5 bg-slate-50 rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目前班別</p>
            <p className="text-base md:text-lg font-black text-slate-800">{todayData.workShift?.name || '無排班'}</p>
          </div>
          <div className="space-y-1 border-l border-slate-200 pl-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">排班時段</p>
            <p className="text-base md:text-lg font-black text-slate-800 tabular-nums">
              {todayData.workShift ? `${todayData.workShift.work_start} - ${todayData.workShift.work_end}` : '--:--'}
            </p>
          </div>
        </div>
      </div>

      {/* WebAuthn Device Management (Moved from Settings) */}
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-gray-200/50 border border-white mt-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-emerald-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-emerald-100">
            <Fingerprint size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">信任設備管理</h3>
            <p className="text-xs text-gray-400 font-bold mt-1">綁定設備後可使用 FaceID / 指紋快速登入</p>
          </div>
        </div>

        {/* 已綁定的設備清單 */}
        <div className="space-y-3 mb-6">
          {credentials.length === 0 ? (
            <div className="text-center py-8 text-gray-400 font-bold bg-gray-50 rounded-2xl">
              尚未綁定任何設備
            </div>
          ) : credentials.map(cred => (
            <div key={cred.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-6 py-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-black text-gray-800 text-sm">{cred.deviceName || '未命名設備'}</p>
                  <p className="text-[10px] text-gray-400">綁定於 {new Date(cred.createdAt).toLocaleDateString('zh-TW')}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteCredential(cred.id, cred.deviceName)}
                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* 新增設備 */}
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={deviceName}
            onChange={e => setDeviceName(e.target.value)}
            placeholder="設備名稱（如：我的手機）"
            className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-bold text-gray-800 focus:ring-4 focus:ring-emerald-100 outline-none transition-all text-sm"
          />
          <button
            onClick={handleRegisterDevice}
            disabled={registerLoading}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-100"
          >
            {registerLoading ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            {registerLoading ? '驗證中...' : '綁定此設備'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3 font-bold">💡 點擊「綁定此設備」後，系統將請求您進行生物辨識驗證，完成後即可在下次登入時使用快速登入。</p>
      </div>

    </div>
  );
}
