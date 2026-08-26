import { ErrorResponseMapper, ExceptionContext, ExceptionPipeline } from '@coreforge/exceptions';
import { ActionDescriptor, ActionExecutionEngine } from '@coreforge/execution';
import { ContextCancelledError, RequestContextManager } from '@coreforge/request-context';
import { ResponseProcessor } from '@coreforge/response';

import { TransportDiagnostics } from '../diagnostics/TransportDiagnostics';
import { TransportPipelineError } from '../errors/TransportErrors';
import { TransportProfiler } from '../internal/TransportProfiler';
import { TransportLifecycleManager } from '../lifecycle/TransportLifecycleManager';
import { TransportRequestContextFactory } from '../request/TransportRequestContextFactory';
import { DefaultTransportRequestNormalizer } from '../request/TransportRequestNormalizer';
import {
  NormalizedRequest,
  ResponseDescriptor,
  TransportDiagnosticsSnapshot,
  TransportExecutionOptions,
  TransportPipelineResult,
  TransportRequestNormalizer,
  TransportResponseWriter,
} from '../types/transportTypes';

export interface TransportPipelineOptions {
  readonly contextManager: RequestContextManager;
  readonly executionEngine: ActionExecutionEngine;
  readonly responseProcessor: ResponseProcessor;
  readonly exceptionPipeline: ExceptionPipeline;
  readonly normalizer?: TransportRequestNormalizer | undefined;
  readonly lifecycleManager?: TransportLifecycleManager | undefined;
  readonly enableDiagnostics?: boolean | undefined;
}

export class TransportPipeline {
  private readonly _contextManager: RequestContextManager;
  private readonly _executionEngine: ActionExecutionEngine;
  private readonly _responseProcessor: ResponseProcessor;
  private readonly _exceptionPipeline: ExceptionPipeline;
  private readonly _normalizer: TransportRequestNormalizer;
  private readonly _contextFactory: TransportRequestContextFactory;
  private readonly _lifecycleManager: TransportLifecycleManager;
  private readonly _diagnostics: TransportDiagnostics;
  private readonly _enableDiagnostics: boolean;

  constructor(options: TransportPipelineOptions) {
    this._contextManager = options.contextManager;
    this._executionEngine = options.executionEngine;
    this._responseProcessor = options.responseProcessor;
    this._exceptionPipeline = options.exceptionPipeline;
    this._normalizer = options.normalizer || new DefaultTransportRequestNormalizer();
    this._contextFactory = new TransportRequestContextFactory(this._contextManager);
    this._lifecycleManager = options.lifecycleManager || new TransportLifecycleManager();
    this._diagnostics = new TransportDiagnostics();
    this._enableDiagnostics = options.enableDiagnostics ?? true;

    if (this._lifecycleManager.state === 'CREATED') {
      this._lifecycleManager.makeReady();
    }
  }

  public get lifecycle(): TransportLifecycleManager {
    return this._lifecycleManager;
  }

  public get contextFactory(): TransportRequestContextFactory {
    return this._contextFactory;
  }

