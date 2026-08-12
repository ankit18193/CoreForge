import { ExecutionId } from './ExecutionId';
import { RequestContext } from '../request/RequestContext';
import { ResponseBuilder } from '../response/ResponseBuilder';

export class HttpExecutionContext {
  public readonly executionId: string;
  public readonly timestamp: number;
  public requestContext?: RequestContext | undefined;
  public responseBuilder?: ResponseBuilder | undefined;
  public duration?: number | undefined;

  constructor() {
    this.executionId = ExecutionId.generate();
    this.timestamp = Date.now();
  }

  public complete(): void {
    this.duration = Date.now() - this.timestamp;
  }
}
