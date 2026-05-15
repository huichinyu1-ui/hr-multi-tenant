import React, { useState, useEffect } from 'react';
import { Users, Search, Settings, Plus, Edit2, Trash2, X, Phone, Mail, MapPin, Briefcase, DollarSign, CreditCard, Shield, Calendar, Heart } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { usePermission } from '../contexts/PermissionContext';

export default function Employees() {
  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [payrollItems, setPayrollItems] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [roles, setRoles] = useState([]);  // 從 DB 動態載入的角色列表
  const [activeModalTab, setActiveModalTab] = useState('personal');
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activePage, setActivePage] = useState('list'); // 'list' or 'metadata'
  const [metadata, setMetadata] = useState([]);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(null);
  const [metadataForm, setMetadataForm] = useState({ type: 'DEPARTMENT', label: '', value: '' });
  
  const { hasPermission, isAdmin, isSelfOnly } = usePermission();
  const canEdit = hasPermission('EMP', 'canEdit');
  const canDelete = hasPermission('EMP', 'canDelete');
  const isEmpSelfOnly = isSelfOnly('EMP');

  // 自定義顯示欄位
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('employeeVisibleColumns');
    return saved ? JSON.parse(saved) : ['code', 'name', 'position', 'salary', 'phone'];
  });

  // 儲存設定
  useEffect(() => {
    localStorage.setItem('employeeVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const allColumns = [
    { id: 'seq', label: '#' },
    { id: 'code', label: '員工代碼' },
    { id: 'name', label: '姓名' },
    { id: 'department', label: '部門名稱' },
    { id: 'position', label: '職稱' },
    { id: 'roleId', label: '權限職務' },
    { id: 'salary', label: '薪資類型', reqModule: 'PAYROLL' },
    { id: 'phone', label: '電話' },
    { id: 'email', label: 'Email' },
    { id: 'join_date', label: '報到日期' },
    { id: 'probation_date', label: '轉正日期' },
    { id: 'resign_date', label: '離職生效日' },
    { id: 'custom_field1', label: '備註 1' },
    { id: 'custom_field2', label: '備註 2' },
    { id: 'custom_field3', label: '備註 3' },
    { id: 'custom_field4', label: '備註 4' },
    { id: 'custom_field5', label: '備註 5' },
    { id: 'custom_field6', label: '備註 6' }
  ];

  const availableColumns = allColumns.filter(col => !col.reqModule || hasPermission(col.reqModule, 'canView'));


  useEffect(() => { 
    fetchEmployees(); 
    fetchShifts(); 
    fetchPayrollItems();
    fetchLeaveTypes();
    fetchMetadata();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data);
    } catch (e) { console.error('[Roles]', e); }
  };

  const fetchMetadata = async () => {
    try {
      const res = await api.get('/metadata');
      setMetadata(res.data);
    } catch (e) { console.error(e); }
  };

  const initialForm = { 
    code: '', name: '', base_salary: 0,
    full_attendance_bonus: 0, production_bonus: 0, performance_bonus: 0, meal_allowance: 0, festival_bonus: 0, workShiftId: '',
    roleId: null, username: '',
    gender: '男', birthday: '', id_number: '', phone: '', email: '', address: '', 
    emergency_contact: '', emergency_phone: '', emergency_relationship: '',
    department: '', position: '', join_date: '', probation_date: '', employment_type: 'FULL_TIME',
    bank_code: '', bank_account: '', insurance_salary: 0,
    pension_rate: 0, health_dependents: 0,
    custom_1: 0, custom_2: 0, custom_3: 0,
    custom_4: 0, custom_5: 0, custom_6: 0,
    overrides: [],
    leaveQuotas: [],
    custom_field1: '', custom_field2: '', custom_field3: '', custom_field4: '', custom_field5: '', custom_field6: '',
    resign_date: ''
  };

  const [form, setForm] = useState(initialForm);

  const fetchLeaveTypes = async () => {
    try {
      const res = await api.get('/leaves/types');
      setLeaveTypes(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchPayrollItems = async () => {
    try {
      const res = await api.get('/items');
      setPayrollItems(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchShifts = async () => {
    try {
      const res = await api.get('/shifts');
      setShifts(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
      setSelectedIds([]); // Reset selection on fetch
    } catch (e) { console.error(e); }
  };

  // 快捷鍵處理
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        const empRole = roles.find(r => r.name === 'EMPLOYEE' || r.name === '一般員工');
        setEditingId(null); setForm({...initialForm, roleId: empRole ? empRole.id : null}); setShowModal(true);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        document.getElementById('erpSearchInput')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
        addToast('更新成功', 'success');
      } else {
        await api.post('/employees', payload);
        addToast('新增成功', 'success');
      }
      setShowModal(false);
      fetchEmployees();
    } catch (e) { 
      addToast(e.response?.data?.error || '儲存失敗', 'error');
    }
  };

  const handleEdit = (emp) => {
    setEditingId(emp.id);
    // Ensure leaveQuotas are mapped correctly for the form
    const quotas = emp.leaveQuotas?.map(q => ({ 
      leaveTypeId: q.leaveTypeId, 
      total_hours: q.total_hours,
      year: q.year 
    })) || [];
    setForm({ ...initialForm, ...emp, workShiftId: emp.workShiftId || '', leaveQuotas: quotas });
    setShowModal(true);
    setActiveModalTab('personal');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除嗎？')) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
      addToast('刪除完成', 'success');
    } catch (e) { addToast('刪除失敗', 'error'); }
  };

  const filteredEmployees = employees.filter(emp => {
    const name = emp.name || '';
    const code = emp.code || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || String(emp.roleId) === roleFilter;
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(filteredEmployees.map(emp => emp.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };
  const handleMetadataSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMetadata) {
        await api.put(`/metadata/${editingMetadata.id}`, metadataForm);
        addToast('更新成功', 'success');
      } else {
        await api.post('/metadata', metadataForm);
        addToast('新增成功', 'success');
      }
      setShowMetadataModal(false);
      fetchMetadata();
    } catch (e) { addToast('儲存失敗', 'error'); }
  };

  const handleDeleteMetadata = async (id) => {
    if (!window.confirm('確定要刪除此選項嗎？這可能會影響現有員工資料的顯示。')) return;
    try {
      await api.delete(`/metadata/${id}`);
      addToast('刪除成功', 'success');
      fetchMetadata();
    } catch (e) { addToast('刪除失敗', 'error'); }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return addToast('請先選擇要刪除的項目', 'warning');
    if (!window.confirm(`確定要刪除選中的 ${selectedIds.length} 筆資料嗎？`)) return;
    
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/employees/${id}`)));
      addToast('批次刪除成功', 'success');
      fetchEmployees();
    } catch (e) { addToast('部分項目刪除失敗', 'error'); }
  };



  const exportToExcel = () => {
    const headers = availableColumns.filter(c => visibleColumns.includes(c.id)).map(c => c.label).join(',');
    const rows = filteredEmployees.map(emp => {
      return availableColumns.filter(c => visibleColumns.includes(c.id)).map(c => {
        if (c.id === 'salary') return emp.base_salary;
        return `"${emp[c.id] || ''}"`;
      }).join(',');
    }).join('\n');
    
    const blob = new Blob([`\ufeff${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `員工清單_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm animate-in fade-in duration-500">
      {/* Tab Navigation */}
      <div className="flex bg-gray-50 border-b border-gray-200 shrink-0 overflow-x-auto whitespace-nowrap no-scrollbar">
        <button 
          onClick={() => setActivePage('list')}
          className={`px-8 py-3 text-sm font-black transition-all border-r border-gray-200 ${activePage === 'list' ? 'bg-white text-indigo-600 border-b-2 border-b-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          職員檔案清單
        </button>
        {hasPermission('EMP', 'canManageMetadata') && (
          <button 
            onClick={() => setActivePage('metadata')}
            className={`px-8 py-3 text-sm font-black transition-all border-r border-gray-200 ${activePage === 'metadata' ? 'bg-white text-indigo-600 border-b-2 border-b-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            基礎資料設定
          </button>
        )}
      </div>

      {activePage === 'list' ? (
        <>
          {/* Top Header/Filter Bar */}
          <div className="bg-[#f8f9fa] border-b border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-indigo-600 rounded-full" />
          <h1 className="text-xl font-black text-gray-800">職員列表</h1>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              id="erpSearchInput"
              type="text" 
              placeholder="輸入後 [Enter]" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
            />
          </div>
          
          <select 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-white border border-gray-300 rounded px-3 py-1.5 text-sm font-bold text-gray-600 outline-none"
          >
            <option value="all">所有職務</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-300 rounded px-3 py-1.5 text-sm font-bold text-[#1e40af] outline-none"
          >
            <option value="ACTIVE">在職中</option>
            <option value="RESIGNED">已離職</option>
            <option value="all">全部狀態</option>
          </select>

          <div className="relative">
            <button 
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm font-bold hover:bg-gray-50 flex items-center gap-1"
            >
              設定
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50">
                <div className="flex justify-between items-center mb-4 px-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">欄位顯示設定</span>
                  <button onClick={() => setShowColumnPicker(false)} className="text-gray-300 hover:text-gray-500"><X size={16}/></button>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {availableColumns.map(col => (
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
                      <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm font-bold hover:bg-gray-50">幫助</button>
        </div>
      </div>

      {/* List */}
      {/* Grid Table */}
      <div className="flex-1 overflow-auto border-b border-gray-200 custom-scrollbar">
        <table className="min-w-full border-collapse table-fixed">
          <thead className="bg-[#f0f4f8] sticky top-0 z-10">
            <tr>
              <th className="w-12 px-2 py-2 border-r border-b border-gray-300">
                <input 
                  type="checkbox" 
                  className="w-3 h-3 rounded border-gray-300 text-indigo-600"
                  checked={selectedIds.length > 0 && selectedIds.length === filteredEmployees.length}
                  onChange={handleSelectAll}
                />
              </th>
              {visibleColumns.includes('seq') && <th className="w-12 px-2 py-2 border-r border-b border-gray-300 text-center text-xs md:text-sm font-bold text-gray-600">行</th>}
              {visibleColumns.includes('code') && <th className="w-32 px-3 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">職員代碼</th>}
              {visibleColumns.includes('name') && <th className="w-40 px-3 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">姓名</th>}
              {visibleColumns.includes('department') && <th className="w-40 px-3 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">部門名稱</th>}
              {visibleColumns.includes('position') && <th className="w-32 px-3 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">職稱</th>}
              {visibleColumns.includes('roleId') && <th className="w-32 px-3 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">權限職務</th>}
              {visibleColumns.includes('salary') && hasPermission('PAYROLL', 'canView') && <th className="w-32 px-3 py-2 border-r border-b border-gray-300 text-right text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">薪資類型</th>}
              {visibleColumns.includes('phone') && <th className="w-40 px-3 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">電話</th>}
              {visibleColumns.includes('join_date') && <th className="w-32 px-3 py-2 border-r border-b border-gray-300 text-center text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">報到日期</th>}
              {[1,2,3,4,5,6].map(i => visibleColumns.includes(`custom_field${i}`) && (
                <th key={i} className="w-40 px-3 py-2 border-r border-b border-gray-300 text-left text-xs md:text-sm font-black text-[#1e40af] uppercase tracking-tight">備註 {i}</th>
              ))}
              <th className="w-24 px-3 py-2 border-b border-gray-300 text-center text-xs md:text-sm font-black text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredEmployees.map((emp, idx) => (
              <tr key={emp.id} className={`hover:bg-blue-50/30 transition-colors border-b border-gray-100 ${selectedIds.includes(emp.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-2 py-2 border-r border-gray-200 text-center">
                  <input 
                    type="checkbox" 
                    className="w-3 h-3 rounded border-gray-300 text-indigo-600"
                    checked={selectedIds.includes(emp.id)}
                    onChange={() => handleSelectOne(emp.id)}
                  />
                </td>
                {visibleColumns.includes('seq') && <td className="px-2 py-2 border-r border-gray-200 text-center text-[10px] text-gray-400 font-mono">{idx + 1}</td>}
                {visibleColumns.includes('code') && <td className="px-3 py-2 border-r border-gray-200 text-xs md:text-sm font-bold text-gray-600">{emp.code}</td>}
                {visibleColumns.includes('name') && <td className="px-3 py-2 border-r border-gray-200 text-xs md:text-sm font-bold text-[#1e40af] hover:underline cursor-pointer" onClick={() => handleEdit(emp)}>{emp.name}</td>}
                {visibleColumns.includes('department') && <td className="px-3 py-2 border-r border-gray-200 text-xs md:text-sm text-gray-500">{emp.department || '--'}</td>}
                {visibleColumns.includes('position') && <td className="px-3 py-2 border-r border-gray-200 text-xs md:text-sm text-gray-500">{emp.position || '--'}</td>}
                {visibleColumns.includes('roleId') && (
                  <td className="px-3 py-2 border-r border-gray-200 text-xs font-bold text-indigo-600">
                    {emp.roleRef?.name || (emp.role === 'ADMIN' ? '系統管理員' : '一般員工')}
                  </td>
                )}
                {visibleColumns.includes('salary') && hasPermission('PAYROLL', 'canView') && (
                  <td className="px-3 py-2 border-r border-gray-200 text-right text-xs md:text-sm font-black text-gray-700">
                    變動薪資
                  </td>
                )}
                {visibleColumns.includes('phone') && <td className="px-3 py-2 border-r border-gray-200 text-xs md:text-sm text-gray-500">{emp.phone || '--'}</td>}
                {visibleColumns.includes('join_date') && <td className="px-3 py-2 border-r border-gray-200 text-center text-xs md:text-sm text-gray-500">{emp.join_date || '--'}</td>}
                {[1,2,3,4,5,6].map(i => visibleColumns.includes(`custom_field${i}`) && (
                  <td key={i} className="px-3 py-2 border-r border-gray-200 text-xs md:text-sm text-gray-500 truncate">{emp[`custom_field${i}`] || '--'}</td>
                ))}
                <td className="px-3 py-2 text-center flex justify-center gap-1">
                  {canEdit && <button onClick={() => handleEdit(emp)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"><Edit2 size={14}/></button>}
                  {canDelete && <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"><Trash2 size={14}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Bottom Action Bar */}
      <div className="bg-[#f8f9fa] border-t border-gray-200 p-4 flex flex-wrap items-center gap-2 shrink-0">
        {canEdit && (
        <button 
          onClick={() => { 
            const empRole = roles.find(r => r.name === 'EMPLOYEE' || r.name === '一般員工');
            setEditingId(null); setForm({...initialForm, roleId: empRole ? empRole.id : null}); setShowModal(true); 
          }}
          className="bg-[#1e40af] text-white px-5 py-2 rounded text-sm font-black shadow hover:bg-blue-800 transition-all"
        >
          新增(F2)
        </button>
        )}
        <button 
          onClick={handlePrint}
          className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm font-bold hover:bg-gray-50 transition-all"
        >
          列印畫面
        </button>
        {canEdit && (
        <button 
          onClick={() => {
            if (selectedIds.length !== 1) return addToast('請選擇一筆職員資料進行編輯', 'warning');
            const emp = employees.find(e => e.id === selectedIds[0]);
            handleEdit(emp);
          }}
          className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm font-bold hover:bg-gray-50 transition-all"
        >
          編輯
        </button>
        )}
        {canDelete && (
          <>
            <button 
              onClick={handleDeleteSelected}
              className="bg-white border border-gray-300 text-gray-400 px-4 py-2 rounded text-sm font-bold hover:bg-gray-50 transition-all"
            >
              徹底刪除
            </button>
          </>
        )}
        <button 
          onClick={exportToExcel}
          className="bg-white border border-gray-300 text-emerald-700 px-4 py-2 rounded text-sm font-bold hover:bg-emerald-50 transition-all"
        >
          Excel
        </button>
      </div>

      </>
      ) : (
        /* Metadata Management View */
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          <div className="p-6 flex justify-between items-center bg-white border-b border-gray-200">
            <div>
              <h2 className="text-xl font-black text-gray-800">基礎資料管理</h2>
              <p className="text-xs text-gray-400 mt-1 font-bold">自定義部門、職稱與雇用類型下拉選單內容</p>
            </div>
            {canEdit && (
            <button 
              onClick={() => { setEditingMetadata(null); setMetadataForm({ type: 'DEPARTMENT', label: '', value: '' }); setShowMetadataModal(true); }}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> 新增項目
            </button>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {['DEPARTMENT', 'POSITION', 'EMPLOYMENT_TYPE'].map(type => (
              <div key={type} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    {type === 'DEPARTMENT' ? '🏢 部門清單' : type === 'POSITION' ? '👔 職稱清單' : '📄 雇用類型'}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px] font-mono text-gray-400">
                    {metadata.filter(m => m.type === type).length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {metadata.filter(m => m.type === type).map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-all group border border-transparent hover:border-gray-100">
                      <div>
                        <div className="text-sm font-bold text-gray-700">{item.label}</div>
                        <div className="text-[10px] font-mono text-gray-300">{item.value}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {canEdit && <button onClick={() => { setEditingMetadata(item); setMetadataForm(item); setShowMetadataModal(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600"><Edit2 size={14}/></button>}
                        {canDelete && <button onClick={() => handleDeleteMetadata(item.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>}
                      </div>
                    </div>
                  ))}
                  {metadata.filter(m => m.type === type).length === 0 && (
                    <div className="py-20 text-center text-gray-300 italic text-xs">尚無設定</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata Edit Modal */}
      {showMetadataModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-300 overflow-hidden border border-gray-200">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
              <h3 className="text-lg font-black">{editingMetadata ? '編輯選項' : '新增基礎資料'}</h3>
              <button onClick={() => setShowMetadataModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleMetadataSubmit} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">項目類別</label>
                <select 
                  value={metadataForm.type} 
                  onChange={e => setMetadataForm({...metadataForm, type: e.target.value})}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-indigo-400 outline-none transition-all"
                >
                  <option value="DEPARTMENT">部門名稱</option>
                  <option value="POSITION">職稱</option>
                  <option value="EMPLOYMENT_TYPE">雇用類型</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">顯示名稱 (Label)</label>
                <input 
                  required
                  value={metadataForm.label} 
                  onChange={e => setMetadataForm({...metadataForm, label: e.target.value, value: metadataForm.value || e.target.value})}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-indigo-400 outline-none transition-all"
                  placeholder="如: 行政部"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">數值代碼 (Value/Key)</label>
                <input 
                  required
                  value={metadataForm.value} 
                  onChange={e => setMetadataForm({...metadataForm, value: e.target.value})}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-indigo-400 outline-none transition-all font-mono"
                  placeholder="如: ADMIN_DEPT"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">儲存變更</button>
                <button type="button" onClick={() => setShowMetadataModal(false)} className="px-6 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">取消</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-[#1e40af] px-6 py-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-white rounded-full" />
                <h2 className="text-lg font-black tracking-tight">{editingId ? `職員編輯: ${form.name}` : '職員新增'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/20 p-1 rounded transition-all"><X size={20}/></button>
            </div>

            {/* Modal Tabs */}
            <div className="flex bg-[#f8f9fa] border-b border-gray-200 shrink-0 overflow-x-auto no-scrollbar">
              {[
                { id: 'personal', label: '基本資料' },
                { id: 'employment', label: '職務資訊' },
                { id: 'payroll', label: '薪資支付', specificPerm: 'canManagePayroll' },
                { id: 'other', label: '其他設定' },
                { id: 'account', label: '帳號權限', specificPerm: 'canManageRole' }
              ].filter(tab => !tab.specificPerm || hasPermission('EMP', tab.specificPerm)).map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveModalTab(tab.id)}
                  className={`px-6 py-3 text-xs font-black transition-all border-r border-gray-200 ${activeModalTab === tab.id ? 'bg-white text-[#1e40af] border-b-2 border-b-[#1e40af]' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <form id="empForm" onSubmit={handleSubmit} className="space-y-8">
                {activeModalTab === 'personal' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">職員代碼 *</label>
                        <input type="text" required value={form.code} onChange={e=>setForm({...form, code: e.target.value, username: form.username === form.code ? e.target.value : form.username})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">姓名 *</label>
                        <input type="text" required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">性別</label>
                        <select value={form.gender} onChange={e=>setForm({...form, gender: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none">
                          <option value="男">男</option>
                          <option value="女">女</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">身分證字號</label>
                        <input type="text" value={form.id_number} onChange={e=>setForm({...form, id_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">出生日期</label>
                        <input type="date" value={form.birthday} onChange={e=>setForm({...form, birthday: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">手機號碼</label>
                        <input type="text" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">常用 Email</label>
                        <input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">支付對象(匯款銀行代碼)</label>
                        <input type="text" value={form.bank_code} onChange={e=>setForm({...form, bank_code: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">銀行帳號</label>
                        <input type="text" value={form.bank_account} onChange={e=>setForm({...form, bank_account: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <h4 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">🆘 緊急聯絡資訊</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400">姓名</span>
                          <input value={form.emergency_contact} onChange={e=>setForm({...form, emergency_contact: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs outline-none" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400">關係</span>
                          <input value={form.emergency_relationship} onChange={e=>setForm({...form, emergency_relationship: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs outline-none" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400">電話</span>
                          <input value={form.emergency_phone} onChange={e=>setForm({...form, emergency_phone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === 'employment' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">部門名稱</label>
                        <select value={form.department} onChange={e=>setForm({...form, department: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                          <option value="">-- 未選擇 --</option>
                          {metadata.filter(m => m.type === 'DEPARTMENT').map(m => (
                            <option key={m.id} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">職稱</label>
                        <select value={form.position} onChange={e=>setForm({...form, position: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                          <option value="">-- 未選擇 --</option>
                          {metadata.filter(m => m.type === 'POSITION').map(m => (
                            <option key={m.id} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">對應班別</label>
                        <select value={form.workShiftId} onChange={e=>setForm({...form, workShiftId: parseInt(e.target.value) || ''})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                          <option value="">-- 未設定 --</option>
                          {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.work_start}-{s.work_end})</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">雇用類型</label>
                        <select value={form.employment_type} onChange={e=>setForm({...form, employment_type: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 outline-none">
                          <option value="">-- 未選擇 --</option>
                          {metadata.filter(m => m.type === 'EMPLOYMENT_TYPE').map(m => (
                            <option key={m.id} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">報到日期</label>
                        <input type="date" value={form.join_date} onChange={e=>setForm({...form, join_date: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">預計轉正日期</label>
                        <input type="date" value={form.probation_date} onChange={e=>setForm({...form, probation_date: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-red-500">離職生效日 (到期自動生效)</label>
                        <div className="flex gap-2">
                          <input type="date" value={form.resign_date} onChange={e=>setForm({...form, resign_date: e.target.value})} className="flex-1 border border-red-200 rounded px-3 py-2 text-sm bg-red-50/10 focus:border-red-500 outline-none" />
                          {form.resign_date && (
                            <button 
                              type="button" 
                              onClick={() => {
                                if (window.confirm('確定要取消此員工的離職設定嗎？')) {
                                  setForm({...form, resign_date: '', status: 'ACTIVE'});
                                }
                              }}
                              className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-xs font-bold hover:bg-gray-200 transition-all shrink-0"
                            >
                              取消離職
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === 'payroll' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-[#1e40af]">基本薪資</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                          <input type="number" value={form.base_salary} onChange={e=>setForm({...form, base_salary: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full border border-blue-200 bg-blue-50/10 rounded pl-8 pr-3 py-2 text-lg font-black text-blue-700 outline-none focus:border-blue-500" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-emerald-700">全勤獎金</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                          <input type="number" value={form.full_attendance_bonus} onChange={e=>setForm({...form, full_attendance_bonus: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full border border-emerald-200 bg-emerald-50/10 rounded pl-8 pr-3 py-2 text-base font-bold text-emerald-700 outline-none focus:border-emerald-500" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-purple-700">生產獎金</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                          <input type="number" value={form.production_bonus} onChange={e=>setForm({...form, production_bonus: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full border border-purple-200 bg-purple-50/10 rounded pl-8 pr-3 py-2 text-base font-bold text-purple-700 outline-none focus:border-purple-500" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-fuchsia-700">績效獎金</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                          <input type="number" value={form.performance_bonus} onChange={e=>setForm({...form, performance_bonus: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full border border-fuchsia-200 bg-fuchsia-50/10 rounded pl-8 pr-3 py-2 text-base font-bold text-fuchsia-700 outline-none focus:border-fuchsia-500" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-orange-700">伙食津貼</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                          <input type="number" value={form.meal_allowance} onChange={e=>setForm({...form, meal_allowance: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full border border-orange-200 bg-orange-50/10 rounded pl-8 pr-3 py-2 text-base font-bold text-orange-700 outline-none focus:border-orange-500" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-rose-700">三節獎金</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                          <input type="number" value={form.festival_bonus} onChange={e=>setForm({...form, festival_bonus: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full border border-rose-200 bg-rose-50/10 rounded pl-8 pr-3 py-2 text-base font-bold text-rose-700 outline-none focus:border-rose-500" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl space-y-4">
                      <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">🛡️ 個人化保險設定</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-indigo-600">勞退個人自提比例 (%)</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min="0" 
                              max="6" 
                              step="1"
                              value={form.pension_rate} 
                              onChange={e=>setForm({...form, pension_rate: e.target.value === '' ? '' : parseFloat(e.target.value)})} 
                              className="w-full border border-indigo-200 rounded px-3 py-2 text-sm font-bold text-indigo-700 outline-none focus:border-indigo-500" 
                            />
                            <span className="text-xs font-bold text-indigo-400">%</span>
                          </div>
                          <p className="text-[10px] text-indigo-400 font-bold">* 範圍: 0% - 6%</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-indigo-600">健保隨同投保眷屬人數</label>
                          <select 
                            value={form.health_dependents} 
                            onChange={e=>setForm({...form, health_dependents: parseInt(e.target.value) || 0})} 
                            className="w-full border border-indigo-200 rounded px-3 py-2 text-sm font-bold text-indigo-700 outline-none focus:border-indigo-500"
                          >
                            <option value={0}>0 人 (僅本人)</option>
                            <option value={1}>1 人</option>
                            <option value={2}>2 人</option>
                            <option value={3}>3 人 (含以上)</option>
                          </select>
                          <p className="text-[10px] text-indigo-400 font-bold">* 最高計算至 3 人</p>
                        </div>
                      </div>
                    </div>

                    {/* 動態顯示自訂項目 */}
                    {(() => {
                      const customFields = [
                        { field: 'custom_1' }, { field: 'custom_2' }, { field: 'custom_3' },
                        { field: 'custom_4' }, { field: 'custom_5' }, { field: 'custom_6' }
                      ];
                      
                      const activeCustomFields = customFields.map(f => {
                        const item = payrollItems.find(pi => pi.formula_expr === `{${f.field}}`);
                        return item ? { ...f, label: item.name } : null;
                      }).filter(Boolean);

                      if (activeCustomFields.length === 0) {
                        return (
                          <div className="bg-gray-50 border border-dashed border-gray-300 p-5 rounded-xl">
                            <p className="text-xs text-gray-500 font-bold leading-relaxed">
                              💡 <span className="text-indigo-600">提示：</span>若需要為特定員工建立專屬的特殊加扣款（例如：職務津貼），請先至左側選單的【薪資項目設定】中新增項目，並使用 <code className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded">{"{custom_1}"}</code> 等自訂變數。設定完成後，這裡就會自動生出對應的輸入框供您直接填寫金額！
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl space-y-4">
                          <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">✨ 員工專屬特殊薪資項目</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeCustomFields.map(cf => (
                              <div key={cf.field} className="space-y-1.5">
                                <label className="text-xs font-black text-amber-700">{cf.label}</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                  <input 
                                    type="number" 
                                    value={form[cf.field] !== undefined ? form[cf.field] : ''} 
                                    onChange={e=>setForm({...form, [cf.field]: e.target.value === '' ? '' : parseFloat(e.target.value)})} 
                                    className="w-full border border-amber-200 bg-white text-amber-900 rounded pl-8 pr-3 py-2 text-base font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="border border-gray-200 rounded p-6 bg-gray-50/50 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">⚙️ 薪資細項覆寫 (特定人員調整)</h4>
                        <button type="button" onClick={() => setForm({...form, overrides: [...form.overrides, { payrollItemId: '', custom_amount: 0 }]})} className="bg-[#1e40af] text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-blue-800 transition-all">+ 新增覆寫</button>
                      </div>
                      <div className="space-y-2">
                        {form.overrides.map((ov, idx) => (
                          <div key={idx} className="flex gap-2 bg-white p-2 border border-gray-200 rounded items-center">
                            <select value={ov.payrollItemId} onChange={e=> {
                              const newOv = [...form.overrides];
                              newOv[idx].payrollItemId = parseInt(e.target.value);
                              setForm({...form, overrides: newOv});
                            }} className="flex-1 bg-transparent border-none text-xs font-bold focus:ring-0">
                              <option value="">選擇項目</option>
                              {payrollItems.map(pi => <option key={pi.id} value={pi.id}>{pi.name} ({pi.type})</option>)}
                            </select>
                            <input type="number" value={ov.custom_amount} onChange={e=> {
                              const newOv = [...form.overrides];
                              newOv[idx].custom_amount = e.target.value === '' ? '' : parseFloat(e.target.value);
                              setForm({...form, overrides: newOv});
                            }} className="w-24 border border-gray-300 rounded px-2 py-1 text-right text-xs font-black text-blue-600" />
                            <button type="button" onClick={() => setForm({...form, overrides: form.overrides.filter((_, i) => i !== idx)})} className="p-1 text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                          </div>
                        ))}
                        {form.overrides.length === 0 && <p className="text-center py-2 text-[10px] text-gray-300 italic">無特殊調整項目</p>}
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === 'other' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="border border-gray-200 rounded p-6 bg-white shadow-sm space-y-6">
                      <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest border-b pb-2">備註與自定義欄位</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <div key={i} className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase">備註欄位 {i}</label>
                            <input 
                              type="text" 
                              value={form[`custom_field${i}`] || ''} 
                              onChange={e => setForm({...form, [`custom_field${i}`]: e.target.value})} 
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500"
                              placeholder={`請輸入...`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === 'account' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">系統登入帳號</label>
                        <input type="text" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-500">設定密碼</label>
                        <input type="password" placeholder="留空則不修改" value={form.password || ''} onChange={e=>setForm({...form, password: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-black text-gray-500">角色權限類別</label>
                        <select
                          value={form.roleId ?? ''}
                          onChange={e => {
                            const matched = roles.find(r => String(r.id) === e.target.value);
                            setForm({ ...form, roleId: matched ? matched.id : null });
                          }}
                          className="w-full border border-gray-200 bg-indigo-50/30 rounded px-3 py-2.5 text-sm font-bold focus:border-indigo-500 outline-none"
                        >
                          <option value="">— 請選擇系統職務角色 —</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} {r.description ? `(${r.description})` : ''}
                            </option>
                          ))}
                        </select>
                        {form.roleId && (
                          <p className="text-[10px] text-indigo-500 mt-1">
                            ✦ 細項權限可至「角色與權限管理」頁面調整
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#f8f9fa] border-t border-gray-200 p-4 flex justify-end gap-2 shrink-0">
              <button 
                type="submit" 
                form="empForm"
                className="bg-[#1e40af] text-white px-8 py-2 rounded text-sm font-black shadow hover:bg-blue-800 transition-all"
              >
                儲存(F2)
              </button>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="bg-white border border-gray-300 text-gray-600 px-8 py-2 rounded text-sm font-bold hover:bg-gray-50 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
