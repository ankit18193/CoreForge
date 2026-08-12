import { Container } from '@coreforge/contracts';

import { Application } from './Application';
import { ApplicationConfiguration } from './ApplicationConfiguration';
import { ApplicationContext } from '../context/ApplicationContext';
import { ApplicationValidationError } from '../errors/ApplicationErrors';
import { StartupStep } from '../lifecycle/StartupCoordinator';
import { ApplicationRegistry } from '../registry/ApplicationRegistry';
import { ComponentRegistry } from '../registry/ComponentRegistry';

export class ApplicationBuilder {
  private _applicationId = `app-${Math.random().toString(36).substring(2, 9)}`;
  private _environment = 'development';
  private _container: Container | undefined;

  private readonly _registry = new ApplicationRegistry();
  private readonly _components = new ComponentRegistry();
  private readonly _steps: StartupStep[] = [];
  private readonly _registeredIds = new Set<string>();

  public setApplicationId(id: string): this {
    this._applicationId = id;
    return this;
  }

  public setEnvironment(env: string): this {
    this._environment = env;
    return this;
  }

  public setContainer(container: Container): this {
    this._container = container;
    return this;
  }

  public registerComponent(id: string, type: string, component: unknown): this {
    if (this._registeredIds.has(id)) {
      throw new ApplicationValidationError(
        `ApplicationBuilder: Duplicate component registered for id "${id}".`,
      );
    }
    this._registeredIds.add(id);
    this._components.register({ id, type, component });
    return this;
  }

  public registerStep(step: StartupStep): this {
    const duplicate = this._steps.find((s) => s.name === step.name);
    if (duplicate) {
      throw new ApplicationValidationError(
        `ApplicationBuilder: Duplicate startup step registered for name "${step.name}".`,
      );
    }
    this._steps.push(step);
    return this;
  }

  public registerRoute(path: string): this {
    this._registry.registerRoute(path);
    return this;
  }

  public registerModule(name: string): this {
    this._registry.registerModule(name);
    return this;
  }

  public registerController(name: string): this {
    this._registry.registerController(name);
    return this;
  }

  public registerSerializer(name: string): this {
    this._registry.registerSerializer(name);
    return this;
  }

  public registerInterceptor(name: string): this {
    this._registry.registerInterceptor(name);
    return this;
  }

  public registerAuthProvider(name: string): this {
    this._registry.registerAuthProvider(name);
    return this;
  }

  public registerEvent(name: string): this {
    this._registry.registerEvent(name);
    return this;
  }

  public registerService(name: string): this {
    this._registry.registerService(name);
    return this;
  }

  public build(): Application {
    if (!this._container) {
      throw new ApplicationValidationError(
        'ApplicationBuilder: DI Container is a required component, but none was configured.',
      );
    }

    const context = new ApplicationContext({
      applicationName: this._applicationId,
      environment: this._environment,
      container: this._container,
    });

    const config = new ApplicationConfiguration({
      applicationId: this._applicationId,
      environment: this._environment,
      context,
      registry: this._registry,
      components: this._components,
      steps: this._steps,
    });

    return new Application(config);
  }
}
