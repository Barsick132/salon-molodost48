/**
 * Email plugin — SMTP transport via nodemailer.
 *
 * Reads config from env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).
 * When SMTP_HOST is not set, app.email.send() is a no-op that logs the message
 * and returns { ok: false, reason: 'smtp_disabled' } so dev environments work
 * without SMTP.
 *
 * Usage:
 *   const result = await app.email.send({
 *     to: 'user@example.com',
 *     subject: 'Reset your password',
 *     html: '<p>Click <a href="...">here</a> to reset</p>',
 *   });
 */

import fp from 'fastify-plugin';
import nodemailer, { type Transporter } from 'nodemailer';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type EmailResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: 'smtp_disabled' | 'send_failed'; error?: string };

declare module 'fastify' {
  interface FastifyInstance {
    email: {
      isEnabled(): boolean;
      send(msg: EmailMessage): Promise<EmailResult>;
    };
  }
}

export default fp(async (app) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user ?? 'noreply@molodost48.ru';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  let transporter: Transporter | null = null;
  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      // Force IPv4: our VPS has no IPv6 connectivity, so default DNS lookup
      // that tries AAAA first will fail with ENETUNREACH.
      family: 4,
      auth: { user, pass },
      tls: { rejectUnauthorized: true },
    } as unknown as Parameters<typeof nodemailer.createTransport>[0]);
    app.log.info({ host, port, user, from }, 'SMTP transport initialized');
  } else {
    app.log.warn(
      'SMTP not configured (SMTP_HOST/USER/PASS missing). Email sends will be no-ops.',
    );
  }

  app.decorate('email', {
    isEnabled: () => transporter !== null,

    async send(msg: EmailMessage): Promise<EmailResult> {
      if (!transporter) {
        app.log.warn(
          { to: msg.to, subject: msg.subject },
          'SMTP disabled — would have sent email (content not logged)',
        );
        return { ok: false, reason: 'smtp_disabled' };
      }
      try {
        const info = await transporter.sendMail({
          from,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text ?? msg.html.replace(/<[^>]+>/g, ''),
          replyTo: msg.replyTo,
          headers: { 'X-Mailer': 'molodost48-api/1.0' },
        });
        app.log.info({ to: msg.to, messageId: info.messageId }, 'Email sent');
        return { ok: true, messageId: info.messageId };
      } catch (err) {
        app.log.error({ err, to: msg.to }, 'Email send failed');
        return {
          ok: false,
          reason: 'send_failed',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  });
}, { name: 'email' });