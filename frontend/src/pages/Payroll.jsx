import React, { useState, useEffect } from 'react';
import { Calculator, User, FileSpreadsheet, CheckCircle, TrendingUp, Unlock, AlertCircle, X, Filter, Settings, Search } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { usePermission } from '../contexts/PermissionContext';
import DateRangePicker from '../components/DateRangePicker';

export default function Payroll() {
  const { addToast } = useToast();
  
  const today = new Date();
  const formatLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const currentMonthStart = formatLocal(new Date(today.getFullYear(), today.getMonth(), 1));
  const currentMonthEnd = formatLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const [dateRange, setDateRange] = useState({ start: currentMonthStart, end: currentMonthEnd });
  
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState({ totalNet: 0, totalEmployees: 0, calculatedCount: 0 });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDetails, setEditDetails] = useState([]);

  const { hasPermission, isAdmin, isSelfOnly } = usePermission();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const canManage = hasPermission('PAYROLL', 'canEdit') || isAdmin;
  const isSelf = isSelfOnly('PAYROLL');

  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'details'
  const [searchTerm, setSearchTerm] = useState('');

  const [employees, setEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [listStatusFilter, setListStatusFilter] = useState('ACTIVE');
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('payrollVisibleColumns');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
      return ['name', 'code', 'department', 'total_addition', 'total_deduction', 'net_salary', 'status'];
    } catch {
      return ['name', 'code', 'department', 'total_addition', 'total_deduction', 'net_salary', 'status'];
    }
  });

  useEffect(() => {
    localStorage.setItem('payrollVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const allColumns = [
    { id: 'name', label: '姓名' },
    { id: 'code', label: '工號' },
    { id: 'department', label: '部門' },
    { id: 'position', label: '職稱' },
    { id: 'total_addition', label: '加項總額' },
    { id: 'total_deduction', label: '扣項總額' },
    { id: 'net_salary', label: '實發金額' },
    { id: 'status', label: '狀態' }
  ];

  useEffect(() => {
    fetchPayrolls();
  }, [dateRange]);

  const fetchPayrolls = async () => {
    try {
      const query = `start_date=${dateRange.start}&end_date=${dateRange.end}`;
      const [res, empRes] = await Promise.all([
        api.get(`/payrolls?${query}`),
        api.get('/employees')
      ]);
      setPayrolls(res.data);
      setEmployees(empRes.data);
      setStats({
        totalNet,
        totalEmployees: empRes.data.length,
        calculatedCount: calculated
      });

      // 自動選取邏輯：如果只看自己的資料（或是有資料時），自動選取第一筆紀錄
      if (isSelf && res.data.length > 0) {
        setSelectedRecord(res.data[0]);
      }
    } catch (e) { console.error(e); }
  };

  const handleCalculate = async () => {
    const ym = window.prompt('請輸入要試算的薪資月份 (格式: YYYY-MM)', dateRange.start.substring(0, 7));
    if (!ym) return;
    setLoading(true);
    try {
      await api.post('/payrolls/calculate', { year_month: ym });
      addToast('試算完成', 'success');
      fetchPayrolls();
    } catch (e) {
      addToast(e.response?.data?.error || '試算失敗', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    const ym = window.prompt('結案後薪資將無法修改。請輸入要結案的薪資月份 (格式: YYYY-MM)', dateRange.start.substring(0, 7));
    if (!ym) return;
    try {
      await api.post('/payrolls/finalize', { year_month: ym });
      addToast('結案成功', 'success');
      fetchPayrolls();
    } catch (e) { addToast('操作失敗', 'error'); }
  };

  const handleUnfinalize = async () => {
    if (!isAdmin) return;
    const ym = window.prompt('請輸入要取消結案的薪資月份 (格式: YYYY-MM)', dateRange.start.substring(0, 7));
    if (!ym) return;
    try {
      await api.post('/payrolls/unfinalize', { year_month: ym });
      addToast('已取消結案鎖定', 'info');
      fetchPayrolls();
    } catch (e) { addToast('操作失敗', 'error'); }
  };

  const handleExport = async () => {
    try {
      addToast('正在準備報表...', 'info');
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
        nameSearch: searchTerm
      });
      if (selectedEmpIds.length > 0) {
        params.append('selectedEmpIds', selectedEmpIds.join(','));
      }
      const res = await api.get(`/payrolls/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payroll_${dateRange.start}_${dateRange.end}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('下載成功', 'success');
    } catch (e) {
      addToast('匯出失敗，請確認權限', 'error');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/payrolls/${id}/read`);
      fetchPayrolls();
      addToast('已確認薪資條', 'success');
    } catch (e) { addToast(e.response?.data?.error || '確認失敗', 'error'); }
  };

  const handleUnmarkRead = async (id) => {
    try {
      await api.delete(`/payrolls/${id}/read`);
      fetchPayrolls();
      addToast('已取消確認狀態', 'info');
    } catch (e) { addToast(e.response?.data?.error || '操作失敗', 'error'); }
  };

  const handleSaveDetails = async () => {
    try {
      setLoading(true);
      await api.put(`/payrolls/${selectedRecord.id}/details`, { details: editDetails });
      addToast('明細已更新', 'success');
      setIsEditing(false);
      // Update selectedRecord and payrolls list
      const updatedSum = editDetails.reduce((acc, curr) => {
        if (curr.type === 'ADDITION') acc.addition += Number(curr.amount) || 0;
        if (curr.type === 'DEDUCTION') acc.deduction += Number(curr.amount) || 0;
        return acc;
      }, { addition: 0, deduction: 0 });
      
      const updatedRecord = {
        ...selectedRecord,
        details: editDetails,
        total_addition: updatedSum.addition,
        total_deduction: updatedSum.deduction,
        net_salary: Math.round(updatedSum.addition - updatedSum.deduction)
      };
      setSelectedRecord(updatedRecord);
      setPayrolls(payrolls.map(p => p.id === updatedRecord.id ? updatedRecord : p));
    } catch (e) {
      addToast('更新失敗', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateEditDetail = (index, field, value) => {
    const newDetails = [...editDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setEditDetails(newDetails);
  };

  const filteredPayrolls = payrolls.filter(p => {
    const matchesEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(p.employeeId);
    const matchesNameSearch = !searchTerm || p.employee?.name?.includes(searchTerm) || p.employee?.code?.includes(searchTerm);
    return matchesEmp && matchesNameSearch;
  });

  const isAllFinalized = payrolls.length > 0 && payrolls.every(p => p.status === 'FINALIZED');

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm animate-in fade-in duration-500">
      {/* Tab Navigation */}
      <div className="flex bg-gray-50 border-b border-gray-200 shrink-0 print:hidden">
        <button 
          onClick={() => setActiveTab('list')}
          className={`px-8 py-3 text-sm font-black transition-all border-r border-gray-200 ${activeTab === 'list' ? 'bg-white text-indigo-600 border-b-2 border-b-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          薪資結算清單
        </button>
        <button 
          onClick={() => setActiveTab('details')}
          className={`px-8 py-3 text-sm font-black transition-all border-r border-gray-200 ${activeTab === 'details' ? 'bg-white text-indigo-600 border-b-2 border-b-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          {selectedRecord ? `薪資明細 (${selectedRecord.employee.name})` : '薪資明細'}
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          <div className="bg-white border-b border-gray-200 shrink-0">
            {/* Top Tier: Title, Date Range, Action Buttons */}
            <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                  <span className="text-indigo-600">▌</span> {isSelf ? '個人薪資查詢' : '薪資結算看板'}
                </h1>
                <DateRangePicker 
                  startDate={dateRange.start} 
                  endDate={dateRange.end} 
                  onDateChange={(start, end) => setDateRange({ start, end })} 
                />
              </div>

              <div className="flex gap-2">
                {!isSelf && (
                  <>
                    <button onClick={handleCalculate} disabled={loading} className="bg-[#1e40af] hover:bg-blue-800 text-white px-4 py-2 rounded text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50">
                      <Calculator size={16} /> 自動試算
                    </button>
                    {!isAllFinalized ? (
                      <button onClick={handleFinalize} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
                        <CheckCircle size={16} /> 結案鎖定
                      </button>
                    ) : (
                      <button onClick={handleUnfinalize} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
                        <Unlock size={16} /> 取消結案
                      </button>
                    )}
                  </>
                )}
                <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
                  <FileSpreadsheet size={16} className="text-emerald-600" /> 匯出報表
                </button>
              </div>
            </div>

            {/* Bottom Tier: Filters */}
            <div className="px-6 py-2.5 bg-gray-50 flex items-center gap-4 text-sm border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                <span className="text-gray-500 font-bold text-xs">列表篩選</span>
              </div>
              
              <select 
                value={listStatusFilter} 
                onChange={e => { setListStatusFilter(e.target.value); setSelectedEmpIds([]); }}
                className="bg-white border border-gray-300 rounded px-3 py-1 text-xs font-bold text-[#1e40af] outline-none hover:border-blue-400 transition-colors shadow-sm"
              >
                <option value="ACTIVE">在職中</option>
                <option value="RESIGNED">已離職</option>
                <option value="all">不分狀態</option>
              </select>

              <div className="relative">
                <button 
                  onClick={() => setIsEmpDropdownOpen(!isEmpDropdownOpen)}
                  className="bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-1 shadow-sm transition-colors"
                >
                  <User size={14} /> 人員選擇 {selectedEmpIds.length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] ml-1">{selectedEmpIds.length}</span>}
                </button>
                {isEmpDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-xl z-50 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-black text-gray-700">選擇人員</span>
                      <button onClick={()=>setIsEmpDropdownOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-2">
                      <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer group">
                        <input type="checkbox" checked={selectedEmpIds.length === 0} onChange={() => setSelectedEmpIds([])} className="rounded text-indigo-600 focus:ring-0" />
                        <span className="text-sm font-bold text-gray-600 group-hover:text-indigo-600">全選所有人員</span>
                      </label>
                      <div className="h-px bg-gray-100 my-1" />
                      {employees.filter(e => listStatusFilter === 'all' || e.status === listStatusFilter).map(emp => (
                        <label key={emp.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer group">
                          <input type="checkbox" checked={selectedEmpIds.includes(emp.id)} 
                            onChange={(e) => {
                              if(e.target.checked) setSelectedEmpIds([...selectedEmpIds, emp.id]);
                              else setSelectedEmpIds(selectedEmpIds.filter(id => id !== emp.id));
                            }} 
                            className="rounded text-indigo-600 focus:ring-0" 
                          />
                          <span className="text-sm font-bold text-gray-600 group-hover:text-indigo-600">{emp.name} <span className="text-xs text-gray-400">({emp.code})</span></span>
                        </label>
                      ))}
                    </div>
                    <button onClick={()=>setIsEmpDropdownOpen(false)} className="w-full mt-3 bg-gray-900 text-white py-2 rounded-lg text-xs md:text-sm font-bold shadow-sm">確定</button>
                  </div>
                )}
              </div>

              <div className="h-4 w-px bg-gray-300 mx-1"></div>

              <div className="relative">
                <button 
                  onClick={() => setShowColumnPicker(!showColumnPicker)}
                  className="bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Settings size={14} /> 顯示欄位
                </button>
                {showColumnPicker && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-xl z-50 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-black text-gray-700">自訂顯示欄位</span>
                      <button onClick={() => setShowColumnPicker(false)} className="text-gray-300 hover:text-gray-500"><X size={16}/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {allColumns.map(col => (
                        <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors group">
                          <input 
                            type="checkbox"
                            checked={visibleColumns.includes(col.id)}
                            onChange={(e) => {
                              if (e.target.checked) setVisibleColumns([...visibleColumns, col.id]);
                              else setVisibleColumns(visibleColumns.filter(id => id !== col.id));
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

          {/* Stats Bar (Simple) */}
          {!isSelf && (
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-8 text-[11px] font-bold text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                本月支出預估: <span className="text-gray-900">${stats.totalNet.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                已結算人數: <span className="text-gray-900">{stats.calculatedCount} / {stats.totalEmployees}</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {isAllFinalized ? (
                  <button onClick={handleUnfinalize} className="text-amber-600 hover:underline flex items-center gap-1 transition-all">
                    <Unlock size={14} /> 已鎖定 (點擊解除)
                  </button>
                ) : (
                  <button onClick={handleFinalize} className="text-emerald-600 hover:underline flex items-center gap-1 transition-all">
                    <CheckCircle size={14} /> 執行結案鎖定
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Table Area */}
          <div className="flex-1 overflow-auto border-b border-gray-200 custom-scrollbar">
            <table className="min-w-full border-collapse">
              <thead className="bg-[#f0f4f8] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">月份</th>
                  {visibleColumns.includes('name') && <th className="px-6 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">員工姓名</th>}
                  {visibleColumns.includes('code') && <th className="px-6 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">工號</th>}
                  {visibleColumns.includes('department') && <th className="px-6 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">部門</th>}
                  {visibleColumns.includes('position') && <th className="px-6 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">職稱</th>}
                  {visibleColumns.includes('total_addition') && <th className="px-6 py-2 border-r border-b border-gray-300 text-right text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">加項總額</th>}
                  {visibleColumns.includes('total_deduction') && <th className="px-6 py-2 border-r border-b border-gray-300 text-right text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">扣項總額</th>}
                  {visibleColumns.includes('net_salary') && <th className="px-6 py-2 border-r border-b border-gray-300 text-right text-xs md:text-sm font-black text-indigo-600 uppercase tracking-tight">實發金額</th>}
                  {visibleColumns.includes('status') && <th className="px-6 py-2 border-r border-b border-gray-300 text-center text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">狀態</th>}
                  <th className="px-6 py-2 border-r border-b border-gray-300 text-center text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">確認日期</th>
                  <th className="px-6 py-2 border-b border-gray-300 text-center text-xs md:text-sm font-black text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white text-xs md:text-sm">
                {filteredPayrolls.map((p, idx) => (
                  <tr key={p.id} className={`hover:bg-blue-50/30 transition-colors border-b border-gray-100 ${selectedRecord?.id === p.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-3 border-r border-gray-200 text-gray-500 font-bold">{p.year_month}</td>
                    {visibleColumns.includes('name') && (
                      <td className="px-6 py-3 border-r border-gray-200 font-bold text-[#1e40af] hover:underline cursor-pointer" onClick={() => { setSelectedRecord(p); setActiveTab('details'); }}>
                        {p.employee.name}
                      </td>
                    )}
                    {visibleColumns.includes('code') && <td className="px-6 py-3 border-r border-gray-200 text-gray-500 font-mono">{p.employee.code}</td>}
                    {visibleColumns.includes('department') && <td className="px-6 py-3 border-r border-gray-200 text-gray-500">{p.employee.department || '--'}</td>}
                    {visibleColumns.includes('position') && <td className="px-6 py-3 border-r border-gray-200 text-gray-500">{p.employee.position || '--'}</td>}
                    {visibleColumns.includes('total_addition') && <td className="px-6 py-3 border-r border-gray-200 text-right font-bold text-emerald-600">+${p.total_addition.toLocaleString()}</td>}
                    {visibleColumns.includes('total_deduction') && <td className="px-6 py-3 border-r border-gray-200 text-right font-bold text-rose-600">-${p.total_deduction.toLocaleString()}</td>}
                    {visibleColumns.includes('net_salary') && <td className="px-6 py-3 border-r border-gray-200 text-right text-sm font-black text-indigo-600">${p.net_salary.toLocaleString()}</td>}
                    {visibleColumns.includes('status') && (
                      <td className="px-6 py-3 border-r border-gray-200 text-center">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase shadow-sm ${p.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                          {p.status === 'FINALIZED' ? '已結案' : '試算中'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-3 border-r border-gray-200 text-center font-bold">
                      {p.is_read ? (
                        <div className="flex flex-col items-center">
                           <span className="text-emerald-600 text-[10px] flex items-center gap-1">
                             <CheckCircle size={12} /> 已確認
                           </span>
                           <span className="text-[9px] text-gray-400 mt-0.5">{new Date(p.read_at).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-[10px]">待確認</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center flex justify-center gap-1">
                      <button onClick={() => { setSelectedRecord(p); setActiveTab('details'); }} className="px-3 py-1 text-xs font-bold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded transition-all">
                        查看明細
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPayrolls.length === 0 && (
                  <tr>
                    <td colSpan={3 + visibleColumns.length} className="py-20 text-center text-gray-300 font-bold italic tracking-widest">NO PAYROLL DATA</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Toolbar (Simple) */}
          <div className="bg-[#f8f9fa] border-t border-gray-200 p-4 flex items-center gap-6 shrink-0">
            <span className="text-xs text-gray-400 font-black uppercase tracking-widest">結算統計</span>
            <div className="flex gap-8">
               <div className="text-xs font-bold text-gray-600">預計支出: <span className="text-indigo-600 font-black">${stats.totalNet.toLocaleString()}</span></div>
               <div className="text-xs font-bold text-gray-600">已確認人數: <span className="text-emerald-600 font-black">{payrolls.filter(p => p.is_read).length} 人</span></div>
            </div>
          </div>
        </>
      ) : (
        /* Payroll Details View */
        <div className="flex-1 flex flex-col bg-[#f1f5f9] overflow-hidden">
          {!selectedRecord ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-gray-300 mb-6">
                <FileSpreadsheet size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">尚未選擇薪資紀錄</h3>
              <p className="text-sm text-gray-400 font-bold max-w-xs mb-8">請先從「薪資結算清單」中點擊員工姓名或查看按鈕，以瀏覽詳細的薪資組成項目。</p>
              <button 
                onClick={() => setActiveTab('list')}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                前往清單選擇
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4 md:p-8">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Centered Main Title */}
                <div className="text-center py-4 print:py-0">
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                    {selectedRecord.year_month} 薪資結算明細
                  </h2>
                  <div className="w-16 h-1 bg-indigo-600 mx-auto mt-4 rounded-full print:hidden" />
                </div>

                {/* Detail Header Card */}
                <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-indigo-600 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">員工姓名 / 工號</p>
                      <h2 className="text-3xl font-black tracking-tight">{selectedRecord.employee.name} <span className="text-sm opacity-60 ml-2">#{selectedRecord.employee.code}</span></h2>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">實發淨額 (Net Salary)</p>
                      <p className="text-4xl font-black">${selectedRecord.net_salary.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">應發總計</p>
                      <p className="text-2xl font-black text-emerald-600">+${selectedRecord.total_addition.toLocaleString()}</p>
                    </div>
                    <div className="text-center border-x border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">應扣總計</p>
                      <p className="text-2xl font-black text-rose-600">-${selectedRecord.total_deduction.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">確認狀態</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase ${selectedRecord.is_read ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {selectedRecord.is_read ? '已確認' : '待確認'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Additions */}
                  <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8">
                    <h3 className="text-base font-black text-emerald-700 mb-6 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span> ➕ 應發項目
                    </h3>
                    <div className="space-y-4">
                      {(isEditing ? editDetails : selectedRecord.details)
                        .map((d, index) => ({...d, originalIndex: index}))
                        .filter(d => d.type === 'ADDITION')
                        .sort((a, b) => {
                          if (a.item_code === 'base') return -1;
                          if (b.item_code === 'base') return 1;
                          return 0;
                        })
                        .map((d) => (
                        <div key={d.originalIndex} className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm py-3 border-b border-gray-50 last:border-0 gap-2">
                          <span className="font-bold text-gray-600 min-w-[120px]">{d.item_name}</span>
                          {isEditing ? (
                            <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-gray-400 font-bold">$</span>
                                <input 
                                  type="number" 
                                  value={d.amount} 
                                  onChange={e => updateEditDetail(d.originalIndex, 'amount', e.target.value)}
                                  className="w-full md:w-28 pl-6 pr-2 py-1 text-right border border-gray-300 rounded font-black text-emerald-600 outline-none focus:border-emerald-500"
                                />
                              </div>
                              <input 
                                type="text" 
                                placeholder="備註事項..." 
                                value={d.note || ''} 
                                onChange={e => updateEditDetail(d.originalIndex, 'note', e.target.value)}
                                className="w-full md:w-48 text-sm px-2 py-1 border border-gray-300 rounded outline-none focus:border-emerald-500 font-bold"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 text-right">
                              <span className="font-black text-emerald-600">+${d.amount.toLocaleString()}</span>
                              {d.note && <span className="text-sm text-gray-500 font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{d.note}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                      {selectedRecord.details.filter(d => d.type === 'ADDITION').length === 0 && (
                        <p className="text-center text-gray-300 italic py-4">無資料</p>
                      )}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8">
                    <h3 className="text-base font-black text-rose-700 mb-6 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-rose-500 rounded-full"></span> ➖ 應扣項目
                    </h3>
                    <div className="space-y-4">
                      {(isEditing ? editDetails : selectedRecord.details)
                        .map((d, index) => ({...d, originalIndex: index}))
                        .filter(d => d.type === 'DEDUCTION')
                        .map((d) => (
                        <div key={d.originalIndex} className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm py-3 border-b border-gray-50 last:border-0 gap-2">
                          <span className="font-bold text-gray-600 min-w-[120px]">{d.item_name}</span>
                          {isEditing ? (
                            <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-gray-400 font-bold">$</span>
                                <input 
                                  type="number" 
                                  value={d.amount} 
                                  onChange={e => updateEditDetail(d.originalIndex, 'amount', e.target.value)}
                                  className="w-full md:w-28 pl-6 pr-2 py-1 text-right border border-gray-300 rounded font-black text-rose-600 outline-none focus:border-rose-500"
                                />
                              </div>
                              <input 
                                type="text" 
                                placeholder="備註事項..." 
                                value={d.note || ''} 
                                onChange={e => updateEditDetail(d.originalIndex, 'note', e.target.value)}
                                className="w-full md:w-48 text-sm px-2 py-1 border border-gray-300 rounded outline-none focus:border-rose-500 font-bold"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 text-right">
                              <span className="font-black text-rose-600">-${d.amount.toLocaleString()}</span>
                              {d.note && <span className="text-sm text-gray-500 font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{d.note}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                      {selectedRecord.details.filter(d => d.type === 'DEDUCTION').length === 0 && (
                        <p className="text-center text-gray-300 italic py-4">無資料</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="bg-white rounded-[2rem] border border-gray-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                   <div className="flex items-center gap-3">
                      {selectedRecord.is_read ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle size={20} />
                          <span className="text-xs font-bold">已於 {new Date(selectedRecord.read_at).toLocaleString()} 確認完畢</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-500">
                          <AlertCircle size={20} />
                          <span className="text-xs font-bold">請詳細核對加扣項，確認無誤後請點擊確認。</span>
                        </div>
                      )}
                   </div>
                   <div className="flex flex-wrap gap-3 w-full md:w-auto print:hidden">
                      {canManage && selectedRecord.status !== 'FINALIZED' && !isEditing && (
                        <button 
                          onClick={() => {
                            setEditDetails(JSON.parse(JSON.stringify(selectedRecord.details)));
                            setIsEditing(true);
                          }} 
                          className="flex-1 md:flex-none bg-white border border-indigo-200 text-indigo-600 px-6 py-3 rounded-xl font-black hover:bg-indigo-50 transition-all"
                        >
                          ✏️ 手動編輯明細
                        </button>
                      )}
                      {isEditing && (
                        <>
                          <button onClick={() => setIsEditing(false)} className="flex-1 md:flex-none bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-black hover:bg-gray-200 transition-all">
                            取消編輯
                          </button>
                          <button onClick={handleSaveDetails} disabled={loading} className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 transition-all">
                            {loading ? '儲存中...' : '💾 儲存修改'}
                          </button>
                        </>
                      )}
                      
                      {!isEditing && (
                        <>
                          <button 
                            onClick={() => window.print()} 
                            className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-black hover:bg-gray-50 transition-all flex items-center gap-2"
                          >
                            列印薪資單
                          </button>
                          {(Number(selectedRecord.employeeId) === Number(user.id) || isSelf) && !selectedRecord.is_read && (
                            <button onClick={() => handleMarkRead(selectedRecord.id)} className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-3 rounded-xl font-black hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all">
                              確認正確
                            </button>
                          )}
                          {canManage && selectedRecord.is_read && (
                            <button onClick={() => handleUnmarkRead(selectedRecord.id)} className="flex-1 md:flex-none bg-rose-50 text-rose-600 px-8 py-3 rounded-xl font-black hover:bg-rose-100 transition-all">
                              管理員取消確認
                            </button>
                          )}
                          <button onClick={() => { setActiveTab('list'); setIsEditing(false); }} className="flex-1 md:flex-none bg-gray-900 text-white px-8 py-3 rounded-xl font-black hover:bg-black transition-all">
                            返回清單
                          </button>
                        </>
                      )}
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
