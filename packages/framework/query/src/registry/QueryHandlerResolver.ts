import { QueryHandlerRegistry } from './QueryHandlerRegistry';
import { QueryHandlerNotFoundError } from '../errors/QueryErrors';
import { QueryHandler } from '../types/queryTypes';

export class QueryHandlerResolver {
  public static resolve<TPayload = unknown, TResult = unknown>(
    registry: QueryHandlerRegistry,
    queryType: string,
  ): QueryHandler<TPayload, TResult> {
    const handler = registry.get(queryType);

    if (!handler) {
      throw new QueryHandlerNotFoundError(`No handler registered for query type "${queryType}"`, {
        queryType,
      });
    }

    return handler as QueryHandler<TPayload, TResult>;
  }
}
