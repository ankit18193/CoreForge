import { ControllerOptions } from './ControllerOptions';

export class ControllerConfiguration {
  public readonly defaultVersion: string;

  constructor(options?: ControllerOptions) {
    this.defaultVersion = options?.defaultVersion || 'v1';
    Object.freeze(this);
  }
}
