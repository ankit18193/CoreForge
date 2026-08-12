import { InterceptorDescriptor } from './InterceptorDescriptor';

export class InterceptorRegistry {
  private readonly _descriptors: InterceptorDescriptor[] = [];

  public add(descriptor: InterceptorDescriptor): void {
    this._descriptors.push(descriptor);
  }

  public getDescriptors(): readonly InterceptorDescriptor[] {
    return this._descriptors;
  }

  public clear(): void {
    this._descriptors.length = 0;
  }
}
