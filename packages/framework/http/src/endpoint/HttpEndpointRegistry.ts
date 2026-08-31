import type {
  HttpEndpoint,
  HttpEndpointOptions,
  HttpEndpointRegistry as IHttpEndpointRegistry,
} from '@coreforge/contracts';

import { HttpControllerValidator } from '../controller/HttpControllerValidator';
import {
  HttpEndpointDuplicateError,
  HttpEndpointRegistrationError,
} from '../errors/HttpControllerErrors';
import { RegisteredEndpointEntry } from '../types/httpControllerTypes';

export class HttpEndpointRegistry implements IHttpEndpointRegistry {
  private readonly _entriesById = new Map<string, RegisteredEndpointEntry>();
  private readonly _entriesByRouteId = new Map<string, RegisteredEndpointEntry>();
  private _locked = false;
  private _sequenceCounter = 0;

  public get size(): number {
    return this._entriesById.size;
  }

  public get locked(): boolean {
    return this._locked;
  }

  public register(endpoint: HttpEndpoint, options?: HttpEndpointOptions): void {
    if (this._locked) {
      throw new HttpEndpointRegistrationError(
        'Cannot register endpoint after registry has been locked',
        endpoint.id,
      );
    }

    const validated = HttpControllerValidator.validateEndpoint(endpoint);

    if (this._entriesById.has(validated.id)) {
      throw new HttpEndpointDuplicateError(validated.id);
    }

    // Prevent duplicate route/controller bindings
    if (this._entriesByRouteId.has(validated.routeId)) {
      const existing = this._entriesByRouteId.get(validated.routeId)!;
      throw new HttpEndpointRegistrationError(
        `Route '${validated.routeId}' is already bound to endpoint '${existing.endpoint.id}'`,
        validated.id,
      );
    }

    const priority = options?.priority ?? validated.priority ?? 0;
    const enabled = options?.enabled ?? validated.enabled ?? true;
    const metadata = Object.freeze({
      ...validated.metadata,
      ...(options?.metadata ?? {}),
    });

    const sequence = ++this._sequenceCounter;

    const entry: RegisteredEndpointEntry = Object.freeze({
      endpoint: Object.freeze({ ...validated, metadata, priority, enabled }),
      priority,
      enabled,
      sequence,
    });

    this._entriesById.set(validated.id, entry);
    this._entriesByRouteId.set(validated.routeId, entry);
  }

  public get(endpointId: string): HttpEndpoint | undefined {
    return this._entriesById.get(endpointId)?.endpoint;
  }

  public getByRouteId(routeId: string): HttpEndpoint | undefined {
    return this._entriesByRouteId.get(routeId)?.endpoint;
  }

  public getEntry(endpointId: string): RegisteredEndpointEntry | undefined {
    return this._entriesById.get(endpointId);
  }

  public has(endpointId: string): boolean {
    return this._entriesById.has(endpointId);
  }

  public hasRouteId(routeId: string): boolean {
    return this._entriesByRouteId.has(routeId);
  }

  public list(): readonly HttpEndpoint[] {
    return Object.freeze([...this._entriesById.values()].map((e) => e.endpoint));
  }

  public listEntries(): readonly RegisteredEndpointEntry[] {
    return Object.freeze([...this._entriesById.values()]);
  }

  public listEnabled(): readonly HttpEndpoint[] {
    return Object.freeze(
      [...this._entriesById.values()].filter((e) => e.enabled).map((e) => e.endpoint),
    );
  }

  public lock(): void {
    this._locked = true;
  }
}
