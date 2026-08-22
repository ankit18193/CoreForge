import { AsyncLocalStorageProvider } from './AsyncLocalStorageProvider';
import { RequestContext } from '../context/RequestContext';

export class ContextStorage {
  private readonly _provider: AsyncLocalStorageProvider = new AsyncLocalStorageProvider();

  public run<R>(context: RequestContext, fn: () => R): R {
    return this._provider.run(context, fn);
  }

  public getStore(): RequestContext | undefined {
    return this._provider.getStore();
  }

  public getCurrent(): RequestContext {
    return this._provider.getCurrent();
  }
}
