import { ActionDescriptor, NormalizedRequest, ResponseDescriptor } from '@coreforge/contracts';
import { ErrorResponseMapper, ExceptionContext, ExceptionPipeline } from '@coreforge/exceptions';
import { ActionExecutionEngine } from '@coreforge/execution';
import { RequestContextManager } from '@coreforge/request-context';
import { ResponseProcessor } from '@coreforge/response';

export interface TransportPipelineLifecycle {
  readonly state: string;
  makeReady(): void;
  stop(timeoutMs?: number): Promise<void> | void;
  acquireRequest(): void;
  releaseRequest(): void;
}

export class DefaultTransportPipelineLifecycle implements TransportPipelineLifecycle {
  private _state = 'CREATED';
  private _activeRequests = 0;

  public get state(): string {
    return this._state;
  }

  public makeReady(): void {
    if (this._state === 'CREATED') {
      this._state = 'READY';
    }
  }

  public stop(_timeoutMs?: number): void {
    this._state = 'STOPPED';
  }

  public acquireRequest(): void {
    this._activeRequests++;
  }

  public releaseRequest(): void {
    this._activeRequests = Math.max(0, this._activeRequests - 1);
  }
}

export interface TransportPipelineOptions {
  readonly contextManager: RequestContextManager;
  readonly executionEngine: ActionExecutionEngine;
  readonly responseProcessor: ResponseProcessor;
  readonly exceptionPipeline: ExceptionPipeline;
}

export interface RuntimeTransportResult {
  readonly descriptor: ResponseDescriptor;
  readonly durationMs: number;
  readonly success: boolean;
}

export class TransportPipeline {
  private readonly _contextManager: RequestContextManager;
  private readonly _executionEngine: ActionExecutionEngine;
  private readonly _responseProcessor: ResponseProcessor;
  private readonly _exceptionPipeline: ExceptionPipeline;
  private readonly _lifecycle: TransportPipelineLifecycle;

  constructor(options: TransportPipelineOptions) {
    this._contextManager = options.contextManager;
    this._executionEngine = options.executionEngine;
    this._responseProcessor = options.responseProcessor;
    this._exceptionPipeline = options.exceptionPipeline;
    this._lifecycle = new DefaultTransportPipelineLifecycle();
    this._lifecycle.makeReady();
  }

  public get lifecycle(): TransportPipelineLifecycle {
    return this._lifecycle;
  }

  public async execute<TNativeRes = unknown>(
    action: ActionDescriptor,
    normalizedRequest: NormalizedRequest,
    nativeResponse?: TNativeRes | undefined,
    writer?: { write(res: TNativeRes, desc: ResponseDescriptor): void | Promise<void> } | undefined,
  ): Promise<RuntimeTransportResult> {
    this._lifecycle.acquireRequest();
    const startTime = Date.now();
    let isSuccess = false;
    let finalDescriptor: ResponseDescriptor | null = null;

    try {
      const headers = normalizedRequest.headers || {};
      const correlationId =
        (typeof headers['x-correlation-id'] === 'string'
          ? headers['x-correlation-id']
          : undefined) ||
        (typeof headers['x-request-id'] === 'string' ? headers['x-request-id'] : undefined);
      const traceId = typeof headers['x-trace-id'] === 'string' ? headers['x-trace-id'] : undefined;

      const contextOptions = {
        correlationId,
        traceId,
      };

      try {
        finalDescriptor = await this._contextManager.runInContext(
          contextOptions,
          async (requestContext) => {
            try {
              const rawResult = await this._executionEngine.execute(
                action,
                normalizedRequest,
                requestContext,
              );
              const responseDesc = await this._responseProcessor.process(rawResult);
              isSuccess = true;
              return responseDesc;
            } catch (executionErr) {
              isSuccess = false;
              const exceptionContext = new ExceptionContext(requestContext, executionErr);
              const errorDescriptor = await this._exceptionPipeline.handle(
                executionErr,
                exceptionContext,
              );
              return ErrorResponseMapper.map(errorDescriptor);
            }
          },
        );
      } catch (contextErr) {
        isSuccess = false;
        const dummyContext = {
          requestContext: null as unknown as import('@coreforge/contracts').RequestContext,
          error: contextErr,
          get: () => undefined,
          set: () => {},
        };
        const errorDescriptor = await this._exceptionPipeline.handle(contextErr, dummyContext);
        finalDescriptor = ErrorResponseMapper.map(errorDescriptor);
      }

      if (writer && nativeResponse !== undefined) {
        await Promise.resolve(writer.write(nativeResponse, finalDescriptor));
      }

      const durationMs = Date.now() - startTime;
      return Object.freeze({
        descriptor: finalDescriptor,
        durationMs,
        success: isSuccess,
      });
    } finally {
      this._lifecycle.releaseRequest();
    }
  }
}
