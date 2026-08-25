import { AsyncLocalStorage } from 'node:async_hooks';

import { TraceContext } from '@coreforge/contracts';

export class ContextStorage {
  private readonly _storage = new AsyncLocalStorage<TraceContext>();

  public run<T>(context: TraceContext, fn: () => T): T {
    return this._storage.run(context, fn);
  }

  public getStore(): TraceContext | undefined {
    return this._storage.getStore();
  }

  public disable(): void {
    this._storage.disable();
  }
}
