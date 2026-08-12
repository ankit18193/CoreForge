import { ActionContext, Controller, ControllerExecutor as IControllerExecutor } from '@coreforge/contracts';

import { ControllerFactory } from './ControllerFactory';
import { ControllerDiagnostics } from '../diagnostics/ControllerDiagnostics';
import { ControllerStateError, DuplicateControllerError } from '../errors/ControllerErrors';
import { ControllerExecutor } from '../executor/ControllerExecutor';
import { ActionProfiler } from '../internal/ActionProfiler';
import { ControllerLifecycleManager } from '../lifecycle/ControllerLifecycleManager';
import { ControllerState } from '../lifecycle/ControllerState';
import { ActionDescriptor } from '../metadata/ActionDescriptor';
import { ActionMetadata } from '../metadata/ActionMetadata';
import { ControllerMetadata } from '../metadata/ControllerMetadata';
import { ControllerDescriptor } from '../registry/ControllerDescriptor';
import { ControllerRegistry } from '../registry/ControllerRegistry';
import { ControllerMetadataOptions } from '../types/controllerTypes';

export class ControllerManager implements IControllerExecutor {
  private readonly _registry = new ControllerRegistry();
  private readonly _lifecycleManager = new ControllerLifecycleManager();
  private readonly _profiler = new ActionProfiler();
  private readonly _diagnostics: ControllerDiagnostics;
  private readonly _executor: ControllerExecutor;
  private readonly _factory: ControllerFactory;

  private _counter = 0;

  constructor(factory: ControllerFactory) {
    this._diagnostics = new ControllerDiagnostics(this._registry, this._profiler);
    this._executor = new ControllerExecutor(this._profiler);
    this._factory = factory;
  }

  public get state(): ControllerState {
    return this._lifecycleManager.state;
  }

  public get diagnostics(): ControllerDiagnostics {
    return this._diagnostics;
  }

  public get registry(): ControllerRegistry {
    return this._registry;
  }

  public startRegistration(): void {
    if (this._lifecycleManager.state === ControllerState.CREATED) {
      this._lifecycleManager.transitionTo(ControllerState.REGISTERING);
    }
  }

  public completeRegistration(): void {
    if (this._lifecycleManager.state === ControllerState.REGISTERING) {
      this._lifecycleManager.transitionTo(ControllerState.READY);
    }
  }

  public stop(): void {
    if (
      this._lifecycleManager.state === ControllerState.READY ||
      this._lifecycleManager.state === ControllerState.RUNNING
    ) {
      this._lifecycleManager.transitionTo(ControllerState.STOPPING);
      this._lifecycleManager.transitionTo(ControllerState.STOPPED);
    }
  }

  public register(
    constructor: new (...args: never[]) => Controller,
    options?: ControllerMetadataOptions,
  ): string {
    if (this._lifecycleManager.state !== ControllerState.REGISTERING) {
      throw new ControllerStateError('Cannot register controllers unless in REGISTERING state.');
    }

    const instance = this._factory.create(constructor);
    const name = options?.name || constructor.name;
    const id = options?.id || `ctrl-${++this._counter}`;

    const proto = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (m) => m !== 'constructor' && typeof (proto as Record<string, unknown>)[m] === 'function',
    );

    const actionSet = new Set<string>();
    const actions: ActionDescriptor[] = [];

    for (const actionName of methodNames) {
      if (actionSet.has(actionName)) {
        throw new DuplicateControllerError(
          `Action "${actionName}" is already defined on controller "${name}".`,
        );
      }
      actionSet.add(actionName);

      const method = (instance as Record<string, unknown>)[actionName] as (
        ...args: unknown[]
      ) => unknown;

      const parameterCount = method.length;
      const isAsync = method.constructor.name === 'AsyncFunction';

      const actionMeta: ActionMetadata = {
        actionName,
        displayName: actionName,
        returnType: 'unknown',
        parameterCount,
        tags: [],
        createdAt: Date.now(),
      };

      const actionDesc: ActionDescriptor = {
        id: `${id}-${actionName}`,
        metadata: Object.freeze(actionMeta),
        handler: method,
        parameterCount,
        async: isAsync,
        createdAt: Date.now(),
      };

      actions.push(Object.freeze(actionDesc));
    }

    const metadata: ControllerMetadata = {
      id,
      name,
      version: options?.version || 'v1',
      group: options?.group || 'default',
      tags: options?.tags ? Object.freeze([...options.tags]) : Object.freeze([]),
      createdAt: Date.now(),
    };

    const descriptor: ControllerDescriptor = {
      id,
      metadata: Object.freeze(metadata),
      instance,
      actions: Object.freeze(actions),
      state: ControllerState.READY,
      createdAt: Date.now(),
      enabled: true,
    };

    const frozenDescriptor = Object.freeze(descriptor);
    this._registry.register(frozenDescriptor);

    return id;
  }

  public async execute(
    controller: Controller,
    action: string,
    context: ActionContext,
    args: unknown[] = [],
  ): Promise<unknown> {
    if (
      this._lifecycleManager.state === ControllerState.STOPPED ||
      this._lifecycleManager.state === ControllerState.STOPPING
    ) {
      throw new ControllerStateError('Cannot execute actions while manager is stopped.');
    }

    if (this._lifecycleManager.state === ControllerState.READY) {
      this._lifecycleManager.transitionTo(ControllerState.RUNNING);
    }

    let desc: ControllerDescriptor | undefined;
    for (const c of this._registry.getAll()) {
      if (c.instance === controller) {
        desc = c;
        break;
      }
    }

    if (!desc) {
      throw new ControllerStateError('Controller instance is not registered.');
    }

    try {
      const execResult = await this._executor.execute(desc, action, context, args);
      if (!execResult.success) {
        throw execResult.exception;
      }
      return execResult.returnedValue;
    } finally {
      if (this._lifecycleManager.state === ControllerState.RUNNING) {
        this._lifecycleManager.transitionTo(ControllerState.READY);
      }
    }
  }
}
