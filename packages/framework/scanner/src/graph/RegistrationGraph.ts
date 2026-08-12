import { RegistrationNode } from './RegistrationNode';

export class RegistrationGraph {
  private readonly _nodes = new Map<string, RegistrationNode>();

  public get size(): number {
    return this._nodes.size;
  }

  public addNode(id: string, type: string, dependencies: string[]): void {
    this._nodes.set(id, new RegistrationNode(id, type, dependencies));
  }

  public hasNode(id: string): boolean {
    return this._nodes.has(id);
  }

  public getNode(id: string): RegistrationNode | undefined {
    return this._nodes.get(id);
  }

  public getDependencies(id: string): readonly string[] {
    const node = this._nodes.get(id);
    return node ? node.dependencies : [];
  }

  public getNodes(): readonly RegistrationNode[] {
    return Array.from(this._nodes.values());
  }

  public getDepth(): number {
    let maxDepth = 0;
    const visited = new Set<string>();

    const dfs = (id: string, currentDepth: number): number => {
      visited.add(id);
      let depth = currentDepth;
      for (const dep of this.getDependencies(id)) {
        if (!visited.has(dep)) {
          depth = Math.max(depth, dfs(dep, currentDepth + 1));
        }
      }
      visited.delete(id);
      return depth;
    };

    for (const node of this._nodes.values()) {
      maxDepth = Math.max(maxDepth, dfs(node.id, 1));
    }
    return maxDepth;
  }

  public clear(): void {
    this._nodes.clear();
  }
}
