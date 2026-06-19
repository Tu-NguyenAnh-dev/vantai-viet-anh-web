/**
 * API client - Axios instance with auth & error handling.
 * Interceptor trả về `response.data` (body JSON), không phải AxiosResponse.
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { APP_CONFIG } from '@/config';

const rawAxios = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

rawAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

rawAxios.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
      localStorage.removeItem(APP_CONFIG.USER_KEY);
      window.location.href = '/login';
    }
    const raw = error.response?.data?.message;
    let text: string;
    if (Array.isArray(raw)) {
      text = raw.map((m) => String(m)).join('; ');
    } else if (raw != null && typeof raw === 'object') {
      text = JSON.stringify(raw);
    } else {
      text = (typeof raw === 'string' ? raw : undefined) ?? error.message ?? 'Có lỗi xảy ra';
    }
    return Promise.reject(new Error(text));
  },
);

/** Client đã unwrap body — dùng generic `get<T>()` / `post<T>()`. */
export type ApiClient = Omit<
  AxiosInstance,
  'get' | 'post' | 'put' | 'patch' | 'delete' | 'request' | 'head' | 'options'
> & {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  request<T = unknown>(config: AxiosRequestConfig): Promise<T>;
};

export const apiClient = rawAxios as unknown as ApiClient;
