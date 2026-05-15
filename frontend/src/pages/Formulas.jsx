import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Calculator, Plus, Save, Trash2, ChevronDown, ChevronUp, Users, Tag, AlertCircle, X, Settings } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function Formulas() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const initialForm = { 
    id: null, code: '', name: '', type: 'ADDITION', calc_type: 'FIXED', 
    default_amount: '', formula_expr: '', is_global: true, applied_employee_ids: [],
    sort_order: '', note: '' 
  };
  const [form, setForm] = useState(initialForm);
  const [activeVarTab, setActiveVarTab] = useState(0);
  
  const formulaInputRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [iRes, eRes, lRes] = await Promise.all([
        api.get('/items'),
        api.get('/employees'),
        api.get('/leaves/types')
      ]);
      setItems(iRes.data);
      setEmployees(eRes.data);
      setLeaveTypes(lRes.data);
    } catch (e) { console.error(e); }
  };

  const handleToggleExpand = (item) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      setShowCreateForm(false);
      setForm({
        ...item,
        default_amount: item.default_amount || '',
        formula_expr: item.formula_expr || '',
        sort_order: item.sort_order || '',
        note: item.note || '',
        applied_employee_ids: item.applied_employees ? item.applied_employees.map(e => e.id) : []
      });
    }
  };

  const handleOpenCreate = () => {
    setExpandedId(null);
    setShowCreateForm(true);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/items/${form.id}`, form);
        addToast('公式修改成功', 'success');
        setExpandedId(null);
      } else {
        await api.post('/items', form);
        addToast('薪資項目新增成功', 'success');
        setShowCreateForm(false);
      }
      setForm(initialForm);
      fetchData();
    } catch (e) { 
      addToast(e.response?.data?.error || '儲存失敗', 'error'); 
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('確定要刪除此項目嗎？')) return;
    try {
      await api.delete(`/items/${id}`);
      fetchData();
      if (expandedId === id) setExpandedId(null);
      addToast('已刪除', 'info');
    } catch (e) { addToast('刪除失敗', 'error'); }
  };

  const toggleEmployee = (empId) => {
    setForm(prev => {
      const ids = prev.applied_employee_ids;
      if (ids.includes(empId)) return { ...prev, applied_employee_ids: ids.filter(id => id !== empId) };
      return { ...prev, applied_employee_ids: [...ids, empId] };
    });
  };

  const insertVariable = (variable) => {
    const input = formulaInputRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const currentVal = form.formula_expr;
    const newVal = currentVal.substring(0, start) + variable + currentVal.substring(end);
    setForm(prev => ({ ...prev, formula_expr: newVal }));
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const variableGroups = [
    {
      title: '基本薪資結構',
      vars: [
        { label: '基本薪資 {base_salary}', value: '{base_salary}' },
        { label: '全勤獎金 {full_attendance_bonus}', value: '{full_attendance_bonus}' },
        { label: '生產獎金 {production_bonus}', value: '{production_bonus}' },
        { label: '績效獎金 {performance_bonus}', value: '{performance_bonus}' },
        { label: '伙食津貼 {meal_allowance}', value: '{meal_allowance}' },
        { label: '三節獎金 {festival_bonus}', value: '{festival_bonus}' }
      ]
    },
    {
      title: '考勤出缺勤',
      vars: [
        { label: '應出勤時數', value: '{work_hours_count}' },
        { label: '應出勤天數', value: '{work_days_count}' },
        { label: '實到時數', value: '{present_hours}' },
        { label: '實到天數', value: '{present_days}' },
        { label: '曠職時數', value: '{absent_hours}' },
        { label: '曠職次數', value: '{absent_count}' },
        { label: '總有效工時', value: '{work_hours}' }
      ]
    },
    {
      title: '遲到早退與加班',
      vars: [
        { label: '遲到(分鐘)', value: '{late_mins}' },
        { label: '遲到(次數)', value: '{late_days}' },
        { label: '早退(小時)', value: '{early_leave_hours}' },
        { label: '早退(次數)', value: '{early_leave_days}' },
        { label: '1階加班(時)', value: '{overtime1_hours}' },
        { label: '1階加班(次)', value: '{overtime1_count}' },
        { label: '2階加班(時)', value: '{overtime2_hours}' },
        { label: '2階加班(次)', value: '{overtime2_count}' },
        { label: '假日加班(時)', value: '{holiday_overtime_hours}' }
      ]
    },
    {
      title: '法定代扣與保險',
      vars: [
        { label: '勞保費(自付)', value: '{labor_fee}' },
        { label: '健保費(本人)', value: '{health_fee}' },
        { label: '健保費(眷屬)', value: '{dependent_health_fee}' },
        { label: '健保眷屬人數', value: '{health_dependents}' },
        { label: '勞退提繳(自提)', value: '{pension_fee}' },
        { label: '勞退自提比例(%)', value: '{pension_rate}' },
        { label: '投保薪資基準', value: '{insurance_salary}' }
      ]
    },
    {
      title: '員工專屬自訂項',
      vars: [
        { label: '自訂項目 1', value: '{custom_1}' },
        { label: '自訂項目 2', value: '{custom_2}' },
        { label: '自訂項目 3', value: '{custom_3}' },
        { label: '自訂項目 4', value: '{custom_4}' },
        { label: '自訂項目 5', value: '{custom_5}' },
        { label: '自訂項目 6', value: '{custom_6}' }
      ]
    },
    {
      title: '請假相關變數 (由系統代碼產生)',
      vars: leaveTypes.flatMap(lt => [
        { label: `${lt.name}(時)`, value: `{${lt.code.toLowerCase()}_leave_hours}` },
        { label: `${lt.name}(次)`, value: `{${lt.code.toLowerCase()}_leave_count}` },
        { label: `${lt.name}(H1次)`, value: `{${lt.code.toLowerCase()}_leave_count_h1}` },
        { label: `${lt.name}(H2次)`, value: `{${lt.code.toLowerCase()}_leave_count_h2}` }
      ])
    },
    {
      title: '邏輯與數學函數',
      isFunctions: true,
      vars: [
        { label: 'IF 判斷式', value: 'if(條件, 成立, 不成立)', desc: '根據條件判斷。例: if({late_mins} > 30, 500, 0)' },
        { label: 'ROUND 四捨五入', value: 'round(數值, 0)', desc: '四捨五入。例: round({base_salary}/30/8, 0)' },
        { label: 'CEIL 無條件進位', value: 'ceil(數值)', desc: '無條件進位。例: ceil(100.1) = 101' },
        { label: 'FLOOR 無條件捨去', value: 'floor(數值)', desc: '無條件捨去。例: floor(100.9) = 100' },
        { label: 'ABS 絕對值', value: 'abs(數值)', desc: '轉為正數。例: abs(-500) = 500' },
        { label: 'MAX 最大值', value: 'max(a, b)', desc: '取較大者。例: max({base_salary}, 27470)' },
        { label: 'MIN 最小值', value: 'min(a, b)', desc: '取較小者。例: min({bonus}, 5000)' },
        { label: 'AND 且', value: 'and(a, b)', desc: '所有條件成立才算成立' },
        { label: 'OR 或', value: 'or(a, b)', desc: '任一條件成立即算成立' }
      ]
    }
  ];

  const renderForm = () => (
    <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="space-y-6">
          <h3 className="text-sm font-black text-indigo-600 mb-4 flex items-center gap-2"><Tag size={16}/> 1. 基本資訊</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">項目名稱</label>
              <input required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-bold focus:border-indigo-400 outline-none transition-all shadow-sm" placeholder="如: 交通津貼" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">系統代碼</label>
              <input required disabled={form.id !== null} value={form.code} onChange={e=>setForm({...form, code: e.target.value})} className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-bold focus:border-indigo-400 outline-none transition-all shadow-sm font-mono disabled:opacity-50 disabled:bg-gray-100" placeholder="如: transport" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">項目屬性</label>
              <div className="flex gap-2">
                <button type="button" onClick={()=>setForm({...form, type: 'ADDITION'})} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${form.type === 'ADDITION' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-400'}`}>+ 加項</button>
                <button type="button" onClick={()=>setForm({...form, type: 'DEDUCTION'})} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${form.type === 'DEDUCTION' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-gray-200 text-gray-400'}`}>- 扣項</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">排序號碼</label>
              <input type="number" value={form.sort_order} onChange={e=>setForm({...form, sort_order: e.target.value})} className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-bold focus:border-indigo-400 outline-none transition-all shadow-sm" placeholder="數字越小越前面" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">備註說明 (顯示於薪資單)</label>
              <input value={form.note} onChange={e=>setForm({...form, note: e.target.value})} className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-bold focus:border-indigo-400 outline-none transition-all shadow-sm" placeholder="例如：每月固定補助交通費" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-black text-indigo-600 mb-4 flex items-center gap-2"><Users size={16}/> 3. 套用範圍</h3>
            <label className="flex items-center gap-3 cursor-pointer group mb-4 w-fit">
              <div className="relative flex items-center">
                <input type="checkbox" checked={form.is_global} onChange={e=>setForm({...form, is_global: e.target.checked, applied_employee_ids: []})} className="peer w-5 h-5 opacity-0 absolute" />
                <div className="w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-indigo-600 transition-colors relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-all peer-checked:after:translate-x-4 shadow-inner"></div>
              </div>
              <div>
                <div className="text-sm font-black text-gray-800">全體員工適用</div>
                <div className="text-[10px] text-gray-400 font-bold">關閉後可個別勾選特定對象</div>
              </div>
            </label>

            {!form.is_global && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in">
                {employees.map(emp => (
                  <label key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.applied_employee_ids.includes(emp.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-800 shadow-sm' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-white hover:border-gray-300'}`}>
                    <input type="checkbox" checked={form.applied_employee_ids.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{emp.name}</span>
                      <span className="text-[10px] font-mono opacity-70">{emp.code}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black text-indigo-600 mb-4 flex items-center gap-2"><Settings size={16}/> 2. 計算規則</h3>
          <div className="flex gap-2 mb-4 p-1 bg-gray-200/50 rounded-xl w-fit">
            <button type="button" onClick={()=>setForm({...form, calc_type: 'FIXED'})} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${form.calc_type === 'FIXED' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>固定金額</button>
            <button type="button" onClick={()=>setForm({...form, calc_type: 'VARIABLE'})} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${form.calc_type === 'VARIABLE' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>員工資料讀取</button>
            <button type="button" onClick={()=>setForm({...form, calc_type: 'FORMULA'})} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${form.calc_type === 'FORMULA' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>公式計算</button>
          </div>

          {form.calc_type === 'FIXED' && (
            <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-300">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">固定發放金額</label>
              <div className="relative max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input type="number" required value={form.default_amount} onChange={e=>setForm({...form, default_amount: e.target.value})} className="w-full border border-gray-200 bg-white rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold focus:border-indigo-400 outline-none shadow-sm" placeholder="輸入金額" />
              </div>
            </div>
          )}

          {form.calc_type === 'VARIABLE' && (
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <p className="text-sm font-black text-sky-700">📋 從員工個人資料讀取</p>
              <p className="text-xs text-sky-600 font-bold leading-relaxed">
                此項目的金額會自動從員工個人檔案的對應欄位讀取。<br/>
                <span className="font-black">系統代碼</span>必須與員工資料欄位名稱一致。<br/>
              </p>
              <div className="bg-white/60 p-3 rounded-xl border border-sky-100 text-xs text-sky-700 font-bold leading-relaxed">
                💡 <span className="text-indigo-600">小提示：</span>若要設定「員工專屬特殊自訂項」，請切換到【公式計算】模式！
              </div>
            </div>
          )}

          {form.calc_type === 'FORMULA' && (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="relative group">
                <textarea 
                  ref={formulaInputRef} required value={form.formula_expr} onChange={e=>setForm({...form, formula_expr: e.target.value})} 
                  className="w-full border-2 border-slate-300 bg-slate-800 text-emerald-400 rounded-2xl px-6 py-4 text-lg font-mono focus:border-indigo-500 outline-none transition-all shadow-inner min-h-[100px] leading-relaxed" 
                  placeholder="點擊下方變數插入，例如：{base_salary} / 240 * {ANN_leave_hours}" 
                />
              </div>
              
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 shadow-inner">
                <p className="text-xs font-black text-indigo-800 mb-4 flex items-center gap-1.5"><Plus size={14}/> 點擊標籤快速插入公式</p>
                
                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-1 border-b border-indigo-100 mb-4">
                  {variableGroups.map((grp, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveVarTab(i)}
                      className={`px-4 py-2 text-[11px] font-black transition-all rounded-t-lg ${activeVarTab === i ? 'bg-white text-indigo-600 border-x border-t border-indigo-100 -mb-px' : 'text-gray-400 hover:text-indigo-400'}`}
                    >
                      {grp.title.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[120px] animate-in fade-in duration-300">
                  {variableGroups.map((grp, i) => (
                    i === activeVarTab && (
                      <div key={i}>
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                          {grp.title}
                          {grp.isFunctions && <span className="text-[8px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-600 font-bold">可用函數</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {grp.vars.map((v, j) => (
                            <div key={j} className="group relative">
                              <button 
                                type="button" 
                                onClick={() => insertVariable(v.value)} 
                                className={`px-3 py-1 border rounded text-[11px] font-bold transition-all shadow-sm active:scale-95 ${grp.isFunctions ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white' : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white'}`}
                              >
                                {v.label}
                              </button>
                              {v.desc && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[10px] p-2.5 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 border border-slate-700 scale-95 group-hover:scale-100">
                                  <div className="font-black text-amber-400 mb-1">用法說明:</div>
                                  {v.desc}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {grp.title.includes('自訂項') && (
                          <div className="mt-4 text-[10px] text-indigo-700 font-bold bg-indigo-50/80 p-3 rounded-lg border border-indigo-200 leading-relaxed shadow-sm">
                            💡 點擊上述標籤（會自動成為計算公式）。設定完成後，【員工管理】的個人檔案中將會自動產生同名的金額輸入框供您輸入特殊加扣款！
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 flex gap-3">
            <button type="button" onClick={handleSubmit} className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-black hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
              <Save size={18} /> {form.id ? '儲存變更' : '建立項目'}
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
      
      {/* 頁首 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-xl shadow-sm">
            <Calculator size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-800">薪資項目與公式設定</h1>
            <p className="text-xs text-gray-500 font-bold mt-1">一目了然的卡片清單，點擊卡片即可展開編輯</p>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={16} /> 新增項目
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-3xl border border-indigo-200 shadow-xl overflow-hidden mb-6 ring-4 ring-indigo-50">
          <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 text-indigo-800 font-black">
            <Plus size={18} /> 建立新的薪資項目
          </div>
          {renderForm()}
        </div>
      )}

      {/* 清單 */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id} className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${isExpanded ? 'border-indigo-300 ring-4 ring-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'}`}>
              
              <div className="flex items-center justify-between px-6 py-4 cursor-pointer" onClick={() => handleToggleExpand(item)}>
                <div className="flex items-center gap-4 flex-1">
                  <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black shadow-inner">{item.sort_order || idx+1}</span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-black text-gray-800">{item.name}</h4>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded shadow-sm">{`{${item.code}}`}</span>
                    </div>
                    {item.note && <p className="text-xs text-gray-500 font-bold mt-1 truncate max-w-xl">{item.note}</p>}
                  </div>

                  <div className="hidden md:flex items-center gap-4 px-4 flex-wrap flex-1 justify-end">
                    <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${item.type === 'ADDITION' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {item.type === 'ADDITION' ? '+ 加項' : '- 扣項'}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black flex items-center gap-1.5">
                      <Settings size={12}/> {item.calc_type === 'FIXED' ? '固定金額' : '公式'}
                    </span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black flex items-center gap-1.5">
                      <Users size={12}/> {item.is_global ? '全體' : `指定 ${item.applied_employees?.length || 0} 人`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <button onClick={(e) => handleDelete(item.id, e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="刪除">
                    <Trash2 size={16} />
                  </button>
                  <div className="w-8 flex justify-center">
                    {isExpanded ? <ChevronUp size={20} className="text-indigo-600" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>
              </div>

              {isExpanded && renderForm()}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center text-gray-400">
            <AlertCircle size={40} className="mb-4 opacity-30"/>
            <p className="text-base font-black text-gray-600">尚無項目設定</p>
            <p className="text-xs mt-1">點擊右上角新增您的第一個薪資項目</p>
          </div>
        )}
      </div>

    </div>
  );
}
