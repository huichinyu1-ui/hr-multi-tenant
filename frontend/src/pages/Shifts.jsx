import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { usePermission } from '../contexts/PermissionContext';

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [formData, setFormData] = useState({
    code: '', name: '', work_start: '09:00', work_end: '18:00',
    rest_start: '12:00', rest_end: '13:00',
    overtime_start: '18:30',
    late_buffer_mins: 0, punch_in_window_mins: 240, overtime_min_unit: 30
  });
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('SHIFT', 'canEdit');
  const canDelete = hasPermission('SHIFT', 'canDelete');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await api.get('/shifts');
      setShifts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/shifts/${editingId}`, formData);
      } else {
        await api.post('/shifts', formData);
      }
      setFormData({
        code: '', name: '', work_start: '09:00', work_end: '18:00',
        rest_start: '12:00', rest_end: '13:00',
        overtime_start: '18:30', late_buffer_mins: 0, punch_in_window_mins: 240, overtime_min_unit: 30
      });
      setEditingId(null);
      fetchShifts();
    } catch (e) {
      alert(e.response?.data?.error || '儲存失敗');
    }
  };

  const handleEdit = (shift) => {
    setFormData({
      code: shift.code,
      name: shift.name,
      work_start: shift.work_start,
      work_end: shift.work_end,
      rest_start: shift.rest_start || '',
      rest_end: shift.rest_end || '',
      overtime_start: shift.overtime_start || '',
      late_buffer_mins: shift.late_buffer_mins,
      punch_in_window_mins: shift.punch_in_window_mins,
      overtime_min_unit: shift.overtime_min_unit
    });
    setEditingId(shift.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('確定刪除此班別？(如果已有員工使用此班別將無法刪除)')) return;
    try {
      await api.delete(`/shifts/${id}`);
      fetchShifts();
    } catch (e) {
      alert(e.response?.data?.error || '刪除失敗');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">班別與出勤規則管理</h2>

      {canEdit && (
      <form onSubmit={handleSave} className="bg-gray-50 p-6 rounded-lg mb-8">
        <h3 className="font-bold text-lg mb-4">{editingId ? '編輯班別' : '新增班別'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-700">班別代碼</label>
            <input required type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} disabled={editingId} className="mt-1 w-full p-2 border rounded" placeholder="如: NORMAL" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">班別名稱</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full p-2 border rounded" placeholder="如: 正常班" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">上班時間</label>
            <input required type="time" value={formData.work_start} onChange={e => setFormData({ ...formData, work_start: e.target.value })} className="mt-1 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">下班時間</label>
            <input required type="time" value={formData.work_end} onChange={e => setFormData({ ...formData, work_end: e.target.value })} className="mt-1 w-full p-2 border rounded" />
          </div>
          
          <div>
            <label className="block text-sm text-gray-700">休息起始 (選填)</label>
            <input type="time" value={formData.rest_start} onChange={e => setFormData({ ...formData, rest_start: e.target.value })} className="mt-1 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">休息結束 (選填)</label>
            <input type="time" value={formData.rest_end} onChange={e => setFormData({ ...formData, rest_end: e.target.value })} className="mt-1 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">加班起算 (選填)</label>
            <input type="time" value={formData.overtime_start} onChange={e => setFormData({ ...formData, overtime_start: e.target.value })} className="mt-1 w-full p-2 border rounded" />
            <div className="text-xs text-gray-500 mt-1">留空則依下班時間</div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">遲到緩衝 (分鐘)</label>
            <input type="number" value={formData.late_buffer_mins} onChange={e => setFormData({...formData, late_buffer_mins: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:bg-white outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">允許提前打卡 (分鐘)</label>
            <input type="number" value={formData.punch_in_window_mins} onChange={e => setFormData({...formData, punch_in_window_mins: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:bg-white outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">加班最小單位 (分)</label>
            <input type="number" value={formData.overtime_min_unit} onChange={e => setFormData({...formData, overtime_min_unit: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:bg-white outline-none" />
            <div className="text-xs text-gray-500 mt-1">如: 30 代表不足半小不計</div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded shadow hover:bg-indigo-700">
            {editingId ? '儲存變更' : '新增班別'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ code: '', name: '', work_start: '08:30', work_end: '17:30', rest_start: '12:00', rest_end: '13:00', overtime_start: '18:00', late_buffer_mins: 5, overtime_min_unit: 30 }); }} className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500">
              取消編輯
            </button>
          )}
        </div>
      </form>
      )}

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-3">代碼 / 名稱</th>
            <th className="p-3">時段</th>
            <th className="p-3">休息時段</th>
            <th className="p-3">加班起算</th>
            <th className="p-3">規則設定</th>
            <th className="p-3">人數</th>
            <th className="p-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map(s => (
            <tr key={s.id} className="border-b hover:bg-gray-50">
              <td className="p-3">
                <div className="font-bold">{s.name}</div>
                <div className="text-xs text-gray-500">{s.code}</div>
              </td>
              <td className="p-3">{s.work_start} - {s.work_end}</td>
              <td className="p-3">{s.rest_start ? `${s.rest_start} - ${s.rest_end}` : '無'}</td>
              <td className="p-3">{s.overtime_start || '下班即算'}</td>
              <td className="p-3 text-sm">
                <div>遲到緩衝: {s.late_buffer_mins}分</div>
                <div>提前打卡: {s.punch_in_window_mins || 240}分</div>
                <div>加班單位: {s.overtime_min_unit}分</div>
              </td>
              <td className="p-3 text-center">{s._count?.employees || 0}</td>
              <td className="p-3 space-x-2">
                {canEdit && <button onClick={() => handleEdit(s)} className="text-indigo-600 hover:text-indigo-900">編輯</button>}
                {canDelete && <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900">刪除</button>}
              </td>
            </tr>
          ))}
          {shifts.length === 0 && (
            <tr><td colSpan="7" className="p-6 text-center text-gray-500">尚無班別設定</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
