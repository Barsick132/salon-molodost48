import { z } from 'zod';

/**
 * Common API response shapes.
 */

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const Pagination = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(200),
  total: z.number().int().nonnegative(),
});

export const PaginatedList = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    pagination: Pagination,
  });

export type ApiError = z.infer<typeof ApiError>;
export type Pagination = z.infer<typeof Pagination>;