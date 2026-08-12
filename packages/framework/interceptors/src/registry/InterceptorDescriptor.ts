import { Interceptor } from '@coreforge/contracts';

import { InterceptorScope } from './InterceptorScope';

export interface InterceptorDescriptor {
  readonly id: string;
  readonly interceptor: Interceptor;
  readonly scope: InterceptorScope;
  readonly priority: number;
}
