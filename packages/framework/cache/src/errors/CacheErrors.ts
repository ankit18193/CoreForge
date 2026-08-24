import { CoreForgeError } from '@coreforge/errors';

export class CacheError extends CoreForgeError {
  constructor(message: string, code = 'CF-CACHE-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class CacheConfigurationError extends CacheError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CACHE-CONFIGURATION', details);
  }
}

export class CacheStateError extends CacheError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CACHE-STATE', details);
  }
}

export class CacheKeyError extends CacheError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CACHE-KEY', details);
  }
}

export class CacheProviderError extends CacheError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CACHE-PROVIDER', details);
  }
}

export class CacheSerializationError extends CacheError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CACHE-SERIALIZATION', details);
  }
}

export class CacheExpirationError extends CacheError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CACHE-EXPIRATION', details);
  }
}

export class CacheNamespaceError extends CacheError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CACHE-NAMESPACE', details);
  }
}

export class CacheFactoryError extends CacheError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CACHE-FACTORY', details);
  }
}

export class CacheConcurrencyError extends CacheError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CACHE-CONCURRENCY', details);
  }
}
