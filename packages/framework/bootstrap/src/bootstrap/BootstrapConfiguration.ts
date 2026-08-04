import { ConfigProvider } from '@coreforge/config';
import { ExceptionReporter } from '@coreforge/exceptions';

import { BootstrapOptions } from './BootstrapOptions';

export class BootstrapConfiguration {
  public readonly configPath?: string | undefined;
  public readonly configProviders: readonly ConfigProvider[];
  public readonly modules: readonly unknown[];
  public readonly reporters: readonly ExceptionReporter[];
  public readonly logWriters: readonly unknown[];
  public readonly runtimeOptions: Readonly<Record<string, unknown>>;
  public readonly startupTimeoutMs?: number | undefined;

  constructor(options: BootstrapOptions) {
    this.configPath = options.configPath;
    this.configProviders = Object.freeze([...(options.configProviders || [])]);
    this.modules = Object.freeze([...(options.modules || [])]);
    this.reporters = Object.freeze([...(options.reporters || [])]);
    this.logWriters = Object.freeze([...(options.logWriters || [])]);
    this.runtimeOptions = Object.freeze({ ...(options.runtimeOptions || {}) });
    this.startupTimeoutMs = options.startupTimeoutMs;
    Object.freeze(this);
  }
}
