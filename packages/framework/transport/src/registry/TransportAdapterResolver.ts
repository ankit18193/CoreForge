import { TransportAdapter, TransportCapability } from '@coreforge/contracts';

import { TransportAdapterRegistry } from './TransportAdapterRegistry';
import { TransportAdapterNotFoundError } from '../errors/TransportErrors';
import { RegisteredAdapterEntry } from '../types/transportTypes';

function compareEntries(a: RegisteredAdapterEntry, b: RegisteredAdapterEntry): number {
  if (a.priority !== b.priority) {
    return b.priority - a.priority; // priority DESC
  }
  return a.sequence - b.sequence; // registration sequence ASC
}

export class TransportAdapterResolver {
  public static resolve<TRequest = unknown, TResponse = unknown>(
    registry: TransportAdapterRegistry,
    id: string,
  ): TransportAdapter<TRequest, TResponse> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new TransportAdapterNotFoundError('Transport adapter ID must be a non-empty string');
    }

    const entry = registry.get<TRequest, TResponse>(id.trim());
    if (!entry) {
      throw new TransportAdapterNotFoundError(
        `Transport adapter with id "${id.trim()}" was not found in registry`,
      );
    }

    return entry.adapter;
  }

  public static resolveEntry<TRequest = unknown, TResponse = unknown>(
    registry: TransportAdapterRegistry,
    id: string,
  ): RegisteredAdapterEntry<TRequest, TResponse> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new TransportAdapterNotFoundError('Transport adapter ID must be a non-empty string');
    }

    const entry = registry.get<TRequest, TResponse>(id.trim());
    if (!entry) {
      throw new TransportAdapterNotFoundError(
        `Transport adapter with id "${id.trim()}" was not found in registry`,
      );
    }

    return entry;
  }

  public static resolveByCapability(
    registry: TransportAdapterRegistry,
    capability: TransportCapability,
  ): readonly TransportAdapter<unknown, unknown>[] {
    const matching = registry
      .list()
      .filter((entry) => entry.capabilities.includes(capability))
      .sort(compareEntries)
      .map((entry) => entry.adapter);

    return Object.freeze(matching);
  }

  public static resolveAll(
    registry: TransportAdapterRegistry,
  ): readonly TransportAdapter<unknown, unknown>[] {
    const sorted = registry
      .list()
      .slice()
      .sort(compareEntries)
      .map((entry) => entry.adapter);

    return Object.freeze(sorted);
  }

  public static resolveDefault(
    registry: TransportAdapterRegistry,
  ): TransportAdapter<unknown, unknown> | undefined {
    const all = TransportAdapterResolver.resolveAll(registry);
    return all[0];
  }
}
