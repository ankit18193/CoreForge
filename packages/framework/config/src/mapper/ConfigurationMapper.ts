import { Dictionary } from '@coreforge/types';

export class ConfigurationMapper {
  public map(flat: Dictionary<unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(flat)) {
      const parts = key.split('.');
      let current = result;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = value;
        } else {
          if (current[part] === undefined) {
            current[part] = {};
          }
          current = current[part] as Record<string, unknown>;
        }
      }
    }
    return result;
  }
}
