import { ApplicationContext } from '../context/ApplicationContext';
import { StartupStep } from '../lifecycle/StartupCoordinator';
import { ApplicationRegistry } from '../registry/ApplicationRegistry';
import { ComponentRegistry } from '../registry/ComponentRegistry';

export interface ApplicationOptions {
  readonly applicationId: string;
  readonly environment: string;
  readonly context: ApplicationContext;
  readonly registry: ApplicationRegistry;
  readonly components: ComponentRegistry;
  readonly steps: readonly StartupStep[];
}
