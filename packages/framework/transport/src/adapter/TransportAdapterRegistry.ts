import { TransportAdapterError } from '../errors/TransportErrors';
import { TransportAdapter, TransportAdapterOptions } from '../types/transportTypes';

export class TransportAdapterRegistry {
  private readonly _adapters = new Map<string, TransportAdapter>();
  private readonly _allowOverride: boolean;

  constructor(options: TransportAdapterOptions = {}) {
    this._allowOverride = options.allowOverride ?? false;
  }

  public register(adapter: TransportAdapter): this {
    if (!adapter || typeof adapter.name !== 'string' || !adapter.name.trim()) {
      throw new TransportAdapterError('Transport adapter must provide a valid non-empty name.');
    }

    const name = adapter.name.trim();
    if (this._adapters.has(name) && !this._allowOverride) {
      throw new TransportAdapterError(
        `Transport adapter '${name}' is already registered and overrides are disabled.`,
      );
    }

    this._adapters.set(name, adapter);
    return this;
  }

  public get<TReq = unknown, TRes = unknown>(
    name: string,
  ): TransportAdapter<TReq, TRes> | undefined {
    return this._adapters.get(name) as TransportAdapter<TReq, TRes> | undefined;
  }

  public getOrThrow<TReq = unknown, TRes = unknown>(name: string): TransportAdapter<TReq, TRes> {
    const adapter = this.get<TReq, TRes>(name);
    if (!adapter) {
      throw new TransportAdapterError(`Transport adapter '${name}' is not registered.`);
    }
    return adapter;
  }

  public has(name: string): boolean {
    return this._adapters.has(name);
  }

  public unregister(name: string): boolean {
    return this._adapters.delete(name);
  }

  public list(): readonly TransportAdapter[] {
    return Object.freeze(Array.from(this._adapters.values()));
  }

  public clear(): void {
    this._adapters.clear();
  }
}
