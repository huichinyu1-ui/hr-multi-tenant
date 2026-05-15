import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Save, ChevronDown, ChevronUp, Lock, AlertCircle, Info } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const MODULE_LABELS = {
  EMP:          { name: '員工檔案管理', desc: '管理員工基本資料、職務資訊。編輯權限連動解鎖「薪資支付」與「帳號權限」頁籤（需搭配 PAYROLL/ROLE 權限）。' },
  ATT:          { name: '考勤報表管理', desc: '查看與匯出打卡紀錄報表。\n• 查看（無僅本人）= 可看全公司考勤 + 顯示人員篩選\n• 查看 + 僅本人 = 只能查看自己的打卡紀錄\n• 編輯 = 可手動修改考勤狀態 + 執行一鍵同步\n• 匯入 = 可使用 Excel 批次匯入打卡資料\n• 新增 = 保留欄位，目前以「補打卡申請」替代' },
  LEAVE:        { name: '請假/加班管理', desc: '處理假單審核與加班紀錄。編輯權限包含審核操作。' },
  LEAVE_TYPE:   { name: '假別設定', desc: '自訂公司假別、給薪比例與額度。編輯權限允許新增/修改假別規則。' },
  PAYROLL:      { name: '薪資結算查詢', desc: '執行月薪資計算、結案與報表匯出。編輯權限解鎖試算按鈕及員工個人薪資設定頁籤。' },
  MISSED_PUNCH: { name: '補打卡申請', desc: '員工漏打卡時的申請流程。編輯權限包含核准與退回申請。' },
  CALENDAR:     { name: '行事曆設定', desc: '設定公司年度工作日、國定假日與休假日，影響薪資與考勤計算。' },
  SHIFT:        { name: '班別時段管理', desc: '設定各類排班時間、彈性時間與遲到判定規則。' },
  FORMULA:      { name: '薪資公式設定', desc: '定義薪資明細項目的加扣項邏輯與計算公式。' },
  SETTINGS:     { name: '系統環境設定', desc: '管理公司 GPS 座標、打卡允許半徑與其他全域系統參數。' },
  INSURANCE:    { name: '保費級距管理', desc: '管理勞保、健保與勞退的投保薪資分級與自提比例。' },
};

const PERM_COLS = [
  { key: 'canView',   label: '查看', tip: '單獨勾選=可查看所有人；搭配[僅本人]=僅能看自己' },
  { key: 'canCreate', label: '新增', tip: '單獨勾選=可為所有人新增(代客申請)；搭配[僅本人]=僅能為自己新增' },
  { key: 'canEdit',   label: '編輯', tip: '單獨勾選=可修改所有人；搭配[僅本人]=僅能修改自己' },
  { key: 'canDelete', label: '刪除', tip: '單獨勾選=可刪除所有人；搭配[僅本人]=僅能刪除自己' },
  { key: 'selfOnly',  label: '僅本人', tip: '核心範圍開關：勾選後，所有查看/新增/修改/刪除的範圍都會被限縮在「自己」' },
];

