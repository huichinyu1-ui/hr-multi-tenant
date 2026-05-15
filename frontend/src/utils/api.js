import axios from 'axios';

const api = axios.create({
  baseURL: window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://hr-api-server-eta.vercel.app/api'
});

console.log('API BaseURL:', api.defaults.baseURL);

// 建立請求攔截器，自動注入登入者資訊
api.interceptors.request.use(config => {
  const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    config.headers['x-user-role'] = user.role;
    config.headers['x-user-id'] = user.id;
  }
  const companyCode = sessionStorage.getItem('companyCode') || localStorage.getItem('companyCode');
  if (companyCode) {
    config.headers['x-company-code'] = companyCode;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default api;
