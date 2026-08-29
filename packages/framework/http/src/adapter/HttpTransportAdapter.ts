import { HttpAdapter, HttpRequestOptions, TransportCapability } from '@coreforge/contracts';

import { HttpAdapterConfig } from '../types/httpTypes';

export class HttpTransportAdapter<TReq = unknown, TRes = unknown> implements HttpAdapter<
  TReq,
  TRes
> {
  public readonly id: string;
  public readonly name: string;
  public readonly priority: number;
  public readonly capabilities: readonly TransportCapability[];
  public readonly defaultOptions?: HttpRequestOptions | undefined;

  constructor(config: HttpAdapterConfig = {}) {
    this.id = config.id ?? 'http';
    this.name = config.name ?? 'HTTP Transport Adapter';
    this.priority = config.priority ?? 100;
    this.capabilities = Object.freeze(['REQUEST', 'RESPONSE', 'CANCELLATION', 'METADATA']);
    this.defaultOptions = config.defaultOptions;
  }
}
