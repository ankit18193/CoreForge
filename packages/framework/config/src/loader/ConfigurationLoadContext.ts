import { EnvironmentName } from '../types/configurationTypes';

export class ConfigurationLoadContext {
  public readonly environment: EnvironmentName;
  public readonly startedAt: number;

  constructor(environment: EnvironmentName) {
    this.environment = environment;
    this.startedAt = Date.now();
  }
}
