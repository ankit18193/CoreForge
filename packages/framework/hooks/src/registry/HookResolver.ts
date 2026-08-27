import { HookRegistry } from './HookRegistry';
import { HookType, RegisteredHookEntry } from '../types/hookTypes';

export class HookResolver {
  public static resolveExecutionOrder(
    registry: HookRegistry,
    type: HookType,
  ): readonly RegisteredHookEntry[] {
    const rawList = registry.getByType(type);
    if (rawList.length === 0) {
      return Object.freeze([]);
    }

    // Sort by priority DESC, then sequence ASC
    const sorted = [...rawList].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.sequence - b.sequence;
    });

    // If AFTER_* hook, execute in reverse unwinding order
    if (type.startsWith('AFTER_')) {
      sorted.reverse();
    }

    return Object.freeze(sorted);
  }
}
