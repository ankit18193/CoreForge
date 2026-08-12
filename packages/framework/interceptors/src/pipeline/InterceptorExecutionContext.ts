import { InterceptorContext } from '@coreforge/contracts';

import { InterceptorStage } from './InterceptorStage';

export class InterceptorExecutionContext {
  public readonly context: InterceptorContext;
  private _stage = InterceptorStage.BEFORE;

  constructor(context: InterceptorContext) {
    this.context = context;
  }

  public get stage(): InterceptorStage {
    return this._stage;
  }

  public setStage(stage: InterceptorStage): void {
    this._stage = stage;
  }
}
