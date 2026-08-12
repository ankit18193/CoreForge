import { ControllerDescriptor } from './ControllerDescriptor';
import { DuplicateControllerError } from '../errors/ControllerErrors';

export class ControllerRegistry {
  private readonly _controllers = new Map<string, ControllerDescriptor>();

  public register(descriptor: ControllerDescriptor): void {
    if (this._controllers.has(descriptor.id)) {
      throw new DuplicateControllerError(
        `Controller with id "${descriptor.id}" is already registered.`,
      );
    }

    for (const c of this._controllers.values()) {
      if (c.metadata.name === descriptor.metadata.name) {
        throw new DuplicateControllerError(
          `Controller name "${descriptor.metadata.name}" is already registered.`,
        );
      }
    }

    this._controllers.set(descriptor.id, descriptor);
  }

  public get(id: string): ControllerDescriptor | undefined {
    return this._controllers.get(id);
  }

  public getByName(name: string): ControllerDescriptor | undefined {
    for (const c of this._controllers.values()) {
      if (c.metadata.name === name) {
        return c;
      }
    }
    return undefined;
  }

  public getAll(): readonly ControllerDescriptor[] {
    return Object.freeze(Array.from(this._controllers.values()));
  }

  public clear(): void {
    this._controllers.clear();
  }
}
