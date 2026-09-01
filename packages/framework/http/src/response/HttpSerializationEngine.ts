import type {
  HttpResponseTransformationOptions,
  HttpResponseTransformer,
  HttpSerializationResult,
} from '@coreforge/contracts';

import { HttpResponseSnapshot } from './HttpResponseSnapshot';
import { DefaultHttpResponseTransformer } from './HttpResponseTransformer';
import { HttpSerializerResolver } from './HttpSerializerResolver';
import { HttpSerializationDiagnostics } from '../diagnostics/HttpSerializationDiagnostics';
import {
  HttpSerializationCancellationError,
  HttpSerializationExecutionError,
  HttpSerializationTimeoutError,
  HttpSerializerNotFoundError,
} from '../errors/HttpSerializationErrors';
import { HttpSerializationProfiler } from '../internal/HttpSerializationProfiler';

export interface SerializationExecutionOptions {
  readonly mediaType?: string | undefined;
  readonly charset?: string | undefined;
  readonly status?: number | undefined;
  readonly operation?: string | undefined;
  readonly serializerId?: string | undefined;
  readonly transformer?: HttpResponseTransformer | undefined;
  readonly transformationOptions?: HttpResponseTransformationOptions | undefined;
  readonly timeoutMs?: number | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly throwOnError?: boolean | undefined;
}

export class HttpSerializationEngine {
  private readonly _resolver: HttpSerializerResolver;
  private readonly _diagnostics: HttpSerializationDiagnostics;
  private readonly _defaultTransformer: HttpResponseTransformer;

  constructor(
    resolver?: HttpSerializerResolver,
    diagnostics?: HttpSerializationDiagnostics,
    defaultTransformer?: HttpResponseTransformer,
  ) {
    this._resolver = resolver ?? new HttpSerializerResolver();
    this._diagnostics = diagnostics ?? new HttpSerializationDiagnostics();
    this._defaultTransformer = defaultTransformer ?? new DefaultHttpResponseTransformer();
  }

  public get resolver(): HttpSerializerResolver {
    return this._resolver;
  }

  public get diagnostics(): HttpSerializationDiagnostics {
    return this._diagnostics;
  }

  public async serialize<TInput = unknown, TOutput = unknown>(
    value: TInput,
    options: SerializationExecutionOptions = {},
  ): Promise<HttpSerializationResult<TOutput>> {
    const profiler = new HttpSerializationProfiler().start();
    this._diagnostics.recordSerializationStarted();

    // 1. Immediate cancellation check
    if (options.signal?.aborted) {
      const durationMs = profiler.stop();
      const cancelErr = new HttpSerializationCancellationError(
        'Serialization was cancelled before execution',
      );
      this._diagnostics.recordSerializationFailure(durationMs, true, false);
      if (options.throwOnError) {
        throw cancelErr;
      }
      return HttpResponseSnapshot.createResult<TOutput>(
        false,
        durationMs,
        undefined,
        undefined,
        options.mediaType,
        cancelErr,
      );
    }

    // 2. 204 No Content enforcement & undefined value: skip serialization
    if (options.status === 204 || value === undefined) {
      const durationMs = profiler.stop();
      this._diagnostics.recordSerializationSuccess(durationMs);
      return HttpResponseSnapshot.createResult<TOutput>(
        true,
        durationMs,
        undefined,
        undefined,
        options.mediaType,
      );
    }

    const requestedMediaType = (options.mediaType ?? 'application/json').toLowerCase();

    try {
      // 3. Response Transformation
      const transformer = options.transformer ?? this._defaultTransformer;
      let transformedValue: unknown;
      try {
        transformedValue = await transformer.transform(value, options.transformationOptions);
      } catch (transErr: unknown) {
        this._diagnostics.recordTransformationFailure();
        throw transErr;
      }

      // Check cancellation post-transformation
      if (options.signal?.aborted) {
        throw new HttpSerializationCancellationError(
          'Serialization was cancelled during transformation',
        );
      }

      // 4. Resolve Serializer
      const serializer = this._resolver.resolve(options.serializerId ?? requestedMediaType);
      if (!serializer) {
        this._diagnostics.recordResolutionFailure();
        throw new HttpSerializerNotFoundError(
          options.serializerId ?? requestedMediaType,
          `No serializer found for media type or ID '${options.serializerId ?? requestedMediaType}'`,
        );
      }

      // 5. Build minimal, sanitized context
      const serializationCtx = HttpResponseSnapshot.createContext(requestedMediaType, {
        charset: options.charset,
        operation: options.operation,
        status: options.status,
      });

      // 6. Execute Serializer with timeout & cancellation race
      const timeoutMs = options.timeoutMs ?? 0;
      let timerId: NodeJS.Timeout | undefined;

      const serializePromise = Promise.resolve(
        serializer.serialize(transformedValue, serializationCtx) as Promise<TOutput>,
      );

      const racePromises: Promise<TOutput>[] = [serializePromise];

      if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timerId = setTimeout(() => {
            reject(new HttpSerializationTimeoutError(timeoutMs, serializer.id));
          }, timeoutMs);
        });
        racePromises.push(timeoutPromise);
      }

      if (options.signal) {
        const signal = options.signal;
        const cancelPromise = new Promise<never>((_, reject) => {
          const onAbort = () => {
            reject(
              new HttpSerializationCancellationError('Serialization was aborted by client signal'),
            );
          };
          if (signal.aborted) {
            onAbort();
          } else {
            signal.addEventListener('abort', onAbort, { once: true });
          }
        });
        racePromises.push(cancelPromise);
      }

      let serializedOutput: TOutput;
      try {
        serializedOutput = await Promise.race(racePromises);
      } finally {
        if (timerId) {
          clearTimeout(timerId);
        }
      }

      const durationMs = profiler.stop();
      this._diagnostics.recordSerializationSuccess(durationMs);

      return HttpResponseSnapshot.createResult<TOutput>(
        true,
        durationMs,
        serializedOutput,
        serializer.id,
        requestedMediaType,
      );
    } catch (err: unknown) {
      const durationMs = profiler.stop();
      const isCancelled =
        err instanceof HttpSerializationCancellationError ||
        (typeof err === 'object' &&
          err !== null &&
          (err as { name?: string }).name === 'AbortError');
      const isTimeout = err instanceof HttpSerializationTimeoutError;

      this._diagnostics.recordSerializationFailure(durationMs, isCancelled, isTimeout);

      const finalError =
        err instanceof Error ? err : new HttpSerializationExecutionError(String(err));

      if (options.throwOnError) {
        throw finalError;
      }

      return HttpResponseSnapshot.createResult<TOutput>(
        false,
        durationMs,
        undefined,
        undefined,
        requestedMediaType,
        finalError,
      );
    }
  }
}
