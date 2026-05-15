import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Send, Trash2, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { usePermission } from '../contexts/PermissionContext';
import api from '../utils/api';

export default function MissedPunches() {
  const { addToast } = useToast();
  const { hasPermission, isSelfOnly } = usePermission();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const canApprove  = hasPermission('MISSED_PUNCH', 'canApprove');
  const canDelete   = hasPermission('MISSED_PUNCH', 'canDelete');
  const canCreate   = hasPermission('MISSED_PUNCH', 'canCreate');
  const isMissedSelfOnly = isSelfOnly('MISSED_PUNCH'); // 查看範圍：由 selfOnly 決定

  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    punch_type: 'IN',
    target_time: '09:00',
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  // 申請表單摺疊狀態
  // 有審核權的管理員：預設收起（以管理為主）
  // 一般員工（純申請者）：預設展開（申請是主要動作）
  const [isFormOpen, setIsFormOpen] = useState(!canApprove);

  // 篩選狀態（前端篩選，同請假中心）
  const [statusFilter, setStatusFilter] = useState('all');
  const [listStatusFilter, setListStatusFilter] = useState('ACTIVE'); // 員工在職狀態篩選
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);

  useEffect(() => {
    fetchRequests();
    if (!isMissedSelfOnly) fetchEmployees();
  }, []);

  const fetchRequests = async () => {
    try {
      const url = isMissedSelfOnly
        ? `/missed-punches?employeeId=${user.id}`
        : `/missed-punches`;
      const res = await api.get(url);
      setRequests(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (e) { console.error(e); }
  };

  // 前端篩選（同請假中心）
  const filteredRequests = requests.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(r.employeeId);
    return matchStatus && matchEmp;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/missed-punches', { ...form, employeeId: user.id });
      addToast('申請已提交', 'success');
      setForm({ ...form, reason: '' });
      fetchRequests();
    } catch (e) {
      const errorMsg = e.response?.data?.details || e.response?.data?.error || '提交失敗';
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, status) => {
    try {
      await api.put(`/missed-punches/${id}/approve`, { status });
      addToast(`申請已${status === 'APPROVED' ? '核准' : '駁回'}`, 'success');
      fetchRequests();
    } catch (e) {
      addToast(e.response?.data?.details || '操作失敗', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除/撤回此申請嗎？')) return;
    try {
      await api.delete(`/missed-punches/${id}`);
      addToast('已刪除/撤回申請', 'success');
      fetchRequests();
    } catch (e) {
      addToast(e.response?.data?.error || '刪除失敗', 'error');
    }
  };

  const statusBadge = (status) => {
    if (status === 'APPROVED') return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">✅ 核准</span>;
    if (status === 'REJECTED') return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">❌ 駁回</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">⏳ 待審核</span>;
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] bg-white -m-6 lg:-m-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-base md:text-xl font-black text-gray-800 tracking-tight flex items-center gap-2 shrink-0">
            <span className="text-indigo-600">◌</span> 補打卡申請
          </h1>

          {/* 手機版可左右滑動的筜選工具列 */}
          {!isMissedSelfOnly && (
            <div className="overflow-x-auto flex-1 min-w-0 -mr-4 md:mr-0">
              <div className="flex items-center gap-2 min-w-max pr-4 md:pr-0">
                {/* 在職狀態筜選 */}
                <select
                  value={listStatusFilter}
                  onChange={e => { setListStatusFilter(e.target.value); setSelectedEmpIds([]); }}
                  className="bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold text-indigo-700 outline-none hover:border-blue-400 transition-colors shrink-0"
                >
                  <option value="ACTIVE">在職中</option>
                  <option value="RESIGNED">已離職</option>
                  <option value="all">不分狀態</option>
                </select>

                {/* 人員多選下拉 */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsEmpDropdownOpen(!isEmpDropdownOpen)}
                    className="bg-white border border-gray-300 rounded px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-indigo-400 transition-all flex items-center gap-1.5"
                  >
                    <span>{selectedEmpIds.length === 0 ? '全部人員' : `已選擇 ${selectedEmpIds.length} 人`}</span>
                    <ChevronDown size={11} />
                  </button>
                  {isEmpDropdownOpen && (
                    <div className="fixed inset-0 z-[998]" onClick={() => setIsEmpDropdownOpen(false)}>
                      <div className="absolute mt-1 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 z-[999] p-3" style={{top: 'auto'}} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2 pb-2 border-b">
                          <span className="text-[10px] font-black text-gray-400 uppercase">人員筜選</span>
                          <button onClick={() => setSelectedEmpIds([])} className="text-[10px] font-bold text-indigo-600">清除</button>
                        </div>
                        <div className="max-h-52 overflow-y-auto space-y-0.5">
                          {employees
                            .filter(e => listStatusFilter === 'all' || e.status === listStatusFilter)
                            .map(emp => (
                              <label key={emp.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                <input type="checkbox"
                                  checked={selectedEmpIds.includes(emp.id)}
                                  onChange={() => selectedEmpIds.includes(emp.id)
                                    ? setSelectedEmpIds(selectedEmpIds.filter(id => id !== emp.id))
                                    : setSelectedEmpIds([...selectedEmpIds, emp.id])}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600"
                                />
                                <span className={`text-xs font-bold ${selectedEmpIds.includes(emp.id) ? 'text-indigo-600' : 'text-gray-600'}`}>
                                  {emp.name} <span className="text-[10px] text-gray-400">({emp.code})</span>
                                </span>
                              </label>
                            ))}
                        </div>
                        <button onClick={() => setIsEmpDropdownOpen(false)} className="w-full mt-2 bg-gray-900 text-white py-1.5 rounded-lg text-xs font-bold">確定</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 狀態 Tab 筜選 */}
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 shadow-inner shrink-0">
                  {[['all','全部'], ['PENDING','待審核'], ['APPROVED','核准'], ['REJECTED','駁回']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setStatusFilter(val)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all whitespace-nowrap ${statusFilter === val ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">

          {/* 左側：申請表單（可摺疊） */}
          {canCreate && isFormOpen && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                    <Send className="w-4 h-4 text-indigo-600" /> 提交新申請
                  </h3>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    title="收起表單"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>
                <div className="p-5">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">日期</label>
                      <input
                        type="date" required value={form.date}
                        onChange={e => setForm({...form, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">類型</label>
                        <select
                          value={form.punch_type}
                          onChange={e => setForm({...form, punch_type: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="IN">上班</option>
                          <option value="OUT">下班</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">時間</label>
                        <input
                          type="time" required value={form.target_time}
                          onChange={e => setForm({...form, target_time: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">原因說明</label>
                      <textarea
                        value={form.reason}
                        onChange={e => setForm({...form, reason: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                        placeholder="請簡述漏打卡原因..."
                      />
                    </div>
                    <button
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100 text-sm"
                    >
                      {loading ? '提交中...' : '確認提交'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* 右側：資料列表 — 寬度隨表單摺疊動態調整 */}
          <div className={canCreate && isFormOpen ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  {isMissedSelfOnly ? '我的申請紀錄' : (canApprove ? '補打卡審核管理' : '全公司補打卡紀錄')}
                  <span className="ml-1 bg-indigo-100 text-indigo-600 text-xs font-black px-2 py-0.5 rounded-full">{filteredRequests.length}</span>
                </h3>
                <div className="flex items-center gap-2">
                  {/* selfOnly 使用者的狀態篩選（精簡版）*/}
                  {isMissedSelfOnly && (
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                      {[['all','全部'], ['PENDING','待審核'], ['APPROVED','核准'], ['REJECTED','駁回']].map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setStatusFilter(val)}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${statusFilter === val ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* 申請表單開關按鈕 */}
                  {canCreate && (
                    <button
                      onClick={() => setIsFormOpen(!isFormOpen)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isFormOpen
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                          : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100'
                      }`}
                    >
                      <PlusCircle size={14} />
                      {isFormOpen ? '收起表單' : '新增申請'}
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {!isMissedSelfOnly && <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">員工</th>}
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">日期</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">類型</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">補打時間</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">原因</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">狀態</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={isMissedSelfOnly ? 6 : 7} className="px-6 py-16 text-center text-gray-400">
                          <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                          <p className="text-sm font-bold">目前沒有相關紀錄</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map(req => (
                        <tr key={req.id} className="hover:bg-indigo-50/30 transition-colors">
                          {!isMissedSelfOnly && (
                            <td className="px-4 py-3 font-bold text-gray-800">
                              {req.employee?.name || <span className="text-gray-300 italic text-xs">已刪除員工</span>}
                              {req.employee?.code && <div className="text-[10px] text-gray-400 font-mono">{req.employee.code}</div>}
                            </td>
                          )}
                          <td className="px-4 py-3 text-gray-700 font-mono text-xs">{req.date}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${req.punch_type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                              {req.punch_type === 'IN' ? '上班' : '下班'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-black text-indigo-600">{req.target_time}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate" title={req.reason}>{req.reason || '—'}</td>
                          <td className="px-4 py-3">{statusBadge(req.status)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {/* 審核按鈕：只有 canApprove 且狀態為 PENDING 時顯示 */}
                              {canApprove && req.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(req.id, 'APPROVED')}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all"
                                  >
                                    <CheckCircle size={12} /> 核准
                                  </button>
                                  <button
                                    onClick={() => handleApprove(req.id, 'REJECTED')}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-all"
                                  >
                                    <XCircle size={12} /> 駁回
                                  </button>
                                </>
                              )}
                              {/* 已核准/駁回：canApprove 可重置回待審核 */}
                              {canApprove && req.status !== 'PENDING' && (
                                <button
                                  onClick={() => handleApprove(req.id, 'PENDING')}
                                  className="px-2.5 py-1 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-lg text-xs font-bold transition-all"
                                >
                                  重置
                                </button>
                              )}
                              {/* 刪除：canDelete 且（是管理員 或 是自己的 PENDING 紀錄）*/}
                              {canDelete && (canApprove || (req.employeeId === user.id && req.status === 'PENDING')) && (
                                <button
                                  onClick={() => handleDelete(req.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs font-bold transition-all"
                                >
                                  <Trash2 size={12} /> {req.status === 'PENDING' && req.employeeId === user.id && !canApprove ? '撤回' : '刪除'}
                                </button>
                              )}
                              {/* 無任何操作時顯示鎖定 */}
                              {!canApprove && !(canDelete && req.status === 'PENDING' && req.employeeId === user.id) && (
                                <span className="text-gray-300 italic text-xs">🔒</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
