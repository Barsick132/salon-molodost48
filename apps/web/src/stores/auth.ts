import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/client';
import type { AdminUser } from '@molodost/shared';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null);
  const isAuthenticated = computed(() => user.value !== null);

  async function check() {
    try {
      user.value = await api<AdminUser>('/admin/auth/me');
    } catch {
      user.value = null;
    }
  }

  async function login(email: string, password: string) {
    const res = await api<{ user: AdminUser }>('/admin/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    user.value = res.user;
  }

  async function logout() {
    try {
      await api('/admin/auth/logout', { method: 'POST' });
    } finally {
      user.value = null;
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await api('/admin/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  }

  async function requestEmailChange(newEmail: string) {
    await api('/admin/auth/request-email-change', {
      method: 'POST',
      body: { newEmail },
    });
  }

  async function updateProfile(data: { displayName?: string; email?: string }) {
    const res = await api<{ user: AdminUser }>('/admin/auth/me', {
      method: 'PATCH',
      body: data,
    });
    user.value = res.user;
  }

  return { user, isAuthenticated, check, login, logout, changePassword, requestEmailChange, updateProfile };
});