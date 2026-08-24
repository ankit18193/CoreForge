import { ConfigurationPath } from './ConfigurationPath';
import { ConfigurationMissingError } from '../errors/ConfigurationErrors';

export class ConfigurationAccessor {
  public static get<T = unknown>(target: unknown, path: string): T | undefined {
    return ConfigurationPath.resolve(target, path) as T | undefined;
  }

  public static require<T = unknown>(target: unknown, path: string): T {
    const value = this.get<T>(target, path);
    if (value === undefined || value === null) {
      throw new ConfigurationMissingError(path);
    }
    return value;
  }

  public static has(target: unknown, path: string): boolean {
    return this.get(target, path) !== undefined;
  }
}
