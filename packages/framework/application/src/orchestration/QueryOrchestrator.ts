import type { Query, QueryOptions, QueryResult } from '@coreforge/contracts';
import { QueryBus } from '@coreforge/query';

export class QueryOrchestrator {
  private readonly _queryBus: QueryBus;

  constructor(queryBus: QueryBus) {
    this._queryBus = queryBus;
  }

  public get queryBus(): QueryBus {
    return this._queryBus;
  }

  public async query<TPayload = unknown, TResult = unknown>(
    query: Query<TPayload>,
    options?: QueryOptions,
  ): Promise<QueryResult<TResult>> {
    return this._queryBus.query<TPayload, TResult>(query, options);
  }
}
