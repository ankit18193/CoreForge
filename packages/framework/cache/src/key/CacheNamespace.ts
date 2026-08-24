import { CacheKey } from './CacheKey';
import { CacheNamespaceError } from '../errors/CacheErrors';

function hasControlCharacters(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

export class CacheNamespace {
  public static validate(namespace: unknown): string {
    if (typeof namespace !== 'string') {
      throw new CacheNamespaceError('Cache namespace must be a non-empty string', { namespace });
    }

    const trimmed = namespace.trim();
    if (trimmed.length === 0) {
      throw new CacheNamespaceError('Cache namespace cannot be empty or whitespace-only', {
        namespace,
      });
    }

    if (hasControlCharacters(trimmed)) {
      throw new CacheNamespaceError('Cache namespace contains invalid control characters', {
        namespace,
      });
    }

    return trimmed;
  }

  public static composeKey(namespace: string, key: string): string {
    const validNs = CacheNamespace.validate(namespace);
    const validKey = CacheKey.validate(key);
    return `${validNs}:${validKey}`;
  }
}
