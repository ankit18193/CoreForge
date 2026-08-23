import { NormalizedRequest } from '../types/parameterBindingTypes';

export class CookieSource {
  public static extract(name: string | undefined, request: NormalizedRequest): unknown {
    if (!request.cookies) {
      return undefined;
    }
    if (name) {
      return request.cookies[name];
    }
    return request.cookies;
  }
}