  public get diagnostics(): TransportDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public async execute<TNativeReq = unknown, TNativeRes = unknown>(
    action: ActionDescriptor,
    nativeRequest: TNativeReq,
    nativeResponse?: TNativeRes | undefined,
    writer?: TransportResponseWriter<TNativeRes> | undefined,
    options: TransportExecutionOptions = {},
  ): Promise<TransportPipelineResult> {
    this._lifecycleManager.acquireRequest();
    const profiler = new TransportProfiler();
    let isSuccess = false;
    let finalDescriptor: ResponseDescriptor | null = null;
    let isAborted = false;

    try {
      // 1. Request Normalization
      let normalizedRequest: NormalizedRequest;
      try {
        normalizedRequest = this._normalizer.normalize(nativeRequest);
      } catch (normErr) {
        this._diagnostics.recordNormalizationFailure();
        throw normErr;
      }

      // 2. Prepare Context Options
      const headers = normalizedRequest.headers || {};
      const correlationId =
        options.correlationId ||
        (typeof headers['x-correlation-id'] === 'string'
          ? headers['x-correlation-id']
          : undefined) ||
        (typeof headers['x-request-id'] === 'string' ? headers['x-request-id'] : undefined);
      const traceId =
        options.traceId ||
        (typeof headers['x-trace-id'] === 'string' ? headers['x-trace-id'] : undefined);

      const contextOptions = {
        correlationId,
        traceId,
        timeoutMs: options.timeoutMs,
        signal: options.abortSignal,
      };

      // 3. Execution inside RequestContextManager.runInContext (owns lifecycle & disposal)
      try {
        finalDescriptor = await this._contextManager.runInContext(
          contextOptions,
          async (requestContext) => {
            try {
              // Execution Engine invocation
              const rawResult = await this._executionEngine.execute(
                action,
                normalizedRequest,
                requestContext,
              );

              // Success Path: Response Processor normalizes & serializes result
              const responseDesc = await this._responseProcessor.process(rawResult);
              isSuccess = true;
              return responseDesc;
            } catch (executionErr) {
              isSuccess = false;
              // Error Path: Catch, handle through ExceptionPipeline, and map via ErrorResponseMapper
              if (
                executionErr instanceof ContextCancelledError ||
                (typeof executionErr === 'object' &&
                  executionErr !== null &&
                  (executionErr as { name?: string }).name === 'AbortError')
              ) {
                isAborted = true;
              }

              const exceptionContext = new ExceptionContext(requestContext, executionErr);
              const errorDescriptor = await this._exceptionPipeline.handle(
                executionErr,
                exceptionContext,
              );

              // Convert ErrorDescriptor directly to ResponseDescriptor
              return ErrorResponseMapper.map(errorDescriptor);
            }
          },
        );
      } catch (contextErr) {
        isSuccess = false;
        if (
          contextErr instanceof ContextCancelledError ||
          (typeof contextErr === 'object' &&
            contextErr !== null &&
            (contextErr as { name?: string }).name === 'AbortError')
        ) {
          isAborted = true;
        }

        const dummyContext = {
          requestContext: null as unknown as import('@coreforge/contracts').RequestContext,
          error: contextErr,
          get: () => undefined,
          set: () => {},
        };

        const errorDescriptor = await this._exceptionPipeline.handle(contextErr, dummyContext);

        finalDescriptor = ErrorResponseMapper.map(errorDescriptor);
      }

      // 4. Response Writing via TransportResponseWriter
      if (writer && nativeResponse !== undefined) {
        try {
          await Promise.resolve(writer.write(nativeResponse, finalDescriptor));
        } catch (writeErr) {
          this._diagnostics.recordResponseWriteFailure();
          throw new TransportPipelineError(
            `Failed to write transport response: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`,
            writeErr,
          );
        }
      }

      const durationMs = profiler.stop();

      if (this._enableDiagnostics) {
        if (isSuccess) {
          this._diagnostics.recordSuccess(finalDescriptor.status, durationMs);
        } else {
          this._diagnostics.recordFailure(finalDescriptor.status, durationMs, isAborted);
        }
      }

      return Object.freeze({
        descriptor: finalDescriptor,
        durationMs,
        success: isSuccess,
      });
    } catch (topLevelErr) {
      const durationMs = profiler.stop();
      const status = finalDescriptor?.status || 500;

      if (
        topLevelErr instanceof ContextCancelledError ||
        (typeof topLevelErr === 'object' &&
          topLevelErr !== null &&
          (topLevelErr as { name?: string }).name === 'AbortError')
      ) {
        isAborted = true;
      }

      if (this._enableDiagnostics) {
        this._diagnostics.recordFailure(status, durationMs, isAborted);
      }

      if (finalDescriptor) {
        return Object.freeze({
          descriptor: finalDescriptor,
          durationMs,
          success: false,
        });
      }

      throw topLevelErr;
    } finally {
      this._lifecycleManager.releaseRequest();
    }
  }
}
