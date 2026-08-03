// Core Base Error
export class CoreForgeError extends Error {
  public readonly code: string;
  public readonly timestamp: number;
  public readonly details?: unknown;

  constructor(message: string, code = 'CORE_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = Date.now();
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Configuration Errors
export class ConfigurationError extends CoreForgeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

// Module Instantiation and Lifecycle Errors
export class ModuleInitializationError extends CoreForgeError {
  constructor(moduleName: string, stage: string, error?: Error) {
    super(
      `Failed to initialize module "${moduleName}" during stage "${stage}": ${error?.message || 'Unknown Error'}`,
      'MODULE_INITIALIZATION_ERROR',
      error,
    );
  }
}

// Validation Errors
export class ValidationError extends CoreForgeError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

// Dependency Injection Resolving Errors
export class DependencyInjectionError extends CoreForgeError {
  constructor(token: string | symbol, reason: string) {
    super(`Dependency resolution failed for token "${token.toString()}": ${reason}`, 'DI_ERROR');
  }
}
