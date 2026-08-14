import { PluginContext } from './PluginContext';

export class PluginSandbox {
  public createSandbox(context: PluginContext): PluginContext {
    return new Proxy(context, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'object' && value !== null) {
          return Object.freeze(value);
        }
        return value;
      },
      set() {
        throw new Error(
          'PluginSandbox: Mutation of framework context state is strictly prohibited.',
        );
      },
      defineProperty() {
        throw new Error(
          'PluginSandbox: Mutation of framework context state is strictly prohibited.',
        );
      },
      deleteProperty() {
        throw new Error(
          'PluginSandbox: Mutation of framework context state is strictly prohibited.',
        );
      },
    });
  }
}
