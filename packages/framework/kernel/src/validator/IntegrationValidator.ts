import { KernelValidationError } from '../errors/KernelErrors';
import { KernelRegistry } from '../registry/KernelRegistry';

export class IntegrationValidator {
  private static readonly REQUIRED = [
    'Bootstrap',
    'Runtime',
    'HttpServer',
    'Router',
    'Middleware',
    'Controllers',
    'RequestHandler',
    'Binding',
    'RequestScope',
    'ActionInvoker',
    'Serialization',
    'Security',
    'Interceptors',
    'Metadata',
    'Discovery',
    'Compiler',
    'Scanner',
    'Assembly',
    'Initialization',
    'Orchestrator',
    'Extensions',
    'Plugins',
  ];

  public validate(registry: KernelRegistry): void {
    for (const name of IntegrationValidator.REQUIRED) {
      if (!registry.has(name)) {
        throw new KernelValidationError(
          `IntegrationValidator: Subsystem validation failed. Required subsystem "${name}" is missing.`,
        );
      }
    }
  }
}
