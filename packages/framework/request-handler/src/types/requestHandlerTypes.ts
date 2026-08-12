import { Container, EventBus, Logger } from '@coreforge/contracts';

export interface RequestServices {
  readonly logger: Logger;
  readonly container: Container;
  readonly eventBus: EventBus;
}
