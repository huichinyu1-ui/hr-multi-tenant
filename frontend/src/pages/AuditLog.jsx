import React, { useState, useEffect } from 'react';
import { History, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { usePermission } from '../contexts/PermissionContext';

const ACTION_LABELS = {
  UPDATE: { label: '修改', color: 'bg-amber-100 text-amber-700' },
  CREATE: { label: '新增', color: 'bg-emerald-100 text-emerald-700' },
  DELETE: { label: '刪除', color: 'bg-red-100 text-red-700' },
};

const TABLE_LABELS = {
  LeaveQuota: '特休額度',
  Employee:   '員工資料',
};

export default function AuditLog() {
  const { addToast } = useToast();
  const { hasPermission } = usePermission();
  const canRevert = hasPermission('AUDIT', 'canEdit');

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState(null);
  const limit = 30;

  useEffect(() => { fetchLogs(); }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit-logs?page=${page}&limit=${limit}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      addToast('載入操作日誌失敗：' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (log) => {
    if (!window.confirm(
      `⚠️ 確定要還原此操作嗎？\n\n` +
      `資料表：${TABLE_LABELS[log.tableName] || log.tableName}\n` +
      `欄位：${log.fieldName}\n` +
      `從「${log.newValue}」改回「${log.oldValue}」\n\n` +
      `此操作不可輕易撤銷，請確認！`
    )) return;

    setReverting(log.id);
    try {
      const res = await api.post(`/audit-logs/${log.id}/revert`);
      addToast(res.data.message, 'success');
      fetchLogs();
    } catch (e) {
      addToast('還原失敗：' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setReverting(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* 頁首 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <span className="text-red-500">▌</span> 系統操作日誌
          </h1>
          <p className="text-sm text-gray-500 mt-1">追蹤所有管理員對敏感資料的修改紀錄，共 {total} 筆</p>
        </div>
        {canRevert && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-4 py-2 rounded-xl">
            <AlertTriangle size={14} />
            您擁有「一鍵還原」高級權限，操作請謹慎
          </div>
        )}
      </div>

      {/* 日誌列表 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm">載入中...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <History size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">目前尚無任何操作紀錄</p>
            <p className="text-xs mt-1 text-gray-300">每次手動調整特休額度或修改員工資料時，系統將自動記錄於此</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* 表頭 */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <div className="col-span-2">時間</div>
              <div className="col-span-1">操作</div>
              <div className="col-span-2">操作人</div>
              <div className="col-span-2">資料表</div>
              <div className="col-span-2">欄位</div>
              <div className="col-span-2">舊值 → 新值</div>
              {canRevert && <div className="col-span-1 text-right">還原</div>}
            </div>

            {/* 日誌列表 */}
            {logs.map(log => {
              const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' };
              const isRevertLog = log.note?.includes('系統還原');
              return (
                <div
                  key={log.id}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center ${isRevertLog ? 'bg-blue-50/30' : ''}`}
                >
                  {/* 時間 */}
                  <div className="col-span-2 text-xs text-gray-500">
                    <p className="font-bold text-gray-700">{new Date(log.created_at).toLocaleDateString('zh-TW')}</p>
                    <p className="text-gray-400">{new Date(log.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>

                  {/* 操作類型 */}
                  <div className="col-span-1">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${actionInfo.color}`}>
                      {actionInfo.label}
                    </span>
                  </div>

                  {/* 操作人 */}
                  <div className="col-span-2 text-xs font-bold text-gray-700 truncate">
                    {log.operatorName || `#${log.operatorId}`}
                    {isRevertLog && <span className="ml-1 text-[9px] text-blue-500 font-black">[還原操作]</span>}
                  </div>

                  {/* 資料表 */}
                  <div className="col-span-2 text-xs text-gray-600">
                    {TABLE_LABELS[log.tableName] || log.tableName}
                    <span className="text-gray-400 ml-1">#{log.recordId}</span>
                  </div>

                  {/* 欄位 */}
                  <div className="col-span-2 text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded truncate">
                    {log.fieldName}
                  </div>

                  {/* 舊值 → 新值 */}
                  <div className="col-span-2 text-xs flex items-center gap-1 truncate">
                    <span className="text-red-500 line-through">{log.oldValue}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-emerald-600 font-bold">{log.newValue}</span>
                  </div>

                  {/* 還原按鈕 */}
                  {canRevert && (
                    <div className="col-span-1 text-right">
                      {log.action !== 'DELETE' ? (
                        <button
                          onClick={() => handleRevert(log)}
                          disabled={reverting === log.id || isRevertLog}
                          title={isRevertLog ? '此筆本身為還原操作，不可再次還原' : '還原此操作'}
                          className={`p-2 rounded-lg transition-all ${
                            isRevertLog
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-amber-500 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          {reverting === log.id
                            ? <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin inline-block" />
                            : <RotateCcw size={15} />
                          }
                        </button>
                      ) : (
                        <span className="text-[9px] text-gray-300">無法還原</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 分頁控制 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">第 {page} / {totalPages} 頁，共 {total} 筆</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-gray-600">{page}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
