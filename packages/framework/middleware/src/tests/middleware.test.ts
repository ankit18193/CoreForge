import * as assert from 'node:assert';
import { test } from 'node:test';

import {
  Container,
  EventBus,
  Logger,
  Middleware,
  MiddlewareContext,
  Next,
} from '@coreforge/contracts';

import { MiddlewareExecutionError, MiddlewareRegistrationError } from '../errors/MiddlewareErrors';
import { PipelineTarget } from '../executor/PipelineTarget';
import { MiddlewareExecutionContext } from '../pipeline/MiddlewareExecutionContext';
import { MiddlewarePriority } from '../pipeline/MiddlewarePriority';
import { MiddlewareState } from '../pipeline/MiddlewareState';
import { PipelineBuilder } from '../pipeline/PipelineBuilder';

class DummyLogger implements Logger {
  trace() {}
  debug() {}
  info() {}
  warn() {}
  error() {}
  fatal() {}
  child() {
    return this;
  }
}

class DummyEventBus implements EventBus {
  async publish() {}
  subscribe() {
    return {};
  }
  unsubscribe() {}
}

class DummyContainer implements Container {
  resolve<T>(): T {
    return {} as T;
  }
  has() {
    return true;
  }
}

class OrderLoggerMiddleware implements Middleware {
  private readonly _name: string;
  private readonly _order: string[];

  constructor(name: string, order: string[]) {
    this._name = name;
    this._order = order;
  }

  public async execute(_context: MiddlewareContext, next: Next): Promise<void> {
    this._order.push(`${this._name}-start`);
    await next();
    this._order.push(`${this._name}-end`);
  }
}

class DoubleNextMiddleware implements Middleware {
  public async execute(_context: MiddlewareContext, next: Next): Promise<void> {
    await next();
    await next();
  }
}

class TerminatingMiddleware implements Middleware {
  public async execute(_context: MiddlewareContext, _next: Next): Promise<void> {
    // stop
  }
}

class ErrorMiddleware implements Middleware {
  public async execute(_context: MiddlewareContext, _next: Next): Promise<void> {
    throw new Error('thrown-error');
  }
}

