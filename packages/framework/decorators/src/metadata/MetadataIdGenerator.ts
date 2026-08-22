export class MetadataIdGenerator {
  public static normalizePath(path?: string): string {
    if (!path || path.trim() === '' || path === '/') {
      return '/';
    }

    let normalized = path.trim();
    if (!normalized.startsWith('/')) {
      normalized = `/${normalized}`;
    }

    normalized = normalized.replace(/\/+/g, '/');

    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }

  public static combinePaths(prefix: string, path?: string): string {
    const normPrefix = MetadataIdGenerator.normalizePath(prefix);
    const normPath = MetadataIdGenerator.normalizePath(path);

    if (normPrefix === '/' && normPath === '/') {
      return '/';
    }
    if (normPrefix === '/') {
      return normPath;
    }
    if (normPath === '/') {
      return normPrefix;
    }

    return `${normPrefix}${normPath}`;
  }

  public static generateModuleId(name: string): string {
    return `module:${name}`;
  }

  public static generateControllerId(name: string): string {
    return `controller:${name}`;
  }

  public static generateActionId(controllerName: string, actionName: string): string {
    return `action:${controllerName}:${actionName}`;
  }

  public static generateRouteId(
    controllerName: string,
    actionName: string,
    method: string,
    path: string,
  ): string {
    const normPath = MetadataIdGenerator.normalizePath(path);
    return `route:${controllerName}:${actionName}:${method.toUpperCase()}:${normPath}`;
  }

  public static generateParamId(
    controllerName: string,
    actionName: string,
    index: number,
    source: string,
    name?: string,
  ): string {
    const namePart = name ? `:${name}` : '';
    return `param:${controllerName}:${actionName}:${index}:${source}${namePart}`;
  }

  public static generateProviderId(tokenOrName: string): string {
    return `provider:${tokenOrName}`;
  }

  public static generateMiddlewareId(targetName: string, middlewareName: string): string {
    return `middleware:${targetName}:${middlewareName}`;
  }

  public static generateInterceptorId(targetName: string, interceptorName: string): string {
    return `interceptor:${targetName}:${interceptorName}`;
  }

  public static generateSecurityId(targetName: string, ruleKey: string): string {
    return `security:${targetName}:${ruleKey}`;
  }
}
