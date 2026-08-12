import { InvocationResult as IInvocationResult } from '@coreforge/contracts';

export class InvocationResult implements IInvocationResult {
  public readonly value: unknown;

  constructor(value: unknown) {
    this.value = value;
    Object.freeze(this);
  }
}
