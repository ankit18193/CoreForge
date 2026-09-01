import { HttpErrorMapper, HttpErrorMapperRegistrationOptions } from '@coreforge/contracts';

import { HttpErrorMappingValidator } from './HttpErrorMappingValidator';
import {
  HttpErrorMapperDuplicateError,
  HttpErrorMappingConfigurationError,
} from '../../errors/HttpErrorMappingErrors';
import { HttpErrorMapperEntry } from '../../types/httpErrorTypes';

export class HttpErrorMapperRegistry {
  private readonly _byId = new Map<string, HttpErrorMapperEntry>();
  private readonly _entries: HttpErrorMapperEntry[] = [];
  private _locked = false;
  private _sequenceCounter = 0;

  public get size(): number {
    return this._byId.size;
  }

  public get locked(): boolean {
    return this._locked;
  }

  public register(mapper: HttpErrorMapper, options: HttpErrorMapperRegistrationOptions = {}): this {
    if (this._locked) {
      throw new HttpErrorMappingConfigurationError(
        'Cannot register error mapper: registry is locked.',
      );
    }

    HttpErrorMappingValidator.validateMapper(mapper);

    const id = options.id ?? mapper.id;
    const cleanId = id.trim();

    if (this._byId.has(cleanId)) {
      throw new HttpErrorMapperDuplicateError(cleanId);
    }

    const priority = options.priority ?? mapper.priority ?? 0;
    const sequence = ++this._sequenceCounter;

    const entry: HttpErrorMapperEntry = {
      id: cleanId,
      mapper,
      priority,
      sequence,
      code: options.code,
      errorType: options.errorType,
      predicate: options.predicate,
    };

    this._byId.set(cleanId, entry);
    this._entries.push(entry);
    return this;
  }

  public unregister(id: string): boolean {
    if (this._locked) {
      throw new HttpErrorMappingConfigurationError(
        'Cannot unregister error mapper: registry is locked.',
      );
    }

    const cleanId = id.trim();
    const existed = this._byId.delete(cleanId);
    if (existed) {
      const idx = this._entries.findIndex((e) => e.id === cleanId);
      if (idx !== -1) {
        this._entries.splice(idx, 1);
      }
    }
    return existed;
  }

  public has(id: string): boolean {
    return this._byId.has(id.trim());
  }

  public get(id: string): HttpErrorMapperEntry | undefined {
    return this._byId.get(id.trim());
  }

  public list(): readonly HttpErrorMapperEntry[] {
    return Object.freeze([...this._entries]);
  }

  public clear(): void {
    if (this._locked) {
      throw new HttpErrorMappingConfigurationError(
        'Cannot clear error mapper registry: registry is locked.',
      );
    }
    this._byId.clear();
    this._entries.length = 0;
  }

  public lock(): void {
    this._locked = true;
  }
}
