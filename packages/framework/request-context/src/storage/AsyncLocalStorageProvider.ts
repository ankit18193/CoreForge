import { AsyncLocalStorage } from 'node:async_hooks';

import { RequestContext } from '../context/RequestContext';
import { ContextNotFoundError } from '../errors/RequestContextErrors';

export class AsyncLocalStorageProvider {
  private readonly _storage = new AsyncLocalStorage<RequestContext>();

  public run<R>(context: RequestContext, fn: () => R): R {
    return this._storage.run(context, fn);
  }

  public getStore(): RequestContext | undefined {
    return this._storage.getStore();
  }

  public getCurrent(): RequestContext {
    const ctx = this._storage.getStore();
    if (!ctx) {
      throw new ContextNotFoundError();
    }
    return ctx;
  }
}
