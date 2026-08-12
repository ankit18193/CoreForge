import { BindingConfigurationError } from '../errors/BindingErrors';
import { BindingMetadata } from '../metadata/BindingMetadata';

export interface ActionBinding {
  readonly controllerId: string;
  readonly actionName: string;
  readonly parameters: readonly BindingMetadata[];
}

export class BindingRegistry {
  private readonly _bindings = new Map<string, ActionBinding>();

  public register(binding: ActionBinding): void {
    const key = `${binding.controllerId}:${binding.actionName}`;
    if (this._bindings.has(key)) {
      throw new BindingConfigurationError(
        `Duplicate action binding registered for ${binding.controllerId}.${binding.actionName}`,
      );
    }
    this._bindings.set(key, binding);
  }

  public get(controllerId: string, actionName: string): ActionBinding | undefined {
    return this._bindings.get(`${controllerId}:${actionName}`);
  }
}
