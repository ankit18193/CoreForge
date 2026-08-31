import type {
  HttpMiddleware,
  HttpMiddlewareFailureStrategy,
  HttpMiddlewareOptions,
  HttpMiddlewareRegistry as IHttpMiddlewareRegistry,
} from '@coreforge/contracts';

import { HttpMiddlewareValidator } from './HttpMiddlewareValidator';
import {
  HttpMiddlewareDuplicateError,
  HttpMiddlewareRegistrationError,
} from '../errors/HttpMiddlewareErrors';
import { RegisteredMiddlewareEntry } from '../types/httpMiddlewareTypes';

export class HttpMiddlewareRegistry implements IHttpMiddlewareRegistry {
  private readonly _entriesById = new Map<string, RegisteredMiddlewareEntry>();
  private readonly _entriesList: RegisteredMiddlewareEntry[] = [];
  private _locked = false;
  private _sequenceCounter = 0;

  public get size(): number {
    return this._entriesById.size;
  }

  public get locked(): boolean {
    return this._locked;
  }

  public register<TContext = unknown, TResult = unknown>(
    middleware: HttpMiddleware<TContext, TResult>,
    options?: HttpMiddlewareOptions,
  ): void {
    if (this._locked) {
      throw new HttpMiddlewareRegistrationError(
        'Cannot register middleware after middleware registry has been locked',
      );
    }

    const validated = HttpMiddlewareValidator.validate<TContext, TResult>(middleware, options);

    if (this._entriesById.has(validated.id)) {
      throw new HttpMiddlewareDuplicateError(validated.id);
    }

    const priority = options?.priority ?? validated.priority ?? 0;
    const enabled = options?.enabled ?? true;
    const failureStrategy: HttpMiddlewareFailureStrategy = options?.failureStrategy ?? 'FAIL_FAST';
    const timeoutMs = options?.timeoutMs;
    const sequence = ++this._sequenceCounter;

    const entry: RegisteredMiddlewareEntry = Object.freeze({
      middleware: validated as HttpMiddleware,
      priority,
      enabled,
      failureStrategy,
      timeoutMs,
      sequence,
    });

    this._entriesById.set(validated.id, entry);
    this._entriesList.push(entry);
  }

  public get(middlewareId: string): HttpMiddleware | undefined {
    return this._entriesById.get(middlewareId)?.middleware;
  }

  public getEntry(middlewareId: string): RegisteredMiddlewareEntry | undefined {
    return this._entriesById.get(middlewareId);
  }

  public has(middlewareId: string): boolean {
    return this._entriesById.has(middlewareId);
  }

  public list(): readonly HttpMiddleware[] {
    return Object.freeze(this._entriesList.map((e) => e.middleware));
  }

  public listEntries(): readonly RegisteredMiddlewareEntry[] {
    return Object.freeze([...this._entriesList]);
  }

  public lock(): void {
    this._locked = true;
  }

  public clear(): void {
    if (this._locked) {
      throw new HttpMiddlewareRegistrationError(
        'Cannot clear middleware registry when registry is locked',
      );
    }
    this._entriesById.clear();
    this._entriesList.length = 0;
    this._sequenceCounter = 0;
  }
}
