import { ConfigurationSource } from '../types/configurationTypes';

export class ProgrammaticConfigurationSource implements ConfigurationSource {
  public readonly name: string;
  private readonly _values: Readonly<Record<string, unknown>>;

  constructor(values: Record<string, unknown>, name = 'ProgrammaticSource') {
    this.name = name;
    const expanded: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(values)) {
      if (k.includes('.')) {
        this._setByDotPath(expanded, k, v);
      } else {
        expanded[k] = v;
      }
    }

    this._values = Object.freeze(JSON.parse(JSON.stringify(expanded)));
  }

  public load(): Readonly<Record<string, unknown>> {
    return this._values;
  }

  private _setByDotPath(target: Record<string, unknown>, dotPath: string, value: unknown): void {
    const segments = dotPath.split('.');
    let current = target;

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!current[seg] || typeof current[seg] !== 'object' || Array.isArray(current[seg])) {
        current[seg] = {};
      }
      current = current[seg] as Record<string, unknown>;
    }

    const last = segments[segments.length - 1];
    current[last] = value;
  }
}
