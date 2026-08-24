import { CacheKeyError } from '../errors/CacheErrors';

function hasControlCharacters(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

export class CacheKey {
  public static validate(key: unknown): string {
    if (typeof key !== 'string') {
      throw new CacheKeyError('Cache key must be a non-empty string', { key });
    }

    const trimmed = key.trim();
    if (trimmed.length === 0) {
      throw new CacheKeyError('Cache key cannot be empty or whitespace-only', { key });
    }

    if (hasControlCharacters(trimmed)) {
      throw new CacheKeyError('Cache key contains invalid control characters', { key });
    }

    return trimmed;
  }
}
