import { ContainerOptions } from './ContainerOptions';

export class ContainerConfiguration {
  public readonly allowOverride: boolean;
  public readonly strictLifecycle: boolean;
  public readonly enableDiagnostics: boolean;

  constructor(options: ContainerOptions = {}) {
    this.allowOverride = options.allowOverride ?? false;
    this.strictLifecycle = options.strictLifecycle ?? true;
    this.enableDiagnostics = options.enableDiagnostics ?? true;
    Object.freeze(this);
  }
}
