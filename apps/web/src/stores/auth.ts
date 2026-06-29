import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/client';
import type { AdminUser } from '@molodost/shared';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null);
  const isAuthenticated = computed(() => user.value !== null);

  async function check() {
    try {
      user.value = await api<AdminUser>('/admin/me');
    } catch {
      user.value = null;
    }
  }

  async function login(email: string, password: string) {
    const res = await api<{ user: AdminUser }>('/admin/login', {
      method: 'POST',
      body: { email, password },
    });
    user.value = res.user;
  }

  async function logout() {
    try {
      await api('/admin/logout', { method: 'POST' });
    } finally {
      user.value = null;
    }
  }

  return { user, isAuthenticated, check, login, logout };
});