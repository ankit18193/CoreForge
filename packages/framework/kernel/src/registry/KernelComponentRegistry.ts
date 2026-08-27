import { KernelRegistrationError } from '../errors/KernelErrors';
import {
  KernelComponent,
  KernelComponentOptions,
  RegisteredKernelComponentEntry,
} from '../types/kernelTypes';

export class KernelComponentRegistry {
  private readonly _components: RegisteredKernelComponentEntry[] = [];
  private readonly _byId = new Map<string, RegisteredKernelComponentEntry>();
  private _sequenceCounter = 0;
  private _locked = false;

  public register(component: KernelComponent, options?: KernelComponentOptions): string {
    if (this._locked) {
      throw new KernelRegistrationError(
        'Cannot register components after kernel initialization has started',
      );
    }

    if (!component || typeof component !== 'object') {
      throw new KernelRegistrationError('Kernel component must be an object');
    }

    const id = options?.id || component.id;
    if (!id || typeof id !== 'string') {
      throw new KernelRegistrationError('Kernel component must have a valid string identifier');
    }

    if (this._byId.has(id)) {
      throw new KernelRegistrationError(`Duplicate kernel component identifier: "${id}"`, {
        componentId: id,
      });
    }

    const name = options?.name || component.name || id;
    const dependencies = options?.dependencies || component.dependencies || [];
    const sequence = ++this._sequenceCounter;

    const entry: RegisteredKernelComponentEntry = Object.freeze({
      id,
      name,
      component,
      dependencies: Object.freeze([...dependencies]),
      sequence,
    });

    this._byId.set(id, entry);
    this._components.push(entry);

    return id;
  }

  public lock(): void {
    this._locked = true;
  }

  public get(id: string): RegisteredKernelComponentEntry | undefined {
    return this._byId.get(id);
  }

  public has(id: string): boolean {
    return this._byId.has(id);
  }

  public getAll(): readonly RegisteredKernelComponentEntry[] {
    return [...this._components];
  }

  public get size(): number {
    return this._components.length;
  }
}
