import { KernelComponentRegistry } from './KernelComponentRegistry';
import { KernelDependencyError } from '../errors/KernelErrors';
import { RegisteredKernelComponentEntry } from '../types/kernelTypes';

export class KernelComponentResolver {
  public static resolveStartupOrder(
    registry: KernelComponentRegistry,
  ): readonly RegisteredKernelComponentEntry[] {
    const all = registry.getAll();
    const byId = new Map<string, RegisteredKernelComponentEntry>();
    for (const entry of all) {
      byId.set(entry.id, entry);
    }

    // 1. Validate missing dependencies
    for (const entry of all) {
      for (const depId of entry.dependencies) {
        if (!byId.has(depId)) {
          throw new KernelDependencyError(
            `Component "${entry.id}" depends on missing component "${depId}"`,
            { componentId: entry.id, missingDependency: depId },
          );
        }
      }
    }

    // 2. Topological sort with cycle detection
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const result: RegisteredKernelComponentEntry[] = [];

    const visit = (entry: RegisteredKernelComponentEntry, path: string[]) => {
      const id = entry.id;

      if (visiting.has(id)) {
        const cyclePath = [...path, id].join(' -> ');
        throw new KernelDependencyError(
          `Circular dependency detected in kernel component graph: ${cyclePath}`,
          { cycle: cyclePath },
        );
      }

      if (visited.has(id)) {
        return;
      }

      visiting.add(id);

      for (const depId of entry.dependencies) {
        const depEntry = byId.get(depId);
        if (depEntry) {
          visit(depEntry, [...path, id]);
        }
      }

      visiting.delete(id);
      visited.add(id);
      result.push(entry);
    };

    for (const entry of all) {
      if (!visited.has(entry.id)) {
        visit(entry, []);
      }
    }

    return Object.freeze(result);
  }

  public static resolveShutdownOrder(
    registry: KernelComponentRegistry,
  ): readonly RegisteredKernelComponentEntry[] {
    const startupOrder = this.resolveStartupOrder(registry);
    return Object.freeze([...startupOrder].reverse());
  }
}
