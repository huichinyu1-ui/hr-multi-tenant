import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, HeartPulse, Wallet, Save, Plus, Trash2, 
  RefreshCw, AlertCircle, Info, Calculator, Users, CheckCircle2, Search, X,
  Upload, FileSpreadsheet, ChevronDown, Clock, Star
} from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';

export default function InsuranceGrades() {
  const { addToast } = useToast();
  const [mainTab, setMainTab] = useState('GRADES'); // GRADES, POLICIES
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Grade Table States
  const [activeType, setActiveType] = useState('LABOR'); 
  const [grades, setGrades] = useState([]);

  // Policy States
  const [policies, setPolicies] = useState([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState(null);
  
  // Assignment States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Version Management States (新版本管理)
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [appliedVersion, setAppliedVersion] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    name: '', year: new Date().getFullYear(),
    labor_total: 12.5, labor_emp: 20, labor_empr: 70,
    health_total: 5.17, health_emp: 30, health_empr: 60,
    pension_emp: 0, pension_empr: 6
  });
  const fileInputRef = useRef(null);

  // 產生新年度 states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    year: new Date().getFullYear() + 1,
    minWage: '',
    labor_total: 12.5, labor_emp: 20,
    health_total: 5.17, health_emp: 30,
    pension_empr: 6
  });

  // 舊的 Preset States (保留相容性，但改為從版本讀取)
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');

  const [globalRates, setGlobalRates] = useState({
    labor: { total: 12.0, employee: 20, employer: 70 },
    health: { total: 5.17, employee: 30, employer: 60 },
    pension: { employee: 0, employer: 6 }
  });
  const [basisFormula, setBasisFormula] = useState('{base}');
  const [payrollItems, setPayrollItems] = useState([]);
  const [showRateSettings, setShowRateSettings] = useState(false);

  useEffect(() => {
    if (mainTab === 'GRADES') {
      const initGradesTab = async () => {
        // 載入版本列表（新系統）
        const versionsRes = await api.get('/insurance-versions').catch(() => ({ data: [] }));
        setVersions(versionsRes.data);

        // 從 Metadata 讀取上次套用的版本
        const metaRes = await api.get('/metadata?type=SYSTEM_SETTING').catch(() => ({ data: [] }));
        const appliedVersionId = metaRes.data.find(s => s.label === 'applied_insurance_version_id');
        const appliedPresetName = metaRes.data.find(s => s.label === 'applied_insurance_preset');

        if (appliedVersionId) {
          setSelectedVersionId(parseInt(appliedVersionId.value));
        } else if (versionsRes.data.length > 0) {
          setSelectedVersionId(versionsRes.data[0].id);
        }
        if (appliedPresetName) setAppliedVersion(appliedPresetName.value);

        // 讀取全域費率
        const laborRate   = metaRes.data.find(s => s.label === 'global_labor_rate');
        const healthRate  = metaRes.data.find(s => s.label === 'global_health_rate');
        const pensionRate = metaRes.data.find(s => s.label === 'global_pension_rate');
        if (laborRate || healthRate || pensionRate) {
          setGlobalRates(prev => ({
            labor:   laborRate   ? JSON.parse(laborRate.value)   : prev.labor,
            health:  healthRate  ? JSON.parse(healthRate.value)  : prev.health,
            pension: pensionRate ? JSON.parse(pensionRate.value) : prev.pension,
          }));
        }
        const basisFound = metaRes.data.find(s => s.label === 'insurance_basis_formula');
        if (basisFound) setBasisFormula(basisFound.value);

        fetchGrades();
        fetchPayrollItems();
      };
      initGradesTab();
    } else {
      fetchPolicies();
    }
  }, [mainTab, activeType]);

  const fetchPayrollItems = async () => {
    try {
      const res = await api.get('/items');
      setPayrollItems(res.data.filter(i => i.is_active));
    } catch (e) {
      console.error('Failed to fetch items');
    }
  };

  const fetchBasisFormula = async () => {
    try {
      const res = await api.get('/metadata?type=SYSTEM_SETTING');
      const found = res.data.find(s => s.label === 'insurance_basis_formula');
      if (found) setBasisFormula(found.value);
    } catch (e) {
      console.error('Failed to fetch formula');
    }
  };

  const fetchPresets = async () => {
    try {
      const res = await api.get('/insurance/presets');
      setPresets(res.data);
      // 預設選第一個，但若有記錄上次導入的版本，則優先選它
      if (res.data.length > 0) setSelectedPresetId(res.data[0].id);
    } catch (e) {
      console.error('Failed to fetch presets');
    }
  };

  const fetchAppliedVersion = async () => {
    try {
      const res = await api.get('/metadata?type=SYSTEM_SETTING');
      // 修正：應用 label 欄位查找，並同步更新下拉選單
      const found = res.data.find(s => s.label === 'applied_insurance_preset');
      if (found) {
        setAppliedVersion(found.value);
        // 同步更新下拉選單到上次導入的版本
        const matchPreset = presets.find(p => p.name === found.value);
        if (matchPreset) setSelectedPresetId(matchPreset.id);
      }

      // 同步讀取全域費率設定
      const laborRate = res.data.find(s => s.label === 'global_labor_rate');
      const healthRate = res.data.find(s => s.label === 'global_health_rate');
      const pensionRate = res.data.find(s => s.label === 'global_pension_rate');
      if (laborRate || healthRate || pensionRate) {
        setGlobalRates(prev => ({
          labor:   laborRate   ? JSON.parse(laborRate.value)   : prev.labor,
          health:  healthRate  ? JSON.parse(healthRate.value)  : prev.health,
          pension: pensionRate ? JSON.parse(pensionRate.value) : prev.pension,
        }));
      }
    } catch (e) {
      console.error('Failed to fetch applied version');
    }
  };

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/insurance?type=${activeType}`);
      setGrades(res.data);
    } catch (e) {
      addToast('無法獲獲級距表', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/insurance/policies');
      setPolicies(res.data);
    } catch (e) {
      addToast('無法獲取保險方案', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (e) {
      addToast('無法獲取員工清單', 'error');
    }
  };

  const handleSaveGrades = async () => {
    setSaving(true);
    try {
      await api.post('/insurance/batch', { grades });
      addToast('級距表已成功儲存', 'success');
      fetchGrades();
    } catch (e) {
      addToast('儲存失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (currentPolicy.id) {
        await api.put(`/insurance/policies/${currentPolicy.id}`, currentPolicy);
        addToast('方案已更新', 'success');
      } else {
        await api.post('/insurance/policies', currentPolicy);
        addToast('新方案已建立', 'success');
      }
      setShowPolicyModal(false);
      fetchPolicies();
    } catch (e) {
      addToast('儲存方案失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePolicy = async (id) => {
    if (!window.confirm('確定要刪除此方案嗎？若有員工套用中將無法刪除。')) return;
    try {
      await api.delete(`/insurance/policies/${id}`);
      addToast('方案已刪除', 'success');
      fetchPolicies();
    } catch (e) {
      addToast(e.response?.data?.error || '刪除失敗', 'error');
    }
  };

  const handleAssignPolicy = async () => {
    if (selectedEmployees.length === 0) return addToast('請至少選擇一位員工', 'warning');
    setSaving(true);
    try {
      await api.post('/insurance/policies/assign', {
        policyId: currentPolicy.id,
        employeeIds: selectedEmployees
      });
      addToast('指派成功', 'success');
      setShowAssignModal(false);
      fetchPolicies();
    } catch (e) {
      addToast('指派失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyGlobalRates = async () => {
    if (!window.confirm('這將根據設定的總費率，自動重新計算並更新資料庫中所有級距表的比例，確定執行？')) return;
    setSaving(true);
    try {
      await api.post('/insurance/global-adjust', { globalRates, basisFormula });
      addToast('全域費率與認定基準已更新', 'success');
      fetchGrades();
      setShowRateSettings(false);
    } catch (e) {
      addToast('更新失敗，請檢查網路連線', 'error');
      console.error('[global-adjust error]', e.response?.data || e.message);
    } finally {
      setSaving(false);
    }
  };

  // 套用選定版本
  const handleApplyVersion = async () => {
    if (!selectedVersionId) return;
    const ver = versions.find(v => v.id === selectedVersionId);
    if (!window.confirm(`確定要套用「${ver?.name}」嗎？這將會覆蓋目前的計算用級距表。`)) return;
    setSaving(true);
    try {
      const res = await api.post('/insurance-versions/apply', { versionId: selectedVersionId });
      addToast(res.data.message || '套用成功', 'success');
      setAppliedVersion(ver?.name);
      fetchGrades();
    } catch (e) {
      addToast('套用失敗: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  // 上傳新版本 Excel
  const handleUploadVersion = async () => {
    if (!uploadFile) return addToast('請選擇 Excel 檔案', 'warning');
    if (!uploadForm.name) return addToast('請填寫版本名稱', 'warning');
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', uploadForm.name);
      formData.append('year', uploadForm.year);
      formData.append('rates', JSON.stringify({
        labor_total: uploadForm.labor_total, labor_emp: uploadForm.labor_emp, labor_empr: uploadForm.labor_empr,
        health_total: uploadForm.health_total, health_emp: uploadForm.health_emp, health_empr: uploadForm.health_empr,
        pension_emp: uploadForm.pension_emp, pension_empr: uploadForm.pension_empr
      }));
      const res = await api.post('/insurance-versions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      addToast(res.data.message, 'success');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadForm(prev => ({ ...prev, name: '' }));
      // 重新載入版本列表
      const versionsRes = await api.get('/insurance-versions');
      setVersions(versionsRes.data);
      setSelectedVersionId(res.data.version.id);
    } catch (e) {
      addToast('上傳失敗: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  // 刪除版本
  const handleDeleteVersion = async (id, name) => {
    if (!window.confirm(`確定要刪除版本「${name}」？此操作不可復原。`)) return;
    try {
      await api.delete(`/insurance-versions/${id}`);
      addToast('版本已刪除', 'success');
      const versionsRes = await api.get('/insurance-versions');
      setVersions(versionsRes.data);
      if (selectedVersionId === id && versionsRes.data.length > 0) {
        setSelectedVersionId(versionsRes.data[0].id);
      }
    } catch (e) {
      addToast('刪除失敗', 'error');
    }
  };

  // 舊版相容（保留但改為呼叫新系統）
  const handleImportPreset = handleApplyVersion;

  // 產生新年度版本
  const handleGenerateVersion = async () => {
    if (!generateForm.minWage) return addToast('請輸入新年度基本工資', 'warning');
    setSaving(true);
    try {
      const res = await api.post('/insurance-versions/generate', {
        year: generateForm.year,
        minWage: parseInt(generateForm.minWage),
        sourceVersionId: selectedVersionId || undefined,
        rates: {
          labor_total:  generateForm.labor_total,
          labor_emp:    generateForm.labor_emp,
          labor_empr:   100 - generateForm.labor_emp - 10,
          health_total: generateForm.health_total,
          health_emp:   generateForm.health_emp,
          health_empr:  100 - generateForm.health_emp - 10,
          pension_empr: generateForm.pension_empr,
          pension_emp:  0
        }
      });
      addToast(res.data.message, 'success');
      setShowGenerateModal(false);
      const versionsRes = await api.get('/insurance-versions');
      setVersions(versionsRes.data);
      setSelectedVersionId(res.data.version.id);
    } catch (e) {
      addToast('產生失敗: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleItemInFormula = (code) => {
    const tag = `{${code}}`;
    if (basisFormula.includes(tag)) {
      const newFormula = basisFormula
        .replace(tag, '')
        .replace(/\+\s*\+/g, '+')
        .replace(/^\s*\+\s*/, '')
        .replace(/\s*\+\s*$/, '')
        .trim();
      setBasisFormula(newFormula || '0');
    } else {
      const newFormula = (basisFormula === '0' || !basisFormula) ? tag : `${basisFormula} + ${tag}`;
      setBasisFormula(newFormula);
    }
  };

  const typeInfo = {
    'LABOR': { name: '勞工保險', icon: <ShieldCheck size={24}/>, color: 'indigo' },
    'HEALTH': { name: '全民健保', icon: <HeartPulse size={24}/>, color: 'rose' },
    'PENSION': { name: '勞退提繳', icon: <Wallet size={24}/>, color: 'emerald' }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">
            {mainTab === 'GRADES' ? '保費級距表管理' : '保險方案指派'}
          </h1>
          <p className="text-gray-400 font-bold">
            {mainTab === 'GRADES' 
              ? '設定勞保、健保與勞退的標準分級對照表' 
              : '建立不同的人員保險組合，並批次指派給員工'}
          </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl shrink-0">
          <button
            onClick={() => setMainTab('GRADES')}
            className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${
              mainTab === 'GRADES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            級距設定
          </button>
          <button
            onClick={() => setMainTab('POLICIES')}
            className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${
              mainTab === 'POLICIES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            方案分配
          </button>
        </div>
      </div>

      {mainTab === 'GRADES' ? (
        <>
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex bg-gray-100 p-1.5 rounded-3xl w-full md:w-fit">
              {Object.entries(typeInfo).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-[1.25rem] font-black text-sm transition-all ${
                    activeType === type 
                      ? `bg-white text-${info.color}-600 shadow-sm` 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {info.icon}
                  {info.name}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowRateSettings(!showRateSettings)}
              className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-2xl font-black text-sm text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Calculator size={18} className="text-indigo-500"/>
              全域費率一鍵調整
            </button>
          </div>

          {/* Version Management Panel */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xl shadow-gray-100/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet size={20}/>
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">級距版本管理</h4>
                  <p className="text-xs font-bold text-gray-400">
                    {appliedVersion ? (
                      <span className="text-emerald-600">✅ 套用中：{appliedVersion}</span>
                    ) : '尚未套用任何版本'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                <Upload size={16}/> 上傳新版本
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
              >
                <RefreshCw size={16}/> 產生新年度
              </button>
            </div>

            {/* 版本列表 */}
            <div className="space-y-2">
              {versions.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">尚無版本，請上傳 Excel 或等待系統初始化</p>
              ) : versions.map(v => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVersionId(v.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedVersionId === v.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                      v.source === 'BUILTIN' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {v.source === 'BUILTIN' ? <Star size={14}/> : <Upload size={14}/>}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-400">
                        勞保 {(v.labor_emp_rate * 100).toFixed(3)}% · 健保 {(v.health_emp_rate * 100).toFixed(3)}%
                        · {v._count?.grades || 0} 筆級距
                        {appliedVersion === v.name && <span className="ml-2 text-emerald-600 font-black">● 套用中</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteVersion(v.id, v.name); }}
                      className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {versions.length > 0 && (
              <button
                onClick={handleApplyVersion}
                disabled={saving || !selectedVersionId}
                className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {saving ? '套用中...' : '確認套用選定版本'}
              </button>
            )}
          </div>

          {/* Global Rate Config Panel */}
          {showRateSettings && (
            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white animate-in slide-in-from-top-4 duration-500 shadow-2xl shadow-indigo-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={24}/>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">勞保費率設定</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black opacity-60">總費率 %</label>
                      <input type="number" step="0.1" value={globalRates.labor.total} onChange={e => setGlobalRates({...globalRates, labor: {...globalRates.labor, total: parseFloat(e.target.value)}})} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none font-black text-white focus:bg-white/20"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black opacity-60">自付 %</label>
                      <input type="number" value={globalRates.labor.employee} onChange={e => setGlobalRates({...globalRates, labor: {...globalRates.labor, employee: parseFloat(e.target.value)}})} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none font-black text-white focus:bg-white/20"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black opacity-60">單位 %</label>
                      <input type="number" value={globalRates.labor.employer} onChange={e => setGlobalRates({...globalRates, labor: {...globalRates.labor, employer: parseFloat(e.target.value)}})} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none font-black text-white focus:bg-white/20"/>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 border-l border-white/10 pl-0 md:pl-12">
                  <div className="flex items-center gap-3">
                    <HeartPulse size={24}/>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">健保費率設定</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black opacity-60">總費率 %</label>
                      <input type="number" step="0.01" value={globalRates.health.total} onChange={e => setGlobalRates({...globalRates, health: {...globalRates.health, total: parseFloat(e.target.value)}})} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none font-black text-white focus:bg-white/20"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black opacity-60">自付 %</label>
                      <input type="number" value={globalRates.health.employee} onChange={e => setGlobalRates({...globalRates, health: {...globalRates.health, employee: parseFloat(e.target.value)}})} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none font-black text-white focus:bg-white/20"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black opacity-60">單位 %</label>
                      <input type="number" value={globalRates.health.employer} onChange={e => setGlobalRates({...globalRates, health: {...globalRates.health, employer: parseFloat(e.target.value)}})} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none font-black text-white focus:bg-white/20"/>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-indigo-300 italic">
                    * 單位負擔已包含法規固定係數 (1 + 0.57 平均眷屬)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12 pt-12 border-t border-white/10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Wallet size={24}/>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">勞退提繳設定</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black opacity-60">員工自提 %</label>
                      <input type="number" value={globalRates.pension.employee} onChange={e => setGlobalRates({...globalRates, pension: {...globalRates.pension, employee: parseFloat(e.target.value)}})} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none font-black text-white focus:bg-white/20"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black opacity-60">單位提繳 %</label>
                      <input type="number" value={globalRates.pension.employer} onChange={e => setGlobalRates({...globalRates, pension: {...globalRates.pension, employer: parseFloat(e.target.value)}})} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none font-black text-white focus:bg-white/20"/>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 border-l border-white/10 pl-0 md:pl-12">
                  <div className="flex items-center gap-3">
                    <Calculator size={24}/>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">投保薪資認定基準 (公式)</h3>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black opacity-60 uppercase tracking-widest">請點選要計入投保薪資的項目：</label>
                    
                    <div className="flex flex-wrap gap-2">
                      {/* 底薪固定顯示 */}
                      <button
                        onClick={() => toggleItemInFormula('base_salary')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          basisFormula.includes('{base_salary}') 
                            ? 'bg-white text-indigo-600 shadow-lg scale-105' 
                            : 'bg-white/10 text-white/50 hover:bg-white/20'
                        }`}
                      >
                        {basisFormula.includes('{base_salary}') && <CheckCircle2 size={14} className="inline mr-1"/>}
                        基本薪資 {`{base_salary}`}
                      </button>

                      {/* 動態薪資項目 */}
                      {payrollItems.filter(i => i.code !== 'base').map(item => (
                        <button
                          key={item.id}
                          onClick={() => toggleItemInFormula(item.code)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            basisFormula.includes(`{${item.code}}`) 
                              ? 'bg-white text-indigo-600 shadow-lg scale-105' 
                              : 'bg-white/10 text-white/50 hover:bg-white/20'
                          }`}
                        >
                          {basisFormula.includes(`{${item.code}}`) && <CheckCircle2 size={14} className="inline mr-1"/>}
                          {item.name} {`{${item.code}}`}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 p-4 bg-black/20 rounded-2xl border border-white/10">
                      <label className="text-[9px] font-black opacity-40 uppercase block mb-1">生成的認定公式</label>
                      <code className="text-sm font-black text-indigo-200">{basisFormula || '未選取任何項目'}</code>
                    </div>

                    <p className="text-[10px] font-bold text-indigo-300 italic">
                      * 法規規定：經常性給予之津貼、獎金均須計入。系統將以此總額對照級距表。
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-white/10 flex justify-between items-center">
                <p className="text-xs font-bold text-indigo-200">
                  注意：點擊後將連動更新所有 LABOR, HEALTH, PENSION 級距，請務必確認數值。
                </p>
                <button 
                  onClick={handleApplyGlobalRates}
                  className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-gray-100 transition-all flex items-center gap-2"
                >
                  <Save size={20}/>
                  計算並更新所有級距表
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">級距</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">薪資範圍</th>
                    <th className="px-6 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest">投保薪資</th>
                    <th className="px-6 py-5 text-[10px] font-black text-rose-500 uppercase tracking-widest">員工自付</th>
                    <th className="px-6 py-5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">單位負擔</th>
                    <th className="px-6 py-5 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grades.map((g, idx) => (
                    <tr key={idx} className="group hover:bg-gray-50/30 transition-all">
                      <td className="px-6 py-4 font-black text-gray-400">{g.grade}</td>
                      <td className="px-6 py-4 font-bold text-gray-700">
                        ${g.salary_range_start.toLocaleString()} - ${g.salary_range_end.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-black">
                          ${g.insured_salary.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-rose-600">{(g.employee_ratio * 100).toFixed(2)}%</span>
                          <span className="text-[10px] font-bold text-gray-300">約 ${(g.insured_salary * g.employee_ratio).toFixed(0)} 元</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-emerald-600">{(g.employer_ratio * 100).toFixed(2)}%</span>
                          <span className="text-[10px] font-bold text-gray-300">約 ${(g.insured_salary * g.employer_ratio).toFixed(0)} 元</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="p-2 text-gray-300 hover:text-indigo-600 transition-all"><Info size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            <div className="p-6 bg-gray-50/50 flex justify-between items-center">
              <p className="text-xs font-bold text-gray-400">
                {appliedVersion ? `套用中：${appliedVersion}` : '尚未套用版本'} · {activeType === 'LABOR' ? '勞保' : activeType === 'HEALTH' ? '健保' : '勞退'} 共 {grades.length} 級
              </p>
              <div className="flex gap-4">
                <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md">員工自付</span>
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">單位負擔</span>
                <span className="flex items-center gap-1 text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-1 rounded-md">政府補助 10%</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Policy Cards */}
          {policies.map(policy => (
            <div key={policy.id} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/40 flex flex-col group hover:border-indigo-200 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <ShieldCheck size={24}/>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => { setCurrentPolicy(policy); setShowPolicyModal(true); }} className="p-2 text-gray-400 hover:text-indigo-600"><Save size={16}/></button>
                  <button onClick={() => handleDeletePolicy(policy.id)} className="p-2 text-gray-400 hover:text-rose-500"><Trash2 size={16}/></button>
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">{policy.name}</h3>
              <p className="text-sm font-bold text-gray-400 mb-6 flex-1">{policy.description || '暫無描述'}</p>
              
              <div className="flex flex-wrap gap-2 mb-8">
                {policy.hasLabor && <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black">勞保</span>}
                {policy.hasHealth && <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black">健保</span>}
                {policy.hasPension && <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black">勞退</span>}
                {policy.hasJobIns && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black">就保</span>}
              </div>

              <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400"/>
                  <span className="text-sm font-black text-gray-600">{policy._count?.employees || 0} 人套用</span>
                </div>
                <button 
                  onClick={() => { setCurrentPolicy(policy); fetchEmployees(); setShowAssignModal(true); }}
                  className="text-sm font-black text-indigo-600 hover:underline"
                >
                  指派人員
                </button>
              </div>
            </div>
          ))}

          {/* Add New Policy Card */}
          <button 
            onClick={() => { setCurrentPolicy({ name: '', description: '', hasLabor: true, hasHealth: true, hasPension: true, hasJobIns: true }); setShowPolicyModal(true); }}
            className="bg-gray-50 rounded-[2rem] p-8 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 hover:border-indigo-300 hover:bg-white transition-all group"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-indigo-600 shadow-sm transition-all">
              <Plus size={24}/>
            </div>
            <span className="font-black text-gray-400 group-hover:text-indigo-600">新增保險方案</span>
          </button>
        </div>
      )}

      {/* Policy Edit Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">
              {currentPolicy.id ? '編輯保險方案' : '建立新保險方案'}
            </h2>
            <form onSubmit={handleSavePolicy} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">方案名稱</label>
                <input 
                  required
                  value={currentPolicy.name}
                  onChange={e => setCurrentPolicy({...currentPolicy, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-700 focus:ring-4 focus:ring-indigo-100 outline-none"
                  placeholder="例如：本國全職員工"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">包含項目</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'hasLabor', name: '勞工保險', icon: <ShieldCheck size={16}/> },
                    { key: 'hasHealth', name: '全民健保', icon: <HeartPulse size={16}/> },
                    { key: 'hasPension', name: '勞退提繳', icon: <Wallet size={16}/> },
                    { key: 'hasJobIns', name: '就業保險', icon: <Calculator size={16}/> },
                  ].map(item => (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => setCurrentPolicy({...currentPolicy, [item.key]: !currentPolicy[item.key]})}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                        currentPolicy[item.key] 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                          : 'bg-white border-gray-100 text-gray-400'
                      }`}
                    >
                      {currentPolicy[item.key] ? <CheckCircle2 size={16}/> : item.icon}
                      <span className="font-black text-sm">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">儲存方案</button>
                <button type="button" onClick={() => setShowPolicyModal(false)} className="px-8 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl hover:bg-gray-200">取消</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employees Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl h-[80vh] flex flex-col p-10 animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">指派人員套用方案</h2>
                <p className="text-indigo-600 font-black text-sm mt-1">當前方案：{currentPolicy.name}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl"><X/></button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
              <input 
                placeholder="搜尋姓名、工號或部門..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {employees
                .filter(emp => emp.name.includes(searchTerm) || emp.code.includes(searchTerm) || (emp.department || '').includes(searchTerm))
                .map(emp => {
                  const isSelected = selectedEmployees.includes(emp.id);
                  return (
                    <div 
                      key={emp.id}
                      onClick={() => setSelectedEmployees(isSelected ? selectedEmployees.filter(id => id !== emp.id) : [...selectedEmployees, emp.id])}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {emp.name[0]}
                        </div>
                        <div>
                          <p className={`font-black ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>{emp.name}</p>
                          <p className="text-[10px] font-bold text-gray-400">{emp.code} · {emp.department || '未設定部門'}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="text-indigo-600" size={20}/>}
                    </div>
                  );
                })}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-50 flex gap-4">
              <button 
                onClick={handleAssignPolicy}
                className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                確認套用方案 ({selectedEmployees.length} 人)
              </button>
              <button onClick={() => setShowAssignModal(false)} className="px-8 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl hover:bg-gray-200">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Version Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">上傳級距表版本</h3>
                  <p className="text-sm text-gray-400 mt-1">支援政府官方 Excel (.xlsx) 格式</p>
                </div>
                <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X size={20}/>
                </button>
              </div>

              {/* 版本名稱 & 年份 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-500">版本名稱 *</label>
                  <input
                    type="text" placeholder="例：2026年 政府標準級距"
                    value={uploadForm.name}
                    onChange={e => setUploadForm(p => ({...p, name: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-500">年份</label>
                  <input
                    type="number" value={uploadForm.year}
                    onChange={e => setUploadForm(p => ({...p, year: parseInt(e.target.value)}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* 檔案上傳區 */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) setUploadFile(f); }}
                className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 text-center cursor-pointer hover:bg-indigo-50 transition-colors"
              >
                <input
                  ref={fileInputRef} type="file" accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => setUploadFile(e.target.files[0])}
                />
                <FileSpreadsheet size={40} className="mx-auto text-indigo-300 mb-3"/>
                {uploadFile ? (
                  <div>
                    <p className="font-black text-indigo-600">{uploadFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB · 點擊更換</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-black text-gray-600">拖曳 Excel 檔案到此處，或點擊選擇</p>
                    <p className="text-xs text-gray-400 mt-1">支援 .xlsx / .xls 格式，最大 10MB</p>
                    <p className="text-xs text-indigo-500 mt-2 font-bold">系統將自動識別勞保/健保/勞退級距欄位</p>
                  </div>
                )}
              </div>

              {/* 費率設定 */}
              <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-black text-gray-700">費率設定（此版本專用）</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '勞保總費率 %', key: 'labor_total' },
                    { label: '勞保員工自付 %', key: 'labor_emp' },
                    { label: '勞保雇主負擔 %', key: 'labor_empr' },
                    { label: '健保總費率 %', key: 'health_total' },
                    { label: '健保員工自付 %', key: 'health_emp' },
                    { label: '健保雇主負擔 %', key: 'health_empr' },
                    { label: '勞退員工自提 %', key: 'pension_emp' },
                    { label: '勞退雇主提繳 %', key: 'pension_empr' },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400">{f.label}</label>
                      <input
                        type="number" step="0.01" value={uploadForm[f.key]}
                        onChange={e => setUploadForm(p => ({...p, [f.key]: parseFloat(e.target.value) || 0}))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUploadVersion}
                  disabled={saving || !uploadFile || !uploadForm.name}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  {saving ? '上傳中...' : '確認上傳並儲存版本'}
                </button>
                <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className="px-6 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all">
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate New Year Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">產生新年度版本</h3>
                  <p className="text-sm text-gray-400 mt-1">以目前版本為基礎，只需填入新基本工資與費率</p>
                </div>
                <button onClick={() => setShowGenerateModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20}/></button>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-sm text-emerald-700 font-bold">
                💡 通常每年只有「基本工資（第一級）」改變，費率若政府未公告調整則不需修改
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-500">新年度</label>
                  <input type="number" value={generateForm.year}
                    onChange={e => setGenerateForm(p => ({...p, year: parseInt(e.target.value)}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-500">新基本工資（元）*</label>
                  <input type="number" placeholder="例：30,000" value={generateForm.minWage}
                    onChange={e => setGenerateForm(p => ({...p, minWage: e.target.value}))}
                    className="w-full border-2 border-emerald-400 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-black text-gray-700">費率調整（若政府有公告變動才需修改）</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '勞保總費率 %', key: 'labor_total' },
                    { label: '勞保員工自付 %', key: 'labor_emp' },
                    { label: '健保總費率 %', key: 'health_total' },
                    { label: '健保員工自付 %', key: 'health_emp' },
                    { label: '勞退雇主提繳 %', key: 'pension_empr' },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400">{f.label}</label>
                      <input type="number" step="0.01" value={generateForm[f.key]}
                        onChange={e => setGenerateForm(p => ({...p, [f.key]: parseFloat(e.target.value) || 0}))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">雇主負擔 = 總費率 - 員工自付 - 政府補助10%，系統自動計算</p>
              </div>

              <div className="flex gap-3">
                <button onClick={handleGenerateVersion} disabled={saving || !generateForm.minWage}
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all"
                >
                  {saving ? '產生中...' : '✨ 一鍵產生新年度版本'}
                </button>
                <button onClick={() => setShowGenerateModal(false)} className="px-6 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
