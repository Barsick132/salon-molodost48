/**
 * Admin media upload — multipart file uploads to /var/lib/molodost48/uploads.
 *
 * POST /api/admin/media       multipart/form-data; field name 'file'
 *    → { url, filename, size, mime }
 *
 * MIME types accepted: image/jpeg, image/png, image/webp, image/svg+xml.
 * Size cap: 12 MB.
 * Files are stored with a random cuid prefix to avoid collisions and preserve
 * the original filename hint in metadata.
 */

import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import path from 'node:path';

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

function safeFilename(original: string): string {
  // Keep just the basename, strip path separators and extension chars
  const base = original.replace(/[\\/]/g, '_');
  // Replace non-ascii and a few pesky chars
  return base.replace(/[^\w.\-]+/g, '_').slice(0, 80);
}

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.auth.requireAdmin);

  app.post('/media', {
    config: { rateLimit: { max: 12, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    if (!req.isMultipart()) {
      reply.code(400).send({ error: { code: 'invalid', message: 'Expected multipart/form-data with field "file"' } });
      return;
    }
    const file = await req.file();
    if (!file) {
      reply.code(400).send({ error: { code: 'no_file', message: 'No file field' } });
      return;
    }
    if (!ALLOWED.has(file.mimetype)) {
      reply.code(415).send({
        error: { code: 'unsupported_type', message: `Unsupported type: ${file.mimetype}` },
      });
      return;
    }

    const buf = await file.toBuffer();
    if (buf.length > 12 * 1024 * 1024) {
      reply.code(413).send({ error: { code: 'too_large', message: 'File exceeds 12 MB' } });
      return;
    }

    const ext = path.extname(file.filename || '').toLowerCase() || extFromMime(file.mimetype);
    const name = `${randomUUID()}${ext}`;
    const fs = await import('node:fs/promises');
    const dest = path.join(config.MEDIA_ROOT, name);
    await fs.writeFile(dest, buf);
    await fs.chmod(dest, 0o644);

    const url = `${config.MEDIA_PUBLIC_BASE}/${name}`;
    reply.header('Location', url);
    return {
      url,
      filename: safeFilename(file.filename || name),
      storedAs: name,
      size: buf.length,
      mime: file.mimetype,
      originalName: file.filename,
    };
  });

  // DELETE /api/admin/media/:filename — remove an upload (best-effort)
  app.delete<{ Params: { filename: string } }>('/media/:filename', async (req, reply) => {
    const name = path.basename(req.params.filename);
    if (name.includes('/') || name.includes('\\') || !name) {
      reply.code(400).send({ error: { code: 'bad_name', message: 'Invalid filename' } });
      return;
    }
    const fs = await import('node:fs/promises');
    const dest = path.join(config.MEDIA_ROOT, name);
    try {
      await fs.unlink(dest);
      return { ok: true };
    } catch (err: any) {
      if (err && err.code === 'ENOENT') {
        reply.code(404).send({ error: { code: 'not_found', message: 'File not found' } });
        return;
      }
      throw err;
    }
  });
};

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/svg+xml') return '.svg';
  return '';
}

export default plugin;