import type { HttpSerializer, HttpSerializerOptions } from '@coreforge/contracts';

import { HttpResponseValidator } from './HttpResponseValidator';
import {
  HttpSerializationConfigurationError,
  HttpSerializerDuplicateError,
} from '../errors/HttpSerializationErrors';
import { RegisteredSerializerEntry } from '../types/httpResponseTypes';

export class HttpSerializerRegistry {
  private readonly _byId = new Map<string, RegisteredSerializerEntry>();
  private readonly _entries: RegisteredSerializerEntry[] = [];
  private _locked = false;
  private _sequenceCounter = 0;

  public get size(): number {
    return this._byId.size;
  }

  public get locked(): boolean {
    return this._locked;
  }

  public register(serializer: HttpSerializer, options: HttpSerializerOptions = {}): void {
    if (this._locked) {
      throw new HttpSerializationConfigurationError(
        'Cannot register serializer: registry is locked',
      );
    }

    const validated = HttpResponseValidator.validateSerializer(serializer);

    const id = options.id ?? validated.id;
    const cleanId = id.trim();

    if (this._byId.has(cleanId)) {
      throw new HttpSerializerDuplicateError(cleanId);
    }

    const priority = options.priority ?? validated.priority ?? 0;
    const enabled = options.enabled ?? true;
    const mediaTypes = options.mediaTypes ?? validated.mediaTypes;
    const sequence = ++this._sequenceCounter;

    const entry: RegisteredSerializerEntry = {
      serializer: validated,
      priority,
      sequence,
      enabled,
      mediaTypes: Object.freeze([...mediaTypes.map((m) => m.toLowerCase())]),
    };

    this._byId.set(cleanId, entry);
    this._entries.push(entry);
  }

  public unregister(id: string): boolean {
    if (this._locked) {
      throw new HttpSerializationConfigurationError(
        'Cannot unregister serializer: registry is locked',
      );
    }

    const cleanId = id.trim();
    if (!this._byId.has(cleanId)) {
      return false;
    }

    this._byId.delete(cleanId);
    const idx = this._entries.findIndex((e) => e.serializer.id === cleanId);
    if (idx !== -1) {
      this._entries.splice(idx, 1);
    }
    return true;
  }

  public get(id: string): HttpSerializer | undefined {
    return this._byId.get(id.trim())?.serializer;
  }

  public getEntry(id: string): RegisteredSerializerEntry | undefined {
    return this._byId.get(id.trim());
  }

  public has(id: string): boolean {
    return this._byId.has(id.trim());
  }

  public list(): readonly HttpSerializer[] {
    return Object.freeze(this._entries.map((e) => e.serializer));
  }

  public listEntries(): readonly RegisteredSerializerEntry[] {
    return Object.freeze([...this._entries]);
  }

  public lock(): void {
    this._locked = true;
  }

  public clear(): void {
    if (this._locked) {
      throw new HttpSerializationConfigurationError(
        'Cannot clear serializer registry: registry is locked',
      );
    }
    this._byId.clear();
    this._entries.length = 0;
  }
}
