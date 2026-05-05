import { create } from 'zustand';
import type { User } from '@/types';

interface UserState {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),

  login: async (username: string, password: string) => {
    const { login: apiLogin } = await import('@/api/user');
    const data = await apiLogin(username, password);
    localStorage.setItem('token', data.token);
    set({ user: { user_id: data.user_id, username: data.username, token: data.token }, token: data.token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));
