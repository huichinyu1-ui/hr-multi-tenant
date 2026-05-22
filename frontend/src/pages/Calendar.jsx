import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { usePermission } from '../contexts/PermissionContext';

// 假別顏色對照（依名稱關鍵字）
const getLeaveColor = (typeName = '') => {
  if (typeName.includes('年') || typeName.includes('特休')) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
  if (typeName.includes('病')) return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
  if (typeName.includes('事')) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
  if (typeName.includes('婚')) return { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' };
  if (typeName.includes('喪')) return { bg: 'bg-gray-200', text: 'text-gray-700', border: 'border-gray-300', dot: 'bg-gray-500' };
  if (typeName.includes('產') || typeName.includes('陪產')) return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' };
  return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' };
};

const formatTime = (date, time) => {
  if (!time) return '';
  return time.slice(0, 5);
};

// 浮層元件
function LeavePopover({ date, leaves, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 left-full top-0 ml-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
      style={{ minWidth: '260px' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="bg-indigo-600 px-4 py-3">
        <p className="text-white font-black text-sm">📅 {date} 請假清單</p>
        <p className="text-indigo-200 text-[11px] mt-0.5">共 {leaves.length} 筆已核准假單</p>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
        {leaves.map(lr => {
          const color = getLeaveColor(lr.leaveType?.name);
          return (
            <div key={lr.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{lr.employee?.name}</p>
                <p className="text-[11px] text-gray-400 font-mono">
                  {lr.leaveType?.name} · {formatTime(lr.start_date, lr.start_time)}~{formatTime(lr.end_date, lr.end_time)}
                </p>
              </div>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${color.bg} ${color.text}`}>
                {lr.leaveType?.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Calendar() {
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [days, setDays] = useState([]);
  const [leaveMap, setLeaveMap] = useState({}); // { 'YYYY-MM-DD': [leaveRequest, ...] }
  const [loading, setLoading] = useState(false);
  const [popoverDate, setPopoverDate] = useState(null); // 目前打開 Popover 的日期

  const { hasPermission, isAdmin } = usePermission();
  const canManage = hasPermission('CALENDAR', 'canEdit') || isAdmin;

  const fetchAll = useCallback(async () => {
    try {
      const [year, month] = yearMonth.split('-');
      const startDate = `${yearMonth}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

      const [calRes, leaveRes] = await Promise.all([
        api.get(`/calendar?month=${yearMonth}`),
        api.get(`/leaves/requests?start_date=${startDate}&end_date=${endDate}`)
      ]);

      setDays(calRes.data);

      // 建立日期→假單的 Map（只包含 APPROVED 狀態）
      const map = {};
      (leaveRes.data || [])
        .filter(lr => lr.status === 'APPROVED')
        .forEach(lr => {
          // 一張假單可能跨多天，展開到每個日期
          const start = new Date(lr.start_date);
          const end = new Date(lr.end_date);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().split('T')[0];
            if (!map[key]) map[key] = [];
            // 避免同一筆在同一天重複加入
            if (!map[key].find(x => x.id === lr.id)) map[key].push(lr);
          }
        });

      setLeaveMap(map);
    } catch (e) { console.error(e); }
  }, [yearMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleGenerate = async () => {
    setLoading(true);
    const [year, month] = yearMonth.split('-');
    try {
      await api.post('/calendar/generate', { year: parseInt(year), month: parseInt(month) });
      fetchAll();
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
      fetchAll();
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
      if (desc === null) return;
      if (!desc) desc = '假日';
    } else {
      desc = '工作日';
    }
    try {
      await api.post('/calendar/upsert', { date: day.date, is_workday: !day.is_workday, description: desc });
      fetchAll();
    } catch (e) { alert('更新失敗'); }
  };

  const handleEditDescription = async (e, day) => {
    e.stopPropagation();
    const newDesc = prompt('請修改名稱:', day.description || '');
    if (newDesc === null) return;
    try {
      await api.post('/calendar/upsert', { date: day.date, is_workday: day.is_workday, description: newDesc });
      fetchAll();
    } catch (e) { alert('更新失敗'); }
  };

  const MAX_VISIBLE = 2;

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

      {/* 圖例 */}
      <div className="flex items-center gap-4 mb-4 px-1 flex-wrap">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">假別圖例：</span>
        {[
          { label: '年假/特休', color: getLeaveColor('年假') },
          { label: '病假', color: getLeaveColor('病假') },
          { label: '事假', color: getLeaveColor('事假') },
          { label: '婚假', color: getLeaveColor('婚假') },
          { label: '產假', color: getLeaveColor('產假') },
          { label: '其他', color: getLeaveColor('') },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
            <span className={`w-2 h-2 rounded-full ${color.dot}`} />
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="font-bold text-center text-gray-500 text-sm py-1">{d}</div>
        ))}

        {days.map(day => {
          const dateObj = new Date(day.date);
          const dayOfWeek = dateObj.getDay();
          const dayLeaves = leaveMap[day.date] || [];
          const visibleLeaves = dayLeaves.slice(0, MAX_VISIBLE);
          const hiddenCount = dayLeaves.length - MAX_VISIBLE;
          const isPopoverOpen = popoverDate === day.date;

          return (
            <div
              key={day.id}
              onClick={() => canManage && handleToggleWorkday(day)}
              className={`relative border rounded-lg text-center ${canManage ? 'cursor-pointer' : 'cursor-default'} transition-colors flex flex-col ${day.is_workday ? 'bg-white hover:bg-gray-50 border-gray-200' : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-800 shadow-sm'}`}
              style={{ gridColumnStart: day.date.endsWith('-01') ? dayOfWeek + 1 : 'auto', minHeight: '110px' }}
              title={canManage ? '點擊切換工作日/假日' : ''}
            >
              {/* 日期數字與名稱 */}
              <div className="pt-2 px-2">
                <div className={`text-lg font-black ${!day.is_workday && 'text-red-600'}`}>{day.date.split('-')[2]}</div>
                <div className="flex items-center justify-center gap-1 group mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${day.is_workday ? 'bg-gray-100 text-gray-500' : 'bg-red-200 text-red-800 font-semibold'} max-w-[72px] truncate`}>
                    {day.description || (day.is_workday ? '工作日' : '假日')}
                  </span>
                  {canManage && (
                    <button
                      onClick={(e) => handleEditDescription(e, day)}
                      className="text-gray-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      title="修改名稱"
                    >
                      ✎
                    </button>
                  )}
                </div>
              </div>

              {/* 請假名條區域 */}
              {dayLeaves.length > 0 && (
                <div className="px-1 pb-1.5 mt-1 space-y-0.5 flex-1" onClick={e => e.stopPropagation()}>
                  {visibleLeaves.map(lr => {
                    const color = getLeaveColor(lr.leaveType?.name);
                    return (
                      <div
                        key={lr.id}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${color.bg} ${color.text} border ${color.border} truncate w-full`}
                        title={`${lr.employee?.name} - ${lr.leaveType?.name}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                        <span className="truncate">{lr.employee?.name}</span>
                      </div>
                    );
                  })}

                  {/* +N 人請假 - 浮層觸發按鈕 */}
                  {hiddenCount > 0 && (
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setPopoverDate(isPopoverOpen ? null : day.date); }}
                        className="w-full text-[10px] font-black text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded px-1.5 py-0.5 transition-colors text-left"
                      >
                        +{hiddenCount} 人請假…
                      </button>
                      {isPopoverOpen && (
                        <LeavePopover
                          date={day.date}
                          leaves={dayLeaves}
                          onClose={() => setPopoverDate(null)}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
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
