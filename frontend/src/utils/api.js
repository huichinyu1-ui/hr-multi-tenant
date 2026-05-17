import axios from 'axios';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css'; // Optional: if it's better to put it here or index.css. Putting it here works if bundler supports it.

// NProgress configuration
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.1 });

const api = axios.create({
  baseURL: window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://hr-api-server-eta.vercel.app/api'
});

console.log('API BaseURL:', api.defaults.baseURL);

// 建立請求攔截器，自動注入登入者資訊與啟動進度條
let activeRequests = 0;

api.interceptors.request.use(config => {
  if (activeRequests === 0) {
    NProgress.start();
    window.dispatchEvent(new Event('api-load-start'));
  }
  activeRequests++;

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
  activeRequests--;
  if (activeRequests <= 0) {
    activeRequests = 0;
    NProgress.done();
    window.dispatchEvent(new Event('api-load-end'));
  }
  return Promise.reject(error);
});

// 建立回應攔截器，關閉進度條
api.interceptors.response.use(response => {
  activeRequests--;
  if (activeRequests <= 0) {
    activeRequests = 0;
    NProgress.done();
    window.dispatchEvent(new Event('api-load-end'));
  }
  return response;
}, error => {
  activeRequests--;
  if (activeRequests <= 0) {
    activeRequests = 0;
    NProgress.done();
    window.dispatchEvent(new Event('api-load-end'));
  }
  return Promise.reject(error);
});

export default api;
