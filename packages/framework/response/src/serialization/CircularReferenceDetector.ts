import { CircularResponseError } from '../errors/ResponseErrors';

export class CircularReferenceDetector {
  private readonly _activeObjects = new Set<object>();
  private readonly _pathSegments: string[] = ['body'];
  private readonly _objectPathMap = new Map<object, string>();

  public enter(obj: object, propertyKey?: string | number): void {
    if (propertyKey !== undefined) {
      this._pathSegments.push(String(propertyKey));
    }

    const currentPath = this._pathSegments.join('.');

    if (this._activeObjects.has(obj)) {
      const originalPath = this._objectPathMap.get(obj) || 'body';
      throw new CircularResponseError(`${currentPath} → ${originalPath}`, {
        path: currentPath,
        target: originalPath,
      });
    }

    this._activeObjects.add(obj);
    this._objectPathMap.set(obj, currentPath);
  }

  public leave(obj: object, hasPropertyKey: boolean): void {
    this._activeObjects.delete(obj);
    this._objectPathMap.delete(obj);
    if (hasPropertyKey) {
      this._pathSegments.pop();
    }
  }

  public get currentPath(): string {
    return this._pathSegments.join('.');
  }
}
