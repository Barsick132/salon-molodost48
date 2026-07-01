/**
 * Blocks store — public + admin share the same shape.
 * The public homepage reads blocks from /api/blocks and renders them by `type`.
 * Admin mutations also flow through here so the editor previews live.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';

export type BlockType = 'hero' | 'stats' | 'advantages' | 'cta-strip';

export interface BlockBase {
  id: string;
  type: BlockType;
  enabled: boolean;
  order: number;
  payload: Record<string, unknown>;
}

export interface HeroPayload {
  eyebrow: string;
  titleBefore: string;
  titleAccent: string;
  titleAfter: string;
  /** Legacy single-string title (used when the new fields are empty). */
  title: string;
  lead: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  imageUrl: string;
  imageOverlay: number;
  textAlign: 'top' | 'center' | 'bottom';
  textAlignHorizontal: 'left' | 'center' | 'right';
  showScrollCue: boolean;
}
export interface StatItem { value: string; label: string; }
export interface AdvantageItem { icon: string; title: string; description: string; }
export interface CtaStripPayload {
  eyebrow: string;
  title: string;
  lead: string;
  ctaLabel: string;
  ctaHref: string;
}

export const useBlocksStore = defineStore('blocks', () => {
  const blocks = ref<BlockBase[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchPublic() {
    loading.value = true;
    error.value = null;
    try {
      const res = await api<{ blocks: BlockBase[] }>('/blocks');
      blocks.value = res.blocks;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'failed to fetch blocks';
    } finally {
      loading.value = false;
    }
  }

  async function fetchAdmin() {
    loading.value = true;
    error.value = null;
    try {
      const res = await api<{ blocks: BlockBase[] }>('/admin/blocks');
      blocks.value = res.blocks;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'failed to fetch blocks';
    } finally {
      loading.value = false;
    }
  }

  return { blocks, loading, error, fetchPublic, fetchAdmin };
});