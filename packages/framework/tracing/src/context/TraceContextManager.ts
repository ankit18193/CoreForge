import { TraceContext as ITraceContext } from '@coreforge/contracts';

import { ContextStorage } from './ContextStorage';
import { TraceContextFactory } from './TraceContext';
import { SpanIdGenerator } from '../identity/SpanIdGenerator';
import { TraceIdGenerator } from '../identity/TraceIdGenerator';

export class TraceContextManager {
  private readonly _storage = new ContextStorage();

  public async withContext<T>(context: ITraceContext, fn: () => Promise<T> | T): Promise<T> {
    return this._storage.run(context, async () => {
      return fn();
    });
  }

  public current(): ITraceContext | undefined {
    return this._storage.getStore();
  }

  public createRootContext(sampled: boolean): ITraceContext {
    const traceId = TraceIdGenerator.generate();
    const spanId = SpanIdGenerator.generate();

    return TraceContextFactory.create({
      traceId,
      spanId,
      sampled,
    });
  }

  public createChildContext(parent: ITraceContext): ITraceContext {
    const spanId = SpanIdGenerator.generate();

    return TraceContextFactory.create({
      traceId: parent.traceId,
      spanId,
      parentSpanId: parent.spanId,
      sampled: parent.sampled,
    });
  }

  public disable(): void {
    this._storage.disable();
  }
}
