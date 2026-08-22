import { RequestLifecycleState } from './RequestLifecycleState';
import { ContextDisposedError, ContextStateError } from '../errors/RequestContextErrors';

export class RequestLifecycleManager {
  private _state: RequestLifecycleState = RequestLifecycleState.INITIALIZING;
  private readonly _contextId: string;

  private static readonly VALID_TRANSITIONS: ReadonlyMap<
    RequestLifecycleState,
    ReadonlySet<RequestLifecycleState>
  > = new Map([
    [
      RequestLifecycleState.INITIALIZING,
      new Set([
        RequestLifecycleState.ACTIVE,
        RequestLifecycleState.DISPOSING,
        RequestLifecycleState.FAILED,
      ]),
    ],
    [
      RequestLifecycleState.ACTIVE,
      new Set([
        RequestLifecycleState.COMPLETING,
        RequestLifecycleState.DISPOSING,
        RequestLifecycleState.FAILED,
      ]),
    ],
    [
      RequestLifecycleState.COMPLETING,
      new Set([RequestLifecycleState.DISPOSING, RequestLifecycleState.FAILED]),
    ],
    [
      RequestLifecycleState.FAILED,
      new Set([RequestLifecycleState.DISPOSING, RequestLifecycleState.DISPOSED]),
    ],
    [RequestLifecycleState.DISPOSING, new Set([RequestLifecycleState.DISPOSED])],
    [RequestLifecycleState.DISPOSED, new Set<RequestLifecycleState>()],
  ]);

  constructor(contextId: string) {
    this._contextId = contextId;
  }

  public get state(): RequestLifecycleState {
    return this._state;
  }

  public transitionTo(nextState: RequestLifecycleState): void {
    if (this._state === nextState) {
      return;
    }

    const allowed = RequestLifecycleManager.VALID_TRANSITIONS.get(this._state);
    if (!allowed || !allowed.has(nextState)) {
      throw new ContextStateError(
        `Invalid RequestContext transition from "${this._state}" to "${nextState}" on context "${this._contextId}".`,
        { currentState: this._state, requestedState: nextState, contextId: this._contextId },
      );
    }

    this._state = nextState;
  }

  public assertActive(): void {
    this.assertNotDisposed();
    if (this._state !== RequestLifecycleState.ACTIVE) {
      throw new ContextStateError(
        `RequestContext "${this._contextId}" is in state "${this._state}", expected ACTIVE.`,
        { currentState: this._state, contextId: this._contextId },
      );
    }
  }

  public assertNotDisposed(): void {
    if (
      this._state === RequestLifecycleState.DISPOSING ||
      this._state === RequestLifecycleState.DISPOSED
    ) {
      throw new ContextDisposedError(this._contextId);
    }
  }
}
