import { HttpRoute } from '@coreforge/contracts';

import { HttpRouteValidator } from './HttpRouteValidator';

function deepCloneAndSanitize<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  if (seen.has(value)) {
    return '[Circular]' as unknown as T;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const copy = value.map((item) => deepCloneAndSanitize(item, seen));
    return copy as unknown as T;
  }

  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    copy[k] = deepCloneAndSanitize(v, seen);
  }

  return copy as unknown as T;
}

function deepFreeze<T>(obj: T, seen = new WeakSet<object>()): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return obj;
  }

  seen.add(obj);

  Object.freeze(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        deepFreeze(item, seen);
      }
    }
  } else {
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object') {
        deepFreeze(val, seen);
      }
    }
  }

  return obj;
}

export class HttpRouteSnapshot {
  public static normalizePath(path: string): string {
    let normalized = path.trim();
    if (!normalized.startsWith('/')) {
      normalized = `/${normalized}`;
    }

    // Collapse multiple consecutive slashes
    normalized = normalized.replace(/\/+/g, '/');

    // Remove trailing slash unless path is '/'
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }

  public static create(route: unknown): Readonly<HttpRoute> {
    const validated = HttpRouteValidator.validate(route);
    const normalizedPath = HttpRouteSnapshot.normalizePath(validated.path);

    const clonedMetadata = validated.metadata
      ? (deepCloneAndSanitize(validated.metadata) as Record<string, unknown>)
      : undefined;

    const frozenMetadata = clonedMetadata ? deepFreeze(clonedMetadata) : undefined;

    const snapshot: HttpRoute = {
      id: validated.id,
      method: validated.method,
      path: normalizedPath,
      operation: validated.operation,
      priority: validated.priority,
      metadata: frozenMetadata,
    };

    return Object.freeze(snapshot);
  }
}
