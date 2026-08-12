import { RegistrationDescriptor } from '@coreforge/contracts';

import { RegistrationIndex } from './RegistrationIndex';

export class RegistrationRegistry {
  private readonly _registrations: RegistrationDescriptor[] = [];
  private readonly _index = new RegistrationIndex();

  public register(desc: RegistrationDescriptor): void {
    this._registrations.push(desc);
    this._index.add(desc);
  }

  public get registrations(): readonly RegistrationDescriptor[] {
    return this._registrations;
  }

  public get index(): RegistrationIndex {
    return this._index;
  }

  public clear(): void {
    this._registrations.length = 0;
    this._index.clear();
  }
}
