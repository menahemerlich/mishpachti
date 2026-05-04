import axios, { AxiosError, AxiosRequestConfig, AxiosInstance } from 'axios';
import { config } from './config';
import { useAuthStore } from '@/stores/authStore';

const STORAGE_KEY = 'mishpachti.auth.v1';

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
}

export function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function persistAuth(auth: StoredAuth | null) {
  if (!auth) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    cfg.headers = cfg.headers ?? {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) return null;
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${config.apiUrl}/auth/refresh`,
        { refreshToken },
      );
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      useAuthStore.getState().logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
