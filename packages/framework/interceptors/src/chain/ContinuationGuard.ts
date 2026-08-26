import { InterceptorContinuationError } from '../errors/InterceptorErrors';

export class ContinuationGuard {
  private _called = false;

  public assertCanProceed(): void {
    if (this._called) {
      throw new InterceptorContinuationError(
        'next() continuation was already invoked in this interceptor step',
      );
    }
    this._called = true;
  }

  public get wasInvoked(): boolean {
    return this._called;
  }
}
