import { RouteMethod } from '@coreforge/contracts';

import { RouteDescriptor } from '../registry/RouteDescriptor';

export class ResolutionContext {
  public readonly requestMethod: RouteMethod;
  public readonly normalizedPath: string;
  public matchedDescriptor?: RouteDescriptor | undefined;
  public extractedParameters?: Readonly<Record<string, string>> | undefined;
  public readonly startTime: number;
  public duration?: number | undefined;

  constructor(method: RouteMethod, path: string) {
    this.requestMethod = method;
    this.normalizedPath = path;
    this.startTime = Date.now();
  }

  public complete(
    descriptor?: RouteDescriptor | undefined,
    params?: Record<string, string> | undefined,
  ): void {
    this.matchedDescriptor = descriptor;
    this.extractedParameters = params ? Object.freeze({ ...params }) : undefined;
    this.duration = Date.now() - this.startTime;
  }
}
