import { DependencyGraph } from '@coreforge/contracts';

export class DependencyOptimizer {
  public optimize(graph: DependencyGraph): { savingsCount: number } {
    let savings = 0;
    const getNodesMethod = (graph as { getNodes?: () => { id: string }[] }).getNodes;
    if (getNodesMethod) {
      const nodes = getNodesMethod.call(graph);
      for (const node of nodes) {
        const deps = graph.getDependencies(node.id);
        if (deps.length > 1) {
          savings++;
        }
      }
    }
    return { savingsCount: savings };
  }
}
