import type {
  HttpController,
  HttpControllerRegistry as IHttpControllerRegistry,
} from '@coreforge/contracts';

import { HttpControllerValidator } from './HttpControllerValidator';
import {
  HttpControllerDuplicateError,
  HttpControllerRegistrationError,
  HttpControllerStateError,
} from '../errors/HttpControllerErrors';
import { RegisteredControllerEntry } from '../types/httpControllerTypes';

export class HttpControllerRegistry implements IHttpControllerRegistry {
  private readonly _entriesById = new Map<string, RegisteredControllerEntry>();
  private readonly _entriesList: RegisteredControllerEntry[] = [];
  private _locked = false;
  private _sequenceCounter = 0;

  public get size(): number {
    return this._entriesById.size;
  }

  public get locked(): boolean {
    return this._locked;
  }

  public register(controller: HttpController, priority?: number): void {
    if (this._locked) {
      throw new HttpControllerRegistrationError(
        'Cannot register controller after registry has been locked',
      );
    }

    const validated = HttpControllerValidator.validate(controller);

    if (this._entriesById.has(validated.id)) {
      throw new HttpControllerDuplicateError(validated.id);
    }

    const resolvedPriority = priority ?? validated.priority ?? 0;
    const sequence = ++this._sequenceCounter;

    const entry: RegisteredControllerEntry = Object.freeze({
      controller: validated as HttpController,
      priority: resolvedPriority,
      sequence,
    });

    this._entriesById.set(validated.id, entry);
    this._entriesList.push(entry);
  }

  public get(controllerId: string): HttpController | undefined {
    return this._entriesById.get(controllerId)?.controller;
  }

  public getEntry(controllerId: string): RegisteredControllerEntry | undefined {
    return this._entriesById.get(controllerId);
  }

  public has(controllerId: string): boolean {
    return this._entriesById.has(controllerId);
  }

  public list(): readonly HttpController[] {
    return Object.freeze(this._entriesList.map((e) => e.controller));
  }

  public listEntries(): readonly RegisteredControllerEntry[] {
    return Object.freeze([...this._entriesList]);
  }

  public lock(): void {
    this._locked = true;
  }

  public clear(): void {
    if (this._locked) {
      throw new HttpControllerStateError('Cannot clear controller registry when it is locked');
    }
    this._entriesById.clear();
    this._entriesList.length = 0;
    this._sequenceCounter = 0;
  }
}
