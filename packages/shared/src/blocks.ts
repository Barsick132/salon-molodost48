import { z } from 'zod';

/**
 * Landing-page block type enum.
 *
 * The actual `payload` shape per type lives in apps/api/src/routes/blocks.admin.ts
 * (it's where validation happens). This package only needs the type discriminator.
 */
export const BlockType = z.enum([
  'hero',
  'stats',
  'advantages',
  'cta-strip',
]);
export type BlockType = z.infer<typeof BlockType>;