import * as assert from 'node:assert';
import { test } from 'node:test';

import {
  Controller,
  Interceptor,
  InterceptorContext,
  NextInvocation,
  RequestScope,
  Container,
  EventBus,
} from '@coreforge/contracts';

import {
  InterceptorConfigurationError,
  InterceptorExecutionError,
} from '../errors/InterceptorErrors';
import { InterceptionResult } from '../executor/InterceptionResult';
import { InterceptorBuilder } from '../interceptor/InterceptorBuilder';
import { InterceptorManager } from '../interceptor/InterceptorManager';
import { InterceptorState } from '../lifecycle/InterceptorState';
import { InterceptorScope } from '../registry/InterceptorScope';

class DummyRequestScope implements RequestScope {
  public id = 'scope-id';
  public container = {} as unknown as Container;
  public state = 0;
  public createdAt = Date.now();
  public events = {} as unknown as EventBus;
  public resolve<T>(_token: unknown): T {
    return {} as unknown as T;
  }
  public has() {
    return false;
  }
  public async dispose() {}
}

class DummyController implements Controller {}

class TrackingInterceptor implements Interceptor {
  private readonly _name: string;
  private readonly _list: string[];

  constructor(name: string, list: string[]) {
    this._name = name;
    this._list = list;
  }

  public async intercept(
    _context: InterceptorContext,
    next: NextInvocation,
  ): Promise<InterceptionResult> {
    this._list.push(`before-${this._name}`);
    const res = await next.proceed();
    this._list.push(`after-${this._name}`);
    return res;
  }
}

class ShortCircuitingInterceptor implements Interceptor {
  private readonly _value: unknown;

  constructor(value: unknown) {
    this._value = value;
  }

  public async intercept(): Promise<InterceptionResult> {
    return new InterceptionResult(this._value);
  }
}

class DoubleProceedInterceptor implements Interceptor {
  public async intercept(
    _context: InterceptorContext,
    next: NextInvocation,
  ): Promise<InterceptionResult> {
    await next.proceed();
    return next.proceed();
  }
}

test('Interceptor Pipeline Package', async (t) => {
  await t.test('Execution Order - scopes and priority execute in order', async () => {
    const list: string[] = [];
    const builder = new InterceptorBuilder()
      .register('G1', new TrackingInterceptor('Global1', list), InterceptorScope.GLOBAL, 1)
      .register('G2', new TrackingInterceptor('Global2', list), InterceptorScope.GLOBAL, 2)
      .register('M1', new TrackingInterceptor('Module1', list), InterceptorScope.MODULE)
      .register('C1', new TrackingInterceptor('Ctrl1', list), InterceptorScope.CONTROLLER)
      .register('A1', new TrackingInterceptor('Act1', list), InterceptorScope.ACTION);

    const manager = new InterceptorManager(builder.build());
    const context: InterceptorContext = {
      requestScope: new DummyRequestScope(),
      controller: new DummyController(),
      action: 'testAction',
    };

    const res = await manager.execute(context, {
      proceed: async () => {
        list.push('coreAction');
        return new InterceptionResult('coreResult');
      },
    });

    assert.strictEqual(res.value, 'coreResult');
    assert.deepStrictEqual(list, [
      'before-Global1',
      'before-Global2',
      'before-Module1',
      'before-Ctrl1',
      'before-Act1',
      'coreAction',
      'after-Act1',
      'after-Ctrl1',
      'after-Module1',
      'after-Global2',
      'after-Global1',
    ]);
  });

  await t.test('Registry Validation - duplicate registration throws error', async () => {
    const builder = new InterceptorBuilder();
    builder.register('I1', new TrackingInterceptor('I1', []), InterceptorScope.GLOBAL);

    assert.throws(() => {
      builder.register('I1', new TrackingInterceptor('I1', []), InterceptorScope.GLOBAL);
    }, InterceptorConfigurationError);
  });

  await t.test('Short Circuiting - proceed is omitted, core is not called', async () => {
    const builder = new InterceptorBuilder().register(
      'I1',
      new ShortCircuitingInterceptor('intercepted'),
      InterceptorScope.GLOBAL,
    );

    const manager = new InterceptorManager(builder.build());
    const context: InterceptorContext = {
      requestScope: new DummyRequestScope(),
      controller: new DummyController(),
      action: 'testAction',
    };

    let coreCalled = false;
    const res = await manager.execute(context, {
      proceed: async () => {
        coreCalled = true;
        return new InterceptionResult('core');
      },
    });

    assert.strictEqual(coreCalled, false);
    assert.strictEqual(res.value, 'intercepted');
  });

  await t.test(
    'Double Proceed Guards - proceed() twice throws InterceptorExecutionError',
    async () => {
      const builder = new InterceptorBuilder().register(
        'I1',
        new DoubleProceedInterceptor(),
        InterceptorScope.GLOBAL,
      );

      const manager = new InterceptorManager(builder.build());
      const context: InterceptorContext = {
        requestScope: new DummyRequestScope(),
        controller: new DummyController(),
        action: 'testAction',
      };

      await assert.rejects(async () => {
        await manager.execute(context, {
          proceed: async () => new InterceptionResult('ok'),
        });
      }, InterceptorExecutionError);
    },
  );

  await t.test(
    'Lifecycle & Diagnostics - statistics evaluate state and executions',
    async () => {
      const list: string[] = [];
      const builder = new InterceptorBuilder().register(
        'I1',
        new TrackingInterceptor('I1', list),
        InterceptorScope.GLOBAL,
      );

      const manager = new InterceptorManager(builder.build());
      assert.strictEqual(manager.state, InterceptorState.READY);

      const context: InterceptorContext = {
        requestScope: new DummyRequestScope(),
        controller: new DummyController(),
        action: 'testAction',
      };

      await manager.execute(context, {
        proceed: async () => new InterceptionResult('ok'),
      });

      const snap = manager.diagnostics.getSnapshot();
      assert.strictEqual(snap.totalInterceptions, 1);
      assert.strictEqual(snap.totalExecutions, 1);
      assert.strictEqual(snap.executionCounts['TrackingInterceptor'], 1);
    },
  );

  await t.test('Immutability - context and configuration are frozen', async () => {
    const builder = new InterceptorBuilder();
    const config = builder.build();

    assert.throws(() => {
      (config as unknown as Record<string, unknown>).registry = {} as unknown;
    });

    const res = new InterceptionResult('ok');
    assert.throws(() => {
      (res as unknown as Record<string, unknown>).value = 'changed';
    });
  });

  await t.test('Parallel Load - 1000 requests execute deterministically', async () => {
    const builder = new InterceptorBuilder();
    const manager = new InterceptorManager(builder.build());

    const promises: Promise<void>[] = [];

    for (let i = 0; i < 1000; i++) {
      promises.push(
        (async () => {
          const context: InterceptorContext = {
            requestScope: new DummyRequestScope(),
            controller: new DummyController(),
            action: `act-${i}`,
          };
          const res = await manager.execute(context, {
            proceed: async () => new InterceptionResult(`res-${i}`),
          });
          assert.strictEqual(res.value, `res-${i}`);
        })(),
      );
    }

    await Promise.all(promises);
  });
});
