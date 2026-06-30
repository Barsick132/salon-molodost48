/**
 * Admin password reset + email change via email tokens.
 *
 * Endpoints (public, rate-limited):
 *   POST /api/admin/auth/forgot-password  { email } → always 200 (no user enumeration)
 *   POST /api/admin/auth/reset-password   { token, newPassword }
 *   POST /api/admin/auth/confirm-email    { token }   (used for email change)
 *
 * Authed:
 *   POST /api/admin/auth/request-email-change { newEmail } → sends confirm link
 *
 * Flow:
 *   1. User submits email → server generates random 32-byte token,
 *      stores sha256(token) with TTL 1h
 *   2. Server emails the raw token URL: https://.../reset?token=<raw>
 *   3. User clicks link, submits token + new password
 *   4. Server hashes token, looks up row, marks used, updates passwordHash
 */

import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const TOKEN_TTL_HOURS = 1;
const RESET_URL_BASE = process.env.PUBLIC_BASE_URL ?? 'https://molodost48.ru';

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function generateToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('base64url');
  return { raw, hash: sha256(raw) };
}

function js(s: z.ZodType): unknown {
  return zodToJsonSchema(s, { target: 'jsonSchema7' });
}

const ForgotBody = z.object({ email: z.string().email().max(254) });
const ResetBody = z.object({
  token: z.string().min(20).max(200),
  newPassword: z.string().min(8).max(256),
});
const ConfirmEmailBody = z.object({ token: z.string().min(20).max(200) });
const RequestEmailChangeBody = z.object({ newEmail: z.string().email().max(254) });

export default async function passwordResetRoutes(app: FastifyInstance) {
  // POST /api/admin/auth/forgot-password
  app.post('/auth/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    schema: { body: js(ForgotBody) },
  }, async (req, reply) => {
    const { email } = req.body as z.infer<typeof ForgotBody>;
    const user = await app.prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });

    // Always 200 to avoid user enumeration
    if (user && user.isActive) {
      const { raw, hash } = generateToken();
      const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
      await app.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt,
          ipAddress: req.ip,
        },
      });
      const resetUrl = `${RESET_URL_BASE}/admin/reset?token=${encodeURIComponent(raw)}`;
      const result = await app.email.send({
        to: user.email,
        subject: 'Сброс пароля — Молодость',
        html: `
          <p>Здравствуйте, ${escapeHtml(user.displayName || user.email)}!</p>
          <p>Кто-то (возможно, вы) запросил сброс пароля для вашего аккаунта администратора.</p>
          <p>Для установки нового пароля перейдите по ссылке (действительна ${TOKEN_TTL_HOURS} ч):</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#E11D48;color:white;border-radius:6px;text-decoration:none">Сбросить пароль</a></p>
          <p>Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
          <hr><small>Ссылка: ${resetUrl}</small>
        `,
      });
      app.log.info({ userId: user.id, smtpOk: result.ok }, 'Password reset requested');
    } else {
      app.log.info({ email }, 'Password reset requested for non-existent user');
    }
    return { ok: true };
  });

  // POST /api/admin/auth/reset-password
  app.post('/auth/reset-password', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    schema: { body: js(ResetBody) },
  }, async (req, reply) => {
    const { token, newPassword } = req.body as z.infer<typeof ResetBody>;
    const tokenHash = sha256(token);
    const row = await app.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      reply.code(400).send({ error: { code: 'invalid_token', message: 'Ссылка недействительна или истекла' } });
      return;
    }
    if (!row.user.isActive) {
      reply.code(400).send({ error: { code: 'user_disabled', message: 'Аккаунт отключён' } });
      return;
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    await app.prisma.$transaction([
      app.prisma.adminUser.update({
        where: { id: row.userId },
        data: { passwordHash: newHash },
      }),
      app.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate ALL sessions on password change
      app.prisma.adminSession.deleteMany({ where: { userId: row.userId } }),
    ]);
    app.log.info({ userId: row.userId }, 'Password reset completed');
    return { ok: true };
  });

  // POST /api/admin/auth/request-email-change (authed)
  app.post('/auth/request-email-change', {
    preHandler: [app.auth.requireAdmin],
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    schema: { body: js(RequestEmailChangeBody) },
  }, async (req, reply) => {
    const { newEmail } = req.body as z.infer<typeof RequestEmailChangeBody>;
    const targetEmail = newEmail.toLowerCase();

    if (targetEmail === req.adminUser!.email) {
      reply.code(400).send({ error: { code: 'same_email', message: 'Это уже ваш текущий email' } });
      return;
    }
    const existing = await app.prisma.adminUser.findUnique({ where: { email: targetEmail } });
    if (existing) {
      reply.code(409).send({ error: { code: 'email_taken', message: 'Email уже используется' } });
      return;
    }
    const { raw, hash } = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
    await app.prisma.emailChangeRequest.create({
      data: { userId: req.adminUser!.id, newEmail: targetEmail, tokenHash: hash, expiresAt },
    });
    const confirmUrl = `${RESET_URL_BASE}/admin/confirm-email?token=${encodeURIComponent(raw)}`;
    await app.email.send({
      to: targetEmail,
      subject: 'Подтверждение нового email — Молодость',
      html: `
        <p>Кто-то запросил смену email на этот адрес для аккаунта администратора «${escapeHtml(req.adminUser!.displayName)}».</p>
        <p>Для подтверждения перейдите по ссылке (действительна ${TOKEN_TTL_HOURS} ч):</p>
        <p><a href="${confirmUrl}" style="display:inline-block;padding:10px 20px;background:#E11D48;color:white;border-radius:6px;text-decoration:none">Подтвердить</a></p>
        <p>Если это были не вы — проигнорируйте письмо, email не изменится.</p>
      `,
    });
    return { ok: true };
  });

  // POST /api/admin/auth/confirm-email
  app.post('/auth/confirm-email', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    schema: { body: js(ConfirmEmailBody) },
  }, async (req, reply) => {
    const { token } = req.body as z.infer<typeof ConfirmEmailBody>;
    const tokenHash = sha256(token);
    const row = await app.prisma.emailChangeRequest.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      reply.code(400).send({ error: { code: 'invalid_token', message: 'Ссылка недействительна или истекла' } });
      return;
    }
    const conflict = await app.prisma.adminUser.findUnique({ where: { email: row.newEmail } });
    if (conflict) {
      reply.code(409).send({ error: { code: 'email_taken', message: 'Email уже занят другим аккаунтом' } });
      return;
    }
    await app.prisma.$transaction([
      app.prisma.adminUser.update({
        where: { id: row.userId },
        data: { email: row.newEmail },
      }),
      app.prisma.emailChangeRequest.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);
    app.log.info({ userId: row.userId, newEmail: row.newEmail }, 'Email change confirmed');
    return { ok: true };
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}