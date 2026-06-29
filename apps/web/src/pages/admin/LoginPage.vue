<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter, useRoute } from 'vue-router';
import { ref } from 'vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
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
    <form @submit.prevent="submit">
      <h1>Вход в админку</h1>
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Пароль" required />
      <button type="submit" :disabled="loading">{{ loading ? 'Входим…' : 'Войти' }}</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--color-bg);
}
form {
  width: 100%;
  max-width: 360px;
  padding: var(--space-8);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
h1 { font-size: var(--font-size-xl); }
input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}
button {
  background: var(--color-accent);
  color: white;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-weight: 600;
}
button:hover { background: var(--color-accent-hover); }
.error { color: var(--color-danger); font-size: var(--font-size-sm); }
</style>