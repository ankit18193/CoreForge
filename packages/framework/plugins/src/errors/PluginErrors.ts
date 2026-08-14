import { CoreForgeError } from '@coreforge/errors';

export class PluginValidationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-PLUGIN_VALIDATION_ERROR', details);
  }
}

export class PluginStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-PLUGIN_STATE_ERROR', details);
  }
}

export class PluginLoadError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-PLUGIN_LOAD_ERROR', details);
  }
}
