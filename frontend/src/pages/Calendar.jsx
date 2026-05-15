import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { usePermission } from '../contexts/PermissionContext';

export default function Calendar() {
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDays();
  }, [yearMonth]);

  const { hasPermission, isAdmin } = usePermission();
  const canManage = hasPermission('CALENDAR', 'canEdit') || isAdmin;

  const fetchDays = async () => {
    try {
      const res = await api.get(`/calendar?month=${yearMonth}`);
      setDays(res.data);
    } catch (e) { console.error(e); }
  };

  const handleGenerate = async () => {
    setLoading(true);
    const [year, month] = yearMonth.split('-');
    try {
      await api.post('/calendar/generate', { year: parseInt(year), month: parseInt(month) });
      fetchDays();
    } catch (e) {
      alert('產生失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGovCalendar = async () => {
    setLoading(true);
    const [year] = yearMonth.split('-');
    try {
      const res = await api.post(`/calendar/sync/${year}`);
      alert(res.data.message);
      fetchDays();
    } catch (e) {
      alert(e.response?.data?.error || '同步失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWorkday = async (day) => {
    const isSettingToHoliday = day.is_workday;
    let desc = day.description;
    
    if (isSettingToHoliday) {
      desc = prompt('請輸入假日名稱 (例如: 颱風假、中秋節等):', day.description === '工作日' ? '' : (day.description || ''));
      if (desc === null) return; // User cancelled
      if (!desc) desc = '假日';
    } else {
      desc = '工作日';
    }

    try {
      await api.post('/calendar/upsert', {
        date: day.date,
        is_workday: !day.is_workday,
        description: desc
      });
      fetchDays();
    } catch (e) { alert('更新失敗'); }
  };

  const handleEditDescription = async (e, day) => {
    e.stopPropagation(); // 阻止觸發切換狀態
    const newDesc = prompt('請修改名稱:', day.description || '');
    if (newDesc === null) return;

    try {
      await api.post('/calendar/upsert', {
        date: day.date,
        is_workday: day.is_workday,
        description: newDesc
      });
      fetchDays();
    } catch (e) { alert('更新失敗'); }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">行事曆設定</h2>
      
      <div className="flex flex-wrap gap-4 items-end mb-8 bg-gray-50 p-4 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700">選擇月份</label>
          <input 
            type="month" 
            value={yearMonth} 
            onChange={(e) => setYearMonth(e.target.value)}
            className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm p-2 border" 
          />
        </div>
        {canManage && (
          <>
            <button 
              onClick={handleGenerate} 
              disabled={loading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-bold"
            >
              自動產生當月 (一至五)
            </button>
            <button 
              onClick={handleSyncGovCalendar} 
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-bold"
            >
              📥 同步 {yearMonth.split('-')[0]} 年政府行事曆
            </button>
            <span className="text-xs text-gray-500 max-w-xs ml-auto">提示：點擊格子可切換工作日/假日；點擊假別名稱右側小圖示可直接修改名稱。</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-7 gap-4">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="font-bold text-center text-gray-500">{d}</div>
        ))}
        
        {days.map(day => {
          const dateObj = new Date(day.date);
          const dayOfWeek = dateObj.getDay();
          
          return (
            <div 
              key={day.id} 
              onClick={() => canManage && handleToggleWorkday(day)}
              className={`relative p-4 border rounded-lg text-center ${canManage ? 'cursor-pointer' : 'cursor-default'} transition-colors min-h-[90px] flex flex-col justify-center items-center ${day.is_workday ? 'bg-white hover:bg-gray-50 border-gray-200' : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-800 shadow-sm'}`}
              style={{ gridColumnStart: day.date.endsWith('-01') ? dayOfWeek + 1 : 'auto' }}
              title={canManage ? '點擊切換工作日/假日' : ''}
            >
              <div className={`text-xl font-bold ${!day.is_workday && 'text-red-600'}`}>{day.date.split('-')[2]}</div>
              <div className="mt-2 flex items-center gap-1 group">
                <span className={`text-xs px-2 py-1 rounded-full ${day.is_workday ? 'bg-gray-100 text-gray-600' : 'bg-red-200 text-red-800 font-semibold max-w-[80px] truncate'}`}>
                  {day.description || (day.is_workday ? '工作日' : '假日')}
                </span>
                {/* 編輯名稱的小按鈕，僅在 hover 該區域時明顯，點擊時阻止冒泡 */}
                {canManage && (
                  <button 
                    onClick={(e) => handleEditDescription(e, day)}
                    className="text-gray-400 hover:text-indigo-600 opacity-50 group-hover:opacity-100 transition-opacity"
                    title="修改名稱"
                  >
                    ✎
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {days.length === 0 && (
        <div className="text-center text-gray-500 py-10 mt-4">此月份尚未建立行事曆，請點擊上方按鈕產生或同步政府資料。</div>
      )}
    </div>
  );
}
