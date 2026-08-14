import { RuntimeNode } from './RuntimeNode';

export class RuntimeGraph {
  private readonly _nodes = new Map<string, RuntimeNode>();
  private _frozen = false;

  public get size(): number {
    return this._nodes.size;
  }

  public addNode(id: string, type: string, dependencies: string[]): void {
    if (this._frozen) {
      throw new Error('RuntimeGraph: cannot mutate frozen graph.');
    }
    this._nodes.set(id, new RuntimeNode(id, type, dependencies));
  }

  public hasNode(id: string): boolean {
    return this._nodes.has(id);
  }

  public getNode(id: string): RuntimeNode | undefined {
    return this._nodes.get(id);
  }

  public getDependencies(id: string): readonly string[] {
    const node = this._nodes.get(id);
    return node ? node.dependencies : [];
  }

  public getNodes(): readonly RuntimeNode[] {
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

  public freeze(): void {
    this._frozen = true;
  }
}
