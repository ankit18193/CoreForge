import { NormalizedRequest } from '../types/parameterBindingTypes';

export class HeaderSource {
  public static extract(name: string | undefined, request: NormalizedRequest): unknown {
    if (!request.headers) {
      return undefined;
    }

    if (!name) {
      return request.headers;
    }

    const targetKey = name.toLowerCase();
    for (const [key, value] of Object.entries(request.headers)) {
      if (key.toLowerCase() === targetKey) {
        return value;
      }
    }

    return undefined;
  }
}
