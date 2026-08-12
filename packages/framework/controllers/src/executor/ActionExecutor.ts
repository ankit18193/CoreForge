import { Controller } from '@coreforge/contracts';

import { ActionDescriptor } from '../metadata/ActionDescriptor';

export class ActionExecutor {
  public async execute(
    descriptor: ActionDescriptor,
    instance: Controller,
    args: unknown[],
  ): Promise<unknown> {
    const method = descriptor.handler;
    const result = method.apply(instance, args);
    return Promise.resolve(result);
  }
}
