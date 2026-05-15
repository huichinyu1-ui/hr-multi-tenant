import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, MapPin, ShieldCheck, Save, RefreshCw, Navigation } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';

export default function Settings() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    punch_enabled: 'true',
    company_lat: '25.033976',
    company_lng: '121.564421',
    punch_radius_meters: '500'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/metadata?type=SYSTEM_SETTING');
      if (res.data && res.data.length > 0) {
        const newCfg = { ...config };
        res.data.forEach(s => {
          if (s.value === 'applied_insurance_preset') return; // 過濾掉內部的級距紀錄
          newCfg[s.label] = s.value;
        });
        setConfig(newCfg);
      }
    } catch (e) {
      addToast('無法讀取系統設定', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = Object.keys(config).map(label => ({
        label,
        value: config[label]
      }));
      await api.put('/metadata/batch-update', { settings });
      addToast('設定已成功儲存', 'success');
    } catch (e) {
      addToast('儲存失敗：' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      addToast('您的瀏覽器不支援地理定位', 'error');
      return;
    }
    addToast('正在獲取您目前的位置...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setConfig(prev => ({
          ...prev,
          company_lat: pos.coords.latitude.toString(),
          company_lng: pos.coords.longitude.toString()
        }));
        addToast('已抓取當前座標', 'success');
      },
      (err) => addToast('無法獲取位置', 'error'),
      { enableHighAccuracy: true }
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-bold">正在載入系統設定...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">系統環境設定</h1>
          <p className="text-gray-400 font-bold">管理全域系統參數與 GPS 打卡規則</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? '正在儲存...' : '儲存所有設定'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* GPS Punch Settings */}
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-gray-200/50 border border-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <Navigation size={28} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">線上打卡規則</h3>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <div>
                <p className="font-black text-gray-900">啟用線上打卡</p>
                <p className="text-xs text-gray-400 font-bold">允許員工使用手機/電腦 GPS 簽到</p>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, punch_enabled: prev.punch_enabled === 'true' ? 'false' : 'true' }))}
                className={`w-14 h-8 rounded-full transition-all relative ${config.punch_enabled === 'true' ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${config.punch_enabled === 'true' ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">允許打卡半徑 (公尺)</label>
              <input
                type="number"
                value={config.punch_radius_meters}
                onChange={e => setConfig(prev => ({ ...prev, punch_radius_meters: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black text-gray-800 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                placeholder="例如: 500"
              />
            </div>
          </div>
        </div>

        {/* Location Settings */}
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-gray-200/50 border border-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-violet-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-violet-100">
              <MapPin size={28} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">公司中心點座標</h3>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">緯度 (Latitude)</label>
                <input
                  type="text"
                  value={config.company_lat}
                  onChange={e => setConfig(prev => ({ ...prev, company_lat: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black text-gray-800 focus:ring-4 focus:ring-violet-100 outline-none transition-all text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">經度 (Longitude)</label>
                <input
                  type="text"
                  value={config.company_lng}
                  onChange={e => setConfig(prev => ({ ...prev, company_lng: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black text-gray-800 focus:ring-4 focus:ring-violet-100 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleGetLocation}
              className="w-full flex items-center justify-center gap-3 bg-violet-50 text-violet-600 font-black py-5 rounded-2xl hover:bg-violet-100 transition-all group"
            >
              <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              抓取我目前的位置作為中心點
            </button>

            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
              <ShieldCheck className="text-amber-600 shrink-0" size={24} />
              <p className="text-xs text-amber-700 leading-relaxed font-bold">
                提示：中心點座標決定了員工打卡的圓心。建議管理員在公司中心位置點擊上方按鈕以獲得最精確的經緯度。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
