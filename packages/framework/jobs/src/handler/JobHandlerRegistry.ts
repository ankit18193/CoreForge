import { JobHandler } from '@coreforge/contracts';

import { JobRegistrationError } from '../errors/JobErrors';

export class JobHandlerRegistry {
  private readonly _handlers = new Map<string, JobHandler<unknown>>();
  private _locked = false;

  public register<T>(type: string, handler: JobHandler<T>): void {
    if (this._locked) {
      throw new JobRegistrationError(
        `Cannot register handler for job type "${type}" after queue has started`,
      );
    }

    if (typeof type !== 'string' || type.trim().length === 0) {
      throw new JobRegistrationError('Job type must be a non-empty string', { type });
    }

    const normalizedType = type.trim();
    if (this._handlers.has(normalizedType)) {
      throw new JobRegistrationError(
        `Handler for job type "${normalizedType}" is already registered`,
      );
    }

    this._handlers.set(normalizedType, handler as JobHandler<unknown>);
  }

  public get(type: string): JobHandler<unknown> | undefined {
    return this._handlers.get(type.trim());
  }

  public has(type: string): boolean {
    return this._handlers.has(type.trim());
  }

  public lock(): void {
    this._locked = true;
  }

  public clear(): void {
    this._handlers.clear();
    this._locked = false;
  }

  public get size(): number {
    return this._handlers.size;
  }
}
