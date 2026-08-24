import { LockKey } from './LockKey';
import { LockNamespaceError } from '../errors/LockErrors';

function hasControlCharacters(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

export class LockNamespace {
  public static validate(namespace: unknown): string {
    if (typeof namespace !== 'string') {
      throw new LockNamespaceError('Lock namespace must be a non-empty string', { namespace });
    }

    const trimmed = namespace.trim();
    if (trimmed.length === 0) {
      throw new LockNamespaceError('Lock namespace cannot be empty or whitespace-only', {
        namespace,
      });
    }

    if (hasControlCharacters(trimmed)) {
      throw new LockNamespaceError('Lock namespace contains invalid control characters', {
        namespace,
      });
    }

    return trimmed;
  }

  public static composeKey(namespace: string, key: string): string {
    const validNs = LockNamespace.validate(namespace);
    const validKey = LockKey.validate(key);
    return `${validNs}:${validKey}`;
  }
}
