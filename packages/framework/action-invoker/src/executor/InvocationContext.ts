import { InvocationDescriptor } from './InvocationDescriptor';

export class InvocationContext {
  public readonly descriptor: InvocationDescriptor;
  public readonly requestId?: string | undefined;
  public readonly startTime = Date.now();

  constructor(descriptor: InvocationDescriptor, requestId?: string) {
    this.descriptor = descriptor;
    this.requestId = requestId;
    Object.freeze(this);
  }
}
