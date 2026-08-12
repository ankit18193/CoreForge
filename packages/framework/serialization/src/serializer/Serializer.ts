import {
  InvocationResult,
  SerializationResult as ISerializationResult,
  Serializer as ISerializer,
} from '@coreforge/contracts';

import { SerializerConfiguration } from './SerializerConfiguration';
import { SerializationDiagnostics } from '../diagnostics/SerializationDiagnostics';
import { SerializationStatistics } from '../diagnostics/SerializationStatistics';
import { SerializationProfiler } from '../internal/SerializationProfiler';
import { SerializationLifecycleManager } from '../lifecycle/SerializationLifecycleManager';
import { SerializationState } from '../lifecycle/SerializationState';
import { ResponseMapper } from '../mapper/ResponseMapper';
import { ContentNegotiator } from '../negotiation/ContentNegotiator';
import { ResponseMetadata } from '../response/ResponseMetadata';

export class Serializer implements ISerializer {
  private readonly _config: SerializerConfiguration;
  private readonly _lifecycle = new SerializationLifecycleManager();

  private readonly _mapper = new ResponseMapper();
  private readonly _negotiator: ContentNegotiator;

  private readonly _stats = new SerializationStatistics();
  private readonly _diagnostics = new SerializationDiagnostics(this._stats);

  constructor(config: SerializerConfiguration) {
    this._config = config;
    this._negotiator = new ContentNegotiator(config.registry);

    this._lifecycle.transitionTo(SerializationState.INITIALIZED);
    this._lifecycle.transitionTo(SerializationState.READY);
  }

  public get state(): SerializationState {
    return this._lifecycle.state;
  }

  public get configuration(): SerializerConfiguration {
    return this._config;
  }

  public get diagnostics(): SerializationDiagnostics {
    return this._diagnostics;
  }

  public stop(): void {
    if (this._lifecycle.state === SerializationState.STOPPED) {
      return;
    }
    this._lifecycle.transitionTo(SerializationState.STOPPED);
  }

  public start(): void {
    if (this._lifecycle.state === SerializationState.READY) {
      return;
    }
    this._lifecycle.transitionTo(SerializationState.READY);
  }

  public async serialize(
    result: InvocationResult,
    acceptHeader?: string,
  ): Promise<ISerializationResult> {
    const profiler = new SerializationProfiler();

    if (this._lifecycle.state !== SerializationState.READY) {
      throw new Error(`Serializer is not in READY state (current: ${this._lifecycle.state}).`);
    }

    try {
      const start = Date.now();

      const negoStart = Date.now();
      const { mediaType, serializer } = this._negotiator.negotiate(acceptHeader, result.value);
      profiler.recordNegotiation(Date.now() - negoStart);

      const mapStart = Date.now();
      const responseModel = this._mapper.map(result, mediaType);
      profiler.recordMapper(Date.now() - mapStart);

      const serializeStart = Date.now();
      const serializedBody = await serializer.serialize(responseModel);
      profiler.recordSerialization(Date.now() - serializeStart);

      const durationMs = Date.now() - start;

      let bytes = 0;
      if (typeof serializedBody === 'string') {
        bytes = Buffer.byteLength(serializedBody, 'utf8');
      } else if (serializedBody instanceof Buffer || serializedBody instanceof Uint8Array) {
        bytes = serializedBody.byteLength;
      }

      this._stats.recordSerialization(mediaType, bytes, durationMs);
      this._stats.recordUsage(serializer.constructor.name);

      new ResponseMetadata({
        contentLength: bytes,
        encoding: 'utf8',
        mediaType,
      });

      const finalResult: ISerializationResult = {
        body: serializedBody,
        headers: responseModel.headers,
        statusCode: responseModel.statusCode,
      };

      Object.freeze(finalResult.headers);
      Object.freeze(finalResult);

      return finalResult;
    } catch (err: unknown) {
      this._stats.recordFailure();
      this._lifecycle.transitionTo(SerializationState.FAILED);
      throw err;
    }
  }
}
