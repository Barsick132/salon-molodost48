import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import PublicLayout from '@/layouts/PublicLayout.vue';
import AdminLayout from '@/layouts/AdminLayout.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: PublicLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/pages/public/HomePage.vue') },
      { path: 'services', name: 'services', component: () => import('@/pages/public/ServicesPage.vue') },
      { path: 'contacts', name: 'contacts', component: () => import('@/pages/public/ContactsPage.vue') },
    ],
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/pages/admin/LoginPage.vue'),
    meta: { layout: 'blank' },
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/admin/services' },
      { path: 'services', name: 'admin-services', component: () => import('@/pages/admin/ServicesPage.vue') },
      { path: 'blocks', name: 'admin-blocks', component: () => import('@/pages/admin/BlocksPage.vue') },
      { path: 'settings', name: 'admin-settings', component: () => import('@/pages/admin/SettingsPage.vue') },
      { path: 'integrations', name: 'admin-integrations', component: () => import('@/pages/admin/IntegrationsPage.vue') },
    ],
  },
  { path: '/:catchAll(.*)*', name: 'not-found', component: () => import('@/pages/NotFoundPage.vue') },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) {
      await authStore.check();
    }
    if (!authStore.isAuthenticated) {
      return { name: 'admin-login', query: { redirect: to.fullPath } };
    }
  }
  return true;
});

import { useAuthStore } from '@/stores/auth';