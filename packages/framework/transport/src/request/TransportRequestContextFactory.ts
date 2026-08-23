import { RequestContextManager } from '@coreforge/request-context';

import {
  NormalizedRequest,
  RequestContext,
  TransportExecutionOptions,
} from '../types/transportTypes';

export class TransportRequestContextFactory {
  private readonly _contextManager: RequestContextManager;

  constructor(contextManager: RequestContextManager) {
    this._contextManager = contextManager;
  }

  public async createContext(
    request: NormalizedRequest,
    options: TransportExecutionOptions = {},
  ): Promise<RequestContext> {
    const headers = request.headers || {};

    const correlationId =
      options.correlationId ||
      (typeof headers['x-correlation-id'] === 'string' ? headers['x-correlation-id'] : undefined) ||
      (typeof headers['x-request-id'] === 'string' ? headers['x-request-id'] : undefined);

    const traceId =
      options.traceId ||
      (typeof headers['x-trace-id'] === 'string' ? headers['x-trace-id'] : undefined);

    return this._contextManager.createContext({
      correlationId,
      traceId,
      timeoutMs: options.timeoutMs,
      signal: options.abortSignal,
    });
  }
}
