import axios, { AxiosInstance, AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

function toSnakeCase(obj: any, skipKeys: Set<string> = new Set()): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => toSnakeCase(item, skipKeys));
  if (typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
    // Don't convert inner content of allOptions/otherSettings - they need to stay as-is for paddlelabel
    if (snakeKey === 'all_options' || snakeKey === 'other_settings') {
      result[snakeKey] = obj[key];
    } else {
      result[snakeKey] = toSnakeCase(obj[key], skipKeys);
    }
  }
  return result;
}

function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = toCamelCase(obj[key]);
  }
  return result;
}

const client: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  if (config.data && typeof config.data === 'object') {
    config.data = toSnakeCase(config.data);
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = toCamelCase(response.data);
    }
    return response;
  },
  (error: AxiosError<{ title?: string }>) => {
    if (error.response?.data?.title) {
      throw new Error(error.response.data.title);
    }
    throw error;
  }
);

export default client;