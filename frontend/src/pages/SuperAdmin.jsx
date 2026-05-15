import React, { useState, useEffect } from 'react';
import { 
  Shield, Building2, Server, Database, Activity, RefreshCw, 
  Power, Trash2, Download, Upload, LogIn, UserPlus, X, PlusCircle 
} from 'lucide-react';
import api from '../utils/api';

export default function SuperAdmin() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals status
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  
  const [targetCompany, setTargetCompany] = useState(null);
  const [adminForm, setAdminForm] = useState({ username: '', password: '', name: '' });
  const [companyForm, setCompanyForm] = useState({ code: '', name: '', db_url: '', db_token: '' });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/super-admin/companies');
      setCompanies(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      await api.post('/super-admin/companies', companyForm);
      alert('企業註冊成功！');
      setShowCompanyModal(false);
      setCompanyForm({ code: '', name: '', db_url: '', db_token: '' });
      fetchCompanies();
    } catch (err) {
      alert('註冊失敗: ' + (err.response?.data?.error || err.message));
    }
  };

  const submitCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await api.post('/super-admin/companies/create-admin', {
        companyCode: targetCompany.code,
        ...adminForm
      });
      alert('管理員建立成功！');
      setShowAdminModal(false);
      setAdminForm({ username: '', password: '', name: '' });
    } catch (err) {
      alert('建立失敗: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleExport = async (code) => {
    if(!window.confirm(`確定要下載 [${code}] 的所有雲端資料備份嗎？`)) return;
    try {
      const res = await api.get(`/super-admin/companies/${code}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${code}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('下載失敗');
    }
  };

  const handleImport = async (code) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!window.confirm(`警告：上傳將會覆蓋 [${code}] 目前所有的資料，確定要繼續嗎？`)) return;
      
      const formData = new FormData();
      formData.append('file', file);
      try {
        await api.post(`/super-admin/companies/${code}/import`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('資料還原成功！');
      } catch (err) {
        alert('資料還原失敗');
      }
    };
    fileInput.click();
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`【危險操作】確定要永久刪除企業 [${code}] 嗎？此操作無法復原！`)) return;
    try {
      await api.delete(`/super-admin/companies/${code}`);
      fetchCompanies();
    } catch (e) {
      alert('刪除失敗');
    }
  };

  const handleImpersonate = async (code) => {
    try {
      const res = await api.get(`/super-admin/companies/${code}/impersonate`);
      const { user, permissions } = res.data;
      
      const currentSession = {
        user: JSON.parse(sessionStorage.getItem('user')),
        companyCode: sessionStorage.getItem('companyCode'),
        permissions: JSON.parse(sessionStorage.getItem('permissions'))
      };
      sessionStorage.setItem('original_super_admin_session', JSON.stringify(currentSession));
      
      sessionStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('companyCode', code);
      sessionStorage.setItem('permissions', JSON.stringify(permissions));
      
      window.location.href = '/'; 
    } catch (e) {
      alert('無法進入該企業：' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">中央系統總管</h1>
              <p className="text-sm font-bold text-indigo-400">多租戶架構維護後台</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowCompanyModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <PlusCircle size={18} /> 建立新企業
            </button>
            <button 
              onClick={() => {
                sessionStorage.clear();
                localStorage.removeItem('user');
                localStorage.removeItem('companyCode');
                window.location.href = '/';
              }} 
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            >
              <Power size={16} /> 登出總管
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-3xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10"><Building2 size={64}/></div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">營運中租戶</p>
            <p className="text-5xl font-black text-white">{companies.filter(c => c.status === 'ACTIVE').length}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-3xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10"><Database size={64}/></div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">資料庫叢集健康度</p>
            <p className="text-5xl font-black text-emerald-400 flex items-center gap-3">100% <Activity size={32}/></p>
          </div>
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-3xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 text-indigo-500"><Server size={64}/></div>
            <p className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-2">中央 API 節點</p>
            <p className="text-xl font-bold text-indigo-200 mt-2">hr-api-server-eta</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-400">線上運作中</span>
            </div>
          </div>
        </div>

        {/* Tenants List */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-[2rem] p-8 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <Building2 className="text-indigo-400"/> 註冊企業列表
            </h2>
            <button onClick={fetchCompanies} className="p-2 hover:bg-slate-700 rounded-xl transition-all text-slate-400 hover:text-white">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid gap-4">
            {companies.map(company => (
              <div key={company.id} className="bg-slate-900/50 border border-slate-700/50 p-6 rounded-2xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center font-black text-xl text-slate-300 border border-slate-700 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg">
                    {company.code}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{company.name}</h3>
                    <p className="text-sm font-mono text-slate-400 mt-1 flex items-center gap-2">
                      <Database size={14} className="text-slate-500"/>
                      {company.db_url.substring(0, 30)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-sm ${company.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {company.status}
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">建立時間</p>
                    <p className="text-sm font-bold text-slate-300 mt-0.5">{new Date(company.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-700/50">
                    <button onClick={() => handleImpersonate(company.code)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all" title="上帝模式 (一鍵代登入)">
                      <LogIn size={18} />
                    </button>
                    <button onClick={() => { setTargetCompany(company); setShowAdminModal(true); }} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all" title="新增該企業的初始管理員">
                      <UserPlus size={18} />
                    </button>
                    <button onClick={() => handleExport(company.code)} className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all" title="雲端備份下載">
                      <Download size={18} />
                    </button>
                    <button onClick={() => handleImport(company.code)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all" title="上傳覆蓋資料">
                      <Upload size={18} />
                    </button>
                    <button onClick={() => handleDelete(company.code)} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all" title="刪除企業">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {companies.length === 0 && !loading && (
              <div className="text-center py-20 text-slate-500 font-bold">目前沒有任何公司註冊紀錄</div>
            )}
          </div>
        </div>
      </main>

      {/* Create Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
          <div className="bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <PlusCircle className="text-indigo-400" />
                註冊新企業
              </h3>
              <button onClick={() => setShowCompanyModal(false)} className="text-slate-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">企業代碼 (Code)</label>
                  <input required value={companyForm.code} onChange={e => setCompanyForm({...companyForm, code: e.target.value.toUpperCase()})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="例如: TJS" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">企業名稱 (Name)</label>
                  <input required value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="例如: 某某實業" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">資料庫網址 (Database URL)</label>
                <input required value={companyForm.db_url} onChange={e => setCompanyForm({...companyForm, db_url: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="libsql://your-db.turso.io" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">資料庫憑證 (Auth Token)</label>
                <textarea required value={companyForm.db_token} onChange={e => setCompanyForm({...companyForm, db_token: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none h-20" placeholder="JWT Token..." />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl mt-4 transition-all shadow-lg shadow-indigo-500/20">
                確認註冊企業
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showAdminModal && targetCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
          <div className="bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <UserPlus className="text-amber-400" />
                新增初始管理員
              </h3>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm font-bold text-slate-400 mb-6">
              目標企業：<span className="text-amber-400">{targetCompany.name} ({targetCompany.code})</span>
            </p>
            <form onSubmit={submitCreateAdmin} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">登入帳號 (Username)</label>
                <input required value={adminForm.username} onChange={e => setAdminForm({...adminForm, username: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-amber-500 outline-none" placeholder="例如: ceo_admin" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">登入密碼 (Password)</label>
                <input required type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-amber-500 outline-none" placeholder="設定高強度密碼" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">負責人姓名 (Name)</label>
                <input required value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-amber-500 outline-none" placeholder="例如: 王大明" />
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-black py-4 rounded-xl mt-4 transition-all">
                確認建立帳號
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
