import { CoreForgeError } from '@coreforge/errors';

export class DependencyError extends CoreForgeError {
  constructor(message: string, code = 'CF-DI-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ProviderRegistrationError extends DependencyError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DI-PROVIDER_REGISTRATION_ERROR', details);
  }
}

export class DuplicateProviderError extends DependencyError {
  constructor(tokenName: string) {
    super(
      `Duplicate provider registration for token "${tokenName}". A provider with this token is already registered and overrides are not enabled.`,
      'CF-DI-DUPLICATE_PROVIDER',
      { token: tokenName },
    );
  }
}

export class ProviderNotFoundError extends DependencyError {
  constructor(tokenName: string) {
    super(
      `No provider found for injection token "${tokenName}". Ensure the provider is registered before resolution.`,
      'CF-DI-PROVIDER_NOT_FOUND',
      { token: tokenName },
    );
  }
}

export class CircularDependencyError extends DependencyError {
  public readonly dependencyPath: readonly string[];

  constructor(dependencyPath: readonly string[]) {
    const cycleStr = dependencyPath.join(' → ');
    super(
      `Circular dependency detected in dependency graph: ${cycleStr}`,
      'CF-DI-CIRCULAR_DEPENDENCY',
      { dependencyPath },
    );
    this.dependencyPath = Object.freeze([...dependencyPath]);
  }
}

export class DependencyResolutionError extends DependencyError {
  constructor(tokenName: string, reason: string, cause?: unknown) {
    super(
      `Failed to resolve dependency for token "${tokenName}": ${reason}`,
      'CF-DI-RESOLUTION_ERROR',
      cause,
    );
  }
}

export class ScopeError extends DependencyError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DI-SCOPE_ERROR', details);
  }
}

export class ContainerStateError extends DependencyError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DI-CONTAINER_STATE_ERROR', details);
  }
}

export class LifecycleHookError extends DependencyError {
  constructor(hookName: string, tokenName: string, cause?: unknown) {
    super(
      `Error executing lifecycle hook "${hookName}" on instance of token "${tokenName}".`,
      'CF-DI-LIFECYCLE_HOOK_ERROR',
      cause,
    );
  }
}
