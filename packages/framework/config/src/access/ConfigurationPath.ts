export class ConfigurationPath {
  public static parse(path: string): readonly string[] {
    if (!path || typeof path !== 'string') {
      return [];
    }

    return path
      .split('.')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);
  }

  public static resolve(target: unknown, path: string): unknown {
    if (target === null || target === undefined || typeof target !== 'object') {
      return undefined;
    }

    const segments = this.parse(path);
    if (segments.length === 0) {
      return undefined;
    }

    let current: unknown = target;
    for (const segment of segments) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }
}
