import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle, CheckCircle2, XCircle, Clock4, FileText, Download, Shield, LogOut, CheckSquare, Settings, BarChart, Plus, Save, Trash2, ChevronDown, ChevronUp, Users, AlertCircle, X, FileSpreadsheet, Printer, Search, Filter, List } from 'lucide-react';
import api from '../utils/api';
import { usePermission } from '../contexts/PermissionContext';
import { useToast } from '../contexts/ToastContext';
import DateRangePicker from '../components/DateRangePicker';

export default function Leaves() {
  const { hasPermission, isSuperUser, isAdmin, isSelfOnly } = usePermission();
  const { addToast } = useToast();
  const canManage    = hasPermission('LEAVE', 'canEdit');
  const canApprove   = hasPermission('LEAVE', 'canApprove');
  const canCreate    = hasPermission('LEAVE', 'canCreate');
  const canDelete    = hasPermission('LEAVE', 'canDelete');
  const isLeaveSelfOnly = isSelfOnly('LEAVE');
  const user = JSON.parse(sessionStorage.getItem('user'));

  const [types, setTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // 自定義顯示欄位
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('leaveVisibleColumns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.requests) return parsed;
      } catch (e) {}
    }
    return {
      requests: ['seq', 'code', 'name', 'type', 'start', 'end', 'hours', 'status'],
      overtime: ['seq', 'code', 'name', 'date', 'time', 'reason', 'status'],
      quotas: ['seq', 'code', 'name', 'leave_type', 'total', 'used', 'remaining', 'usage']
    };
  });

  useEffect(() => {
    localStorage.setItem('leaveVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const allColumns = {
    requests: [
      { id: 'seq', label: '#' },
      { id: 'code', label: '工號' },
      { id: 'name', label: '員工姓名' },
      { id: 'type', label: '假別' },
      { id: 'start', label: '開始時間' },
      { id: 'end', label: '結束時間' },
      { id: 'hours', label: '時數' },
      { id: 'status', label: '狀態' }
    ],
    overtime: [
      { id: 'seq', label: '#' },
      { id: 'code', label: '工號' },
      { id: 'name', label: '員工姓名' },
      { id: 'date', label: '日期' },
      { id: 'time', label: '申請時段' },
      { id: 'reason', label: '加班事由' },
      { id: 'status', label: '審核狀態' }
    ],
    quotas: [
      { id: 'seq', label: '#' },
      { id: 'code', label: '工號' },
      { id: 'name', label: '員工姓名' },
      { id: 'leave_type', label: '假別項目' },
      { id: 'total', label: '年度總額度' },
      { id: 'used', label: '已用時數' },
      { id: 'remaining', label: '剩餘時數' },
      { id: 'usage', label: '使用率' }
    ]
  };

  // 篩選狀態
  const today = new Date();
  const formatLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const currentMonthStart = formatLocal(new Date(today.getFullYear(), today.getMonth(), 1));
  const currentMonthEnd = formatLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const [dateRange, setDateRange] = useState({ start: currentMonthStart, end: currentMonthEnd });

  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [listStatusFilter, setListStatusFilter] = useState('ACTIVE');
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const [quotaSearch, setQuotaSearch] = useState('');
  const [quotaFilter, setQuotaFilter] = useState({ leaveTypeId: '' });

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  
  const [form, setForm] = useState({ 
    employeeId: '', leaveTypeId: '', start_date: '', start_time: '08:00',
    end_date: '', end_time: '17:00', reason: '' 
  });

  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [otForm, setOtForm] = useState({ 
    employeeId: '', date: '', start_time: '09:00', end_time: '18:00', reason: '' 
  });
  
  const [typeForm, setTypeForm] = useState({ id: null, code: '', name: '', is_paid: true, deduction_ratio: 1.0, note: '' });
  const [expandedTypeId, setExpandedTypeId] = useState(null);
  const [showTypeCreateForm, setShowTypeCreateForm] = useState(false);
  const [batchLeaveTypeId, setBatchLeaveTypeId] = useState('');
  const [batchYear, setBatchYear] = useState(new Date().getFullYear());
  const [batchValues, setBatchValues] = useState({});

  useEffect(() => {
    fetchData();
    if (!canManage && user) {
      setForm(prev => ({ ...prev, employeeId: user.id }));
    }
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 'quotas') fetchQuotas();
  }, [quotaFilter, quotaSearch, activeTab, dateRange]);

  const fetchData = async () => {
    try {
      const query = `start_date=${dateRange.start}&end_date=${dateRange.end}`;
      const [tRes, rRes, eRes, oRes] = await Promise.all([
        api.get('/leaves/types'),
        api.get(`/leaves/requests?${query}`),
        api.get('/employees'),
        api.get(`/overtime?${query}`)
      ]);
      setTypes(tRes.data);
      setRequests(rRes.data);
      setEmployees(eRes.data);
      setOvertimeRequests(oRes.data);
    } catch (e) { console.error(e); }
  };

  const handleOtSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/overtime', otForm);
      addToast('加班申請送出成功', 'success');
      setShowOvertimeModal(false);
      fetchData();
    } catch (e) { addToast('送出失敗', 'error'); }
  };

  const handleUpdateOtStatus = async (id, status) => {
    try {
      await api.put(`/overtime/${id}/status`, { status });
      addToast('狀態更新成功', 'success');
      fetchData();
    } catch (e) { addToast('操作失敗', 'error'); }
  };

  const handleDeleteOt = async (id) => {
    if(!window.confirm('確定刪除此加班單？')) return;
    try {
      await api.delete(`/overtime/${id}`);
      addToast('刪除成功', 'success');
      fetchData();
    } catch (e) { addToast('刪除失敗', 'error'); }
  };

  const fetchQuotas = async () => {
    try {
      const qParams = new URLSearchParams({ ...quotaFilter, start_date: dateRange.start, end_date: dateRange.end });
      const res = await api.get(`/leaves/quotas?${qParams.toString()}`);
      let filtered = res.data;
      if (quotaSearch) {
        const s = quotaSearch.toLowerCase();
        filtered = filtered.filter(q => 
          q.employee.name.toLowerCase().includes(s) || 
          q.employee.code.toLowerCase().includes(s)
        );
      }
      setQuotas(filtered);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const startDT = new Date(`${form.start_date}T${form.start_time}`);
    const endDT = new Date(`${form.end_date}T${form.end_time}`);
    if (startDT >= endDT) return alert('錯誤：結束時間必須晚於開始時間');
    
    try {
      await api.post('/leaves/requests', form);
      setForm({ employeeId: canManage ? '' : user?.id, leaveTypeId: '', start_date: '', start_time: '08:00', end_date: '', end_time: '17:00', reason: '' });
      addToast('申請成功', 'success');
      setShowRequestModal(false);
      fetchData();
    } catch (e) { addToast('新增失敗: ' + (e.response?.data?.error || '資料格式錯誤'), 'error'); }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/leaves/requests/${id}/status`, { status });
      fetchData();
    } catch (e) { addToast('更新失敗', 'error'); }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`確定要刪除選中的 ${selectedIds.length} 筆請假單嗎？此動作無法復原。`)) return;
    try {
      await api.delete('/leaves/requests/batch', { data: { ids: selectedIds } });
      addToast('刪除成功', 'success');
      setSelectedIds([]);
      fetchData();
    } catch (e) { addToast('刪除失敗', 'error'); }
  };

  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      if (typeForm.id) await api.put(`/leaves/types/${typeForm.id}`, typeForm);
      else await api.post('/leaves/types', typeForm);
      setTypeForm({ id: null, code: '', name: '', is_paid: true, deduction_ratio: 1.0, note: '' });
      setShowTypeCreateForm(false);
      setExpandedTypeId(null);
      addToast('儲存成功', 'success');
      fetchData();
    } catch (e) { addToast('儲存失敗', 'error'); }
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm('確定要刪除這個假別嗎？已建立的假單可能會受到影響。')) return;
    try {
      await api.delete(`/leaves/types/${id}`);
      fetchData();
      if (expandedTypeId === id) setExpandedTypeId(null);
      addToast('已刪除假別', 'info');
    } catch (e) { addToast('刪除失敗', 'error'); }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        activeTab,
        start_date: dateRange.start,
        end_date: dateRange.end,
        statusFilter: requestStatusFilter,
        nameSearch: activeTab === 'quotas' ? quotaSearch : '', 
      });
      if (selectedEmpIds.length > 0) {
        params.append('selectedEmpIds', selectedEmpIds.join(','));
      }
      const res = await api.get(`/leaves/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Leaves_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) { addToast('匯出失敗', 'error'); }
  };

  const handleBatchSave = async () => {
    if (!batchLeaveTypeId) return alert('請先選擇假別');
    const quotasToSave = employees.map(emp => ({
      employeeId: emp.id, leaveTypeId: batchLeaveTypeId, year: batchYear, total_hours: parseFloat(batchValues[emp.id] || 0)
    }));
    try {
      await api.post('/leaves/quotas/batch', { quotas: quotasToSave });
      addToast('批次核給成功', 'success');
      fetchQuotas();
      setShowQuotaModal(false);
    } catch (e) { addToast('儲存失敗', 'error'); }
  };

  const filteredRequests = requests.filter(r => {
    const matchesStatus = requestStatusFilter === 'all' || r.status === requestStatusFilter;
    const matchesEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(r.employeeId);
    return matchesStatus && matchesEmp;
  });

  const filteredOvertimeRequests = overtimeRequests.filter(r => {
    const matchesStatus = requestStatusFilter === 'all' || r.status === requestStatusFilter;
    const matchesEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(r.employeeId);
    return matchesStatus && matchesEmp;
  });

  const filteredQuotas = quotas.filter(q => {
    const matchesEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(q.employeeId);
    return matchesEmp;
  });

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header Area */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        {/* Top Tier */}
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              <span className="text-indigo-600">▌</span> 加班/請假管理中心
            </h1>
            <DateRangePicker 
              startDate={dateRange.start} 
              endDate={dateRange.end} 
              onDateChange={(start, end) => setDateRange({ start, end })} 
            />
          </div>
          <div className="flex items-center gap-3">
            {/* 保留未來可能新增的右側按鈕區域 */}
          </div>
        </div>

        {/* Bottom Tier: Filters */}
        <div className="px-6 py-2.5 bg-gray-50 flex items-center gap-4 text-sm border-t border-gray-100 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={14} className="text-gray-400" />
            <span className="text-gray-500 font-bold text-xs">列表篩選</span>
          </div>

          {['requests', 'overtime', 'quotas'].includes(activeTab) && (
            <>
              <select 
                value={listStatusFilter} 
                onChange={e => { setListStatusFilter(e.target.value); setSelectedEmpIds([]); }}
                className="bg-white border border-gray-300 rounded px-3 py-1 text-xs font-bold text-[#1e40af] outline-none shadow-sm hover:border-blue-400 shrink-0"
              >
                <option value="ACTIVE">在職中</option>
                <option value="RESIGNED">已離職</option>
                <option value="all">不分狀態</option>
              </select>

              <div className="relative shrink-0">
                <button 
                  onClick={() => setIsEmpDropdownOpen(!isEmpDropdownOpen)}
                  className="bg-white border border-gray-300 rounded px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-1 shadow-sm"
                >
                  <Users size={14} /> 人員選擇 {selectedEmpIds.length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] ml-1">{selectedEmpIds.length}</span>}
                </button>
                {isEmpDropdownOpen && (
                  <div className="absolute top-full mt-1 left-0 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b">
                      <span className="text-[10px] font-black text-gray-400 uppercase">人員篩選清單</span>
                      <button onClick={() => setSelectedEmpIds([])} className="text-[10px] font-bold text-indigo-600 hover:underline">清除選擇</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {employees.filter(e => listStatusFilter === 'all' || e.status === listStatusFilter).map(emp => (
                        <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors">
                          <input type="checkbox" checked={selectedEmpIds.includes(emp.id)} onChange={() => selectedEmpIds.includes(emp.id) ? setSelectedEmpIds(selectedEmpIds.filter(id => id !== emp.id)) : setSelectedEmpIds([...selectedEmpIds, emp.id])} className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-0" />
                          <span className={`text-xs md:text-sm font-bold ${selectedEmpIds.includes(emp.id) ? 'text-indigo-600' : 'text-gray-600'}`}>{emp.name} <span className="text-[10px] text-gray-400 font-mono">({emp.code})</span></span>
                        </label>
                      ))}
                    </div>
                    <button onClick={()=>setIsEmpDropdownOpen(false)} className="w-full mt-3 bg-gray-900 text-white py-2 rounded-lg text-xs font-bold shadow-sm">確定</button>
                  </div>
                )}
              </div>

              {['requests', 'overtime'].includes(activeTab) && (
                <div className="flex bg-gray-100 p-0.5 rounded-md border border-gray-200 shadow-inner shrink-0">
                  {['all', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                    <button key={s} onClick={() => setRequestStatusFilter(s)} className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${requestStatusFilter === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {s === 'all' ? '全部' : s === 'PENDING' ? '待審核' : s === 'APPROVED' ? '核准' : '駁回'}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'quotas' && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input type="text" placeholder="搜尋姓名/工號..." value={quotaSearch} onChange={e => setQuotaSearch(e.target.value)} className="pl-8 pr-3 py-1 bg-white border border-gray-300 rounded text-xs font-bold outline-none w-40 focus:border-blue-400 transition-all shadow-sm" />
              </div>
              <select value={quotaFilter.leaveTypeId} onChange={e => setQuotaFilter({...quotaFilter, leaveTypeId: e.target.value})} className="bg-white border border-gray-300 rounded px-3 py-1 text-xs font-bold outline-none shadow-sm hover:border-blue-400">
                <option value="">所有假別</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div className="h-4 w-px bg-gray-300 mx-1 hidden md:block shrink-0"></div>

          <div className="relative shrink-0">
            <button 
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-1 shadow-sm"
            >
              <Settings size={14} /> 顯示欄位
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-black text-gray-700">自訂顯示欄位</span>
                  <button onClick={() => setShowColumnPicker(false)} className="text-gray-300 hover:text-gray-500"><X size={16}/></button>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {allColumns[activeTab]?.map(col => (
                    <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors group">
                      <input 
                        type="checkbox"
                        checked={visibleColumns[activeTab]?.includes(col.id)}
                        onChange={(e) => {
                          const newCols = e.target.checked 
                            ? [...(visibleColumns[activeTab] || []), col.id]
                            : visibleColumns[activeTab].filter(id => id !== col.id);
                          setVisibleColumns({...visibleColumns, [activeTab]: newCols});
                        }}
                        className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-xs md:text-sm font-bold text-gray-600 group-hover:text-indigo-600">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Area */}
      <div className="flex bg-[#f8fafc] px-6 border-b border-gray-200 shadow-sm z-10">
        {[
          { id: 'requests', label: '假單管理', icon: <List size={16} /> },
          { id: 'overtime', label: '加班單管理', icon: <Clock4 size={16} /> },
          { id: 'quotas', label: '額度報表', icon: <BarChart size={16} /> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedIds([]); }}
            className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.icon} {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-auto bg-[#f1f5f9] p-4">
        {activeTab === 'requests' && (
          <div className="bg-white border border-gray-300 shadow-sm min-w-max">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] text-[12px] font-bold text-[#1e40af] border-b border-gray-300">
                  <th className="w-10 p-2 border-r border-gray-300 text-center">
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(filteredRequests.map(r => r.id));
                        else setSelectedIds([]);
                      }}
                      checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0}
                    />
                  </th>
                  {visibleColumns.requests?.includes('seq') && <th className="w-12 p-2 border-r border-gray-300 text-center">#</th>}
                  {visibleColumns.requests?.includes('code') && <th className="px-4 py-2 text-left border-r border-gray-300">工號</th>}
                  {visibleColumns.requests?.includes('name') && <th className="px-4 py-2 text-left border-r border-gray-300">員工姓名</th>}
                  {visibleColumns.requests?.includes('type') && <th className="px-4 py-2 text-left border-r border-gray-300">假別</th>}
                  {visibleColumns.requests?.includes('start') || visibleColumns.requests?.includes('end') ? <th className="px-4 py-2 text-left border-r border-gray-300">請假期間 (起 ~ 訖)</th> : null}
                  {visibleColumns.requests?.includes('hours') && <th className="px-4 py-2 text-center border-r border-gray-300">合計時數</th>}
                  {visibleColumns.requests?.includes('status') && <th className="px-4 py-2 text-center border-r border-gray-300">審核狀態</th>}
                  <th className="px-4 py-2 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm md:text-sm">
                {filteredRequests.length > 0 ? filteredRequests.map((req, idx) => (
                  <tr key={req.id} className={`border-b border-gray-200 hover:bg-blue-50/30 transition-colors ${selectedIds.includes(req.id) ? 'bg-blue-50' : ''}`}>
                    <td className="p-2 border-r border-gray-200 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(req.id)}
                        onChange={() => {
                          if (selectedIds.includes(req.id)) setSelectedIds(selectedIds.filter(id => id !== req.id));
                          else setSelectedIds([...selectedIds, req.id]);
                        }}
                      />
                    </td>
                    {visibleColumns.requests?.includes('seq') && <td className="p-2 border-r border-gray-200 text-center text-gray-400 font-mono">{idx + 1}</td>}
                    {visibleColumns.requests?.includes('code') && <td className="px-4 py-2 border-r border-gray-200 text-gray-400 font-mono">{req.employee?.code}</td>}
                    {visibleColumns.requests?.includes('name') && <td className="px-4 py-2 border-r border-gray-200 font-bold text-gray-700">{req.employee?.name}</td>}
                    {visibleColumns.requests?.includes('type') && <td className="px-4 py-2 border-r border-gray-200"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-bold">{req.leaveType?.name}</span></td>}
                    {(visibleColumns.requests?.includes('start') || visibleColumns.requests?.includes('end')) && (
                      <td className="px-4 py-2 border-r border-gray-200 font-mono text-gray-500">
                        {visibleColumns.requests?.includes('start') && `${req.start_date} ${req.start_time}`}
                        {visibleColumns.requests?.includes('start') && visibleColumns.requests?.includes('end') && <span className="mx-1 text-gray-300">→</span>}
                        {visibleColumns.requests?.includes('end') && `${req.end_date} ${req.end_time}`}
                      </td>
                    )}
                    {visibleColumns.requests?.includes('hours') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-indigo-600">{Math.round(req.days * 8)}h</td>}
                    {visibleColumns.requests?.includes('status') && (
                      <td className="px-4 py-2 border-r border-gray-200 text-center">
                        <span className={`px-2 py-1 rounded font-black text-[10px] uppercase shadow-sm ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                          {req.status === 'APPROVED' ? '核准' : req.status === 'REJECTED' ? '駁回' : '待審'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-1 text-center">
                      <div className="flex gap-3 justify-center">
                        {canApprove ? (
                          req.status === 'PENDING' ? (
                            <>
                              <button onClick={() => handleUpdateStatus(req.id, 'APPROVED')} className="text-emerald-600 hover:underline font-bold flex items-center gap-1"><CheckCircle size={14}/> 核准</button>
                              <button onClick={() => handleUpdateStatus(req.id, 'REJECTED')} className="text-rose-600 hover:underline font-bold flex items-center gap-1"><X size={14}/> 駁回</button>
                            </>
                          ) : (
                            <button onClick={() => handleUpdateStatus(req.id, 'PENDING')} className="text-gray-400 hover:text-indigo-600 font-bold flex items-center gap-1"><Clock size={14}/> 重置</button>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" className="py-20 text-center text-gray-400 italic">目前沒有符合篩選條件的假單</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'overtime' && (
          <div className="bg-white border border-gray-300 shadow-sm min-w-max">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Clock4 size={16}/> 加班單列表</h2>
              {canCreate && (
                <button onClick={() => setShowOvertimeModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-indigo-700 flex items-center gap-1 shadow-sm">
                  <Plus size={16} /> 新增加班單
                </button>
              )}
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] text-[12px] font-bold text-[#1e40af] border-b border-gray-300">
                  {visibleColumns.overtime?.includes('seq') && <th className="w-12 p-2 border-r border-gray-300 text-center">#</th>}
                  {visibleColumns.overtime?.includes('code') && <th className="px-4 py-2 text-left border-r border-gray-300">工號</th>}
                  {visibleColumns.overtime?.includes('name') && <th className="px-4 py-2 text-left border-r border-gray-300">員工姓名</th>}
                  {visibleColumns.overtime?.includes('date') && <th className="px-4 py-2 text-left border-r border-gray-300">日期</th>}
                  {visibleColumns.overtime?.includes('time') && <th className="px-4 py-2 text-left border-r border-gray-300">申請時段</th>}
                  {visibleColumns.overtime?.includes('reason') && <th className="px-4 py-2 text-left border-r border-gray-300">加班事由</th>}
                  {visibleColumns.overtime?.includes('status') && <th className="px-4 py-2 text-center border-r border-gray-300">審核狀態</th>}
                  <th className="px-4 py-2 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm">
                {filteredOvertimeRequests.map((req, idx) => (
                  <tr key={req.id} className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors">
                    {visibleColumns.overtime?.includes('seq') && <td className="p-2 border-r border-gray-200 text-center text-gray-400 font-mono">{idx + 1}</td>}
                    {visibleColumns.overtime?.includes('code') && <td className="px-4 py-2 border-r border-gray-200 text-gray-400 font-mono">{req.employee?.code}</td>}
                    {visibleColumns.overtime?.includes('name') && <td className="px-4 py-2 border-r border-gray-200 font-bold text-gray-700">{req.employee?.name}</td>}
                    {visibleColumns.overtime?.includes('date') && <td className="px-4 py-2 border-r border-gray-200 font-mono">{req.date}</td>}
                    {visibleColumns.overtime?.includes('time') && <td className="px-4 py-2 border-r border-gray-200 font-mono text-gray-500">{req.start_time} - {req.end_time}</td>}
                    {visibleColumns.overtime?.includes('reason') && <td className="px-4 py-2 border-r border-gray-200 text-gray-600">{req.reason || '--'}</td>}
                    {visibleColumns.overtime?.includes('status') && (
                      <td className="px-4 py-2 border-r border-gray-200 text-center">
                        <span className={`px-2 py-1 rounded font-black text-[10px] uppercase shadow-sm ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                          {req.status === 'APPROVED' ? '核准' : req.status === 'REJECTED' ? '駁回' : '待審'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-1 text-center">
                      <div className="flex gap-3 justify-center">
                        {canApprove ? (
                          req.status === 'PENDING' ? (
                            <>
                              <button onClick={() => handleUpdateOtStatus(req.id, 'APPROVED')} className="text-emerald-600 hover:underline font-bold flex items-center gap-1"><CheckCircle size={14}/> 核准</button>
                              <button onClick={() => handleUpdateOtStatus(req.id, 'REJECTED')} className="text-rose-600 hover:underline font-bold flex items-center gap-1"><X size={14}/> 駁回</button>
                            </>
                          ) : (
                            <button onClick={() => handleUpdateOtStatus(req.id, 'PENDING')} className="text-gray-400 hover:text-indigo-600 font-bold flex items-center gap-1"><Clock size={14}/> 重置</button>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                        {canDelete && <button onClick={() => handleDeleteOt(req.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOvertimeRequests.length === 0 && (
                  <tr><td colSpan="8" className="py-20 text-center text-gray-400 italic">目前沒有符合條件的加班單</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'quotas' && (
          <div className="bg-white border border-gray-300 shadow-sm min-w-max">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] text-[12px] font-bold text-[#1e40af] border-b border-gray-300">
                  {visibleColumns.quotas?.includes('seq') && <th className="w-12 p-2 border-r border-gray-300 text-center">#</th>}
                  {visibleColumns.quotas?.includes('code') && <th className="px-4 py-2 text-left border-r border-gray-300">工號</th>}
                  {visibleColumns.quotas?.includes('name') && <th className="px-4 py-2 text-left border-r border-gray-300">員工姓名</th>}
                  {visibleColumns.quotas?.includes('leave_type') && <th className="px-4 py-2 text-left border-r border-gray-300">假別項目</th>}
                  {visibleColumns.quotas?.includes('total') && <th className="px-4 py-2 text-center border-r border-gray-300">年度總額度</th>}
                  {visibleColumns.quotas?.includes('used') && <th className="px-4 py-2 text-center border-r border-gray-300 text-blue-600">已用時數</th>}
                  {visibleColumns.quotas?.includes('remaining') && <th className="px-4 py-2 text-center border-r border-gray-300 text-emerald-600">剩餘時數</th>}
                  {visibleColumns.quotas?.includes('usage') && <th className="px-4 py-2 text-center">使用率</th>}
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm">
                {filteredQuotas.map((q, idx) => (
                  <tr key={q.id} className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors">
                    {visibleColumns.quotas?.includes('seq') && <td className="p-2 border-r border-gray-200 text-center text-gray-400 font-mono">{idx + 1}</td>}
                    {visibleColumns.quotas?.includes('code') && <td className="px-4 py-2 border-r border-gray-200 text-gray-500 font-mono">{q.employee.code}</td>}
                    {visibleColumns.quotas?.includes('name') && <td className="px-4 py-2 border-r border-gray-200 font-bold text-gray-700">{q.employee.name}</td>}
                    {visibleColumns.quotas?.includes('leave_type') && <td className="px-4 py-2 border-r border-gray-200 font-bold text-[#1e40af]">{q.leaveType.name}</td>}
                    {visibleColumns.quotas?.includes('total') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold font-mono">{Math.round(q.total_hours)}h</td>}
                    {visibleColumns.quotas?.includes('used') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold font-mono text-blue-600">{Math.round(q.used_days * 8)}h</td>}
                    {visibleColumns.quotas?.includes('remaining') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold font-mono text-emerald-600">{Math.round(q.remaining_days * 8)}h</td>}
                    {visibleColumns.quotas?.includes('usage') && (
                      <td className="px-4 py-2 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden shadow-inner border border-gray-200">
                            <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (q.used_days / (q.total_hours/8 || 1)) * 100)}%` }}></div>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">{Math.round((q.used_days / (q.total_hours/8 || 1)) * 100)}%</span>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Bottom Toolbar */}
      <div className="bg-white border-t border-gray-300 p-2 px-6 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4 italic text-[11px] font-bold text-gray-400">
          已篩選出 {activeTab === 'requests' ? filteredRequests.length : activeTab === 'overtime' ? filteredOvertimeRequests.length : activeTab === 'quotas' ? filteredQuotas.length : 0} 筆資料
        </div>
        <div className="flex items-center gap-2">
          {canDelete && selectedIds.length > 0 && activeTab === 'requests' && (
            <button 
              onClick={handleBatchDelete}
              className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-2 rounded-xl text-xs md:text-sm font-bold hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2 mr-4 shadow-sm"
            >
              <Trash2 size={16} /> 刪除選中 ({selectedIds.length})
            </button>
          )}
          {activeTab === 'requests' && canCreate && (
            <button onClick={() => setShowRequestModal(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 hover:-translate-y-0.5">
              <Plus size={18} /> 新增請假/加班單
            </button>
          )}
          <button onClick={handleExport} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
            <FileSpreadsheet size={18} /> 匯出 Excel
          </button>
          <button onClick={() => window.print()} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-gray-100 shadow-sm">
            <Printer size={18} /> 列印目前報表
          </button>
        </div>
      </div>

      {/* Modal: New Request */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4" onClick={() => setShowRequestModal(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl animate-in zoom-in duration-300 overflow-hidden border border-gray-200" onClick={e=>e.stopPropagation()}>
            <div className="bg-indigo-600 p-8 text-white relative">
              <h2 className="text-2xl font-black">建立假單/加班單</h2>
              <p className="text-indigo-100 text-xs md:text-sm mt-1 font-bold">請輸入正確的日期與時間，系統將自動計算時數</p>
              <button onClick={()=>setShowRequestModal(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"><X/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">選擇員工</label>
                  <select required value={form.employeeId} onChange={e=>setForm({...form, employeeId: e.target.value})} className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white outline-none transition-all">
                    <option value="">請選擇員工...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">假別項目</label>
                  <select required value={form.leaveTypeId} onChange={e=>setForm({...form, leaveTypeId: e.target.value})} className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white outline-none transition-all">
                    <option value="">請選擇假別...</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">開始日期</label>
                  <input type="date" required value={form.start_date} onChange={e=>setForm({...form, start_date: e.target.value})} className="w-full border-none bg-transparent p-0 text-sm font-black focus:ring-0" />
                  <input type="time" required value={form.start_time} onChange={e=>setForm({...form, start_time: e.target.value})} className="w-full border-none bg-transparent p-0 text-lg font-black focus:ring-0 mt-1" />
                </div>
                <div className="space-y-2 border-l border-gray-200 pl-6">
                  <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-1">結束日期</label>
                  <input type="date" required value={form.end_date} onChange={e=>setForm({...form, end_date: e.target.value})} className="w-full border-none bg-transparent p-0 text-sm font-black focus:ring-0" />
                  <input type="time" required value={form.end_time} onChange={e=>setForm({...form, end_time: e.target.value})} className="w-full border-none bg-transparent p-0 text-lg font-black focus:ring-0 mt-1" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">申請事由 / 備註</label>
                <textarea rows="3" value={form.reason} onChange={e=>setForm({...form, reason: e.target.value})} className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white outline-none transition-all" placeholder="請填寫詳細事由..."></textarea>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">送出申請單</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch Quota */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4" onClick={() => setShowQuotaModal(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[90vh]" onClick={e=>e.stopPropagation()}>
             <div className="bg-blue-600 p-8 text-white">
                <h2 className="text-2xl font-black italic">年度額度核給工具</h2>
                <div className="flex gap-4 mt-4">
                   <select value={batchLeaveTypeId} onChange={e=>setBatchLeaveTypeId(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none">
                      <option value="" className="text-gray-900">選擇假別項目...</option>
                      {types.map(t => <option key={t.id} value={t.id} className="text-gray-900">{t.name}</option>)}
                   </select>
                   <input type="number" value={batchYear} onChange={e=>setBatchYear(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm font-bold text-white text-center outline-none w-24" />
                </div>
             </div>
             <div className="flex-1 overflow-auto p-8 space-y-4">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest italic">員工核給時數清單</span>
                   <button onClick={() => {
                      const v = prompt('輸入統一核給時數:');
                      if (v) {
                         const newV = {};
                         employees.forEach(e => newV[e.id] = v);
                         setBatchValues(newV);
                      }
                   }} className="text-xs md:text-sm font-bold text-blue-600 hover:underline">批次輸入</button>
                </div>
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xs md:text-sm font-black border border-gray-100 shadow-sm">{emp.name.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-black text-gray-700">{emp.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{emp.code}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="number" value={batchValues[emp.id] || ''} onChange={e=>setBatchValues({...batchValues, [emp.id]: e.target.value})} className="w-24 text-right border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-sm font-black focus:border-blue-400 outline-none" placeholder="0" />
                       <span className="text-xs md:text-sm font-bold text-gray-400">小時</span>
                    </div>
                  </div>
                ))}
             </div>
             <div className="p-8 border-t bg-gray-50 flex justify-end gap-3">
                <button onClick={()=>setShowQuotaModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-200 transition-colors">取消</button>
                <button onClick={handleBatchSave} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">確認核給</button>
             </div>
          </div>
        </div>
      )}

      {/* Modal: New Overtime Request */}
      {showOvertimeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4" onClick={() => setShowOvertimeModal(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl animate-in zoom-in duration-300 overflow-hidden border border-gray-200" onClick={e=>e.stopPropagation()}>
            <div className="bg-indigo-600 p-8 text-white relative">
              <h2 className="text-2xl font-black">填寫加班申請單</h2>
              <p className="text-indigo-100 text-xs md:text-sm mt-1 font-bold">送出後需由主管審核。系統將根據實際打卡時間與申請時段取交集核發時數。</p>
              <button onClick={()=>setShowOvertimeModal(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"><X/></button>
            </div>
            <form onSubmit={handleOtSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">選擇員工</label>
                <select required value={otForm.employeeId} onChange={e=>setOtForm({...otForm, employeeId: e.target.value})} className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white outline-none transition-all">
                  <option value="">請選擇員工...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">加班日期</label>
                  <input type="date" required value={otForm.date} onChange={e=>setOtForm({...otForm, date: e.target.value})} className="w-full border-none bg-transparent p-0 text-lg font-black focus:ring-0 mt-1" />
                </div>
                <div className="space-y-2 border-l border-gray-200 pl-6">
                  <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-1">申請時段 (起迄)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="time" required value={otForm.start_time} onChange={e=>setOtForm({...otForm, start_time: e.target.value})} className="w-full border-none bg-transparent p-0 text-sm font-black focus:ring-0" />
                    <span className="text-gray-300">-</span>
                    <input type="time" required value={otForm.end_time} onChange={e=>setOtForm({...otForm, end_time: e.target.value})} className="w-full border-none bg-transparent p-0 text-sm font-black focus:ring-0" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">加班事由</label>
                <textarea rows="3" value={otForm.reason} onChange={e=>setOtForm({...otForm, reason: e.target.value})} className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white outline-none transition-all" placeholder="請簡述加班原因..."></textarea>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">送出加班單</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
