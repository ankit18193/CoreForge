import { InterceptionResult as IInterceptionResult } from '@coreforge/contracts';

export class InterceptionResult implements IInterceptionResult {
  public readonly value: unknown;

  constructor(value: unknown) {
    this.value = value;
    Object.freeze(this);
  }
}