export default function Roles() {
  const { addToast } = useToast();
  const [roles, setRoles] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [editingPerms, setEditingPerms] = useState({});
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // 展開/收起角色
  const toggleExpand = (role) => {
    if (expandedId === role.id) {
      setExpandedId(null);
    } else {
      setExpandedId(role.id);
      // 初始化編輯狀態
      if (!editingPerms[role.id]) {
        const permMap = {};
        role.permissions.forEach(p => { permMap[p.module] = { ...p }; });
        setEditingPerms(prev => ({ ...prev, [role.id]: permMap }));
      }
    }
  };

  const handlePermChange = (roleId, module, key, value) => {
    setEditingPerms(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [module]: {
          ...prev[roleId]?.[module],
          [key]: value,
          // 若關閉 canView，同時關閉 canCreate/canEdit/canDelete（保留 selfOnly）
          ...(key === 'canView' && !value
            ? { canCreate: false, canEdit: false, canDelete: false }
            : {}),
          // 若開啟 canCreate/canEdit/canDelete/selfOnly，自動開啟 canView
          ...((['canCreate', 'canEdit', 'canDelete', 'selfOnly'].includes(key) && value)
            ? { canView: true }
            : {}),
        }
      }
    }));
  };

  const handleSavePermissions = async (roleId) => {
    setSaving(roleId);
    try {
      const permMap = editingPerms[roleId] || {};
      const permissions = Object.keys(MODULE_LABELS).map(module => ({
        module,
        ...(permMap[module] || { canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: false })
      }));
      await api.put(`/roles/${roleId}/permissions`, { permissions });
      await fetchRoles();
      addToast('✅ 權限已儲存', 'success');
    } catch (e) {
      addToast('❌ 儲存失敗：' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setNameError('請輸入角色名稱');
      return;
    }
    setNameError('');
    setCreating(true);
    try {
      await api.post('/roles', { name: newRoleName.trim(), description: newRoleDesc.trim() });
      setNewRoleName('');
      setNewRoleDesc('');
      setShowCreateForm(false);
      await fetchRoles();
      addToast(`角色「${newRoleName.trim()}」建立成功`, 'success');
    } catch (e) {
      setNameError('建立失敗：' + (e.response?.data?.error || e.message));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.isSystem) { addToast('系統預設角色不可刪除', 'error'); return; }
    if (!window.confirm(`確定刪除角色「${role.name}」？\n使用此角色的員工將失去該角色設定。`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      await fetchRoles();
      addToast('角色已刪除', 'success');
    } catch (e) {
      addToast('刪除失敗：' + (e.response?.data?.error || e.message), 'error');
    }
  };

  const roleBadgeColor = (name) => {
    if (name === 'ADMIN') return 'bg-red-100 text-red-700';
    if (name === 'COLLABORATOR') return 'bg-emerald-100 text-emerald-700';
    if (name === 'EMPLOYEE') return 'bg-blue-100 text-blue-700';
    return 'bg-purple-100 text-purple-700';
  };

  return (
    <div className="space-y-6">
      {/* 頁首 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <span className="text-purple-600">▌</span> 角色與權限管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">設定各角色可存取的功能模組與操作能力</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={16} /> 新增角色
        </button>
      </div>

      {/* 新增角色表單 */}
      {showCreateForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-indigo-900 mb-4">建立新角色</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">角色名稱 *</label>
              <input
                type="text"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="例如：SUPERVISOR"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">角色描述</label>
              <input
                type="text"
                value={newRoleDesc}
                onChange={e => setNewRoleDesc(e.target.value)}
                placeholder="例如：部門主管，可查閱本部門考勤"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          {nameError && (
            <div className="flex items-center gap-2 text-red-600 text-sm font-bold mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {nameError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleCreateRole}
              disabled={creating}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-black hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {creating ? '建立中...' : '確認建立'}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNameError(''); setNewRoleName(''); setNewRoleDesc(''); }}
              className="bg-white border border-gray-300 text-gray-600 px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 角色列表 */}
      <div className="space-y-3">
        {roles.map(role => {
          const isExpanded = expandedId === role.id;
          const perms = editingPerms[role.id] || {};

          return (
            <div key={role.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* 角色標題列 */}
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(role)}
              >
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-indigo-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-800">{role.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${roleBadgeColor(role.name)}`}>
                        {role.isSystem ? '系統預設' : '自訂'}
                      </span>
                    </div>
                    {role.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!role.isSystem && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteRole(role); }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  {role.isSystem && (
                    <Lock size={14} className="text-gray-300" title="系統角色不可刪除" />
                  )}
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {/* 展開的權限矩陣 */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-6 py-4 animate-in slide-in-from-top duration-150">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="text-left py-2 pr-4 w-40">模組</th>
                          {PERM_COLS.map(col => (
                            <th key={col.key} className="text-center px-3 py-2" title={col.tip || ''}>
                              {col.label}
                              {col.tip && <span className="ml-0.5 text-indigo-300">?</span>}
                            </th>
                          ))}
                          <th className="text-left px-4 py-2">專屬特製權限</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {Object.keys(MODULE_LABELS).map(module => {
                          const mp = perms[module] || {};
                          return (
                            <tr key={module} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="py-2.5 pr-4 font-bold text-gray-700 text-xs whitespace-nowrap">
                                <div 
                                  className="flex items-center gap-1.5 cursor-help group" 
                                  title={MODULE_LABELS[module].desc}
                                >
                                  {MODULE_LABELS[module].name}
                                  <Info size={13} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                              </td>
                              {PERM_COLS.map(col => (
                                <td key={col.key} className="text-center px-3 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={!!mp[col.key]}
                                    onChange={e => handlePermChange(role.id, module, col.key, e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>
                              ))}
                              <td className="px-4 py-2.5 text-xs text-gray-600">
                                <div className="flex items-center gap-3 flex-wrap">
                                  {module === 'EMP' && (
                                    <>
                                      <label title="是否能查看與編輯員工的「薪資支付」頁籤" className="flex items-center gap-1.5 cursor-help hover:text-indigo-600"><input type="checkbox" checked={!!mp.canManagePayroll} onChange={e => handlePermChange(role.id, module, 'canManagePayroll', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /> 薪資設定 <Info size={11} className="text-gray-400" /></label>
                                      <label title="是否能管理員工的登入帳號與系統權限" className="flex items-center gap-1.5 cursor-help hover:text-indigo-600"><input type="checkbox" checked={!!mp.canManageRole} onChange={e => handlePermChange(role.id, module, 'canManageRole', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /> 權限設定 <Info size={11} className="text-gray-400" /></label>
                                      <label title="是否能編輯公司的部門與職稱設定" className="flex items-center gap-1.5 cursor-help hover:text-indigo-600"><input type="checkbox" checked={!!mp.canManageMetadata} onChange={e => handlePermChange(role.id, module, 'canManageMetadata', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /> 基礎資料 <Info size={11} className="text-gray-400" /></label>
                                    </>
                                  )}
                                  {(module === 'LEAVE' || module === 'MISSED_PUNCH') && (
                                    <label title="是否能核准或退回員工的單據申請" className="flex items-center gap-1.5 cursor-help hover:text-indigo-600"><input type="checkbox" checked={!!mp.canApprove} onChange={e => handlePermChange(role.id, module, 'canApprove', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /> 核准單據 <Info size={11} className="text-gray-400" /></label>
                                  )}
                                  {module === 'ATT' && (
                                    <>
                                      <label title="是否能使用 Excel 批次匯入打卡紀錄" className="flex items-center gap-1.5 cursor-help hover:text-indigo-600"><input type="checkbox" checked={!!mp.canImport} onChange={e => handlePermChange(role.id, module, 'canImport', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /> Excel 匯入 <Info size={11} className="text-gray-400" /></label>
                                      <label title="是否能在首頁使用 GPS 線上打卡功能" className="flex items-center gap-1.5 cursor-help hover:text-indigo-600 font-black text-indigo-600"><input type="checkbox" checked={!!mp.canPunch} onChange={e => handlePermChange(role.id, module, 'canPunch', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /> GPS 線上打卡 <Info size={11} className="text-indigo-400" /></label>
                                    </>
                                  )}
                                  {module === 'SETTINGS' && (
                                    <label title="是否能管理全公司的系統參數(如打卡座標)" className="flex items-center gap-1.5 cursor-help hover:text-indigo-600"><input type="checkbox" checked={!!mp.canManageSettings} onChange={e => handlePermChange(role.id, module, 'canManageSettings', e.target.checked)} className="rounded border-gray-300 text-indigo-600" /> 管理系統參數 <Info size={11} className="text-gray-400" /></label>
                                  )}
                                  {!(module === 'EMP' || module === 'LEAVE' || module === 'MISSED_PUNCH' || module === 'ATT' || module === 'SETTINGS') && (
                                    <span className="text-[10px] text-gray-300 italic">無特製項目</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      ⚠️ 儲存後，員工需重新登入才能看到最新權限
                    </p>
                    <button
                      onClick={() => handleSavePermissions(role.id)}
                      disabled={saving === role.id}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
                    >
                      <Save size={15} />
                      {saving === role.id ? '儲存中...' : '儲存此角色的權限'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 圖例說明 */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Info size={14} className="text-indigo-500" /> 基礎欄位說明
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {PERM_COLS.map(col => (
            <div key={col.key} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
              <div className="text-xs font-black text-gray-700 mb-1">{col.label}</div>
              <div className="text-[10px] text-gray-400 leading-relaxed">
                {col.key === 'canView'   && '單獨勾選=可查看所有人；搭配[僅本人]=僅能查看自己'}
                {col.key === 'canCreate' && '單獨勾選=可為所有人新增；搭配[僅本人]=僅能為自己新增'}
                {col.key === 'canEdit'   && '單獨勾選=可編輯所有人；搭配[僅本人]=僅能編輯自己'}
                {col.key === 'canDelete' && '單獨勾選=可刪除所有人；搭配[僅本人]=僅能刪除自己'}
                {col.key === 'selfOnly'  && '範圍核心開關：所有操作將被限縮在「自己」'}
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Info size={14} className="text-indigo-500" /> 專屬特製權限說明
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <div className="text-xs font-black text-indigo-700 mb-1">【人事管理】薪資設定</div>
            <div className="text-[10px] text-gray-500 leading-relaxed">解鎖員工編輯視窗內的「薪資支付」頁籤，可設定本薪、獎金及銀行帳號。</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <div className="text-xs font-black text-indigo-700 mb-1">【人事管理】權限設定</div>
            <div className="text-[10px] text-gray-500 leading-relaxed">解鎖左側「角色與權限管理」選單，並允許修改員工的登入帳號及系統角色。</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <div className="text-xs font-black text-indigo-700 mb-1">【人事管理】基礎資料</div>
            <div className="text-[10px] text-gray-500 leading-relaxed">可編輯全公司的部門清單、職稱清單與雇用類型設定。</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <div className="text-xs font-black text-indigo-700 mb-1">【假單/補打卡】核准單據</div>
            <div className="text-[10px] text-gray-500 leading-relaxed">擁有主管權限，可核准或退回單據。不打勾即無審核權。此開關不影響查看範圍，能看到誰完全由「僅本人」開關決定。</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <div className="text-xs font-black text-indigo-700 mb-1">【考勤管理】Excel匯入 / GPS打卡</div>
            <div className="text-[10px] text-gray-500 leading-relaxed">允許使用 Excel 批次匯入舊版打卡資料；允許在首頁使用 GPS 按鈕線上打卡。</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <div className="text-xs font-black text-indigo-700 mb-1">【系統環境】管理系統參數</div>
            <div className="text-[10px] text-gray-500 leading-relaxed">可修改全公司適用的打卡座標中心點、打卡允許半徑範圍。</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <div className="text-xs font-black text-indigo-700 mb-1">【薪資設定】保費級距管理</div>
            <div className="text-[10px] text-gray-500 leading-relaxed">管理勞健保與勞退之投保等級。支援一鍵導入政府 2024-2026 最新官方預設標準，並同步更新負擔比例。</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <div className="text-xs font-black text-indigo-700 mb-1">【考勤管理】權限詳細說明</div>
            <div className="text-[10px] text-gray-500 leading-relaxed">
              <span className="font-bold text-gray-700">查看（無僅本人）</span>：看全公司所有人考勤，頂部顯示人員篩選。<br/>
              <span className="font-bold text-gray-700">查看 + 僅本人</span>：只能看自己的打卡紀錄，隱藏人員篩選。<br/>
              <span className="font-bold text-gray-700">編輯</span>：可手動調整每日考勤狀態 + 執行一鍵同步。<br/>
              <span className="font-bold text-gray-700">新增</span>：保留欄位，漏打卡請統一走「補打卡申請」功能。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
