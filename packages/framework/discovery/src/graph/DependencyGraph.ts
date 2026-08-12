import { DependencyGraph as IDependencyGraph } from '@coreforge/contracts';

import { GraphNode } from './GraphNode';

export class DependencyGraph implements IDependencyGraph {
  private readonly _nodes = new Map<string, GraphNode>();

  public get size(): number {
    return this._nodes.size;
  }

  public addNode(id: string, dependencies: readonly string[]): void {
    this._nodes.set(id, new GraphNode(id, dependencies));
  }

  public hasNode(id: string): boolean {
    return this._nodes.has(id);
  }

  public getDependencies(id: string): readonly string[] {
    const node = this._nodes.get(id);
    return node ? node.dependencies : [];
  }

  public getNodes(): readonly GraphNode[] {
    return Array.from(this._nodes.values());
  }

  public clear(): void {
    this._nodes.clear();
  }
}
