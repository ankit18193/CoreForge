import { SecurityOptions } from './SecurityOptions';
import { SecurityRegistry } from '../registry/SecurityRegistry';

export class SecurityConfiguration {
  public readonly registry: SecurityRegistry;

  constructor(options: SecurityOptions) {
    this.registry = options.registry;
    Object.freeze(this);
  }
}
