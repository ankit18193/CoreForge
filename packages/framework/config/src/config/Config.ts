import { Config as IConfig, ServerConfig } from '@coreforge/contracts';
import { FrameworkEnv } from '@coreforge/types';

export class Config implements IConfig {
  public readonly env: FrameworkEnv;
  public readonly server: ServerConfig;
  [key: string]: unknown;

  constructor(data: { env: FrameworkEnv; server: ServerConfig; [key: string]: unknown }) {
    this.env = data.env;
    this.server = data.server;

    Object.keys(data).forEach((key) => {
      if (key !== 'env' && key !== 'server') {
        this[key] = data[key];
      }
    });
  }
}
