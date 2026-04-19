import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8081";

export const fetchLogs = ({ limit = 100, offset = 0, type } = {}) => {
  const params = { limit, offset };
  if (type) params.type = type;
  return axios.get(`${BASE}/api/logs`, { params }).then((r) => r.data);
};

export const fetchStats = () =>
  axios.get(`${BASE}/api/stats`).then((r) => r.data);

export const fetchTopIps = (limit = 10) =>
  axios.get(`${BASE}/api/top-ips`, { params: { limit } }).then((r) => r.data);
