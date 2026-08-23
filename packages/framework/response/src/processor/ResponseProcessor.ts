import { ResponseDescriptorFactory } from './ResponseDescriptorFactory';
import { ResultNormalizer } from './ResultNormalizer';
import { ResponseDiagnostics } from '../diagnostics/ResponseDiagnostics';
import {
  CircularResponseError,
  ResponseProcessingError,
  ResponseSerializationError,
} from '../errors/ResponseErrors';
import { ResponseProfiler } from '../internal/ResponseProfiler';
import { ResponseLifecycleManager } from '../lifecycle/ResponseLifecycleManager';
import { ResponseState } from '../lifecycle/ResponseState';
import { ResponseDescriptor } from '../response/ResponseDescriptor';
import { JsonSerializer } from '../serialization/JsonSerializer';
import { SerializationContext } from '../serialization/SerializationContext';
import { Serializer } from '../serialization/Serializer';
import {
  ResponseDiagnosticsSnapshot,
  ResponseProcessingContext,
  ResponseProcessor as IResponseProcessor,
} from '../types/responseTypes';

export class ResponseProcessor implements IResponseProcessor {
  private readonly _serializer: Serializer;
  private readonly _lifecycle = new ResponseLifecycleManager();
  private readonly _diagnostics = new ResponseDiagnostics();
  private readonly _enableDiagnostics: boolean;

  constructor(
    options: {
      serializer?: Serializer;
      enableDiagnostics?: boolean;
    } = {},
  ) {
    this._serializer = options.serializer || new JsonSerializer();
    this._enableDiagnostics = options.enableDiagnostics ?? true;
    this._lifecycle.transitionTo(ResponseState.READY);
  }

  public get state(): ResponseState {
    return this._lifecycle.state;
  }

  public get diagnostics(): ResponseDiagnosticsSnapshot {
    return this._diagnostics.snapshot();
  }

  public start(): void {
    this._lifecycle.transitionTo(ResponseState.RUNNING);
  }

  public stop(): void {
    if (this._lifecycle.state !== ResponseState.STOPPED) {
      this._lifecycle.transitionTo(ResponseState.STOPPING);
      this._lifecycle.transitionTo(ResponseState.STOPPED);
    }
  }

  public async process<T>(
    result: T | Promise<T>,
    context?: ResponseProcessingContext,
  ): Promise<ResponseDescriptor> {
    this._lifecycle.assertCanProcess();

    const profiler = new ResponseProfiler();
    profiler.start();

    try {
      // 1. Resolve possible promise
      const resolvedResult = await Promise.resolve(result);

      // 2. Normalize result
      const normalized = ResultNormalizer.normalize(resolvedResult, context);

      // 3. Serialize body if defined and non-null (handles objects, arrays, Date, BigInt, etc.)
      let serializedBody = normalized.body;
      if (normalized.body !== undefined && normalized.body !== null) {
        const serializationCtx = new SerializationContext(context?.serializationOptions);
        serializedBody = this._serializer.serialize(normalized.body, serializationCtx);
      }

      // 4. Construct immutable descriptor
      const descriptor = ResponseDescriptorFactory.create({
        status: normalized.status,
        headers: normalized.headers,
        contentType: normalized.contentType,
        body: serializedBody,
      });

      const duration = profiler.stop();
      if (this._enableDiagnostics) {
        this._diagnostics.recordSuccess(descriptor.status, duration);
      }

      return descriptor;
    } catch (err) {
      const duration = profiler.stop();
      if (this._enableDiagnostics) {
        this._diagnostics.recordFailure(duration, {
          isCircularFailure: err instanceof CircularResponseError,
          isSerializationFailure: err instanceof ResponseSerializationError,
        });
      }

      if (
        err instanceof CircularResponseError ||
        err instanceof ResponseSerializationError ||
        err instanceof ResponseProcessingError
      ) {
        throw err;
      }

      throw new ResponseProcessingError(
        `Failed to process response: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }
  }
}
