import { RegistrationGraph } from './RegistrationGraph';
import {
  RegistrationOrderingError,
  ScannerValidationError,
} from '../errors/ScannerErrors';

export class RegistrationGraphValidator {
  public validate(graph: RegistrationGraph): void {
    this._detectCycles(graph);
    this._detectOrphans(graph);
  }

  private _detectCycles(graph: RegistrationGraph): void {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      stack.add(nodeId);

      for (const dep of graph.getDependencies(nodeId)) {
        if (!visited.has(dep)) {
          dfs(dep);
        } else if (stack.has(dep)) {
          throw new RegistrationOrderingError(
            `RegistrationGraphValidator: Circular registration order dependency detected: "${nodeId}" -> "${dep}".`,
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

  private _detectOrphans(graph: RegistrationGraph): void {
    for (const node of graph.getNodes()) {
      for (const dep of node.dependencies) {
        if (!graph.hasNode(dep)) {
          throw new ScannerValidationError(
            `RegistrationGraphValidator: Orphan registration dependency reference. Node "${node.id}" requires missing node "${dep}".`,
          );
        }
      }
    }
  }
}
