import React, { useState, useEffect } from "react";
import { History, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle, Trash2, CheckSquare } from "lucide-react";
import api from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import { usePermission } from "../contexts/PermissionContext";

const ACTION_LABELS = {
  UPDATE: { label: "修改", color: "bg-amber-100 text-amber-700" },
  CREATE: { label: "新增", color: "bg-emerald-100 text-emerald-700" },
  DELETE: { label: "刪除", color: "bg-red-100 text-red-700" },
};

const TABLE_LABELS = {
  LeaveQuota:  "特休額度",
  Employee:    "員工基本資料",
  DailyRecord: "考勤打卡紀錄",
  PayrollItem: "薪資項目與公式",
  LeaveType:   "假別設定規則",
};

function tryParseJSON(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function ValuesCell({ log, compact }) {
  const colClass = compact ? "col-span-1" : "col-span-2";
  const isMulti = log.fieldName === "MULTIPLE_FIELDS";
  if (!isMulti) {
    return (
      <div className={colClass + " text-xs flex items-center gap-1 overflow-hidden"}>
        <span className="text-red-500 line-through truncate max-w-[55px]" title={String(log.oldValue)}>{String(log.oldValue)}</span>
        <span className="text-gray-300">→</span>
        <span className="text-emerald-600 font-bold truncate max-w-[55px]" title={String(log.newValue)}>{String(log.newValue)}</span>
      </div>
    );
  }
  const po = tryParseJSON(log.oldValue);
  const pn = tryParseJSON(log.newValue);
  if (!po || !pn) return <div className={colClass + " text-xs text-gray-400"}>(多欄位)</div>;
  const keys = Object.keys(po);
  return (
    <div className={colClass + " text-[10px] overflow-hidden"}>
      <div className="flex flex-col gap-0.5">
        {keys.slice(0, 2).map(k => (
          <div key={k} className="flex items-center gap-1 truncate">
            <span className="text-red-400 line-through truncate max-w-[40px]" title={po[k]}>{po[k]}</span>
            <span className="text-gray-300">→</span>
            <span className="text-emerald-600 font-bold truncate max-w-[40px]" title={pn[k]}>{pn[k]}</span>
          </div>
        ))}
        {keys.length > 2 && <span className="text-gray-400">+{keys.length - 2} 欄位</span>}
      </div>
    </div>
  );
}

export default function AuditLog() {
  const { addToast } = useToast();
  const { hasPermission } = usePermission();
  const canRevert = hasPermission("AUDIT", "canEdit");
  const canDelete = hasPermission("AUDIT", "canDelete");
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const limit = 30;

  useEffect(() => { fetchLogs(); setSelectedIds([]); }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit-logs?page=${page}&limit=${limit}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      addToast("載入操作日誌失敗：" + (e.response?.data?.error || e.message), "error");
    } finally { setLoading(false); }
  };

  const handleRevert = async (log) => {
    let fieldText = log.fieldName === "MULTIPLE_FIELDS" ? "多欄位批次變更" : log.fieldName;
    let oldText = log.oldValue, newText = log.newValue;
    if (log.fieldName === "MULTIPLE_FIELDS") {
      const po = tryParseJSON(log.oldValue), pn = tryParseJSON(log.newValue);
      if (po && pn) {
        oldText = Object.keys(po).map(k => k + ": " + po[k]).join("\n");
        newText = Object.keys(pn).map(k => k + ": " + pn[k]).join("\n");
      }
    }
    if (!window.confirm("⚠️ 確定要還原此操作嗎？\n\n資料表：" + (TABLE_LABELS[log.tableName] || log.tableName) + "\n欄位：" + fieldText + "\n從「" + newText + "」\n改回「" + oldText + "」\n\n此操作不可輕易撤銷，請確認！")) return;
    setReverting(log.id);
    try {
      const res = await api.post("/audit-logs/" + log.id + "/revert");
      addToast(res.data.message, "success");
      fetchLogs();
    } catch (e) {
      addToast("還原失敗：" + (e.response?.data?.error || e.message), "error");
    } finally { setReverting(null); }
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm("⚠️ 確定要永久刪除選取的 " + selectedIds.length + " 筆紀錄嗎？\n此操作無法復原！")) return;
    setDeleting(true);
    try {
      const res = await api.post("/audit-logs/batch-delete", { ids: selectedIds });
      addToast(res.data.message, "success");
      setSelectedIds([]); fetchLogs();
    } catch (e) {
      addToast("刪除失敗：" + (e.response?.data?.error || e.message), "error");
    } finally { setDeleting(false); }
  };

  const toggleSelectAll = () => setSelectedIds(selectedIds.length === logs.length ? [] : logs.map(l => l.id));
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2"><span className="text-red-500">▌</span> 系統操作日誌</h1>
          <p className="text-sm text-gray-500 mt-1">追蹤所有管理員對敏感資料的修改紀錄，共 {total} 筆</p>
        </div>
        {canRevert && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-4 py-2 rounded-xl">
            <AlertTriangle size={14} />您擁有「一鍵還原」高級權限，操作請謹慎
          </div>
        )}
      </div>

      {canDelete && selectedIds.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-700"><CheckSquare size={16} /><span className="text-sm font-bold">已選取 {selectedIds.length} 筆紀錄</span></div>
          <button onClick={handleBatchDelete} disabled={deleting} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50">
            {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}永久刪除
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400"><div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-sm">載入中...</p></div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-gray-400"><History size={48} className="mx-auto mb-4 opacity-30" /><p className="text-sm">目前尚無任何操作紀錄</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest items-center">
              {canDelete && <div className="col-span-1"><input type="checkbox" checked={logs.length > 0 && selectedIds.length === logs.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300" /></div>}
              <div className="col-span-2">時間</div>
              <div className="col-span-1">操作</div>
              <div className="col-span-2">操作人</div>
              <div className="col-span-2">資料表</div>
              <div className="col-span-2">欄位</div>
              <div className={canDelete ? "col-span-1" : "col-span-2"}>舊值 → 新值</div>
              {canRevert && <div className="col-span-1 text-right">還原</div>}
            </div>

            {logs.map(log => {
              const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-gray-100 text-gray-600" };
              const isRevertLog = log.note?.includes("系統還原");
              return (
                <div key={log.id} className={"grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center" + (isRevertLog ? " bg-blue-50/30" : "")}>
                  {canDelete && <div className="col-span-1"><input type="checkbox" checked={selectedIds.includes(log.id)} onChange={() => toggleSelect(log.id)} className="w-4 h-4 rounded border-gray-300" /></div>}
                  <div className="col-span-2 text-xs text-gray-500">
                    <p className="font-bold text-gray-700">{new Date(log.created_at).toLocaleDateString("zh-TW")}</p>
                    <p className="text-gray-400">{new Date(log.created_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="col-span-1"><span className={"text-[10px] font-black px-2 py-1 rounded-full " + actionInfo.color}>{actionInfo.label}</span></div>
                  <div className="col-span-2 text-xs font-bold text-gray-700 truncate">
                    {log.operatorName || "#" + log.operatorId}
                    {isRevertLog && <span className="ml-1 text-[9px] text-blue-500 font-black">[還原操作]</span>}
                  </div>
                  <div className="col-span-2 text-xs text-gray-600">
                    <div>{TABLE_LABELS[log.tableName] || log.tableName}<span className="text-gray-400 ml-1">#{log.recordId}</span></div>
                    {log.note && !isRevertLog && (
                      <div className="mt-1 text-[10px] text-indigo-500 font-bold bg-indigo-50/80 border border-indigo-100 px-1.5 py-0.5 rounded max-w-full truncate" title={log.note}>
                        💡 {log.note}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded truncate">{log.fieldName === "MULTIPLE_FIELDS" ? "多欄位變更" : log.fieldName}</div>
                  <ValuesCell log={log} compact={canDelete} />
                  {canRevert && (
                    <div className="col-span-1 text-right">
                      {log.action !== "DELETE" ? (
                        <button onClick={() => handleRevert(log)} disabled={reverting === log.id || isRevertLog} title={isRevertLog ? "此筆本身為還原操作" : "還原此操作"} className={"p-2 rounded-lg transition-all " + (isRevertLog ? "text-gray-300 cursor-not-allowed" : "text-amber-500 hover:bg-amber-50 hover:text-amber-700")}>
                          {reverting === log.id ? <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin inline-block" /> : <RotateCcw size={15} />}
                        </button>
                      ) : <span className="text-[9px] text-gray-300">無法還原</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">第 {page} / {totalPages} 頁，共 {total} 筆</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-all"><ChevronLeft size={16} /></button>
              <span className="text-xs font-bold text-gray-600">{page}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}