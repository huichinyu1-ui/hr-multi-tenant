import React, { useState, useEffect } from 'react';
import { Calculator, User, FileSpreadsheet, CheckCircle, TrendingUp, Unlock, AlertCircle, X, Filter, Settings, Search, Printer, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { usePermission } from '../contexts/PermissionContext';
import DateRangePicker from '../components/DateRangePicker';

export default function Payroll() {
  const { addToast } = useToast();
  
  const getMonthString = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const today = new Date();
  const thisMonthStr = getMonthString(today);
  const lastMonthStr = getMonthString(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const thisYearStartStr = `${today.getFullYear()}-01`;
  const thisYearEndStr = `${today.getFullYear()}-12`;

  const [selectedStartMonth, setSelectedStartMonth] = useState(thisMonthStr);
  const [selectedEndMonth, setSelectedEndMonth] = useState(thisMonthStr);

  const formatLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const currentMonthStart = formatLocal(new Date(today.getFullYear(), today.getMonth(), 1));
  const currentMonthEnd = formatLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const [dateRange, setDateRange] = useState({ start: currentMonthStart, end: currentMonthEnd });

  const updateDateRange = (startM, endM) => {
    const [eYear, eMonth] = endM.split('-').map(Number);
    const start = `${startM}-01`;
    const end = `${endM}-${String(new Date(eYear, eMonth, 0).getDate()).padStart(2, '0')}`;
    setDateRange({ start, end });
  };

  const handleStartMonthChange = (val) => {
    if (!val) return;
    setSelectedStartMonth(val);
    let currentEnd = selectedEndMonth;
    if (val > selectedEndMonth) {
      setSelectedEndMonth(val);
      currentEnd = val;
    }
    updateDateRange(val, currentEnd);
  };

  const handleEndMonthChange = (val) => {
    if (!val) return;
    setSelectedEndMonth(val);
    let currentStart = selectedStartMonth;
    if (val < selectedStartMonth) {
      setSelectedStartMonth(val);
      currentStart = val;
    }
    updateDateRange(currentStart, val);
  };

  const setFilterThisMonth = () => {
    setSelectedStartMonth(thisMonthStr);
    setSelectedEndMonth(thisMonthStr);
    updateDateRange(thisMonthStr, thisMonthStr);
  };

  const setFilterLastMonth = () => {
    setSelectedStartMonth(lastMonthStr);
    setSelectedEndMonth(lastMonthStr);
    updateDateRange(lastMonthStr, lastMonthStr);
  };

  const setFilterThisYear = () => {
    setSelectedStartMonth(thisYearStartStr);
    setSelectedEndMonth(thisYearEndStr);
    updateDateRange(thisYearStartStr, thisYearEndStr);
  };

  const isThisMonthActive = selectedStartMonth === thisMonthStr && selectedEndMonth === thisMonthStr;
  const isLastMonthActive = selectedStartMonth === lastMonthStr && selectedEndMonth === lastMonthStr;
  const isThisYearActive = selectedStartMonth === thisYearStartStr && selectedEndMonth === thisYearEndStr;

  
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState({ totalNet: 0, totalEmployees: 0, calculatedCount: 0 });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDetails, setEditDetails] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

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
      
      // Sort chronologically (由舊到新): year_month ASC, and then by employee code ASC
      const sortedPayrolls = (res.data || []).sort((a, b) => {
        if (a.year_month !== b.year_month) {
          return a.year_month.localeCompare(b.year_month);
        }
        return (a.employee?.code || '').localeCompare(b.employee?.code || '');
      });

      setPayrolls(sortedPayrolls);
      setEmployees(empRes.data);
      setSelectedIds([]); // Reset selection when data is re-fetched
      const totalNet = res.data.reduce((sum, p) => sum + p.net_salary, 0);
      const calculated = res.data.filter(p => p.status === 'FINALIZED').length;
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

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(filteredPayrolls.map(p => p.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleBatchPrint = () => {
    window.print();
  };

  const isAllFinalized = payrolls.length > 0 && payrolls.every(p => p.status === 'FINALIZED');

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .page-break { page-break-after: always !important; break-after: page !important; }
          
          /* 緊湊列印排版以防溢出單頁，解決列印到後面頁面印到一半被切掉的 Bug */
          .payroll-slip-print-page {
            padding: 12px 20px !important;
            margin: 0 auto !important;
            max-width: 100% !important;
          }
          .payroll-slip-print-page > * + * {
            margin-top: 8px !important;
          }
          
          /* 縮小字體與單元格內距，提升列印緊湊度 */
          .payroll-slip-print-page th,
          .payroll-slip-print-page td {
            padding: 4px 8px !important;
            font-size: 12px !important;
          }
          
          /* 調整標題間距 */
          .payroll-slip-print-page h2 {
            margin-bottom: 8px !important;
            padding-bottom: 4px !important;
            font-size: 18px !important;
          }
          
          /* 強化列印時的表格邊線與外框 */
          .border-2, .border-x-2, .border-y-2,
          .border-gray-800, .border-gray-400 {
            border: 2px solid #000000 !important;
          }
          
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          
          th, td {
            border: 1px solid #000000 !important;
            border-collapse: collapse !important;
          }
          
          /* 加粗內部間隔線 */
          .border-r-2 {
            border-right: 2px solid #000000 !important;
          }
          .border-b-2 {
            border-bottom: 2px solid #000000 !important;
          }
          .border-t-2 {
            border-top: 2px solid #000000 !important;
          }
          .border-gray-300 {
            border-color: #000000 !important;
          }
          
          /* 強制列印背景顏色（如灰色表頭與合計列） */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          ${activeTab === 'list' ? `
            .main-app-container { display: none !important; }
            .batch-print-container { display: block !important; }
          ` : `
            .batch-print-container { display: none !important; }
          `}
        }
      `}} />
      <div className="flex flex-col h-[calc(100vh-100px)] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm animate-in fade-in duration-500 main-app-container">
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
                  <h1 className="text-xl font-black text-gray-800 tracking-tight flex flex-wrap items-center gap-2">
                    <span className="text-indigo-600">▌</span> {isSelf ? '個人薪資查詢' : '薪資結算看板'}
                    {!isSelf && (
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm shrink-0">
                          預估支出: ${stats.totalNet.toLocaleString()}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm shrink-0">
                          已結算: {stats.calculatedCount} / {stats.totalEmployees}
                        </span>
                        {isAllFinalized ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm flex items-center gap-0.5 cursor-pointer hover:bg-amber-100 transition-colors shrink-0" onClick={handleUnfinalize}>
                            <Unlock size={10} /> 已鎖定
                          </span>
                        ) : (
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm flex items-center gap-0.5 cursor-pointer hover:bg-blue-100 transition-colors shrink-0" onClick={handleFinalize}>
                            <CheckCircle size={10} /> 執行結案
                          </span>
                        )}
                      </div>
                    )}
                  </h1>
                </div>

                <div className="flex gap-2">
                  {!isSelf && selectedIds.length > 0 && (
                    <button onClick={handleBatchPrint} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-200">
                      <Printer size={16} /> 批次列印 ({selectedIds.length} 筆)
                    </button>
                  )}
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

              {/* Bottom Tier: Consolidated Month Range, Quick Buttons & List Filters */}
              <div className="px-6 py-2.5 bg-gray-50 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
                {/* Left Part: Month Range & Quick Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded px-2.5 py-1 shadow-sm hover:border-indigo-400 transition-colors shrink-0">
                    <span className="text-[11px] font-black text-gray-500">從</span>
                    <input 
                      type="month" 
                      value={selectedStartMonth} 
                      onChange={(e) => handleStartMonthChange(e.target.value)} 
                      className="text-[11px] font-black text-indigo-600 outline-none cursor-pointer bg-transparent border-none p-0 focus:ring-0 w-24"
                    />
                    <span className="text-[11px] font-black text-gray-400 mx-0.5">至</span>
                    <input 
                      type="month" 
                      value={selectedEndMonth} 
                      onChange={(e) => handleEndMonthChange(e.target.value)} 
                      className="text-[11px] font-black text-indigo-600 outline-none cursor-pointer bg-transparent border-none p-0 focus:ring-0 w-24"
                    />
                  </div>

                  {/* Quick Filter Buttons */}
                  <div className="flex items-center bg-gray-200/60 p-0.5 rounded-lg border border-gray-300/80 shadow-sm shrink-0">
                    <button 
                      onClick={setFilterThisMonth}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-black transition-all ${isThisMonthActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      本月
                    </button>
                    <button 
                      onClick={setFilterLastMonth}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-black transition-all ${isLastMonthActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      上個月
                    </button>
                    <button 
                      onClick={setFilterThisYear}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-black transition-all ${isThisYearActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      今年
                    </button>
                  </div>
                </div>

                {/* Right Part: List Filters */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Filter size={12} className="text-gray-400" />
                    <span className="text-gray-500 font-black text-[11px]">篩選</span>
                  </div>
                  
                  <select 
                    value={listStatusFilter} 
                    onChange={e => { setListStatusFilter(e.target.value); setSelectedEmpIds([]); }}
                    className="bg-white border border-gray-300 rounded px-2 py-1 text-[11px] font-black text-[#1e40af] outline-none hover:border-blue-400 transition-colors shadow-sm cursor-pointer"
                  >
                    <option value="ACTIVE">在職中</option>
                    <option value="RESIGNED">已離職</option>
                    <option value="all">不分狀態</option>
                  </select>

                  <div className="relative">
                    <button 
                      onClick={() => setIsEmpDropdownOpen(!isEmpDropdownOpen)}
                      className="bg-white border border-gray-300 text-gray-600 px-2 py-1 rounded text-[11px] font-black hover:bg-gray-50 flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <User size={12} /> 人員選擇 {selectedEmpIds.length > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[9px] ml-0.5">{selectedEmpIds.length}</span>}
                    </button>
                    {isEmpDropdownOpen && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-xl z-50 p-4 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black text-gray-700">選擇人員</span>
                          <button onClick={()=>setIsEmpDropdownOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-2">
                          <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer group">
                            <input type="checkbox" checked={selectedEmpIds.length === 0} onChange={() => setSelectedEmpIds([])} className="rounded text-indigo-600 focus:ring-0" />
                            <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600">全選所有人員</span>
                          </label>
                          <div className="h-px bg-gray-100 my-1" />
                          {employees.filter(e => listStatusFilter === 'all' || e.status === listStatusFilter).map(emp => (
                            <label key={emp.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer group">
                              <input type="checkbox" checked={selectedEmpIds.includes(emp.id)} 
                                onChange={(e) => {
                                  if(e.target.checked) setSelectedEmpIds([...selectedEmpIds, emp.id]);
                                  else setSelectedEmpIds(selectedEmpIds.filter(id => id !== emp.id));
                                }} 
                                className="rounded text-indigo-600 focus:ring-0" 
                              />
                              <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600">{emp.name} <span className="text-[10px] text-gray-400">({emp.code})</span></span>
                            </label>
                          ))}
                        </div>
                        <button onClick={()=>setIsEmpDropdownOpen(false)} className="w-full mt-3 bg-gray-900 text-white py-2 rounded-lg text-xs font-bold shadow-sm">確定</button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => setShowColumnPicker(!showColumnPicker)}
                      className="bg-white border border-gray-300 text-gray-600 px-2 py-1 rounded text-[11px] font-black hover:bg-gray-50 flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <Settings size={12} /> 顯示欄位
                    </button>
                    {showColumnPicker && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-xl z-50 p-4 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black text-gray-700">自訂顯示欄位</span>
                          <button onClick={() => setShowColumnPicker(false)} className="text-gray-300 hover:text-gray-500"><X size={14}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                          {allColumns.map(col => (
                            <label key={col.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors group">
                              <input 
                                type="checkbox"
                                checked={visibleColumns.includes(col.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setVisibleColumns([...visibleColumns, col.id]);
                                  else setVisibleColumns(visibleColumns.filter(id => id !== col.id));
                                }}
                                className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-0"
                              />
                              <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600">{col.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto border-b border-gray-200 custom-scrollbar print:hidden">
            <table className="min-w-full border-collapse">
              <thead className="bg-[#f0f4f8] sticky top-0 z-10">
                <tr>
                  {!isSelf && (
                    <th className="px-4 py-1.5 border-r border-b border-gray-300 text-center w-12 print:hidden">
                      <input 
                        type="checkbox" 
                        checked={filteredPayrolls.length > 0 && selectedIds.length === filteredPayrolls.length} 
                        onChange={handleSelectAll} 
                        className="rounded border-gray-300 text-indigo-600 focus:ring-0" 
                      />
                    </th>
                  )}
                  <th className="px-6 py-1.5 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">月份</th>
                  {visibleColumns.includes('name') && <th className="px-6 py-1.5 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">員工姓名</th>}
                  {visibleColumns.includes('code') && <th className="px-6 py-1.5 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">工號</th>}
                  {visibleColumns.includes('department') && <th className="px-6 py-1.5 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">部門</th>}
                  {visibleColumns.includes('position') && <th className="px-6 py-1.5 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">職稱</th>}
                  {visibleColumns.includes('total_addition') && <th className="px-6 py-1.5 border-r border-b border-gray-300 text-right text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">加項總額</th>}
                  {visibleColumns.includes('total_deduction') && <th className="px-6 py-1.5 border-r border-b border-gray-300 text-right text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">扣項總額</th>}
                  {visibleColumns.includes('net_salary') && <th className="px-6 py-1.5 border-r border-b border-gray-300 text-right text-xs md:text-sm font-black text-indigo-600 uppercase tracking-tight">實發金額</th>}
                  {visibleColumns.includes('status') && <th className="px-6 py-1.5 border-r border-b border-gray-300 text-center text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">狀態</th>}
                  <th className="px-6 py-1.5 border-r border-b border-gray-300 text-center text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">確認日期</th>
                  <th className="px-6 py-1.5 border-b border-gray-300 text-center text-xs md:text-sm font-black text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white text-xs md:text-sm">
                {filteredPayrolls.map((p, idx) => (
                  <tr key={p.id} className={`hover:bg-blue-50/30 transition-colors border-b border-gray-100 ${selectedRecord?.id === p.id ? 'bg-blue-50' : ''}`}>
                    {!isSelf && (
                      <td className="px-4 py-1.5 border-r border-gray-200 text-center print:hidden">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(p.id)} 
                          onChange={() => handleSelectOne(p.id)} 
                          className="rounded border-gray-300 text-indigo-600 focus:ring-0" 
                        />
                      </td>
                    )}
                    <td className="px-6 py-1.5 border-r border-gray-200 text-gray-500 font-bold">{p.year_month}</td>
                    {visibleColumns.includes('name') && (
                      <td className="px-6 py-1.5 border-r border-gray-200 font-bold text-[#1e40af] hover:underline cursor-pointer" onClick={() => { setSelectedRecord(p); setActiveTab('details'); }}>
                        {p.employee.name}
                      </td>
                    )}
                    {visibleColumns.includes('code') && <td className="px-6 py-1.5 border-r border-gray-200 text-gray-500 font-mono">{p.employee.code}</td>}
                    {visibleColumns.includes('department') && <td className="px-6 py-1.5 border-r border-gray-200 text-gray-500">{p.employee.department || '--'}</td>}
                    {visibleColumns.includes('position') && <td className="px-6 py-1.5 border-r border-gray-200 text-gray-500">{p.employee.position || '--'}</td>}
                    {visibleColumns.includes('total_addition') && <td className="px-6 py-1.5 border-r border-gray-200 text-right font-bold text-emerald-600">+${p.total_addition.toLocaleString()}</td>}
                    {visibleColumns.includes('total_deduction') && <td className="px-6 py-1.5 border-r border-gray-200 text-right font-bold text-rose-600">-${p.total_deduction.toLocaleString()}</td>}
                    {visibleColumns.includes('net_salary') && <td className="px-6 py-1.5 border-r border-gray-200 text-right text-sm font-black text-indigo-600">${p.net_salary.toLocaleString()}</td>}
                    {visibleColumns.includes('status') && (
                      <td className="px-6 py-1.5 border-r border-gray-200 text-center">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase shadow-sm ${p.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                          {p.status === 'FINALIZED' ? '已結案' : '試算中'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-1.5 border-r border-gray-200 text-center font-bold">
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
                    <td className="px-6 py-1.5 text-center flex justify-center gap-1">
                      <button onClick={() => { setSelectedRecord(p); setActiveTab('details'); }} className="px-3 py-1 text-xs font-bold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded transition-all">
                        查看明細
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPayrolls.length === 0 && (
                  <tr>
                    <td colSpan={(isSelf ? 3 : 4) + visibleColumns.length} className="py-20 text-center text-gray-300 font-bold italic tracking-widest">NO PAYROLL DATA</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Toolbar (Simple) */}
          <div className="bg-[#f8f9fa] border-t border-gray-200 p-4 flex items-center gap-6 shrink-0 print:hidden">
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
            <div className="flex-1 overflow-auto p-4 md:p-8 bg-gray-100">
              <div className="max-w-4xl mx-auto space-y-4 print:space-y-0 print:m-0">
                
                {/* Centered Slip Title */}
                <h2 className="text-xl md:text-2xl font-black text-center text-gray-800 tracking-wider mb-6 pb-2 border-b-2 border-gray-800">
                  {(() => {
                    const ym = selectedRecord.year_month.split('-');
                    const displayCoName = (sessionStorage.getItem('companyName') || localStorage.getItem('companyName') || sessionStorage.getItem('companyCode') || '企業')
                      .replace(/^[A-Z0-9]+\s*/i, '')
                      .replace(/\s*\([A-Z0-9]+\)$/i, '');
                    return `${ym[0]}年${ym[1]}月 ${displayCoName} 薪資明細`;
                  })()}
                </h2>

                {/* 1. Header Information Table */}
                <div className="bg-white border-2 border-gray-800">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      <tr className="border-b-2 border-gray-800">
                        <td className="w-1/6 px-3 py-2 bg-gray-50 font-black text-center border-r-2 border-gray-800">職員代碼</td>
                        <td className="w-2/6 px-3 py-2 border-r-2 border-gray-800 font-bold">{selectedRecord.employee.code}</td>
                        <td className="w-1/6 px-3 py-2 bg-gray-50 font-black text-center border-r-2 border-gray-800">姓名</td>
                        <td className="w-2/6 px-3 py-2 font-bold">{selectedRecord.employee.name}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 bg-gray-50 font-black text-center border-r-2 border-gray-800">部門</td>
                        <td className="px-3 py-2 border-r-2 border-gray-800 font-bold">{selectedRecord.employee.department || '--'}</td>
                        <td className="px-3 py-2 bg-gray-50 font-black text-center border-r-2 border-gray-800">支付日期</td>
                        <td className="px-3 py-2 font-bold">{selectedRecord.year_month.replace('-', '/')}/05</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. Summary Row Table */}
                <div className="bg-white border-2 border-gray-800">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      <tr className="font-black">
                        <td className="w-1/6 px-3 py-2 bg-gray-50 text-center border-r-2 border-gray-800">支付總額</td>
                        <td className="w-1/6 px-3 py-2 text-right border-r-2 border-gray-800 text-emerald-700">{selectedRecord.total_addition.toLocaleString()}</td>
                        <td className="w-1/6 px-3 py-2 bg-gray-50 text-center border-r-2 border-gray-800">扣除總額</td>
                        <td className="w-1/6 px-3 py-2 text-right border-r-2 border-gray-800 text-rose-700">{selectedRecord.total_deduction.toLocaleString()}</td>
                        <td className="w-1/6 px-3 py-2 bg-gray-50 text-center border-r-2 border-gray-800">實支付額</td>
                        <td className="w-1/6 px-3 py-2 text-right text-indigo-700 text-lg">{selectedRecord.net_salary.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. Additions Table */}
                <div className="bg-white border-x-2 border-t-2 border-gray-400">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-400">
                        <th className="w-5/12 py-2 border-r-2 border-gray-400 text-center font-black">津貼項目名稱</th>
                        <th className="w-3/12 py-2 border-r-2 border-gray-400 text-center font-black">金額</th>
                        <th className="w-4/12 py-2 text-center font-black">備註事項</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isEditing ? editDetails : selectedRecord.details)
                        .map((d, index) => ({...d, originalIndex: index}))
                        .filter(d => d.type === 'ADDITION')
                        .sort((a, b) => {
                          if (a.item_name === '基本薪資') return -1;
                          if (b.item_name === '基本薪資') return 1;
                          return 0;
                        })
                        .map((d) => (
                          <tr key={d.originalIndex} className="border-b border-gray-300">
                            <td className="px-3 py-2 border-r-2 border-gray-300 font-bold text-gray-700">{d.item_name}</td>
                            <td className="px-3 py-2 border-r-2 border-gray-300 text-right font-black">
                              {isEditing ? (
                                <input 
                                  type="number" 
                                  value={d.amount} 
                                  onChange={e => updateEditDetail(d.originalIndex, 'amount', e.target.value)}
                                  className="w-full text-right outline-none bg-blue-50 focus:bg-white"
                                />
                              ) : d.amount.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 italic text-gray-500 text-xs">
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={d.note || ''} 
                                  onChange={e => updateEditDetail(d.originalIndex, 'note', e.target.value)}
                                  className="w-full outline-none bg-blue-50 focus:bg-white"
                                />
                              ) : d.note}
                            </td>
                          </tr>
                        ))}
                      {/* Addition Total Row */}
                      <tr className="bg-gray-50 font-black border-b-2 border-gray-400">
                        <td className="px-3 py-2 border-r-2 border-gray-300 text-center">合計</td>
                        <td className="px-3 py-2 border-r-2 border-gray-300 text-right text-emerald-700">{selectedRecord.total_addition.toLocaleString()}</td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. Deductions Table */}
                <div className="bg-white border-x-2 border-y-2 border-gray-800">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-800">
                        <th className="w-5/12 py-2 border-r-2 border-gray-800 text-center font-black">扣除項目名稱</th>
                        <th className="w-3/12 py-2 border-r-2 border-gray-800 text-center font-black">金額</th>
                        <th className="w-4/12 py-2 text-center font-black">備註事項</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isEditing ? editDetails : selectedRecord.details)
                        .map((d, index) => ({...d, originalIndex: index}))
                        .filter(d => d.type === 'DEDUCTION')
                        .map((d) => (
                          <tr key={d.originalIndex} className="border-b border-gray-300">
                            <td className="px-3 py-2 border-r-2 border-gray-300 font-bold text-gray-700">{d.item_name}</td>
                            <td className="px-3 py-2 border-r-2 border-gray-300 text-right font-black">
                              {isEditing ? (
                                <input 
                                  type="number" 
                                  value={d.amount} 
                                  onChange={e => updateEditDetail(d.originalIndex, 'amount', e.target.value)}
                                  className="w-full text-right outline-none bg-blue-50 focus:bg-white"
                                />
                              ) : d.amount.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 italic text-gray-500 text-xs">
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={d.note || ''} 
                                  onChange={e => updateEditDetail(d.originalIndex, 'note', e.target.value)}
                                  className="w-full outline-none bg-blue-50 focus:bg-white px-1"
                                />
                              ) : d.note}
                            </td>
                          </tr>
                        ))}
                      {/* Deduction Total Row */}
                      <tr className="bg-gray-50 font-black">
                        <td className="px-3 py-2 border-r-2 border-gray-300 text-center">合計</td>
                        <td className="px-3 py-2 border-r-2 border-gray-300 text-right text-rose-700">{selectedRecord.total_deduction.toLocaleString()}</td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 pb-12 print:pb-0">
                   <div className="flex items-center gap-3">
                      {selectedRecord.is_read ? (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                          <CheckCircle size={20} />
                          <span className="text-sm font-bold">已確認完畢 ({new Date(selectedRecord.read_at).toLocaleDateString()})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                          <AlertCircle size={20} />
                          <span className="text-sm font-bold">待員工確認中</span>
                        </div>
                      )}
                   </div>
                   
                   <div className="flex flex-wrap gap-3 w-full md:w-auto print:hidden">
                      {isEditing ? (
                        <>
                          <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-gray-200 text-gray-600 font-black rounded-lg hover:bg-gray-300 transition-all">
                            取消編輯
                          </button>
                          <button onClick={handleSaveDetails} className="px-8 py-2 bg-indigo-600 text-white font-black rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                            💾 儲存修改
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => window.print()} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-black rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2">
                            <Printer size={18} /> 列印薪資單
                          </button>
                          
                          {canManage && selectedRecord.status !== 'FINALIZED' && (
                            <button 
                              onClick={() => {
                                setEditDetails(JSON.parse(JSON.stringify(selectedRecord.details)));
                                setIsEditing(true);
                              }} 
                              className="px-6 py-2 bg-white border border-indigo-200 text-indigo-600 font-black rounded-lg hover:bg-indigo-50 transition-all"
                            >
                              ✏️ 手動編輯
                            </button>
                          )}

                          {((Number(selectedRecord.employeeId) === Number(user.id) || isSelf) && !selectedRecord.is_read) && (
                            <button onClick={() => handleMarkRead(selectedRecord.id)} className="px-8 py-2 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all">
                              確認正確
                            </button>
                          )}

                          {canManage && selectedRecord.is_read && (
                            <button onClick={() => handleUnmarkRead(selectedRecord.id)} className="px-8 py-2 bg-rose-50 text-rose-600 font-black rounded-lg hover:bg-rose-100 transition-all">
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

    {/* 批次列印專用 DOM 容器 */}
    <div className="hidden batch-print-container bg-white text-black p-0 m-0">
      {payrolls.filter(p => selectedIds.includes(p.id)).map((p, idx) => (
        <div key={p.id} className="payroll-slip-print-page p-8 max-w-4xl mx-auto space-y-6 page-break">
          
          {/* Centered Slip Title */}
          <h2 className="text-xl md:text-2xl font-black text-center text-gray-800 tracking-wider mb-6 pb-2 border-b-2 border-gray-800">
            {(() => {
              const ym = p.year_month.split('-');
              const displayCoName = (sessionStorage.getItem('companyName') || localStorage.getItem('companyName') || sessionStorage.getItem('companyCode') || '企業')
                .replace(/^[A-Z0-9]+\s*/i, '')
                .replace(/\s*\([A-Z0-9]+\)$/i, '');
              return `${ym[0]}年${ym[1]}月 ${displayCoName} 薪資明細`;
            })()}
          </h2>

          {/* 1. Header Information Table */}
          <div className="bg-white border-2 border-gray-800">
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b-2 border-gray-800">
                  <td className="w-1/6 px-3 py-2 bg-gray-50 font-black text-center border-r-2 border-gray-800">職員代碼</td>
                  <td className="w-2/6 px-3 py-2 border-r-2 border-gray-800 font-bold">{p.employee.code}</td>
                  <td className="w-1/6 px-3 py-2 bg-gray-50 font-black text-center border-r-2 border-gray-800">姓名</td>
                  <td className="w-2/6 px-3 py-2 font-bold">{p.employee.name}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 bg-gray-50 font-black text-center border-r-2 border-gray-800">部門</td>
                  <td className="px-3 py-2 border-r-2 border-gray-800 font-bold">{p.employee.department || '--'}</td>
                  <td className="px-3 py-2 bg-gray-50 font-black text-center border-r-2 border-gray-800">支付日期</td>
                  <td className="px-3 py-2 font-bold">{p.year_month.replace('-', '/')}/05</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. Summary Row Table */}
          <div className="bg-white border-2 border-gray-800">
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr className="font-black">
                  <td className="w-1/6 px-3 py-2 bg-gray-50 text-center border-r-2 border-gray-800">支付總額</td>
                  <td className="w-1/6 px-3 py-2 text-right border-r-2 border-gray-800 text-emerald-700">{p.total_addition.toLocaleString()}</td>
                  <td className="w-1/6 px-3 py-2 text-right border-r-2 border-gray-800 text-rose-700">{p.total_deduction.toLocaleString()}</td>
                  <td className="w-1/6 px-3 py-2 bg-gray-50 text-center border-r-2 border-gray-800">扣除總額</td>
                  <td className="w-1/6 px-3 py-2 bg-gray-50 text-center border-r-2 border-gray-800">實支付額</td>
                  <td className="w-1/6 px-3 py-2 text-right text-indigo-700 text-lg">{p.net_salary.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. Additions Table */}
          <div className="bg-white border-x-2 border-t-2 border-gray-400">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-400">
                  <th className="w-5/12 py-2 border-r-2 border-gray-400 text-center font-black">津貼項目名稱</th>
                  <th className="w-3/12 py-2 border-r-2 border-gray-400 text-center font-black">金額</th>
                  <th className="w-4/12 py-2 text-center font-black">備註事項</th>
                </tr>
              </thead>
              <tbody>
                {(p.details || [])
                  .filter(d => d.type === 'ADDITION')
                  .sort((a, b) => {
                    if (a.item_name === '基本薪資') return -1;
                    if (b.item_name === '基本薪資') return 1;
                    return 0;
                  })
                  .map((d, index) => (
                    <tr key={index} className="border-b border-gray-300">
                      <td className="px-3 py-2 border-r-2 border-gray-300 font-bold text-gray-700">{d.item_name}</td>
                      <td className="px-3 py-2 border-r-2 border-gray-300 text-right font-black">{d.amount.toLocaleString()}</td>
                      <td className="px-3 py-2 italic text-gray-500 text-xs">{d.note}</td>
                    </tr>
                  ))}
                {/* Addition Total Row */}
                <tr className="bg-gray-50 font-black border-b-2 border-gray-400">
                  <td className="px-3 py-2 border-r-2 border-gray-300 text-center">合計</td>
                  <td className="px-3 py-2 border-r-2 border-gray-300 text-right text-emerald-700">{p.total_addition.toLocaleString()}</td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. Deductions Table */}
          <div className="bg-white border-x-2 border-y-2 border-gray-800">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-800">
                  <th className="w-5/12 py-2 border-r-2 border-gray-800 text-center font-black">扣除項目名稱</th>
                  <th className="w-3/12 py-2 border-r-2 border-gray-800 text-center font-black">金額</th>
                  <th className="w-4/12 py-2 text-center font-black">備註事項</th>
                </tr>
              </thead>
              <tbody>
                {(p.details || [])
                  .filter(d => d.type === 'DEDUCTION')
                  .map((d, index) => (
                    <tr key={index} className="border-b border-gray-300">
                      <td className="px-3 py-2 border-r-2 border-gray-300 font-bold text-gray-700">{d.item_name}</td>
                      <td className="px-3 py-2 border-r-2 border-gray-300 text-right font-black">{d.amount.toLocaleString()}</td>
                      <td className="px-3 py-2 italic text-gray-500 text-xs">{d.note}</td>
                    </tr>
                  ))}
                {/* Deduction Total Row */}
                <tr className="bg-gray-50 font-black">
                  <td className="px-3 py-2 border-r-2 border-gray-300 text-center">合計</td>
                  <td className="px-3 py-2 border-r-2 border-gray-300 text-right text-rose-700">{p.total_deduction.toLocaleString()}</td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  </>
);
}
