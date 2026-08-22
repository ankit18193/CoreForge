import { RequestContext } from './RequestContext';
import { RequestContextOptions, RequestScope } from '../types/requestContextTypes';

export class RequestContextBuilder {
  private _id?: string | undefined;
  private _correlationId?: string | undefined;
  private _traceId?: string | undefined;
  private _timeoutMs?: number | undefined;
  private _signal?: AbortSignal | undefined;
  private _attributes: Record<string, unknown> = {};

  public setId(id: string): this {
    this._id = id;
    return this;
  }

  public setCorrelationId(correlationId: string): this {
    this._correlationId = correlationId;
    return this;
  }

  public setTraceId(traceId: string): this {
    this._traceId = traceId;
    return this;
  }

  public setTimeoutMs(timeoutMs: number): this {
    this._timeoutMs = timeoutMs;
    return this;
  }

  public setSignal(signal: AbortSignal): this {
    this._signal = signal;
    return this;
  }

  public setAttribute(key: string, value: unknown): this {
    this._attributes[key] = value;
    return this;
  }

  public setAttributes(attributes: Readonly<Record<string, unknown>>): this {
    this._attributes = { ...this._attributes, ...attributes };
    return this;
  }

  public setOptions(options: RequestContextOptions): this {
    if (options.id) {
      this._id = options.id;
    }
    if (options.correlationId) {
      this._correlationId = options.correlationId;
    }
    if (options.traceId) {
      this._traceId = options.traceId;
    }
    if (options.timeoutMs !== undefined) {
      this._timeoutMs = options.timeoutMs;
    }
    if (options.signal) {
      this._signal = options.signal;
    }
    if (options.attributes) {
      this._attributes = { ...this._attributes, ...options.attributes };
    }
    return this;
  }

  public build(scope: RequestScope): RequestContext {
    const options: RequestContextOptions = {
      id: this._id,
      correlationId: this._correlationId,
      traceId: this._traceId,
      timeoutMs: this._timeoutMs,
      signal: this._signal,
      attributes: Object.freeze({ ...this._attributes }),
    };
    return new RequestContext(scope, options);
  }
}
