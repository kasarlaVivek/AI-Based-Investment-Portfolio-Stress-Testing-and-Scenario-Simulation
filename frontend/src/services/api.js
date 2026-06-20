import axios from 'axios';

// API base URL is configurable per environment via Vite env vars.
// Set VITE_API_BASE_URL in a .env file (see .env.example). Falls back to the
// local backend for development.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const TOKEN_KEY = 'access_token';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: async (email, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, { email, password });
    return response.data;
  },

  login: async (email, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
    localStorage.setItem(TOKEN_KEY, response.data.access_token);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY),
};

export const portfolioService = {
  list: async () => {
    const response = await apiClient.get('/portfolio/');
    return response.data;
  },

  get: async (id) => {
    const response = await apiClient.get(`/portfolio/${id}`);
    return response.data;
  },

  delete: async (id) => {
    await apiClient.delete(`/portfolio/${id}`);
  },

  upload: async (name, file) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);
    const response = await apiClient.post('/portfolio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  runSimulation: async (id) => {
    const response = await apiClient.post(`/portfolio/${id}/simulate`);
    return response.data;
  },

  getSimulationResults: async (id) => {
    const response = await apiClient.get(`/portfolio/${id}/simulation-results`);
    return response.data;
  },

  getRiskAnalysis: async (id) => {
    const response = await apiClient.get(`/portfolio/${id}/risk-analysis`);
    return response.data;
  },

  getSuggestions: async (id) => {
    const response = await apiClient.get(`/portfolio/${id}/suggestions`);
    return response.data;
  },

  getHistoricalData: async (symbol) => {
    const response = await apiClient.get(`/portfolio/market/${symbol}/history`);
    return response.data;
  },

  getEfficientFrontier: async (id) => {
    const response = await apiClient.get(`/portfolio/${id}/efficient-frontier`);
    return response.data;
  },

  getSectorExposure: async (id) => {
    const response = await apiClient.get(`/portfolio/${id}/sector-exposure`);
    return response.data;
  },

  getBacktest: async (id, years = 5) => {
    const response = await apiClient.get(`/portfolio/${id}/backtest`, { params: { years } });
    return response.data;
  },

  getAssetSuggestions: async (id) => {
    const response = await apiClient.get(`/portfolio/${id}/asset-suggestions`);
    return response.data;
  },

  compare: async (ids) => {
    const response = await apiClient.get('/portfolio/compare', { params: { ids: ids.join(',') } });
    return response.data;
  },

  downloadReport: async (id, name) => {
    const response = await apiClient.get(`/portfolio/${id}/report`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(name || 'portfolio').replace(/\s+/g, '_')}_report.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
