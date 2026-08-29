import {
  TransportAdapter,
  TransportAdapterOptions,
  TransportCapability,
} from '@coreforge/contracts';

import {
  TransportConfigurationError,
  TransportRegistrationError,
  TransportStateError,
} from '../errors/TransportErrors';
import { RegisteredAdapterEntry } from '../types/transportTypes';

export class TransportAdapterRegistry {
  private readonly _entries = new Map<string, RegisteredAdapterEntry>();
  private _sequence = 0;
  private _isLocked = false;

  public register<TRequest = unknown, TResponse = unknown>(
    adapter: TransportAdapter<TRequest, TResponse>,
    options?: TransportAdapterOptions,
  ): void {
    if (this._isLocked) {
      throw new TransportStateError('Cannot register adapters after registry has been locked');
    }

    if (!adapter || typeof adapter !== 'object') {
      throw new TransportConfigurationError(
        `TransportAdapter must be a non-null object, received ${typeof adapter}`,
      );
    }

    if (!adapter.id || typeof adapter.id !== 'string' || adapter.id.trim().length === 0) {
      throw new TransportConfigurationError('TransportAdapter must have a non-empty string "id"');
    }

    if (!adapter.name || typeof adapter.name !== 'string' || adapter.name.trim().length === 0) {
      throw new TransportConfigurationError('TransportAdapter must have a non-empty string "name"');
    }

    const adapterId = adapter.id.trim();

    if (this._entries.has(adapterId)) {
      throw new TransportRegistrationError(
        `Transport adapter with id "${adapterId}" is already registered`,
      );
    }

    const priority = options?.priority ?? adapter.priority ?? 0;
    const capabilities: readonly TransportCapability[] = Object.freeze(
      options?.capabilities ?? adapter.capabilities ?? [],
    );

    const entry: RegisteredAdapterEntry<TRequest, TResponse> = Object.freeze({
      id: adapterId,
      name: adapter.name.trim(),
      adapter,
      priority,
      capabilities,
      sequence: ++this._sequence,
    });

    this._entries.set(adapterId, entry as RegisteredAdapterEntry);
  }

  public get<TRequest = unknown, TResponse = unknown>(
    id: string,
  ): RegisteredAdapterEntry<TRequest, TResponse> | undefined {
    return this._entries.get(id) as RegisteredAdapterEntry<TRequest, TResponse> | undefined;
  }

  public has(id: string): boolean {
    return this._entries.has(id);
  }

  public list(): readonly RegisteredAdapterEntry[] {
    return Object.freeze(Array.from(this._entries.values()));
  }

  public lock(): void {
    this._isLocked = true;
  }

  public get isLocked(): boolean {
    return this._isLocked;
  }

  public get size(): number {
    return this._entries.size;
  }

  public clear(): void {
    if (this._isLocked) {
      throw new TransportStateError('Cannot clear adapter registry when locked');
    }
    this._entries.clear();
    this._sequence = 0;
  }
}
