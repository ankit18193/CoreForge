import { RegistrationGraph } from '../graph/RegistrationGraph';

export class RegistrationPlanner {
  public plan(graph: RegistrationGraph): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) {
        return;
      }
      visited.add(id);

      for (const dep of graph.getDependencies(id)) {
        visit(dep);
      }
      result.push(id);
    };

    const sortedNodes = Array.from(graph.getNodes()).sort((a, b) => a.id.localeCompare(b.id));
    for (const node of sortedNodes) {
      visit(node.id);
    }

    return result;
  }
}
