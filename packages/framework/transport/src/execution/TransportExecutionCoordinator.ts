import {
  TransportAdapter,
  TransportExecutionOptions,
  TransportRequest,
  TransportResponse,
  TransportResult,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { ApplicationIntegration } from '@coreforge/integration';

import { TransportContextFactory } from '../context/TransportContextFactory';
import { TransportDiagnostics } from '../diagnostics/TransportDiagnostics';
import { TransportCancellationError, TransportTimeoutError } from '../errors/TransportErrors';
import { TransportProfiler } from '../internal/TransportProfiler';
import { TransportLifecycleManager } from '../lifecycle/TransportLifecycleManager';
import { TransportAdapterRegistry } from '../registry/TransportAdapterRegistry';
import { TransportAdapterResolver } from '../registry/TransportAdapterResolver';
import { TransportRequestSnapshot } from '../request/TransportRequestSnapshot';
import { TransportResponseFactory } from '../response/TransportResponseFactory';

export class TransportExecutionCoordinator {
  private readonly _contextManager: ExecutionContextManager;
  private readonly _lifecycle: TransportLifecycleManager;
  private readonly _registry: TransportAdapterRegistry;
  private readonly _diagnostics: TransportDiagnostics;
  private readonly _application?: ApplicationIntegration | undefined;
  private readonly _defaultTimeoutMs: number;

  constructor(
    contextManager: ExecutionContextManager,
    lifecycle: TransportLifecycleManager,
    registry: TransportAdapterRegistry,
    diagnostics: TransportDiagnostics,
    application?: ApplicationIntegration,
    defaultTimeoutMs = 30000,
  ) {
    this._contextManager = contextManager;
    this._lifecycle = lifecycle;
    this._registry = registry;
    this._diagnostics = diagnostics;
    this._application = application;
    this._defaultTimeoutMs = defaultTimeoutMs;
  }

  public async execute<TRequest = unknown, TResponse = unknown>(
    request: TransportRequest<TRequest>,
    options?: TransportExecutionOptions,
  ): Promise<TransportResult<TResponse>> {
    this._lifecycle.acquireRequest();
    const profiler = new TransportProfiler().start();
    this._diagnostics.recordRequestStarted();

    try {
      // 1. Validate and Snapshot Request
      const snapshot = TransportRequestSnapshot.create<TRequest>(request);

      // 2. Resolve Adapter if specified or available
      let adapter: TransportAdapter<TRequest, TResponse> | undefined;
      const adapterId = options?.adapterId;

      if (adapterId) {
        try {
          adapter = TransportAdapterResolver.resolve<TRequest, TResponse>(
            this._registry,
            adapterId,
          );
          this._diagnostics.recordAdapterResolution();
        } catch (err: unknown) {
          this._diagnostics.recordResolutionFailure();
          throw err;
        }
      } else if (this._registry.size > 0) {
        adapter = TransportAdapterResolver.resolveDefault(this._registry) as
          TransportAdapter<TRequest, TResponse> | undefined;
        if (adapter) {
          this._diagnostics.recordAdapterResolution();
        }
      }

      // 3. Create Transport Context
      const transportType = adapter?.id || 'GENERIC_TRANSPORT';
      const context = TransportContextFactory.create(transportType, {
        executionContext: options?.context ?? snapshot.context,
        contextManager: this._contextManager,
        metadata: snapshot.metadata,
      });

      // 4. Check Cancellation Signal
      if (context.executionContext.signal.aborted) {
        const durationMs = profiler.stop();
        const cancelErr = new TransportCancellationError(
          'Execution context was aborted before transport execution',
        );
        this._diagnostics.recordRequestFailure(durationMs, true);
        const response = TransportResponseFactory.createFailure<TResponse>(cancelErr);
        return Object.freeze({
          success: false,
          response,
          error: cancelErr,
          durationMs,
        });
      }

      // 5. Execute with Timeout Coordination
      const timeoutMs = options?.timeoutMs ?? this._defaultTimeoutMs;

      const executePromise = async (): Promise<TransportResponse<TResponse>> => {
        // If adapter provides custom handle translation
        if (adapter && typeof adapter.handle === 'function') {
          return adapter.handle(snapshot, context);
        }

        // If ApplicationIntegration is connected
        if (this._application) {
          const payload = snapshot.payload as Record<string, unknown>;

          if (payload && typeof payload === 'object') {
            // Service execution pattern: { serviceName, input }
            if (typeof payload.serviceName === 'string' && 'input' in payload) {
              const serviceResult = await this._application.executeService(
                payload.serviceName,
                payload.input,
                { context: context.executionContext },
              );
              return TransportResponseFactory.fromApplicationResult(
                serviceResult,
              ) as TransportResponse<TResponse>;
            }

            // Command / Query pattern: { type, payload }
            if (typeof payload.type === 'string' && 'payload' in payload) {
              const dispatchResult = await this._application.dispatch(
                { type: payload.type, payload: payload.payload },
                { context: context.executionContext },
              );
              return TransportResponseFactory.fromDispatchResult(
                dispatchResult,
              ) as TransportResponse<TResponse>;
            }
          }

          // Generic application execution delegation
          const appResult = await this._application.execute(
            snapshot.payload,
            async (input) => input,
            { context: context.executionContext },
          );

          if (appResult.success) {
            return TransportResponseFactory.createSuccess<TResponse>(appResult.value as TResponse);
          }
          return TransportResponseFactory.createFailure<TResponse>(appResult.error);
        }

        // Default echo success if no adapter handle or application
        return TransportResponseFactory.createSuccess<TResponse>(
          snapshot.payload as unknown as TResponse,
        );
      };

      let timer: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<TransportResponse<TResponse>>((_, reject) => {
        if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
          timer = setTimeout(() => {
            reject(new TransportTimeoutError(`Transport execution timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }
      });

      let response: TransportResponse<TResponse>;
      try {
        response = await Promise.race([executePromise(), timeoutPromise]);
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }

      const durationMs = profiler.stop();

      if (response.success) {
        this._diagnostics.recordRequestSuccess(durationMs);
      } else {
        this._diagnostics.recordRequestFailure(durationMs, false);
      }

      return Object.freeze({
        success: response.success,
        response,
        error: response.error,
        durationMs,
      });
    } catch (err: unknown) {
      const durationMs = profiler.stop();
      const isCancelled =
        err instanceof TransportCancellationError ||
        (typeof err === 'object' &&
          err !== null &&
          (err as { name?: string }).name === 'AbortError');

      this._diagnostics.recordRequestFailure(durationMs, isCancelled);

      const response = TransportResponseFactory.createFailure<TResponse>(err);
      return Object.freeze({
        success: false,
        response,
        error: err,
        durationMs,
      });
    } finally {
      this._lifecycle.releaseRequest();
    }
  }
}
