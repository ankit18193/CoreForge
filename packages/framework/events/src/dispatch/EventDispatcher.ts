import {
  DomainEvent,
  EventHandlerExecutionResult,
  EventHandlerRegistration,
} from '../types/eventTypes';

export interface DispatchExecutionOutcome {
  readonly results: readonly EventHandlerExecutionResult[];
  readonly cancelled: boolean;
}

export interface IEventDispatcher {
  dispatch(
    event: DomainEvent,
    handlers: readonly EventHandlerRegistration[],
    signal?: AbortSignal,
  ): Promise<DispatchExecutionOutcome>;
}
