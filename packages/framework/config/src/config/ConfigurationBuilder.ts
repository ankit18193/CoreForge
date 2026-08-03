import { ServerConfig } from '@coreforge/contracts';
import { FrameworkEnv } from '@coreforge/types';

import { Config } from './Config';

export class ConfigurationBuilder {
  public build(data: Record<string, unknown>): Config {
    const env = (data.env as FrameworkEnv) || FrameworkEnv.Development;
    const server = (data.server as ServerConfig) || { port: 3000, host: 'localhost' };

    const config = new Config({
      ...data,
      env,
      server,
    });

    this.deepFreeze(config);
    return config;
  }

  private deepFreeze(obj: unknown): void {
    if (obj && typeof obj === 'object') {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((prop) => {
        const propVal = (obj as Record<string, unknown>)[prop];
        if (
          propVal !== null &&
          (typeof propVal === 'object' || typeof propVal === 'function') &&
          !Object.isFrozen(propVal)
        ) {
          this.deepFreeze(propVal);
        }
      });
    }
  }
}
