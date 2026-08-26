import type { Command, DispatchOptions, DispatchResult } from '@coreforge/contracts';
import { Dispatcher } from '@coreforge/dispatch';

export class CommandOrchestrator {
  private readonly _dispatcher: Dispatcher;

  constructor(dispatcher: Dispatcher) {
    this._dispatcher = dispatcher;
  }

  public get dispatcher(): Dispatcher {
    return this._dispatcher;
  }

  public async dispatch<TPayload = unknown, TResult = unknown>(
    command: Command<TPayload>,
    options?: DispatchOptions,
  ): Promise<DispatchResult<TResult>> {
    return this._dispatcher.dispatch<TPayload, TResult>(command, options);
  }
}
