import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('reelearn_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthSubmission = ['/auth/login', '/auth/register']
        .some((path) => requestUrl.endsWith(path));
      if (!isAuthSubmission) {
        localStorage.removeItem('reelearn_token');
        window.location.href = '/login';
      }
    }
    if (!error.response || error.response.status >= 500) {
      window.dispatchEvent(new CustomEvent('reelearn:connection-error', {
        detail: { offline: !navigator.onLine }
      }));
    }
    return Promise.reject(error);
  }
);

export default api;
