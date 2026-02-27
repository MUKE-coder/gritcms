import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_URL,
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = getRefreshToken();
      if (!refresh) return Promise.reject(error);

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_URL}/api/auth/refresh`, { refresh_token: refresh })
            .then((res) => {
              const { access_token, refresh_token } = res.data.data;
              setTokens(access_token, refresh_token);
              return access_token as string;
            })
            .finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearTokens();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
