import { CoreForgeError } from '@coreforge/errors';

export class ConfigurationError extends CoreForgeError {
  constructor(message: string, code = 'CF-CONFIG-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ConfigurationLoadError extends ConfigurationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CONFIG-LOAD', details);
  }
}

export class ConfigurationValidationError extends ConfigurationError {
  public readonly path?: string | undefined;

  constructor(message: string, path?: string, details?: unknown) {
    super(
      path
        ? `Configuration validation failed at '${path}': ${message}`
        : `Configuration validation failed: ${message}`,
      'CF-CONFIG-VALIDATION',
      { path, ...(typeof details === 'object' && details !== null ? details : { details }) },
    );
    this.path = path;
  }
}

export class ConfigurationMissingError extends ConfigurationError {
  public readonly path: string;

  constructor(path: string) {
    super(`Required configuration key '${path}' is missing.`, 'CF-CONFIG-MISSING', { path });
    this.path = path;
  }
}

export class ConfigurationTypeError extends ConfigurationError {
  public readonly path: string;
  public readonly expectedType: string;
  public readonly actualType: string;

  constructor(path: string, expectedType: string, actualType: string) {
    super(
      `Configuration key '${path}' expected type '${expectedType}', got '${actualType}'.`,
      'CF-CONFIG-TYPE',
      { path, expectedType, actualType },
    );
    this.path = path;
    this.expectedType = expectedType;
    this.actualType = actualType;
  }
}

export class ConfigurationSourceError extends ConfigurationError {
  public readonly sourceName: string;

  constructor(sourceName: string, message: string, cause?: unknown) {
    super(`Configuration source '${sourceName}' failed: ${message}`, 'CF-CONFIG-SOURCE', {
      sourceName,
      cause: cause instanceof Error ? cause.message : cause,
    });
    this.sourceName = sourceName;
  }
}

export class ConfigurationStateError extends ConfigurationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CONFIG-STATE', details);
  }
}

export class ConfigurationConflictError extends ConfigurationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CONFIG-CONFLICT', details);
  }
}

export class ConfigurationSecurityError extends ConfigurationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-CONFIG-SECURITY', details);
  }
}
