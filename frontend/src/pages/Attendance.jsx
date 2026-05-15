import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Filter, X, Printer, Zap, Trash2, Settings, Calendar, Download, Clock, Upload, Search, User, CheckCircle, AlertTriangle, Play, Database } from 'lucide-react';
import api from '../utils/api';
import { usePermission } from '../contexts/PermissionContext';
import DateRangePicker from '../components/DateRangePicker';

export default function Attendance() {
  const [loading, setLoading] = useState(false);
  const today = new Date();
  const formatLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const currentMonthStart = formatLocal(new Date(today.getFullYear(), today.getMonth(), 1));
  const currentMonthEnd = formatLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const [dateRange, setDateRange] = useState({ start: currentMonthStart, end: currentMonthEnd });

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [listStatusFilter, setListStatusFilter] = useState('ACTIVE');
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'summary', 'anomalies'
  
  const [nameSearch, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { hasPermission, isSelfOnly } = usePermission();
  const canManageAttendance = hasPermission('ATT', 'canEdit');
  const canCreateAttendance = hasPermission('ATT', 'canCreate');
  const canDeleteAttendance = hasPermission('ATT', 'canDelete');
  const canImport = hasPermission('ATT', 'canImport');
  const isAttSelfOnly = isSelfOnly('ATT'); // 查看範圍由 selfOnly 決定，與編輯權限無關

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const res = await api.post('/attendances/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message || '匯入成功');
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || '匯入失敗');
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('attendanceVisibleColumns');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      return {
        daily: ['date', 'name', 'clock_in_out', 'status', 'late_mins', 'work_mins'],
        summary: ['code', 'name', 'actual', 'expected', 'late', 'absent']
      };
    } catch {
      return {
        daily: ['date', 'name', 'clock_in_out', 'status', 'late_mins', 'work_mins'],
        summary: ['code', 'name', 'actual', 'expected', 'late', 'absent']
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('attendanceVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const allColumns = {
    daily: [
      { id: 'date', label: '日期' },
      { id: 'name', label: '員工姓名' },
      { id: 'code', label: '工號' },
      { id: 'clock_in_out', label: '打卡時間' },
      { id: 'punch_method', label: '打卡方式' },
      { id: 'status', label: '總狀態' },
      { id: 'clock_in_status', label: '上班狀態' },
      { id: 'clock_out_status', label: '下班狀態' },
      { id: 'late_mins', label: '遲到(分)' },
      { id: 'early_mins', label: '早退(分)' },
      { id: 'work_mins', label: '工時(h)' },
      { id: 'overtime1', label: '1階加班(h)' },
      { id: 'overtime2', label: '2階加班(h)' },
      { id: 'holiday_overtime', label: '假日加班(h)' },
      { id: 'leave_code', label: '請假代碼' }
    ],
    summary: [
      { id: 'code', label: '工號' },
      { id: 'name', label: '員工姓名' },
      { id: 'expected', label: '應出勤天數' },
      { id: 'actual', label: '實到天數' },
      { id: 'work_hours', label: '總有效工時' },
      { id: 'late', label: '遲到(次數)' },
      { id: 'late_mins', label: '遲到(分鐘)' },
      { id: 'early_leave', label: '早退(次數)' },
      { id: 'early_leave_hours', label: '早退(小時)' },
      { id: 'absent', label: '曠職(天數)' },
      { id: 'absent_hours', label: '曠職(時數)' },
      { id: 'overtime', label: '總加班時數' },
      { id: 'overtime1_hours', label: '1階加班(時)' },
      { id: 'overtime2_hours', label: '2階加班(時)' },
      { id: 'holiday_overtime', label: '假日加班(時)' },
      { id: 'leaves_detail', label: '請假明細' }
    ]
  };

  useEffect(() => {
    fetchRecords();
  }, [dateRange]);

  const fetchRecords = async () => {
    try {
      const query = `start_date=${dateRange.start}&end_date=${dateRange.end}`;
      const [res, sumRes, empRes] = await Promise.allSettled([
        api.get(`/attendances?${query}`),
        api.get(`/attendances/summary?${query}`),
        api.get('/employees')
      ]);
      
      if (res.status === 'fulfilled') setRecords(Array.isArray(res.value.data) ? res.value.data : []);
      if (sumRes.status === 'fulfilled') setSummary(Array.isArray(sumRes.value.data) ? sumRes.value.data : []);
      if (empRes.status === 'fulfilled') setEmployees(Array.isArray(empRes.value.data) ? empRes.value.data : []);
      else setEmployees([]); // Fallback if no EMP permission
    } catch (e) { console.error(e); }
  };

  const handleMatch = async () => {
    if (!window.confirm('確定要執行自動對帳嗎？這將根據排班與請假紀錄重新計算所有考勤狀態。')) return;
    setLoading(true);
    try {
      const res = await api.post('/attendances/match', { start_date: dateRange.start, end_date: dateRange.end });
      alert(res.data.message);
      fetchRecords();
    } catch (e) { alert('比對失敗'); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
        activeTab: activeTab,
        statusFilter: statusFilter,
        nameSearch: nameSearch
      });
      if (selectedEmpIds.length > 0) {
        params.append('selectedEmpIds', selectedEmpIds.join(','));
      }
      const res = await api.get(`/attendances/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_${dateRange.start}_${dateRange.end}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) { alert('匯出失敗'); }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`確定要刪除選中的 ${selectedIds.length} 筆考勤紀錄嗎？此動作無法復原。`)) return;
    try {
      await api.delete('/attendances/batch', { data: { ids: selectedIds } });
      alert('刪除成功');
      setSelectedIds([]);
      fetchRecords();
    } catch (e) { alert('刪除失敗'); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/attendances/${id}`, { status: newStatus });
      fetchRecords();
    } catch (e) { alert('更新失敗'); }
  };

  const handleTimeChange = async (id, field, value) => {
    try {
      await api.put(`/attendances/${id}`, { [field]: value || null });
      fetchRecords();
    } catch (e) { alert('更新時間失敗'); }
  };

  const getStatusBadge = (status, leaveCode) => {
    switch (status) {
      case 'PRESENT': return <span className="text-emerald-600 font-bold">✅ 正常</span>;
      case 'LATE': return <span className="text-orange-600 font-bold">🕒 遲到</span>;
      case 'EARLY': return <span className="text-amber-600 font-bold">🏃 早退</span>;
      case 'ABSENT': return <span className="text-red-600 font-bold">🚫 曠職</span>;
      case 'LEAVE': return <span className="text-blue-600 font-bold">⛱️ 請假({leaveCode || 'OK'})</span>;
      default: return <span className="text-gray-500">{status}</span>;
    }
  };

  const getSubStatusBadge = (status) => {
    switch (status) {
      case 'NORMAL': return <span className="text-emerald-600 font-bold">正常</span>;
      case 'LATE': return <span className="text-orange-600 font-bold">遲到</span>;
      case 'TOO_EARLY': return <span className="text-blue-600 font-bold">過早</span>;
      case 'EARLY_LEAVE': return <span className="text-amber-600 font-bold">早退</span>;
      case 'INVALID': return <span className="text-red-600 font-bold">異常</span>;
      default: return <span className="text-gray-400">--</span>;
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(r.employeeId);
    const matchesNameSearch = !nameSearch || r.employee?.name?.includes(nameSearch) || r.employee?.code?.includes(nameSearch) || r.date?.includes(nameSearch);
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    if (activeTab === 'anomalies') return matchesEmp && matchesNameSearch && matchesStatus && r.status !== 'PRESENT' && r.status !== 'LEAVE';
    return matchesEmp && matchesNameSearch && matchesStatus;
  });

  const filteredSummary = summary.filter(s => {
    const matchesEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(s.employee?.id);
    const matchesNameSearch = !nameSearch || s.employee?.name?.includes(nameSearch) || s.employee?.code?.includes(nameSearch);
    return matchesEmp && matchesNameSearch;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(filteredRecords.map(r => r.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header Area */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        {/* Top Tier: Title, Date Range, Action Buttons */}
        <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              <span className="text-blue-600">▌</span> 考勤報表管理
            </h1>
            <DateRangePicker 
              startDate={dateRange.start} 
              endDate={dateRange.end} 
              onDateChange={(start, end) => setDateRange({ start, end })} 
            />
          </div>

          <div className="flex items-center gap-3">
            {/* 一鍵同步按鈕 - 只有管理者可使用 */}
            {canImport && (
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  id="excel-upload" 
                  className="hidden" 
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                />
                <button 
                  onClick={() => document.getElementById('excel-upload').click()}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs md:text-sm font-black hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm"
                >
                  <FileSpreadsheet size={16} /> 匯入 Excel
                </button>
              </div>
            )}

            {canManageAttendance && (
              <button 
                onClick={handleMatch} 
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-black transition-all flex items-center gap-2 shadow-sm ${
                  loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                } text-white`}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Zap size={16} />
                )}
                {loading ? '計算對帳中...' : '一鍵同步'}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Tier: Filters */}
        <div className="px-6 py-2.5 bg-gray-50 flex items-center gap-4 text-sm border-t border-gray-100 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={14} className="text-gray-400" />
            <span className="text-gray-500 font-bold text-xs">列表篩選</span>
          </div>

          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
            <input 
              type="text" 
              placeholder="搜尋姓名/工號..." 
              value={nameSearch}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-white border border-gray-300 rounded text-xs font-bold outline-none w-40 focus:border-blue-400 transition-all shadow-sm"
            />
          </div>

          {/* 在職狀態切換 + 複選下拉 - 無 selfOnly 限制時才顯示 */}
          {!isAttSelfOnly && (
            <>
              <select 
                value={listStatusFilter} 
                onChange={e => {
                  setListStatusFilter(e.target.value);
                  setSelectedEmpIds([]); 
                }}
                className="bg-white border border-gray-300 rounded px-3 py-1 text-xs font-bold text-[#1e40af] outline-none hover:border-blue-400 shadow-sm shrink-0"
              >
                <option value="ACTIVE">在職中</option>
                <option value="RESIGNED">已離職</option>
                <option value="all">不分狀態</option>
              </select>

              {/* 人員複選下拉選單 */}
              <div className="relative shrink-0">
                <button 
                  onClick={() => setIsEmpDropdownOpen(!isEmpDropdownOpen)}
                  className="bg-white border border-gray-300 rounded px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-1 shadow-sm"
                >
                  <User size={14} /> 人員選擇 {selectedEmpIds.length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] ml-1">{selectedEmpIds.length}</span>}
                </button>

                {isEmpDropdownOpen && (
                  <div className="absolute top-full mt-1 left-0 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b">
                      <span className="text-[10px] font-black text-gray-400 uppercase">人員名單</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const visibleIds = employees
                              .filter(e => listStatusFilter === 'all' || e.status === listStatusFilter)
                              .map(e => e.id);
                            setSelectedEmpIds(visibleIds);
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:underline"
                        >
                          全選
                        </button>
                        <button 
                          onClick={() => setSelectedEmpIds([])}
                          className="text-[10px] font-bold text-gray-400 hover:underline"
                        >
                          清除
                        </button>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {employees
                        .filter(e => listStatusFilter === 'all' || e.status === listStatusFilter)
                        .map(emp => (
                          <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                            <input 
                              type="checkbox" 
                              checked={selectedEmpIds.includes(emp.id)}
                              onChange={() => {
                                if (selectedEmpIds.includes(emp.id)) {
                                  setSelectedEmpIds(selectedEmpIds.filter(id => id !== emp.id));
                                } else {
                                  setSelectedEmpIds([...selectedEmpIds, emp.id]);
                                }
                              }}
                              className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-0"
                            />
                            <span className={`text-xs md:text-sm font-bold ${selectedEmpIds.includes(emp.id) ? 'text-indigo-600' : 'text-gray-600'}`}>
                              {emp.name} <span className="text-[10px] text-gray-400 font-mono ml-1">({emp.code})</span>
                            </span>
                          </label>
                        ))}
                    </div>
                    <button onClick={()=>setIsEmpDropdownOpen(false)} className="w-full mt-3 bg-gray-900 text-white py-2 rounded-lg text-xs font-bold shadow-sm">確定</button>
                  </div>
                )}
              </div>
            </>
          )}

          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-300 rounded px-3 py-1 text-xs font-bold text-[#1e40af] outline-none hover:border-blue-400 shadow-sm shrink-0"
          >
            <option value="ALL">全部考勤狀態</option>
            <option value="PRESENT">正常</option>
            <option value="LATE">遲到</option>
            <option value="EARLY">早退</option>
            <option value="ABSENT">曠職</option>
            <option value="LEAVE">請假</option>
          </select>

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
                  {allColumns[activeTab === 'summary' ? 'summary' : 'daily']?.map(col => (
                    <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors group">
                      <input 
                        type="checkbox"
                        checked={visibleColumns[activeTab === 'summary' ? 'summary' : 'daily']?.includes(col.id)}
                        onChange={(e) => {
                          const tabKey = activeTab === 'summary' ? 'summary' : 'daily';
                          const newCols = e.target.checked 
                            ? [...(visibleColumns[tabKey] || []), col.id]
                            : visibleColumns[tabKey].filter(id => id !== col.id);
                          setVisibleColumns({...visibleColumns, [tabKey]: newCols});
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

      {/* Tabs */}
      <div className="flex bg-[#f8fafc] px-6 border-b border-gray-200">
        {[
          { id: 'daily', label: '每日明細', icon: '📋' },
          { id: 'anomalies', label: '異常處理', icon: '⚠️' },
          { id: 'summary', label: '月度結算', icon: '📊' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedIds([]);
            }}
            className={`px-6 py-3 text-sm font-bold transition-all relative ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.icon} {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-auto bg-[#f1f5f9] p-4">
        <div className="bg-white border border-gray-300 shadow-sm min-w-max">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-[12px] font-bold text-[#1e40af] border-b border-gray-300">
                <th className="w-10 p-2 border-r border-gray-300">
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === (activeTab === 'summary' ? summary.length : filteredRecords.length) && (activeTab === 'summary' ? summary.length : filteredRecords.length) > 0} />
                </th>
                <th className="w-12 p-2 border-r border-gray-300 text-center">#</th>
                {activeTab === 'summary' ? (
                  <>
                    {visibleColumns.summary?.includes('code') && <th className="px-4 py-2 text-left border-r border-gray-300">工號</th>}
                    {visibleColumns.summary?.includes('name') && <th className="px-4 py-2 text-left border-r border-gray-300">員工姓名</th>}
                    {visibleColumns.summary?.includes('expected') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-indigo-50/50">應到天數</th>}
                    {visibleColumns.summary?.includes('actual') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-indigo-50/50">實到天數</th>}
                    {visibleColumns.summary?.includes('work_hours') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-indigo-50/50">有效工時</th>}
                    {visibleColumns.summary?.includes('late') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-orange-50/50">遲到次數</th>}
                    {visibleColumns.summary?.includes('late_mins') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-orange-50/50">遲到分鐘</th>}
                    {visibleColumns.summary?.includes('early_leave') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-amber-50/50">早退次數</th>}
                    {visibleColumns.summary?.includes('early_leave_hours') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-amber-50/50">早退小時</th>}
                    {visibleColumns.summary?.includes('absent') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-red-50/50">曠職次數</th>}
                    {visibleColumns.summary?.includes('absent_hours') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-red-50/50">曠職時數</th>}
                    {visibleColumns.summary?.includes('overtime') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-blue-50/50">總加班時數</th>}
                    {visibleColumns.summary?.includes('overtime1_hours') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-blue-50/50">1階加班</th>}
                    {visibleColumns.summary?.includes('overtime2_hours') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-blue-50/50">2階加班</th>}
                    {visibleColumns.summary?.includes('holiday_overtime') && <th className="px-4 py-2 text-center border-r border-gray-300 bg-purple-50/50">假日加班</th>}
                    {visibleColumns.summary?.includes('leaves_detail') && <th className="px-4 py-2 text-left border-r border-gray-300">請假明細</th>}
                  </>
                ) : (
                  <>
                    {allColumns.daily.filter(c => visibleColumns.daily?.includes(c.id)).map(col => (
                      <th key={col.id} className="px-4 py-2 text-left border-r border-gray-300">{col.label}</th>
                    ))}
                    <th className="px-4 py-2 text-center">操作</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="text-xs md:text-sm md:text-sm">
              {activeTab === 'summary' ? (
                filteredSummary.map((s, idx) => (
                  <tr key={s.employee.id} className={`border-b border-gray-200 hover:bg-blue-50/30 transition-colors ${selectedIds.includes(s.employee.id) ? 'bg-blue-50' : ''}`}>
                    <td className="p-2 border-r border-gray-200 text-center">
                      <input type="checkbox" checked={selectedIds.includes(s.employee.id)} onChange={() => handleSelectOne(s.employee.id)} />
                    </td>
                    <td className="p-2 border-r border-gray-200 text-center text-gray-400 font-mono">{idx + 1}</td>
                    {visibleColumns.summary?.includes('code') && <td className="px-4 py-2 border-r border-gray-200 text-gray-500 font-mono">{s.employee.code}</td>}
                    {visibleColumns.summary?.includes('name') && <td className="px-4 py-2 border-r border-gray-200 font-bold text-gray-700">{s.employee.name}</td>}
                    {visibleColumns.summary?.includes('expected') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-indigo-400">{s.expected_days}</td>}
                    {visibleColumns.summary?.includes('actual') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-indigo-600">{s.actual_days}</td>}
                    {visibleColumns.summary?.includes('work_hours') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-indigo-700">{s.work_hours || 0}h</td>}
                    {visibleColumns.summary?.includes('late') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-orange-500">{s.late_days || 0}</td>}
                    {visibleColumns.summary?.includes('late_mins') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-orange-600">{s.late_mins || 0}m</td>}
                    {visibleColumns.summary?.includes('early_leave') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-amber-500">{s.early_leave_days || 0}</td>}
                    {visibleColumns.summary?.includes('early_leave_hours') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-amber-600">{s.early_leave_hours || 0}h</td>}
                    {visibleColumns.summary?.includes('absent') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-red-500">{s.absent_count || 0}</td>}
                    {visibleColumns.summary?.includes('absent_hours') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-red-600">{s.absent_hours || 0}h</td>}
                    {visibleColumns.summary?.includes('overtime') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-blue-500">{s.total_overtime_hours || 0}h</td>}
                    {visibleColumns.summary?.includes('overtime1_hours') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-blue-600">{s.overtime1_hours || 0}h</td>}
                    {visibleColumns.summary?.includes('overtime2_hours') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-blue-700">{s.overtime2_hours || 0}h</td>}
                    {visibleColumns.summary?.includes('holiday_overtime') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-purple-600">{s.holiday_overtime_hours || 0}h</td>}
                    {visibleColumns.summary?.includes('leaves_detail') && (
                      <td className="px-4 py-2 border-r border-gray-200 text-left text-xs">
                        {s.leaves?.length > 0 ? s.leaves.map(l => (
                          <span key={l.code} className="inline-block bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mr-1 mb-1 font-bold border border-blue-200">
                            {l.name}: {l.days}天
                          </span>
                        )) : <span className="text-gray-400">無</span>}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id} className={`border-b border-gray-200 hover:bg-blue-50/30 transition-colors ${selectedIds.includes(r.id) ? 'bg-blue-50' : ''}`}>
                    <td className="p-2 border-r border-gray-200 text-center">
                      <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => handleSelectOne(r.id)} />
                    </td>
                    <td className="p-2 border-r border-gray-200 text-center text-gray-400 font-mono">{idx + 1}</td>
                    {visibleColumns.daily?.includes('date') && <td className="px-4 py-2 border-r border-gray-200 font-mono text-gray-500">{r.date}</td>}
                    {visibleColumns.daily?.includes('name') && <td className="px-4 py-2 border-r border-gray-200 font-bold text-gray-700">{r.employee?.name}</td>}
                    {visibleColumns.daily?.includes('code') && <td className="px-4 py-2 border-r border-gray-200 text-gray-400 font-mono">{r.employee?.code}</td>}
                    {visibleColumns.daily?.includes('clock_in_out') && (
                      <td className="px-4 py-2 border-r border-gray-200 font-mono">
                        {canManageAttendance ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="time" 
                              defaultValue={r.clock_in || ''}
                              onBlur={e => {
                                if (e.target.value !== (r.clock_in || '')) {
                                  handleTimeChange(r.id, 'clock_in', e.target.value);
                                }
                              }}
                              className="bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            <span className="text-gray-400">→</span>
                            <input 
                              type="time" 
                              defaultValue={r.clock_out || ''}
                              onBlur={e => {
                                if (e.target.value !== (r.clock_out || '')) {
                                  handleTimeChange(r.id, 'clock_out', e.target.value);
                                }
                              }}
                              className="bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </div>
                        ) : (
                          <>{r.clock_in || '--:--'} → {r.clock_out || '--:--'}</>
                        )}
                      </td>
                    )}
                    {visibleColumns.daily?.includes('punch_method') && <td className="px-4 py-2 border-r border-gray-200 text-center text-[10px] font-bold text-gray-500">{r.punch_method === 'WEB' ? '📱 線上打卡' : '📑 Excel匯入'}</td>}
                    {visibleColumns.daily?.includes('status') && <td className="px-4 py-2 border-r border-gray-200 text-center">{getStatusBadge(r.status, r.leave_code)}</td>}
                    {visibleColumns.daily?.includes('clock_in_status') && <td className="px-4 py-2 border-r border-gray-200 text-center text-xs">{getSubStatusBadge(r.clock_in_status)}</td>}
                    {visibleColumns.daily?.includes('clock_out_status') && <td className="px-4 py-2 border-r border-gray-200 text-center text-xs">{getSubStatusBadge(r.clock_out_status)}</td>}
                    {visibleColumns.daily?.includes('late_mins') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-orange-600">{r.late_mins > 0 ? `${r.late_mins}m` : '--'}</td>}
                    {visibleColumns.daily?.includes('early_mins') && <td className="px-4 py-2 border-r border-gray-200 text-center font-bold text-amber-600">{r.early_leave_mins > 0 ? `${r.early_leave_mins}m` : '--'}</td>}
                    {visibleColumns.daily?.includes('work_mins') && <td className="px-4 py-2 border-r border-gray-200 text-center text-gray-600 font-mono">{Math.round((r.work_mins||0)/60*2)/2}h</td>}
                    {visibleColumns.daily?.includes('overtime1') && <td className="px-4 py-2 border-r border-gray-200 text-center text-indigo-600 font-bold">{r.overtime1_mins > 0 ? `${Math.round(r.overtime1_mins/60*2)/2}h` : '--'}</td>}
                    {visibleColumns.daily?.includes('overtime2') && <td className="px-4 py-2 border-r border-gray-200 text-center text-purple-600 font-bold">{r.overtime2_mins > 0 ? `${Math.round(r.overtime2_mins/60*2)/2}h` : '--'}</td>}
                    {visibleColumns.daily?.includes('holiday_overtime') && <td className="px-4 py-2 border-r border-gray-200 text-center text-rose-600 font-bold">{r.holiday_overtime_mins > 0 ? `${Math.round(r.holiday_overtime_mins/60*2)/2}h` : '--'}</td>}
                    {visibleColumns.daily?.includes('leave_code') && <td className="px-4 py-2 border-r border-gray-200 text-center font-black text-blue-500">{r.leave_code || '--'}</td>}
                    
                    <td className="px-4 py-1 text-center">
                      {canManageAttendance ? (
                        <select value={r.status} onChange={e=>handleStatusChange(r.id, e.target.value)} className="bg-gray-50 border border-gray-200 rounded text-[10px] font-bold py-1 focus:ring-1 focus:ring-blue-400 outline-none">
                          <option value="PRESENT">正常</option>
                          <option value="LATE">遲到</option>
                          <option value="EARLY">早退</option>
                          <option value="ABSENT">曠職</option>
                          <option value="LEAVE">請假</option>
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="bg-white border-t border-gray-300 p-2 px-6 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          <span className="text-xs md:text-sm font-bold text-gray-500 italic">已選擇 {selectedIds.length} 筆項目</span>
          <button 
            onClick={() => setSelectedIds([])}
            className="text-xs md:text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            取消選擇
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {canDeleteAttendance && selectedIds.length > 0 && (
            <button 
              onClick={handleBatchDelete}
              className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-2 rounded text-sm font-bold hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2 mr-4 shadow-sm"
            >
              <Trash2 size={16} /> 刪除選中 ({selectedIds.length})
            </button>
          )}
          <button 
            onClick={handleExport}
            className="bg-white border border-emerald-200 text-emerald-700 px-4 py-2 rounded text-sm font-bold hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet size={16} /> 匯出 Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-bold hover:bg-gray-100 transition-all flex items-center gap-2 shadow-sm"
          >
            <Printer size={16} /> 列印報表
          </button>
        </div>
      </div>

    </div>
  );
}
