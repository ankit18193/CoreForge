import { ParameterBindingSourceError } from '../errors/ParameterBindingErrors';
import { BodySource } from '../sources/BodySource';
import { CookieSource } from '../sources/CookieSource';
import { HeaderSource } from '../sources/HeaderSource';
import { ParamSource } from '../sources/ParamSource';
import { QuerySource } from '../sources/QuerySource';
import { NormalizedRequest, ParameterBindingSource } from '../types/parameterBindingTypes';

export class ParameterValueExtractor {
  public static extract(
    source: ParameterBindingSource,
    name: string | undefined,
    request: NormalizedRequest,
  ): unknown {
    switch (source) {
      case 'PARAM':
        return ParamSource.extract(name, request);
      case 'QUERY':
        return QuerySource.extract(name, request);
      case 'BODY':
        return BodySource.extract(name, request);
      case 'HEADER':
        return HeaderSource.extract(name, request);
      case 'COOKIE':
        return CookieSource.extract(name, request);
      default:
        throw new ParameterBindingSourceError(
          `Unknown parameter binding source: "${String(source)}".`,
        );
    }
  }
}
