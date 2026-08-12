import { InterceptorContext, NextInvocation } from '@coreforge/contracts';

import { InterceptionResult } from './InterceptionResult';
import { InterceptorExecutionError } from '../errors/InterceptorErrors';

export class InvocationChain implements NextInvocation {
  private readonly _context: InterceptorContext;
  private readonly _proceedFn: () => Promise<InterceptionResult>;
  private _called = false;

  constructor(context: InterceptorContext, proceedFn: () => Promise<InterceptionResult>) {
    this._context = context;
    this._proceedFn = proceedFn;
  }

  public async proceed(): Promise<InterceptionResult> {
    if (this._called) {
      throw new InterceptorExecutionError(
        'InvocationChain: proceed() was already invoked on this continuation.',
      );
    }
    this._called = true;
    return this._proceedFn();
  }

  public get called(): boolean {
    return this._called;
  }

  public get context(): InterceptorContext {
    return this._context;
  }
}
