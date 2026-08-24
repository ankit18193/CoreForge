import { RateLimitKey } from './RateLimitKey';
import { RateLimitNamespaceError } from '../errors/RateLimitErrors';

function hasControlCharacters(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

export class RateLimitNamespace {
  public static validate(namespace: unknown): string {
    if (typeof namespace !== 'string') {
      throw new RateLimitNamespaceError('Rate limit namespace must be a non-empty string', {
        namespace,
      });
    }

    const trimmed = namespace.trim();
    if (trimmed.length === 0) {
      throw new RateLimitNamespaceError('Rate limit namespace cannot be empty or whitespace-only', {
        namespace,
      });
    }

    if (hasControlCharacters(trimmed)) {
      throw new RateLimitNamespaceError(
        'Rate limit namespace contains invalid control characters',
        { namespace },
      );
    }

    return trimmed;
  }

  public static composeKey(namespace: string, key: string): string {
    const validNs = RateLimitNamespace.validate(namespace);
    const validKey = RateLimitKey.validate(key);
    return `${validNs}:${validKey}`;
  }
}
