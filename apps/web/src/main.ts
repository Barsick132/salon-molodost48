import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import './styles/main.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

// Apply dynamic favicon once the public site settings load. Until then the
// static /favicon.svg in index.html stays in place — no broken tab icon.
import { useSiteStore } from './stores/site';
const site = useSiteStore();
site.fetch().then(() => {
  const url = site.settings.faviconUrl;
  if (!url) return;
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = url.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  link.href = url;
});