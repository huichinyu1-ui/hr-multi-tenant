import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Save, Trash2, X, AlertCircle, ShieldCheck, Tag, List, Calculator, Calendar } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { usePermission } from '../contexts/PermissionContext';

export default function LeaveTypes() {
  const { addToast } = useToast();
  const { hasPermission, isAdmin } = usePermission();
  const [types, setTypes] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const initialForm = { 
    id: null, 
    code: '', 
    name: '', 
    is_paid: true, 
    deduction_ratio: 1.0, 
    deduction_base: '{base_salary}',
    quota_type: 'UNLIMITED',
    default_days: 0,
    seniority_rules: [],
    note: '' 
  };
  const [form, setForm] = useState(initialForm);
  const baseInputRef = useRef(null);

  const canManage = hasPermission('LEAVE', 'canEdit') || isAdmin;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leaves/types');
      setTypes(res.data);
    } catch (e) { 
      console.error(e); 
    } finally {
      setLoading(false);
    }
  };

  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return addToast('權限不足', 'error');
    
    try {
      const payload = {
        ...form,
        seniority_rules: form.quota_type === 'SENIORITY' ? JSON.stringify(form.seniority_rules) : null
      };

      if (form.id) await api.put(`/leaves/types/${form.id}`, payload);
      else await api.post('/leaves/types', payload);
      
      setForm(initialForm);
      setShowCreateForm(false);
      setExpandedId(null);
      addToast('儲存成功', 'success');
      fetchData();
    } catch (e) { addToast('儲存失敗', 'error'); }
  };

  const handleDeleteType = async (id) => {
    if (!canManage) return addToast('權限不足', 'error');
    if (!window.confirm('確定要刪除這個假別嗎？這可能會影響相關的薪資計算。')) return;
    
    try {
      await api.delete(`/leaves/types/${id}`);
      addToast('已刪除假別', 'info');
      fetchData();
    } catch (e) { addToast('刪除失敗', 'error'); }
  };

  const handleAutoCalcQuotas = async () => {
    if (!window.confirm('即將根據現有員工年資，自動重新派發當年度額度。若已手動修改過的額度將被覆蓋，確定執行嗎？')) return;
    try {
      await api.post('/leaves/quotas/auto', { year: new Date().getFullYear() });
      addToast('年度額度自動試算完成！', 'success');
    } catch (e) {
      addToast('試算失敗', 'error');
    }
  };

  const insertVariable = (varStr) => {
    const input = baseInputRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const currentVal = form.deduction_base || '';
    const newVal = currentVal.substring(0, start) + varStr + currentVal.substring(end);
    setForm({ ...form, deduction_base: newVal });
    
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + varStr.length, start + varStr.length);
    }, 10);
  };

  const addSeniorityRule = () => {
    const rules = [...form.seniority_rules];
    rules.push({ months: 0, days: 0 });
    setForm({...form, seniority_rules: rules});
  };

  const updateSeniorityRule = (index, field, value) => {
    const rules = [...form.seniority_rules];
    rules[index][field] = parseFloat(value) || 0;
    setForm({...form, seniority_rules: rules});
  };

  const removeSeniorityRule = (index) => {
    const rules = [...form.seniority_rules];
    rules.splice(index, 1);
    setForm({...form, seniority_rules: rules});
  };

  const openForm = (type = null) => {
    if (type) {
      setForm({
        ...type,
        seniority_rules: type.seniority_rules ? JSON.parse(type.seniority_rules) : []
      });
      setExpandedId(type.id);
      setShowCreateForm(false);
    } else {
      setForm({
        ...initialForm,
        seniority_rules: [
          { months: 6, days: 3 },
          { months: 12, days: 7 },
          { months: 24, days: 10 },
          { months: 36, days: 14 }
        ]
      });
      setExpandedId(null);
      setShowCreateForm(true);
    }
  };

  const variables = [
    { label: '本薪', value: '{base_salary}' },
    { label: '全勤獎金', value: '{full_attendance_bonus}' },
    { label: '生產獎金', value: '{production_bonus}' },
    { label: '績效獎金', value: '{performance_bonus}' },
    { label: '伙食津貼', value: '{meal_allowance}' },
    { label: '三節獎金', value: '{festival_bonus}' },
    { label: '自訂 1', value: '{custom_1}' },
    { label: '自訂 2', value: '{custom_2}' },
    { label: '自訂 3', value: '{custom_3}' },
    { label: '自訂 4', value: '{custom_4}' },
    { label: '自訂 5', value: '{custom_5}' },
    { label: '自訂 6', value: '{custom_6}' }
  ];

  const renderForm = () => (
    <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 左半：基本與扣款設定 */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-indigo-600 mb-4 flex items-center gap-2"><Tag size={16}/> 1. 基本資訊</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">假別名稱</label>
              <input required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-bold focus:border-indigo-400 outline-none transition-all shadow-sm" placeholder="如: 特休、事假" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">系統代碼 (大寫英文)</label>
              <input required disabled={form.id !== null} value={form.code} onChange={e=>setForm({...form, code: e.target.value.toUpperCase()})} className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-bold focus:border-indigo-400 outline-none transition-all shadow-sm font-mono disabled:opacity-50 disabled:bg-gray-100" placeholder="如: ANN, SICK" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">備註說明</label>
              <input value={form.note || ''} onChange={e=>setForm({...form, note: e.target.value})} className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-bold focus:border-indigo-400 outline-none transition-all shadow-sm" placeholder="例如：需附相關證明" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-black text-indigo-600 mb-4 flex items-center gap-2"><Calculator size={16}/> 2. 扣薪與計算引擎</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">薪資扣款係數 (0~1)</label>
                <div className="flex items-center gap-3">
                  <input type="number" step="0.1" max="1" min="0" required value={form.deduction_ratio} onChange={e=>setForm({...form, deduction_ratio: parseFloat(e.target.value)})} className="w-32 border border-indigo-100 bg-indigo-50/30 rounded-xl px-4 py-2 text-sm font-black text-indigo-700 focus:bg-white focus:border-indigo-400 outline-none transition-all shadow-sm" />
                  <span className="text-xs font-bold text-gray-500">
                    {form.deduction_ratio === 0 ? '不扣薪 (0%)' : form.deduction_ratio === 1 ? '全額扣薪 (100%)' : `扣薪 ${Math.round(form.deduction_ratio * 100)}%`}
                  </span>
                </div>
              </div>

              {form.deduction_ratio > 0 && (
                <div className="space-y-1.5 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex justify-between">
                    扣款基準公式
                    <span className="text-[9px] text-gray-400">系統將以此公式 ÷ 240 × 時數 × 係數</span>
                  </label>
                  <input 
                    ref={baseInputRef}
                    required 
                    value={form.deduction_base || ''} 
                    onChange={e=>setForm({...form, deduction_base: e.target.value})} 
                    className="w-full border border-indigo-200 bg-white rounded-xl px-4 py-2 text-sm font-mono focus:border-indigo-500 outline-none transition-all shadow-inner text-indigo-700" 
                    placeholder="請輸入計算公式，例如: {base_salary} + {custom_1}" 
                  />
                  <p className="text-[10px] text-indigo-500 font-bold mt-1.5 ml-1">
                    💡 提示：點擊按鈕插入變數後，若有多個變數請手動輸入 <kbd className="bg-indigo-100 px-1 rounded">+</kbd> 號相加。
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {variables.map((v, i) => (
                      <button key={i} type="button" onClick={()=>insertVariable(v.value)} className="px-2 py-1 bg-white border border-indigo-100 rounded text-[10px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95">
                        +{v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右半：額度設定 */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-indigo-600 mb-4 flex items-center gap-2"><Calendar size={16}/> 3. 年度額度核發設定</h3>
          
          <div className="flex gap-2 mb-4 p-1 bg-gray-200/50 rounded-xl w-fit">
            <button type="button" onClick={()=>setForm({...form, quota_type: 'FIXED'})} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${form.quota_type === 'FIXED' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>固定天數</button>
            <button type="button" onClick={()=>setForm({...form, quota_type: 'SENIORITY'})} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${form.quota_type === 'SENIORITY' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>依年資核發</button>
            <button type="button" onClick={()=>setForm({...form, quota_type: 'UNLIMITED'})} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${form.quota_type === 'UNLIMITED' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>無限制(按次申請)</button>
          </div>

          {form.quota_type === 'FIXED' && (
            <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-300">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">每年預設給予天數</label>
              <div className="flex items-center gap-3">
                <input type="number" step="0.5" min="0" required value={form.default_days} onChange={e=>setForm({...form, default_days: e.target.value})} className="w-32 border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-400 outline-none shadow-sm" />
                <span className="text-sm font-bold text-gray-500">天</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-bold leading-relaxed">每年或員工到職時，系統將自動派發此固定額度 (例如病假30天)。</p>
            </div>
          )}

          {form.quota_type === 'SENIORITY' && (
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center">
                <p className="text-sm font-black text-sky-800">📊 年資級距表</p>
                <button type="button" onClick={addSeniorityRule} className="text-[10px] bg-sky-600 text-white px-2 py-1 rounded border border-sky-700 font-bold hover:bg-sky-700 transition-all">+ 新增級距</button>
              </div>
              <p className="text-[10px] text-sky-700 font-bold leading-relaxed">
                系統將根據員工到職日自動換算年資，並依此表核發對應天數。可自由修改以優於勞基法。
              </p>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {form.seniority_rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-sky-100 shadow-sm">
                    <span className="text-xs font-bold text-gray-500">滿</span>
                    <input type="number" min="0" value={rule.months} onChange={e=>updateSeniorityRule(idx, 'months', e.target.value)} className="w-16 border border-gray-200 rounded text-sm px-2 py-1 text-center font-mono outline-none focus:border-sky-500" />
                    <span className="text-xs font-bold text-gray-500">個月, 給</span>
                    <input type="number" min="0" step="0.5" value={rule.days} onChange={e=>updateSeniorityRule(idx, 'days', e.target.value)} className="w-16 border border-gray-200 rounded text-sm px-2 py-1 text-center font-mono outline-none focus:border-sky-500" />
                    <span className="text-xs font-bold text-gray-500">天</span>
                    <button type="button" onClick={() => removeSeniorityRule(idx)} className="ml-auto text-rose-400 hover:text-rose-600 p-1"><Trash2 size={14}/></button>
                  </div>
                ))}
                {form.seniority_rules.length === 0 && <div className="text-center text-xs text-sky-600 py-4 opacity-50 font-bold">請新增至少一個級距</div>}
              </div>
            </div>
          )}
          
          {form.quota_type === 'UNLIMITED' && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 animate-in fade-in zoom-in-95 duration-300">
               <p className="text-sm font-black text-gray-600">不限制年度額度</p>
               <p className="text-[10px] text-gray-400 font-bold mt-1">此假別（如公假、喪假）不需事前派發額度，由員工檢附證明直接申請，系統僅紀錄時數供薪資結算使用。</p>
            </div>
          )}

          <div className="pt-6 flex gap-3 border-t border-gray-200">
            <button type="button" onClick={handleTypeSubmit} className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-black hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
              <Save size={18} /> {form.id ? '儲存變更' : '建立假別'}
            </button>
            <button type="button" onClick={() => { setExpandedId(null); setShowCreateForm(false); }} className="px-6 bg-white border border-gray-300 text-gray-600 py-3 rounded-xl text-sm font-black hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
              <X size={18} /> 取消
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-2xl shadow-inner">
            <Settings size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">假別與額度引擎設定</h1>
            <p className="text-sm text-gray-400 font-bold mt-1 italic">定義各項假別及其對應的扣薪公式、並管理全自動年度給假機制。</p>
          </div>
        </div>
        <div className="flex gap-3">
          {canManage && (
            <button onClick={handleAutoCalcQuotas} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-3 rounded-2xl font-black text-sm hover:bg-emerald-100 transition-all flex items-center gap-2">
              <Calculator size={20} /> 自動試算今年額度
            </button>
          )}
          {canManage && !showCreateForm && (
            <button onClick={() => openForm(null)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
              <Plus size={20} /> 新增假別規則
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {showCreateForm && (
          <div className="bg-indigo-600 px-8 py-4 text-white flex justify-between items-center shadow-inner">
            <h3 className="font-black flex items-center gap-2 text-lg">
              <ShieldCheck size={20}/> 定義新假別規則
            </h3>
          </div>
        )}
        {showCreateForm && renderForm()}

        {/* List View */}
        <div className="divide-y divide-gray-100">
          {types.map(type => (
            <div key={type.id} className="group">
              <div 
                className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${expandedId === type.id ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                onClick={() => expandedId === type.id ? setExpandedId(null) : openForm(type)}
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                    {type.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-black text-gray-800">{type.name}</h3>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md uppercase font-bold tracking-widest">{type.code}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <span>扣款比例: {Math.round(type.deduction_ratio * 100)}%</span>
                      <span className="text-gray-300">|</span>
                      <span>
                        額度發放: {type.quota_type === 'FIXED' ? `固定 ${type.default_days} 天` : type.quota_type === 'SENIORITY' ? '依年資發放' : '無限制申請'}
                      </span>
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteType(type.id); }} 
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </div>
                )}
              </div>
              
              {expandedId === type.id && renderForm()}
            </div>
          ))}
          
          {!loading && types.length === 0 && !showCreateForm && (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <AlertCircle size={48} className="mb-4 opacity-20"/>
              <p className="font-black text-lg">尚未定義任何假別</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
