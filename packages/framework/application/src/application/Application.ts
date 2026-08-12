import { Application as IApplication } from '@coreforge/contracts';

import { ApplicationConfiguration } from './ApplicationConfiguration';
import { ApplicationDiagnostics } from '../diagnostics/ApplicationDiagnostics';
import { ApplicationKernel } from '../kernel/ApplicationKernel';
import { KernelState } from '../kernel/KernelState';

export class Application implements IApplication {
  private readonly _kernel: ApplicationKernel;

  constructor(config: ApplicationConfiguration) {
    this._kernel = new ApplicationKernel(config.applicationId);
    this._kernel.transitionTo(KernelState.BUILDING);

    for (const descriptor of config.components.list()) {
      this._kernel.components.register(descriptor);
    }

    for (const path of config.registry.routes) {
      this._kernel.registry.registerRoute(path);
    }
    for (const name of config.registry.modules) {
      this._kernel.registry.registerModule(name);
    }
    for (const name of config.registry.controllers) {
      this._kernel.registry.registerController(name);
    }
    for (const name of config.registry.serializers) {
      this._kernel.registry.registerSerializer(name);
    }
    for (const name of config.registry.interceptors) {
      this._kernel.registry.registerInterceptor(name);
    }
    for (const name of config.registry.authProviders) {
      this._kernel.registry.registerAuthProvider(name);
    }
    for (const name of config.registry.events) {
      this._kernel.registry.registerEvent(name);
    }
    for (const name of config.registry.services) {
      this._kernel.registry.registerService(name);
    }

    this._kernel.registry.freeze();

    for (const step of config.steps) {
      this._kernel.registerStep(step);
    }

    this._kernel.setContext(config.context);

    this._kernel.transitionTo(KernelState.INITIALIZED);
  }

  public get diagnostics(): ApplicationDiagnostics {
    return this._kernel.diagnostics;
  }

  public get state(): KernelState {
    return this._kernel.state;
  }

  public async start(): Promise<void> {
    await this._kernel.start();
  }

  public async stop(): Promise<void> {
    await this._kernel.stop();
  }
}
