import { ScanResult } from '@coreforge/contracts';

export class AssemblyPlanner {
  public plan(scan: ScanResult): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) {
        return;
      }
      visited.add(id);

      const reg = scan.registrations.find((r) => r.id === id);
      if (reg) {
        if (reg.type === 'MODULE') {
          const moduleDeps = (reg as { dependencies?: readonly string[] }).dependencies || [];
          for (const dep of moduleDeps) {
            visit(dep);
          }
        } else {
          const parentId = (reg as { parentId?: string }).parentId;
          if (parentId) {
            visit(parentId);
          }
        }
        result.push(id);
      }
    };

    const sorted = [...scan.registrations].sort((a, b) => a.id.localeCompare(b.id));
    for (const reg of sorted) {
      visit(reg.id);
    }

    return result;
  }
}
