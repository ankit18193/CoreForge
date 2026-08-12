export class RouteNormalizer {
  public static normalize(path: string, _caseSensitive = false): string {
    let clean = path.replace(/\/+/g, '/');
    if (clean.endsWith('/') && clean.length > 1) {
      clean = clean.slice(0, -1);
    }
    if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }
    return clean;
  }

  public static splitSegments(path: string): string[] {
    return path.split('/').filter((s) => s.length > 0);
  }
}
