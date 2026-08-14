import { PluginDescriptor } from '../registry/PluginDescriptor';

export class PluginDependencyGraph {
  private readonly _nodes = new Map<string, PluginDescriptor>();

  public addNode(desc: PluginDescriptor): void {
    this._nodes.set(desc.id, desc);
  }

  public get size(): number {
    return this._nodes.size;
  }

  public get depth(): number {
    let max = 0;
    for (const node of this._nodes.keys()) {
      max = Math.max(max, this.getDepthOf(node, new Set<string>()));
    }
    return max;
  }

  private getDepthOf(id: string, visited: Set<string>): number {
    if (visited.has(id)) {
      return 0;
    }
    visited.add(id);
    const node = this._nodes.get(id);
    if (!node || !node.dependencies || node.dependencies.length === 0) {
      visited.delete(id);
      return 1;
    }
    let subDepth = 0;
    for (const dep of node.dependencies) {
      subDepth = Math.max(subDepth, this.getDepthOf(dep, visited));
    }
    visited.delete(id);
    return subDepth + 1;
  }

  public hasCycle(): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const check = (id: string): boolean => {
      if (recStack.has(id)) {
        return true;
      }
      if (visited.has(id)) {
        return false;
      }
      visited.add(id);
      recStack.add(id);

      const node = this._nodes.get(id);
      if (node && node.dependencies) {
        for (const dep of node.dependencies) {
          if (check(dep)) {
            return true;
          }
        }
      }
      recStack.delete(id);
      return false;
    };

    for (const node of this._nodes.keys()) {
      if (check(node)) {
        return true;
      }
    }
    return false;
  }

  public getTopologicalOrder(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) {
        return;
      }
      if (recStack.has(id)) {
        throw new Error(
          'PluginDependencyGraph: Circular dependency detected during topological sort.',
        );
      }
      recStack.add(id);

      const node = this._nodes.get(id);
      if (node && node.dependencies) {
        for (const dep of node.dependencies) {
          visit(dep);
        }
      }

      recStack.delete(id);
      visited.add(id);
      result.push(id);
    };

    for (const id of this._nodes.keys()) {
      visit(id);
    }
    return result;
  }
}
