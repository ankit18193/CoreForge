import { CoreForgeError } from '@coreforge/errors';

export class AssemblyValidationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-ASSEMBLY_VALIDATION_ERROR', details);
  }
}

export class AssemblyStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-ASSEMBLY_STATE_ERROR', details);
  }
}

export class AssemblyGraphError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-ASSEMBLY_GRAPH_ERROR', details);
  }
}

export class AssemblyInitializationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-ASSEMBLY_INITIALIZATION_ERROR', details);
  }
}
