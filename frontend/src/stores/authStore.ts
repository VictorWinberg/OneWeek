import { create } from 'zustand';
import { authApi } from '@/services/api';

interface User {
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  login: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const { isAuthenticated } = await authApi.getStatus();

      if (isAuthenticated) {
        const user = await authApi.getMe();
        set({ isAuthenticated: true, user, isLoading: false });
      } else {
        set({ isAuthenticated: false, user: null, isLoading: false });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ isAuthenticated: false, user: null, isLoading: false, error: 'Failed to check authentication' });
    }
  },

  login: () => {
    authApi.login();
  },

  logout: async () => {
    try {
      await authApi.logout();
      set({ isAuthenticated: false, user: null });
    } catch (error) {
      console.error('Logout failed:', error);
      set({ error: 'Failed to logout' });
    }
  },

  clearError: () => set({ error: null }),
}));

