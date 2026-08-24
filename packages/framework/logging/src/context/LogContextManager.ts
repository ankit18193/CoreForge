export class LogContextManager {
  public static createContext(
    initial: Record<string, unknown> = {},
  ): Readonly<Record<string, unknown>> {
    return Object.freeze(JSON.parse(JSON.stringify(initial)));
  }

  public static createChild(
    parent: Readonly<Record<string, unknown>>,
    childValues: Record<string, unknown>,
  ): Readonly<Record<string, unknown>> {
    const merged: Record<string, unknown> = {
      ...parent,
      ...childValues,
    };
    return Object.freeze(JSON.parse(JSON.stringify(merged)));
  }
}
