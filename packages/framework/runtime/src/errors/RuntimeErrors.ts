import { CoreForgeError } from '@coreforge/errors';

export class RuntimeError extends CoreForgeError {
  constructor(message: string, code = 'CF-RUNTIME-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class RuntimeConfigurationError extends RuntimeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RUNTIME-CONFIGURATION', details);
  }
}

export class RuntimeStateError extends RuntimeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RUNTIME-STATE', details);
  }
}

export class RuntimeStartupError extends RuntimeError {
  public readonly stage?: string | undefined;

  constructor(message: string, stage?: string, cause?: unknown) {
    super(
      stage ? `Startup failed at stage '${stage}': ${message}` : `Startup failed: ${message}`,
      'CF-RUNTIME-STARTUP',
      { stage, cause: cause instanceof Error ? cause.message : cause },
    );
    this.stage = stage;
  }
}

export class RuntimeShutdownError extends RuntimeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RUNTIME-SHUTDOWN', details);
  }
}

export class RuntimeRequestError extends RuntimeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RUNTIME-REQUEST', details);
  }
}

export class RuntimeBootstrapError extends RuntimeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RUNTIME-BOOTSTRAP', details);
  }
}

export class RuntimeDependencyError extends RuntimeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RUNTIME-DEPENDENCY', details);
  }
}

export class RuntimePipelineError extends RuntimeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RUNTIME-PIPELINE', details);
  }
}
