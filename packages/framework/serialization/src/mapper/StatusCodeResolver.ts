import { InvocationResult } from '@coreforge/contracts';

export class StatusCodeResolver {
  public resolve(result: InvocationResult): number {
    const val = result.value;
    if (val === null || val === undefined) {
      return 204;
    }
    // Future extensions:
    // TODO: Support Created Resource mapped to 201
    return 200;
  }
}
