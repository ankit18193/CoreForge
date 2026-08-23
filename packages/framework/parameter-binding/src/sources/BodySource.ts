import { NormalizedRequest } from '../types/parameterBindingTypes';

export class BodySource {
  public static extract(name: string | undefined, request: NormalizedRequest): unknown {
    if (request.body === undefined) {
      return undefined;
    }

    if (name) {
      if (
        typeof request.body === 'object' &&
        request.body !== null &&
        name in (request.body as Record<string, unknown>)
      ) {
        return (request.body as Record<string, unknown>)[name];
      }
      return undefined;
    }

    return request.body;
  }
}
