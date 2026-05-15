import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import api from '../utils/api';

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // 每 30 秒自動重新獲取一次
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get(`/notifications?employeeId=${user.id}`);
      setNotifications(res.data);
    } catch (e) { console.error(e); }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (e) { console.error(e); }
  };

  const handleReadAll = async () => {
    try {
      await api.post('/notifications/read-all', { employeeId: user.id });
      fetchNotifications();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-indigo-100 hover:text-white transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-indigo-600">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* 透明遮罩：點擊外部關閉 */}
          <div className="fixed inset-0 z-[998]" onClick={() => setShowDropdown(false)} />
          {/* 通知面板：使用 fixed 確保浮層在最頂層 */}
          <div className="fixed top-20 right-4 w-80 bg-white rounded-xl shadow-2xl z-[999] border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">通知中心</h3>
              {unreadCount > 0 && (
                <button onClick={handleReadAll} className="text-xs text-indigo-600 hover:underline">全部標記為已讀</button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">目前沒有任何通知</div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleMarkAsRead(n.id)}
                    className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-indigo-50 transition-colors ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className={`text-sm font-bold ${!n.is_read ? 'text-indigo-900' : 'text-gray-600'}`}>{n.title}</h4>
                      {!n.is_read && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
