import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../page/Dashboard.vue'),
  },
  {
    path: '/subscription',
    name: 'Subscription',
    component: () => import('../page/Subscription.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../page/Settings.vue'),
  },
  {
    path: '/memory-logger',
    name: 'MemoryLogger',
    component: () => import('../page/MemoryLogger.vue'),
  },
  {
    path: '/auto-profile',
    name: 'AutoProfile',
    component: () => import('../page/AutoProfile.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
