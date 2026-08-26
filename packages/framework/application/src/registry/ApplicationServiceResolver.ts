import { ApplicationServiceRegistry } from './ApplicationServiceRegistry';
import { ApplicationServiceNotFoundError } from '../errors/ApplicationErrors';
import { ApplicationService } from '../types/applicationTypes';

export class ApplicationServiceResolver {
  public static resolve<TInput = unknown, TResult = unknown>(
    registry: ApplicationServiceRegistry,
    type: string,
  ): ApplicationService<TInput, TResult> {
    const service = registry.get(type);

    if (!service) {
      throw new ApplicationServiceNotFoundError(
        `No application service registered for type "${type}"`,
        { serviceType: type },
      );
    }

    return service as ApplicationService<TInput, TResult>;
  }
}
