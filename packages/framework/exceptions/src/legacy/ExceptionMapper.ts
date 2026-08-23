import { CoreForgeError } from '@coreforge/errors';

export class ExceptionMapper {
  public map(error: Error): CoreForgeError {
    let code = 'CF-UNKNOWN_ERROR';
    const name = error.name || error.constructor.name;

    if (name === 'ConfigurationError') {
      code = 'CF-1001';
    } else if (name === 'ValidationError') {
      code = 'CF-2001';
    } else if (name.includes('Module') || name === 'ModuleInitializationError') {
      code = 'CF-3001';
    } else if (
      name.includes('Dependency') ||
      name === 'ServiceNotFoundError' ||
      name === 'DuplicateRegistrationError' ||
      name === 'CircularDependencyError' ||
      name === 'InvalidRegistrationError'
    ) {
      code = 'CF-4001';
    } else if (name.includes('Event') || name === 'EventHandlerError') {
      code = 'CF-5001';
    } else if (name.includes('Logging') || name === 'FormatterError' || name === 'WriterError') {
      code = 'CF-6001';
    }

    if (error instanceof CoreForgeError) {
      Object.defineProperty(error, 'code', {
        value: code !== 'CF-UNKNOWN_ERROR' ? code : error.code,
        writable: true,
        configurable: true,
      });
      return error;
    }

    let details: Record<string, unknown> | undefined;
    if ('details' in error && error.details && typeof error.details === 'object') {
      details = { ...(error.details as Record<string, unknown>) };
    }

    const mapped = new CoreForgeError(error.message, code, details);

    if (error.stack) {
      Object.defineProperty(mapped, 'stack', {
        value: error.stack,
        writable: true,
        configurable: true,
      });
    }

    return mapped;
  }
}
