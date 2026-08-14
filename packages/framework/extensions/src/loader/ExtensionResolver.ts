import { ExtensionDependencyGraph } from './ExtensionDependencyGraph';
import { ExtensionValidationError } from '../errors/ExtensionErrors';
import { ExtensionDescriptor } from '../registry/ExtensionDescriptor';

export class ExtensionResolver {
  public resolve(descriptors: readonly ExtensionDescriptor[]): {
    graph: ExtensionDependencyGraph;
    order: string[];
  } {
    const graph = new ExtensionDependencyGraph();
    const idSet = new Set<string>();

    for (const desc of descriptors) {
      if (idSet.has(desc.id)) {
        throw new ExtensionValidationError(
          `ExtensionResolver: Duplicate extension ID detected: "${desc.id}"`,
        );
      }
      idSet.add(desc.id);
      graph.addNode(desc);
    }

    for (const desc of descriptors) {
      if (desc.dependencies) {
        for (const dep of desc.dependencies) {
          if (!idSet.has(dep)) {
            throw new ExtensionValidationError(
              `ExtensionResolver: Missing dependency "${dep}" for extension "${desc.id}"`,
            );
          }
        }
      }
    }

    if (graph.hasCycle()) {
      throw new ExtensionValidationError(
        'ExtensionResolver: Circular dependency detected in extension graph.',
      );
    }

    const order = graph.getTopologicalOrder();
    return { graph, order };
  }
}
