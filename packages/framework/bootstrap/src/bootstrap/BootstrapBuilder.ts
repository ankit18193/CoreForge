import { ConfigProvider } from '@coreforge/config';

import { Bootstrap } from './Bootstrap';
import { BootstrapConfiguration } from './BootstrapConfiguration';
import { BootstrapOptions } from './BootstrapOptions';

export class BootstrapBuilder {
  private readonly _options: BootstrapOptions = {
    configProviders: [],
    modules: [],
    reporters: [],
    logWriters: [],
    runtimeOptions: {},
  };

  public registerConfig(configPath: string): this {
    this._options.configPath = configPath;
    return this;
  }

  public registerProvider(provider: ConfigProvider): this {
    if (!this._options.configProviders) {
      this._options.configProviders = [];
    }
    this._options.configProviders.push(provider);
    return this;
  }

  public registerModule(moduleClass: unknown): this {
    if (!this._options.modules) {
      this._options.modules = [];
    }
    this._options.modules.push(moduleClass);
    return this;
  }

  public registerReporter(reporter: unknown): this {
    if (!this._options.reporters) {
      this._options.reporters = [];
    }
    this._options.reporters.push(reporter);
    return this;
  }

  public registerLogWriter(writer: unknown): this {
    if (!this._options.logWriters) {
      this._options.logWriters = [];
    }
    this._options.logWriters.push(writer);
    return this;
  }

  public configureRuntime(options: Record<string, unknown>): this {
    this._options.runtimeOptions = {
      ...this._options.runtimeOptions,
      ...options,
    };
    return this;
  }

  public setStartupTimeout(timeoutMs: number): this {
    this._options.startupTimeoutMs = timeoutMs;
    return this;
  }

  public build(): Bootstrap {
    const configuration = new BootstrapConfiguration(this._options);
    return new Bootstrap(configuration);
  }
}
