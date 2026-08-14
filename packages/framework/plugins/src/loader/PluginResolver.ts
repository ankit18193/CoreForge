import { PluginDependencyGraph } from './PluginDependencyGraph';
import { PluginValidationError } from '../errors/PluginErrors';
import { PluginDescriptor } from '../registry/PluginDescriptor';

export class PluginResolver {
  public resolve(descriptors: readonly PluginDescriptor[]): {
    graph: PluginDependencyGraph;
    order: string[];
  } {
    const graph = new PluginDependencyGraph();
    const idSet = new Set<string>();

    for (const desc of descriptors) {
      if (idSet.has(desc.id)) {
        throw new PluginValidationError(
          `PluginResolver: Duplicate plugin ID detected: "${desc.id}"`,
        );
      }
      idSet.add(desc.id);
      graph.addNode(desc);
    }

    for (const desc of descriptors) {
      if (desc.dependencies) {
        for (const dep of desc.dependencies) {
          if (!idSet.has(dep)) {
            throw new PluginValidationError(
              `PluginResolver: Missing dependency "${dep}" for plugin "${desc.id}"`,
            );
          }
        }
      }
    }

    if (graph.hasCycle()) {
      throw new PluginValidationError(
        'PluginResolver: Circular dependency detected in plugin graph.',
      );
    }

    const order = graph.getTopologicalOrder();
    return { graph, order };
  }
}
