import { CoreForgeError } from '@coreforge/errors';

export class RequestContextError extends CoreForgeError {
  constructor(message: string, code = 'CF-REQ-CONTEXT-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ContextNotFoundError extends RequestContextError {
  constructor(message = 'No active RequestContext found in current asynchronous execution chain.') {
    super(message, 'CF-REQ-CONTEXT-NOT_FOUND');
  }
}

export class ContextStateError extends RequestContextError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-REQ-CONTEXT-STATE_ERROR', details);
  }
}

export class ContextTimeoutError extends RequestContextError {
  public readonly timeoutMs: number;
  public readonly contextId: string;

  constructor(contextId: string, timeoutMs: number) {
    super(
      `RequestContext "${contextId}" exceeded execution timeout of ${timeoutMs}ms.`,
      'CF-REQ-CONTEXT-TIMEOUT',
      { contextId, timeoutMs },
    );
    this.contextId = contextId;
    this.timeoutMs = timeoutMs;
  }
}

export class ContextCancelledError extends RequestContextError {
  public readonly contextId: string;

  constructor(contextId: string, reason?: string) {
    super(
      `RequestContext "${contextId}" was cancelled${reason ? `: ${reason}` : '.'}`,
      'CF-REQ-CONTEXT-CANCELLED',
      { contextId, reason },
    );
    this.contextId = contextId;
  }
}

export class ContextDisposedError extends RequestContextError {
  public readonly contextId: string;

  constructor(contextId: string) {
    super(
      `Cannot perform operations on RequestContext "${contextId}": the context has already been disposed.`,
      'CF-REQ-CONTEXT-DISPOSED',
      { contextId },
    );
    this.contextId = contextId;
  }
}

export class ContextCreationError extends RequestContextError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-REQ-CONTEXT-CREATION_ERROR', details);
  }
}
