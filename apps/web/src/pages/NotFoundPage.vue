<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useSiteStore } from '@/stores/site';

const route = useRoute();
const router = useRouter();
const site = useSiteStore();

function goHome() {
  router.push('/');
}
</script>

<template>
  <div class="nf">
    <div class="nf__bg" aria-hidden="true">
      <div class="nf__bg-grid"></div>
      <div class="nf__bg-glow"></div>
    </div>
    <div class="nf__card">
      <div class="nf__code">404</div>
      <h1>Страница не найдена</h1>
      <p>
        Запрашиваемый путь <code>{{ route.fullPath }}</code> не существует
        или был перемещён. Проверьте адрес или вернитесь на главную.
      </p>
      <button class="nf__btn" @click="goHome">На главную</button>
    </div>
  </div>
</template>

<style scoped>
.nf {
  min-height: 70vh;
  display: grid;
  place-items: center;
  position: relative;
  padding: 3rem 1.5rem;
  overflow: hidden;
}
.nf__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.nf__bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(225, 29, 72, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(225, 29, 72, 0.04) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent 80%);
}
.nf__bg-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(225, 29, 72, 0.18), transparent 70%);
  top: -150px;
  left: 50%;
  transform: translateX(-50%);
  filter: blur(50px);
}

.nf__card {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 520px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 3rem 2rem;
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.5);
}
.nf__code {
  font-family: var(--font-display);
  font-size: 6rem;
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1;
  background: linear-gradient(135deg, #ff4d6d 0%, #e11d48 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
}
h1 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
}
p {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  margin: 0 0 1.5rem;
  line-height: 1.5;
}
code {
  background: var(--color-surface-3);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.875em;
  word-break: break-all;
}
.nf__btn {
  display: inline-flex;
  align-items: center;
  padding: 0.85rem 1.75rem;
  background: var(--color-accent);
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease;
}
.nf__btn:hover { background: var(--color-accent-hover); }
</style>