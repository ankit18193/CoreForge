import { DependencyGraph } from './DependencyGraph';
import { DiscoveryCycleError, DiscoveryOrphanError } from '../errors/DiscoveryErrors';

export class GraphValidator {
  public validate(graph: DependencyGraph): void {
    this._detectCycles(graph);
    this._detectOrphans(graph);
  }

  private _detectCycles(graph: DependencyGraph): void {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      stack.add(nodeId);

      for (const dep of graph.getDependencies(nodeId)) {
        if (!visited.has(dep)) {
          dfs(dep);
        } else if (stack.has(dep)) {
          throw new DiscoveryCycleError(
            `GraphValidator: Circular dependency detected involving module "${nodeId}" -> "${dep}".`,
          );
        }
      }

      stack.delete(nodeId);
    };

    for (const node of graph.getNodes()) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }
  }

  private _detectOrphans(graph: DependencyGraph): void {
    for (const node of graph.getNodes()) {
      for (const dep of node.dependencies) {
        if (!graph.hasNode(dep)) {
          throw new DiscoveryOrphanError(
            `GraphValidator: Orphan dependency reference detected. Node "${node.id}" depends on missing node "${dep}".`,
          );
        }
      }
    }
  }
}
