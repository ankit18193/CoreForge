import { CoreForgeError } from '@coreforge/errors';

export class DiscoveryValidationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-DISCOVERY_VALIDATION_ERROR', details);
  }
}

export class DiscoveryStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-DISCOVERY_STATE_ERROR', details);
  }
}

export class DiscoveryCycleError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-DISCOVERY_CYCLE_ERROR', details);
  }
}

export class DiscoveryOrphanError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-DISCOVERY_ORPHAN_ERROR', details);
  }
}
