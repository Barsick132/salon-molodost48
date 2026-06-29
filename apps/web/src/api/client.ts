/**
 * API client — fetch wrapper with credentials and CSRF.
 */

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type JsonValue = unknown;
interface RequestOptions {
  body?: JsonValue | FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  method?: string;
  signal?: AbortSignal;
  cache?: RequestCache;
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers = new Headers(opts.headers);
  if (opts.body !== undefined && !(opts.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'include',
    signal: opts.signal,
    cache: opts.cache,
  };

  if (opts.body !== undefined) {
    if (opts.body instanceof FormData) {
      init.body = opts.body;
    } else {
      init.body = JSON.stringify(opts.body);
    }
  }

  const res = await fetch(url.toString(), init);
  if (!res.ok) {
    let payload: { error?: { code: string; message: string; details?: Record<string, unknown> } } | null = null;
    try {
      payload = await res.json();
    } catch {
      /* not JSON */
    }
    throw new ApiError(
      res.status,
      payload?.error?.code ?? 'unknown',
      payload?.error?.message ?? `HTTP ${res.status}`,
      payload?.error?.details,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}