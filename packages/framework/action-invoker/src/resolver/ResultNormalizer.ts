import { InvocationResult } from '../executor/InvocationResult';

export class ResultNormalizer {
  public normalize(value: unknown): InvocationResult {
    // Future extensibility extension points:
    // TODO: Support Stream response mappings
    // TODO: Support AsyncIterable response mappings
    // TODO: Support File download mapping
    // TODO: Support Server Sent Events (SSE) mapping

    return new InvocationResult(value);
  }
}
