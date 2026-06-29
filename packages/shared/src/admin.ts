import { z } from 'zod';

/**
 * Admin user (one role only for v1: admin; expand to admin/editor later).
 */
export const AdminUser = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().max(80),
  role: z.enum(['admin', 'editor']).default('admin'),
  isActive: z.boolean(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
});

export const AdminLoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const AdminLoginResponse = z.object({
  user: AdminUser.omit({ passwordHash: true }),
  expiresAt: z.string(),
});

export type AdminUser = z.infer<typeof AdminUser>;
export type AdminLoginRequest = z.infer<typeof AdminLoginRequest>;

/**
 * Media library item.
 * Stored on disk under MEDIA_ROOT (default /var/lib/molodost48/uploads); URL is served by nginx.
 */
export const MediaItem = z.object({
  id: z.string(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().nonnegative().nullable().default(null),
  height: z.number().int().nonnegative().nullable().default(null),
  alt: z.string().max(280).default(''),
  url: z.string(),
  uploadedAt: z.string(),
});

export type MediaItem = z.infer<typeof MediaItem>;

/**
 * Master.
 */
export const Master = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  role: z.string().max(120).default(''),
  bio: z.string().max(4000).default(''),
  experienceYears: z.number().int().nonnegative().nullable().default(null),
  avatarMediaId: z.string().nullable().default(null),
  portfolioMediaIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  order: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

export type Master = z.infer<typeof Master>;

/**
 * Promotion / special offer.
 */
export const Promotion = z.object({
  id: z.string(),
  title: z.string().min(1).max(160),
  description: z.string().max(2000).default(''),
  coverMediaId: z.string().nullable().default(null),
  serviceIds: z.array(z.string()).default([]),
  discountPercent: z.number().int().min(0).max(100).nullable().default(null),
  discountFixed: z.number().int().nonnegative().nullable().default(null),
  validFrom: z.string().nullable().default(null),
  validUntil: z.string().nullable().default(null),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0),
});

export type Promotion = z.infer<typeof Promotion>;

/**
 * Gallery category + item.
 */
export const GalleryCategory = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  order: z.number().int().min(0),
});

export const GalleryItem = z.object({
  id: z.string(),
  categoryId: z.string(),
  mediaId: z.string(),
  caption: z.string().max(280).default(''),
  masterId: z.string().nullable().default(null),
  order: z.number().int().min(0),
});

export type GalleryCategory = z.infer<typeof GalleryCategory>;
export type GalleryItem = z.infer<typeof GalleryItem>;

/**
 * Room / interior space.
 */
export const Room = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().max(800).default(''),
  mediaIds: z.array(z.string()).default([]),
  order: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

export type Room = z.infer<typeof Room>;

/**
 * Review.
 */
export const Review = z.object({
  id: z.string(),
  authorName: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1).max(2000),
  source: z.string().max(80).default(''),
  avatarMediaId: z.string().nullable().default(null),
  publishedAt: z.string(),
  isApproved: z.boolean().default(false),
});

export type Review = z.infer<typeof Review>;

/**
 * FAQ.
 */
export const Faq = z.object({
  id: z.string(),
  question: z.string().min(1).max(280),
  answer: z.string().min(1).max(2000),
  category: z.string().max(80).default(''),
  order: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

export type Faq = z.infer<typeof Faq>;

/**
 * Vacancy.
 */
export const Vacancy = z.object({
  id: z.string(),
  title: z.string().min(1).max(160),
  description: z.string().max(4000).default(''),
  requirements: z.string().max(2000).default(''),
  salaryFrom: z.number().int().nonnegative().nullable().default(null),
  salaryTo: z.number().int().nonnegative().nullable().default(null),
  contactEmail: z.string().email().nullable().default(null),
  contactPhone: z.string().max(40).nullable().default(null),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
});

export type Vacancy = z.infer<typeof Vacancy>;

/**
 * Static page (e.g. privacy policy, offer agreement).
 */
export const StaticPage = z.object({
  id: z.string(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(160),
  body: z.string().max(50000),
  isPublished: z.boolean().default(true),
  updatedAt: z.string(),
});

export type StaticPage = z.infer<typeof StaticPage>;