test('Middleware Pipeline Framework Package', async (t) => {
  const container = new DummyContainer();
  const logger = new DummyLogger();
  const eventBus = new DummyEventBus();

  const createContext = () => {
    return new MiddlewareExecutionContext({
      request: { key: 'value' },
      response: { status: 200 },
      route: { path: '/users/:id' },
      parameters: { id: '42' },
      container,
      logger,
      eventBus,
      requestId: 'req-abc',
    });
  };

  await t.test('PipelineBuilder & Registration Validation', async () => {
    const builder = new PipelineBuilder();
    builder.useGlobal(new OrderLoggerMiddleware('g', []));
    builder.useGroup('api', new OrderLoggerMiddleware('gp', []));
    builder.useRoute('/users/:id', new OrderLoggerMiddleware('r', []));

    assert.throws(() => {
      builder.useGroup('', new OrderLoggerMiddleware('x', []));
    }, MiddlewareRegistrationError);

    assert.throws(() => {
      builder.useRoute('no-leading-slash', new OrderLoggerMiddleware('x', []));
    }, MiddlewareRegistrationError);

    const pipeline = builder.build();
    assert.strictEqual(pipeline.state, MiddlewareState.READY);
  });

  await t.test('Priority and Scope execution ordering - Global ➔ Group ➔ Route', async () => {
    const order: string[] = [];
    const builder = new PipelineBuilder();

    builder.useGlobal(new OrderLoggerMiddleware('g2', order), MiddlewarePriority.NORMAL);
    builder.useGlobal(new OrderLoggerMiddleware('g1', order), MiddlewarePriority.HIGH);
    builder.useGroup('api', new OrderLoggerMiddleware('group', order));
    builder.useRoute('/users/:id', new OrderLoggerMiddleware('route', order));

    const pipeline = builder.build();
    const context = createContext();

    const target: PipelineTarget = {
      async execute() {
        order.push('target');
      },
    };

    const result = await pipeline.execute(context, target, {
      groupName: 'api',
      routePath: '/users/:id',
    });

    assert.strictEqual(result.completed, true);
    assert.deepStrictEqual(order, [
      'g1-start',
      'g2-start',
      'group-start',
      'route-start',
      'target',
      'route-end',
      'group-end',
      'g2-end',
      'g1-end',
    ]);
  });

  await t.test(
    'Double Next Prevention - calling next() twice throws MiddlewareExecutionError',
    async () => {
      const builder = new PipelineBuilder();
      builder.useGlobal(new DoubleNextMiddleware());
      const pipeline = builder.build();
      const context = createContext();

      const target: PipelineTarget = {
        async execute() {},
      };

      await assert.rejects(async () => {
        await pipeline.execute(context, target);
      }, MiddlewareExecutionError);
    },
  );

  await t.test(
    'Graceful pipeline termination - not calling next() ends runs without exceptions',
    async () => {
      const order: string[] = [];
      const builder = new PipelineBuilder();
      builder.useGlobal(new OrderLoggerMiddleware('first', order));
      builder.useGlobal(new TerminatingMiddleware());
      builder.useGlobal(new OrderLoggerMiddleware('second', order));

      const pipeline = builder.build();
      const context = createContext();

      const target: PipelineTarget = {
        async execute() {
          order.push('target');
        },
      };

      const result = await pipeline.execute(context, target);
      assert.strictEqual(result.completed, false);
      assert.strictEqual(result.terminatedEarly, true);
      assert.deepStrictEqual(order, ['first-start', 'first-end']);
      assert.strictEqual(result.executedCount, 2);
      assert.strictEqual(result.skippedCount, 1);
    },
  );

  await t.test(
    'Exceptions propagation - Errors propagate up correctly and stop execution',
    async () => {
      const builder = new PipelineBuilder();
      builder.useGlobal(new ErrorMiddleware());
      const pipeline = builder.build();
      const context = createContext();

      const target: PipelineTarget = {
        async execute() {},
      };

      await assert.rejects(async () => {
        await pipeline.execute(context, target);
      }, /thrown-error/);
    },
  );

  await t.test('Diagnostics Snapshot tracking metrics', async () => {
    const builder = new PipelineBuilder();
    builder.useGlobal(new OrderLoggerMiddleware('g1', []));
    builder.useGroup('api', new OrderLoggerMiddleware('gp1', []));
    builder.useRoute('/users', new OrderLoggerMiddleware('r1', []));

    const pipeline = builder.build();

    const diagBefore = pipeline.diagnostics;
    assert.strictEqual(diagBefore.totalMiddleware, 3);
    assert.strictEqual(diagBefore.globalMiddleware, 1);
    assert.strictEqual(diagBefore.groupMiddleware, 1);
    assert.strictEqual(diagBefore.routeMiddleware, 1);

    const context = createContext();
    const target: PipelineTarget = {
      async execute() {},
    };

    await pipeline.execute(context, target, {
      groupName: 'api',
      routePath: '/users',
    });

    const diagAfter = pipeline.diagnostics;
    assert.strictEqual(diagAfter.executionCount, 3);
    assert.strictEqual(diagAfter.averagePipelineDepth, 3);
  });

  await t.test('Immutability checks', async () => {
    const context = createContext();
    assert.throws(() => {
      (context.request as unknown as Record<string, unknown>).key = 'mutated';
    });
    assert.throws(() => {
      (context.parameters as unknown as Record<string, unknown>).id = 'mutated';
    });

    context.response.status = 500;
    assert.strictEqual(context.response.status, 500);
  });

  await t.test('Stress Scale Test - executes 1000+ middlewares chain safely', async () => {
    const builder = new PipelineBuilder();
    const order: number[] = [];

    class IncrementMiddleware implements Middleware {
      private readonly _val: number;
      constructor(val: number) {
        this._val = val;
      }
      public async execute(_context: MiddlewareContext, next: Next): Promise<void> {
        order.push(this._val);
        await next();
      }
    }

    for (let i = 0; i < 1000; i++) {
      builder.useGlobal(new IncrementMiddleware(i));
    }

    const pipeline = builder.build();
    const context = createContext();
    const target: PipelineTarget = {
      async execute() {},
    };

    const result = await pipeline.execute(context, target);
    assert.strictEqual(result.completed, true);
    assert.strictEqual(result.executedCount, 1000);
    assert.strictEqual(order.length, 1000);
    assert.strictEqual(order[0], 0);
    assert.strictEqual(order[999], 999);
  });
});
