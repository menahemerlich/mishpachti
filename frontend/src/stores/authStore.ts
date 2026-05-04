import { create } from 'zustand';
import { User, AuthResponse } from '@/types/models';
import { loadStoredAuth, persistAuth } from '@/lib/apiClient';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (auth: AuthResponse) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  setSession: (auth) => {
    persistAuth({ accessToken: auth.accessToken, refreshToken: auth.refreshToken });
    set({
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      user: auth.user,
    });
  },
  setTokens: (accessToken, refreshToken) => {
    persistAuth({ accessToken, refreshToken });
    set({ accessToken, refreshToken });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    persistAuth(null);
    set({ accessToken: null, refreshToken: null, user: null });
  },
  hydrate: () => {
    const stored = loadStoredAuth();
    set({
      accessToken: stored?.accessToken ?? null,
      refreshToken: stored?.refreshToken ?? null,
      hydrated: true,
    });
  },
}));
