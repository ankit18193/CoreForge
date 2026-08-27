import { HookDuplicateError, HookRegistrationError } from '../errors/HookErrors';
import {
  Hook,
  HookFailureStrategy,
  HookOptions,
  HookType,
  RegisteredHookEntry,
} from '../types/hookTypes';

const VALID_HOOK_TYPES: ReadonlySet<HookType> = new Set([
  'BEFORE_START',
  'AFTER_START',
  'BEFORE_STOP',
  'AFTER_STOP',
  'BEFORE_EXECUTE',
  'AFTER_EXECUTE',
  'ON_ERROR',
]);

export class HookRegistry {
  private readonly _hooksById = new Map<string, RegisteredHookEntry>();
  private readonly _hooksByType = new Map<HookType, RegisteredHookEntry[]>();
  private _sequence = 0;
  private _isLocked = false;

  constructor() {
    for (const type of VALID_HOOK_TYPES) {
      this._hooksByType.set(type, []);
    }
  }

  public get isLocked(): boolean {
    return this._isLocked;
  }

  public get size(): number {
    return this._hooksById.size;
  }

  public lock(): void {
    this._isLocked = true;
  }

  public register<TPayload = unknown, TResult = unknown>(
    hook: Hook<TPayload, TResult>,
    options?: HookOptions,
  ): void {
    if (this._isLocked) {
      throw new HookRegistrationError(
        `Cannot register hook "${hook?.id}": hook registry is locked after initialization`,
      );
    }

    if (!hook || typeof hook !== 'object') {
      throw new HookRegistrationError('Invalid hook definition: must be an object');
    }

    if (!hook.id || typeof hook.id !== 'string' || hook.id.trim() === '') {
      throw new HookRegistrationError('Invalid hook definition: missing or empty "id"');
    }

    if (!hook.type || !VALID_HOOK_TYPES.has(hook.type)) {
      throw new HookRegistrationError(
        `Invalid hook definition for "${hook.id}": unknown hook type "${hook.type}"`,
      );
    }

    if (typeof hook.execute !== 'function') {
      throw new HookRegistrationError(
        `Invalid hook definition for "${hook.id}": execute must be a function`,
      );
    }

    if (this._hooksById.has(hook.id)) {
      throw new HookDuplicateError(
        `Duplicate hook registration: hook with id "${hook.id}" already exists`,
      );
    }

    const priority = options?.priority ?? hook.priority ?? 0;
    const failureStrategy: HookFailureStrategy = options?.failureStrategy ?? 'CONTINUE';

    const entry: RegisteredHookEntry<TPayload, TResult> = Object.freeze({
      id: hook.id,
      type: hook.type,
      hook,
      priority,
      sequence: ++this._sequence,
      failureStrategy,
    });

    this._hooksById.set(hook.id, entry as RegisteredHookEntry<unknown, unknown>);
    const typeList = this._hooksByType.get(hook.type);
    if (typeList) {
      typeList.push(entry as RegisteredHookEntry<unknown, unknown>);
    }
  }

  public get(id: string): RegisteredHookEntry | undefined {
    return this._hooksById.get(id);
  }

  public has(id: string): boolean {
    return this._hooksById.has(id);
  }

  public getByType(type: HookType): readonly RegisteredHookEntry[] {
    return Object.freeze([...(this._hooksByType.get(type) ?? [])]);
  }

  public getAll(): readonly RegisteredHookEntry[] {
    return Object.freeze([...this._hooksById.values()]);
  }

  public clear(): void {
    if (this._isLocked) {
      throw new HookRegistrationError('Cannot clear locked hook registry');
    }
    this._hooksById.clear();
    for (const list of this._hooksByType.values()) {
      list.length = 0;
    }
    this._sequence = 0;
  }
}
