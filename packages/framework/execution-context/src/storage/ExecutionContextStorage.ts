import { AsyncLocalStorage } from 'node:async_hooks';

import { ExecutionContext } from '@coreforge/contracts';

export class ExecutionContextStorage {
  private readonly _storage = new AsyncLocalStorage<ExecutionContext>();

  public run<T>(context: ExecutionContext, callback: () => T | Promise<T>): T | Promise<T> {
    return this._storage.run(context, callback);
  }

  public current(): ExecutionContext | undefined {
    return this._storage.getStore();
  }

  public disable(): void {
    this._storage.disable();
  }
}
