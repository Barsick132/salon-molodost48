/**
 * Admin auth routes — login, logout, me, change password, update profile.
 *
 * Public: POST /api/admin/auth/login
 * Authed: POST /api/admin/auth/logout
 *         GET  /api/admin/auth/me
 *         PATCH /api/admin/auth/me          (displayName, email)
 *         POST /api/admin/auth/change-password (current, new)
 *
 * Password reset (forgot/reset) lives in admin.auth.password-reset.ts and is
 * only enabled when SMTP is configured (SMTP_HOST env var set).
 */

import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const LoginBody = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});

const UserResponse = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: z.string(),
});

const UpdateProfileBody = z.object({
  displayName: z.string().min(1).max(120).optional(),
  email: z.string().email().max(254).optional(),
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(8).max(256),
});

const OkResponse = z.object({ ok: z.boolean() });

function js(s: z.ZodType): unknown {
  return zodToJsonSchema(s, { target: 'jsonSchema7' });
}

export default async function adminAuthRoutes(app: FastifyInstance) {
  // POST /api/admin/auth/login
  app.post('/auth/login', {
    config: { rateLimit: { max: 8, timeWindow: '1 minute' } },
    schema: {
      body: js(LoginBody),
      response: { 200: js(z.object({ user: UserResponse })) },
    },
  }, async (req, reply) => {
    const { email, password } = req.body as z.infer<typeof LoginBody>;

    const user = await app.prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) {
      // Constant-time-ish delay to discourage user enumeration
      await bcrypt.compare(password, '$2a$12$abcdefghijklmnopqrstuv').catch(() => false);
      reply.code(401).send({ error: { code: 'invalid_credentials', message: 'Неверный email или пароль' } });
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      reply.code(401).send({ error: { code: 'invalid_credentials', message: 'Неверный email или пароль' } });
      return;
    }

    await app.auth.issueSession(reply, user, {
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
      request: req,
    });
    await app.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  });

  // POST /api/admin/auth/logout
  app.post('/auth/logout', {
    preHandler: [app.auth.requireAdmin],
    schema: { response: { 200: js(OkResponse) } },
  }, async (req, reply) => {
    await app.auth.revokeSession(req, reply);
    return { ok: true };
  });

  // GET /api/admin/auth/me
  app.get('/auth/me', {
    preHandler: [app.auth.requireAdmin],
    schema: { response: { 200: js(z.object({ user: UserResponse })) } },
  }, async (req) => {
    return { user: req.adminUser };
  });

  // PATCH /api/admin/auth/me — update displayName / email
  app.patch('/auth/me', {
    preHandler: [app.auth.requireAdmin],
    schema: { body: js(UpdateProfileBody) },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof UpdateProfileBody>;
    if (!body.displayName && !body.email) {
      reply.code(400).send({ error: { code: 'no_changes', message: 'Nothing to update' } });
      return;
    }
    if (body.email) {
      const existing = await app.prisma.adminUser.findFirst({
        where: { email: body.email.toLowerCase(), NOT: { id: req.adminUser!.id } },
      });
      if (existing) {
        reply.code(409).send({ error: { code: 'email_taken', message: 'Email уже используется' } });
        return;
      }
    }
    const updated = await app.prisma.adminUser.update({
      where: { id: req.adminUser!.id },
      data: {
        ...(body.displayName ? { displayName: body.displayName } : {}),
        ...(body.email ? { email: body.email.toLowerCase() } : {}),
      },
    });
    req.adminUser = {
      id: updated.id, email: updated.email,
      displayName: updated.displayName, role: updated.role,
    };
    return { user: req.adminUser };
  });

  // POST /api/admin/auth/change-password
  app.post('/auth/change-password', {
    preHandler: [app.auth.requireAdmin],
    schema: { body: js(ChangePasswordBody) },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof ChangePasswordBody>;
    const user = await app.prisma.adminUser.findUnique({ where: { id: req.adminUser!.id } });
    if (!user) {
      reply.code(401).send({ error: { code: 'unauthorized', message: 'User not found' } });
      return;
    }
    const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!ok) {
      reply.code(400).send({ error: { code: 'wrong_password', message: 'Текущий пароль неверен' } });
      return;
    }
    const newHash = await bcrypt.hash(body.newPassword, 12);
    await app.prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });
    // Invalidate all other sessions, keep this one
    await app.prisma.adminSession.deleteMany({
      where: { userId: user.id, NOT: { id: req.adminSessionId! } },
    });
    return { ok: true };
  });
}