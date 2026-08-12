import { ApplicationOptions } from './ApplicationOptions';
import { ApplicationContext } from '../context/ApplicationContext';
import { StartupStep } from '../lifecycle/StartupCoordinator';
import { ApplicationRegistry } from '../registry/ApplicationRegistry';
import { ComponentRegistry } from '../registry/ComponentRegistry';

export class ApplicationConfiguration {
  public readonly applicationId: string;
  public readonly environment: string;
  public readonly context: ApplicationContext;
  public readonly registry: ApplicationRegistry;
  public readonly components: ComponentRegistry;
  public readonly steps: readonly StartupStep[];

  constructor(options: ApplicationOptions) {
    this.applicationId = options.applicationId;
    this.environment = options.environment;
    this.context = options.context;
    this.registry = options.registry;
    this.components = options.components;
    this.steps = options.steps;
    Object.freeze(this);
  }
}
