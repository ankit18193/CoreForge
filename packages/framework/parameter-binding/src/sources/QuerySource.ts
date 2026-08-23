import { NormalizedRequest } from '../types/parameterBindingTypes';

export class QuerySource {
  public static extract(name: string | undefined, request: NormalizedRequest): unknown {
    if (!request.query) {
      return undefined;
    }
    if (name) {
      return request.query[name];
    }
    return request.query;
  }
}
