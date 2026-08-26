import { ApplicationRegistrationError } from '../errors/ApplicationErrors';
import { ApplicationServiceValidator } from '../service/ApplicationServiceValidator';
import { ApplicationService } from '../types/applicationTypes';

export class ApplicationServiceRegistry {
  private readonly _services = new Map<string, ApplicationService<unknown, unknown>>();
  private _locked = false;

  public register<TInput, TResult>(
    type: string,
    service: ApplicationService<TInput, TResult>,
  ): void {
    if (this._locked) {
      throw new ApplicationRegistrationError(
        'Cannot register service after application manager is READY',
        { serviceType: type },
      );
    }

    ApplicationServiceValidator.validateType(type);
    ApplicationServiceValidator.validateService<TInput, TResult>(service, type);

    if (this._services.has(type)) {
      throw new ApplicationRegistrationError(`Service for type "${type}" is already registered`, {
        serviceType: type,
      });
    }

    this._services.set(type, service as ApplicationService<unknown, unknown>);
  }

  public lock(): void {
    this._locked = true;
  }

  public get(type: string): ApplicationService<unknown, unknown> | undefined {
    return this._services.get(type);
  }

  public has(type: string): boolean {
    return this._services.has(type);
  }

  public get size(): number {
    return this._services.size;
  }
}
