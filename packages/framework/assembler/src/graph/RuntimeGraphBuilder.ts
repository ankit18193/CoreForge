import { ScanResult } from '@coreforge/contracts';

import { RuntimeGraph } from './RuntimeGraph';

export class RuntimeGraphBuilder {
  public build(scan: ScanResult): RuntimeGraph {
    const graph = new RuntimeGraph();

    for (const reg of scan.registrations) {
      const deps: string[] = [];

      if (reg.type === 'MODULE') {
        const moduleDeps = (reg as { dependencies?: readonly string[] }).dependencies || [];
        deps.push(...moduleDeps);
      } else {
        const parentId = (reg as { parentId?: string }).parentId;
        if (parentId) {
          deps.push(parentId);
        }
      }

      graph.addNode(reg.id, reg.type, deps);
    }

    return graph;
  }
}
