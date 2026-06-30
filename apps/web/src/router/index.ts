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
      // masters route intentionally removed in v1
      { path: 'gallery', name: 'gallery', component: () => import('@/pages/public/GalleryPage.vue') },
      { path: 'promotions', name: 'promotions', component: () => import('@/pages/public/PromotionsPage.vue') },
      { path: 'reviews', name: 'reviews', component: () => import('@/pages/public/ReviewsPage.vue') },
      { path: 'faq', name: 'faq', component: () => import('@/pages/public/FaqPage.vue') },
      { path: 'vacancies', name: 'vacancies', component: () => import('@/pages/public/VacanciesPage.vue') },
      { path: 'contacts', name: 'contacts', component: () => import('@/pages/public/ContactsPage.vue') },
      { path: 'p/:slug', name: 'static-page', component: () => import('@/pages/public/StaticPageView.vue') },
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
      { path: '', name: 'admin-dashboard', component: () => import('@/pages/admin/DashboardPage.vue') },
      { path: 'blocks', name: 'admin-blocks', component: () => import('@/pages/admin/BlocksPage.vue') },
      { path: 'services', name: 'admin-services', component: () => import('@/pages/admin/ServicesPage.vue') },
      { path: 'gallery', name: 'admin-gallery', component: () => import('@/pages/admin/GalleryPage.vue') },
      { path: 'promotions', name: 'admin-promotions', component: () => import('@/pages/admin/PromotionsPage.vue') },
      { path: 'rooms', name: 'admin-rooms', component: () => import('@/pages/admin/RoomsPage.vue') },
      { path: 'reviews', name: 'admin-reviews', component: () => import('@/pages/admin/ReviewsPage.vue') },
      { path: 'faq', name: 'admin-faq', component: () => import('@/pages/admin/FaqPage.vue') },
      { path: 'vacancies', name: 'admin-vacancies', component: () => import('@/pages/admin/VacanciesPage.vue') },
      { path: 'pages', name: 'admin-pages', component: () => import('@/pages/admin/PagesAdminPage.vue') },
      { path: 'media', name: 'admin-media', component: () => import('@/pages/admin/MediaPage.vue') },
      { path: 'navigation', name: 'admin-navigation', component: () => import('@/pages/admin/NavigationPage.vue') },
      { path: 'settings', name: 'admin-settings', component: () => import('@/pages/admin/SettingsPage.vue') },
      { path: 'users', name: 'admin-users', component: () => import('@/pages/admin/UsersPage.vue') },
      { path: 'audit', name: 'admin-audit', component: () => import('@/pages/admin/AuditPage.vue') },
      { path: 'import', name: 'admin-import', component: () => import('@/pages/admin/ImportPage.vue') },
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

// Auth guard for admin
router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) {
      return { name: 'admin-login', query: { redirect: to.fullPath } };
    }
  }
  return true;
});

import { useAuthStore } from '@/stores/auth';