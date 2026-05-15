import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Users, FileSpreadsheet, Calculator, Settings as SettingsIcon, Menu, Clock, X, LogOut, Key, Shield, ShieldCheck, Wallet, ChevronDown, ChevronRight } from 'lucide-react';

import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Formulas from './pages/Formulas';
import Payroll from './pages/Payroll';
import Calendar from './pages/Calendar';
import Leaves from './pages/Leaves';
import LeaveTypes from './pages/LeaveTypes';
import Shifts from './pages/Shifts';
import MissedPunches from './pages/MissedPunches';
import Roles from './pages/Roles';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import InsuranceGrades from './pages/InsuranceGrades';
import NotificationBell from './components/NotificationBell';

import Login from './pages/Login';
import SuperAdmin from './pages/SuperAdmin';

import api from './utils/api';
import { useToast } from './contexts/ToastContext';
import { usePermission } from './contexts/PermissionContext';

function App() {
  const { addToast } = useToast();
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [companyName] = useState(() => 
    sessionStorage.getItem('companyName') || localStorage.getItem('companyName') || '人事薪資系統'
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '' });

  const roleNames = {
    'ADMIN': '管理員',
    'COLLABORATOR': '協作者',
    'EMPLOYEE': '一般員工'
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('companyCode');
    sessionStorage.removeItem('permissions');
    localStorage.removeItem('user');
    localStorage.removeItem('companyCode');
    localStorage.removeItem('permissions');
    setUser(null);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees/change-password', {
        employeeId: user.id,
        ...pwdForm
      });
      addToast('密碼修改成功，請重新登入', 'success');
      setTimeout(handleLogout, 2000);
    } catch (err) {
      const errorData = err.response?.data?.error;
      const errorMsg = typeof errorData === 'object' 
        ? (errorData.message || JSON.stringify(errorData)) 
        : (errorData || '修改失敗');
      addToast(errorMsg, 'error');
    }
  };

  const handleReturnSuperAdmin = () => {
    const original = sessionStorage.getItem('original_super_admin_session');
    if (original) {
      const parsed = JSON.parse(original);
      sessionStorage.setItem('user', JSON.stringify(parsed.user));
      sessionStorage.setItem('companyCode', parsed.companyCode);
      sessionStorage.setItem('permissions', JSON.stringify(parsed.permissions));
      sessionStorage.removeItem('original_super_admin_session');
    } else {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('companyCode');
      sessionStorage.removeItem('permissions');
    }
    window.location.href = '/super-admin';
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const { hasPermission, isAdmin } = usePermission();
  const canViewEmployees = hasPermission('EMP', 'canView') || hasPermission('EMP', 'selfOnly');
  const canViewAttendance = hasPermission('ATT', 'canView') || hasPermission('ATT', 'selfOnly');
  const canViewLeaves = hasPermission('LEAVE', 'canView') || hasPermission('LEAVE', 'selfOnly');
  const canViewLeaveTypes = hasPermission('LEAVE_TYPE', 'canView') || hasPermission('LEAVE_TYPE', 'selfOnly');
  const canViewMissedPunches = hasPermission('MISSED_PUNCH', 'canView') || hasPermission('MISSED_PUNCH', 'selfOnly');
  const canViewCalendar = hasPermission('CALENDAR', 'canView') || hasPermission('CALENDAR', 'selfOnly');
  const canViewShifts = hasPermission('SHIFT', 'canView') || hasPermission('SHIFT', 'selfOnly');
  const canViewFormulas = hasPermission('FORMULA', 'canView') || hasPermission('FORMULA', 'selfOnly');
  const canViewPayroll = hasPermission('PAYROLL', 'canView') || hasPermission('PAYROLL', 'selfOnly');
  const canViewInsurance = hasPermission('INSURANCE', 'canView') || hasPermission('INSURANCE', 'selfOnly');
  const canManageSettings = hasPermission('SETTINGS', 'canManageSettings');

  const companyCode = sessionStorage.getItem('companyCode') || localStorage.getItem('companyCode');
  api.defaults.headers.common['x-company-code'] = companyCode;
  api.defaults.headers.common['x-user-role'] = user.role;
  api.defaults.headers.common['x-user-id'] = user.id;

  if (window.location.pathname === '/super-admin' && isAdmin) {
    return <SuperAdmin />;
  }

  const NavLink = ({ to, icon: Icon, children }) => (
    <Link 
      to={to} 
      onClick={() => setIsMenuOpen(false)}
      className="text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 flex items-center px-4 py-2.5 rounded-xl text-sm font-bold transition-all group"
    >
      <Icon className="w-4.5 h-4.5 mr-3 group-hover:scale-110 transition-transform text-gray-400 group-hover:text-indigo-600" />
      {children}
    </Link>
  );

  const NavSection = ({ title, children }) => {
    // 檢查是否有子內容被渲染 (排除 null)
    const hasVisibleItems = React.Children.toArray(children).some(child => child !== null && child !== false);
    if (!hasVisibleItems) return null;

    return (
      <div className="pt-4 first:pt-0">
        <div className="px-4 mb-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</div>
        <div className="space-y-0.5">
          {children}
        </div>
      </div>
    );
  };

  const SidebarContent = () => (
    <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
      <NavSection title="核心概況">
        <NavLink to="/" icon={Clock}>工作儀表板</NavLink>
      </NavSection>

      <NavSection title="人事行政">
        {canViewEmployees && <NavLink to="/employees" icon={Users}>職員檔案管理</NavLink>}
        {canViewLeaves && <NavLink to="/leaves" icon={FileSpreadsheet}>請假與加班審核</NavLink>}
        {canViewLeaveTypes && <NavLink to="/leave-types" icon={SettingsIcon}>假別規則設定</NavLink>}
      </NavSection>

      <NavSection title="考勤薪資">
        {canViewAttendance && <NavLink to="/attendance" icon={FileSpreadsheet}>打卡紀錄報表</NavLink>}
        {canViewMissedPunches && <NavLink to="/missed-punches" icon={Clock}>補打卡申請單</NavLink>}
        {canViewInsurance && <NavLink to="/insurance-grades" icon={ShieldCheck}>保費級距管理</NavLink>}
        {canViewFormulas && <NavLink to="/formulas" icon={Calculator}>薪資項目與公式</NavLink>}
        {canViewCalendar && <NavLink to="/calendar" icon={FileSpreadsheet}>公司行事曆</NavLink>}
        {canViewShifts && <NavLink to="/shifts" icon={Clock}>排班時段設定</NavLink>}
      </NavSection>

      <NavSection title="系統權限">
        {canManageSettings && <NavLink to="/settings" icon={SettingsIcon}>系統環境設定</NavLink>}
        {isAdmin && <NavLink to="/roles" icon={Shield}>角色與權限管理</NavLink>}
      </NavSection>

      {/* 薪資結算 - 置底凸顯區 */}
      {canViewPayroll && (
        <div className="pt-6 mt-4 border-t border-gray-100">
          <Link 
            to="/payroll" 
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center px-4 py-4 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:-translate-y-0.5 transition-all duration-300 group"
          >
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white/20 transition-colors">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-white leading-none mb-1 uppercase tracking-widest">Final Step</p>
              <p className="text-sm font-black">每月薪資結算系統</p>
            </div>
            <ChevronDown className="w-4 h-4 text-white/40 -rotate-90" />
          </Link>
        </div>
      )}
    </nav>
  );

  return (
    <Router>
      <div className="min-h-screen bg-[#f4f7fa] flex font-sans">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 shadow-xl z-50">
          <div className="p-6 h-20 flex items-center gap-3 border-b border-gray-50">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">{companyName?.[0] || 'T'}</div>
            <span className="font-black text-xl tracking-tighter text-gray-800 truncate">{companyName}</span>
          </div>
          
          <SidebarContent />

          <div className="p-4 mt-auto border-t border-gray-50">
            <div className="bg-indigo-50/50 rounded-2xl p-4 text-center border border-indigo-100">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Antigravity HR</span>
              <p className="text-[10px] font-bold text-gray-500 mt-1">專業人事薪資系統</p>
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:px-10 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-4 shrink-0">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl lg:hidden"
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                <span>我的頁面</span>
                <span>/</span>
                <span className="text-gray-900">人事管理</span>
              </div>
              
              {user.id === 999999 && (
                <button 
                  onClick={handleReturnSuperAdmin}
                  className="ml-4 flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-black shadow-lg shadow-rose-500/20 transition-all animate-pulse"
                >
                  <Shield size={16} /> 返回中央總管
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <NotificationBell user={user} />
              
              <div className="h-8 w-[1px] bg-gray-100 mx-2 hidden sm:block" />

              <div className="flex items-center gap-3 bg-white p-1 pr-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 shadow-lg shadow-indigo-100 rounded-xl flex items-center justify-center font-black text-white text-lg transform group-hover:scale-105 transition-transform">
                  {user.name[0]}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-black text-gray-900 leading-none mb-1">{user.name}</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                    isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.roleRef?.name || (user.role === 'ADMIN' ? '系統管理員' : '一般員工')}
                  </span>
                </div>
                
                <div className="h-6 w-[1px] bg-gray-200 mx-1 hidden md:block" />

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setShowPwdModal(true)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="修改密碼"
                  >
                    <Key size={18} />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    title="登出系統"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="fixed inset-0 z-[100] lg:hidden">
              <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col animate-in slide-in-from-left duration-300">
                <div className="p-6 h-20 flex items-center justify-between border-b">
                   <span className="font-black text-xl truncate pr-4">{companyName}</span>
                   <button onClick={() => setIsMenuOpen(false)} className="p-2"><X /></button>
                </div>
                <SidebarContent />
              </div>
            </div>
          )}

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto p-6 lg:p-10">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/employees" element={canViewEmployees ? <Employees /> : <Payroll />} />
                <Route path="/attendance" element={canViewAttendance ? <Attendance /> : <Payroll />} />
                <Route path="/shifts" element={canViewShifts ? <Shifts /> : <Payroll />} />
                <Route path="/calendar" element={canViewCalendar ? <Calendar /> : <Payroll />} />
                <Route path="/leaves" element={canViewLeaves ? <Leaves /> : <Payroll />} />
                <Route path="/leave-types" element={canViewLeaveTypes ? <LeaveTypes /> : <Payroll />} />
                <Route path="/missed-punches" element={canViewMissedPunches ? <MissedPunches /> : <Payroll />} />
                <Route path="/formulas" element={canViewFormulas ? <Formulas /> : <Payroll />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/insurance-grades" element={<InsuranceGrades />} />
                <Route path="/settings" element={canManageSettings ? <Settings /> : <Dashboard />} />
                <Route path="/roles" element={isAdmin ? <Roles /> : <Dashboard />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>

      {/* Change Password Modal (Responsive) */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">安全設定</h3>
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">目前使用的密碼</label>
                <input 
                  type="password" 
                  required 
                  value={pwdForm.oldPassword}
                  onChange={e => setPwdForm({...pwdForm, oldPassword: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-700 focus:ring-4 focus:ring-indigo-100 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">設定新密碼</label>
                <input 
                  type="password" 
                  required 
                  value={pwdForm.newPassword}
                  onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-700 focus:ring-4 focus:ring-indigo-100 outline-none"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  確認修改
                </button>
                <button 
                  type="button"
                  onClick={() => setShowPwdModal(false)}
                  className="px-6 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl hover:bg-gray-200 transition-all"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;
