<script setup lang="ts">
/**
 * Admin login page.
 *
 * - Email + password fields with show/hide toggle for password.
 * - "Запомнить меня" toggle — when on, the session persists across browser
 *   restarts for 30 days. When off, the cookie still persists but expires in
 *   24 hours, so logging out / browser restart kicks the user out within a day.
 * - Server-side rate limit is 8 attempts/min/IP — we surface server errors
 *   verbatim.
 */
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter, useRoute } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const remember = ref(true);
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);

const canSubmit = computed(() => email.value.includes('@') && password.value.length > 0 && !loading.value);

async function submit() {
  if (!canSubmit.value) return;
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value, remember.value);
    const redirect = (route.query.redirect as string) || '/admin';
    router.replace(redirect);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка входа';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg" aria-hidden="true">
      <div class="login-bg__grid" />
      <div class="login-bg__glow" />
    </div>

    <form class="login-card" @submit.prevent="submit" novalidate>
      <div class="login-brand">
        <span class="login-brand__dot" />
        <span class="login-brand__text">Молодость · admin</span>
      </div>
      <h1>Вход</h1>
      <p class="login-lead">Войдите, чтобы управлять сайтом</p>

      <label class="field">
        <span class="field__label">Email</span>
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          autofocus
          required
          placeholder="support@molodost48.ru"
        />
      </label>

      <label class="field">
        <span class="field__label">Пароль</span>
        <div class="field__password">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            placeholder="••••••••"
          />
          <button
            type="button"
            class="field__toggle"
            @click="showPassword = !showPassword"
            :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
          >
            <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10.4 10.4 0 0112 5c5.4 0 9.5 4.5 10.5 6.5a10.7 10.7 0 01-3 4M6.6 6.6C4.1 8.3 2.4 11.5 1.5 13.5a16.2 16.2 0 003.3 4.7"/>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M1.5 12C2.5 9.5 6.5 5 12 5s9.5 4.5 10.5 7c-1 2.5-5 7-10.5 7s-9.5-4.5-10.5-7z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </label>

      <label class="remember">
        <input type="checkbox" v-model="remember" />
        <span class="remember__box">
          <svg v-if="remember" width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="remember__text">
          Запомнить меня
          <span class="remember__hint">{{ remember ? 'сессия 30 дней' : 'только эта сессия' }}</span>
        </span>
      </label>

      <button class="submit" type="submit" :disabled="!canSubmit">
        <span v-if="!loading">Войти</span>
        <span v-else class="submit__loading">
          <span class="spinner" aria-hidden="true" /> Входим…
        </span>
      </button>

      <p v-if="error" class="error" role="alert">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ error }}
      </p>
    </form>

    <p class="footer-note">Защищено JWT-cookie сессией · rate-limit 8/мин</p>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  background: var(--color-bg);
}

.login-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.login-bg__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(225, 29, 72, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(225, 29, 72, 0.04) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent 80%);
}
.login-bg__glow {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(225, 29, 72, 0.18), transparent 70%);
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  filter: blur(60px);
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.6);
}

.login-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
  font-weight: 600;
}
.login-brand__dot {
  width: 6px;
  height: 6px;
  background: var(--color-accent);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--color-accent);
}

h1 {
  font-family: var(--font-display);
  font-size: 1.85rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 0.4rem;
}
.login-lead {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}
.field__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}
.field input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.7rem 0.85rem;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  transition: border-color 0.15s ease;
}
.field input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.field__password {
  position: relative;
}
.field__password input {
  width: 100%;
  padding-right: 2.6rem;
}
.field__toggle {
  position: absolute;
  top: 50%;
  right: 0.6rem;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-text-muted);
  display: grid;
  place-items: center;
}
.field__toggle:hover {
  background: var(--color-surface-3);
  color: var(--color-text-primary);
}

.remember {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.5rem 0 1.5rem;
  cursor: pointer;
  user-select: none;
}
.remember input { position: absolute; opacity: 0; pointer-events: none; }
.remember__box {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
  color: white;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.remember input:checked + .remember__box {
  background: var(--color-accent);
  border-color: var(--color-accent);
}
.remember__text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.remember__hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.submit {
  width: 100%;
  padding: 0.85rem 1.25rem;
  background: var(--color-accent);
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.submit:hover:not(:disabled) {
  background: var(--color-accent-hover);
}
.submit:active:not(:disabled) { transform: translateY(1px); }
.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.submit__loading { display: inline-flex; align-items: center; gap: 0.5rem; }
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-md);
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--color-danger);
  font-size: 0.875rem;
}

.footer-note {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  z-index: 1;
}

@media (max-width: 480px) {
  .login-card { padding: 1.5rem; }
  h1 { font-size: 1.5rem; }
  .footer-note { font-size: 0.7rem; }
}
</style>