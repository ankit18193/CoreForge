import { ScanResult } from '@coreforge/contracts';

import { RuntimeGraph } from './RuntimeGraph';
import { AssemblyGraphError } from '../errors/AssemblyErrors';

export class RuntimeGraphValidator {
  public validate(graph: RuntimeGraph, scan: ScanResult): void {
    this._detectDuplicates(scan);
    this._detectOrphans(graph);
    this._detectCycles(graph);
    this._detectUnreachable(graph);
  }

  private _detectDuplicates(scan: ScanResult): void {
    const ids = new Set<string>();
    for (const reg of scan.registrations) {
      if (ids.has(reg.id)) {
        throw new AssemblyGraphError(
          `RuntimeGraphValidator: Duplicate runtime node registration detected: "${reg.id}".`,
        );
      }
      ids.add(reg.id);
    }
  }

  private _detectOrphans(graph: RuntimeGraph): void {
    for (const node of graph.getNodes()) {
      for (const dep of node.dependencies) {
        if (!graph.hasNode(dep)) {
          throw new AssemblyGraphError(
            `RuntimeGraphValidator: Orphan runtime node detected. Node "${node.id}" requires missing node "${dep}".`,
          );
        }
      }
    }
  }

  private _detectCycles(graph: RuntimeGraph): void {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (id: string) => {
      visited.add(id);
      stack.add(id);

      for (const dep of graph.getDependencies(id)) {
        if (!visited.has(dep)) {
          dfs(dep);
        } else if (stack.has(dep)) {
          throw new AssemblyGraphError(
            `RuntimeGraphValidator: Circular reference detected in runtime graph: "${id}" -> "${dep}".`,
          );
        }
      }

      stack.delete(id);
    };

    for (const node of graph.getNodes()) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }
  }

  private _detectUnreachable(graph: RuntimeGraph): void {
    for (const node of graph.getNodes()) {
      if (node.type !== 'MODULE') {
        let current: string | undefined = node.id;
        const pathVisited = new Set<string>();
        while (current) {
          if (pathVisited.has(current)) {
            throw new AssemblyGraphError(
              `RuntimeGraphValidator: Unreachable cyclic component chain: "${current}".`,
            );
          }
          pathVisited.add(current);
          const nextNode = graph.getNode(current);
          if (!nextNode) {
            throw new AssemblyGraphError(
              `RuntimeGraphValidator: Unreachable or missing component parent: "${current}".`,
            );
          }
          if (nextNode.type === 'MODULE') {
            break;
          }
          current = nextNode.dependencies[0];
        }
      }
    }
  }
}
