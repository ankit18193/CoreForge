import * as assert from 'node:assert';
import { test } from 'node:test';

import {
  CircularDependencyError,
  DuplicateRegistrationError,
  ServiceNotFoundError,
} from '../errors/ContainerErrors';
import { ServiceLifetime } from '../lifetimes/ServiceLifetime';
import { InjectionToken } from '../tokens/InjectionToken';
import { Container } from './../container/Container';

test('DI Container', async (t) => {
  await t.test('should resolve class registered as singleton', async () => {
    let count = 0;
    class Counter {
      public id: number;
      constructor() {
        count++;
        this.id = count;
      }
    }

    const container = new Container();
    container.registerSingleton('counter', Counter);

    const c1 = container.resolve<Counter>('counter');
    const c2 = container.resolve<Counter>('counter');

    assert.strictEqual(c1.id, 1);
    assert.strictEqual(c2.id, 1);
    assert.strictEqual(c1, c2);
  });

  await t.test('should resolve class registered as transient', async () => {
    let count = 0;
    class Counter {
      public id: number;
      constructor() {
        count++;
        this.id = count;
      }
    }

    const container = new Container();
    container.registerTransient('counter', Counter);

    const c1 = container.resolve<Counter>('counter');
    const c2 = container.resolve<Counter>('counter');

    assert.strictEqual(c1.id, 1);
    assert.strictEqual(c2.id, 2);
    assert.notStrictEqual(c1, c2);
  });

  await t.test('should resolve value registrations', async () => {
    const container = new Container();
    container.registerValue('config', { env: 'testing', port: 8080 });

    const val = container.resolve<{ env: string; port: number }>('config');
    assert.strictEqual(val.port, 8080);
  });

  await t.test('should resolve factory registrations', async () => {
    const container = new Container();
    container.registerValue('port', 9000);
    container.registerFactory('url', (c) => {
      const port = c.resolve<number>('port');
      return `http://localhost:${port}`;
    });

    const url = container.resolve<string>('url');
    assert.strictEqual(url, 'http://localhost:9000');
  });

  await t.test('should reject duplicate registrations by default', async () => {
    class ServiceA {}
    class ServiceB {}

    const container = new Container();
    container.registerSingleton('srv', ServiceA);

    assert.throws(
      () => {
        container.registerSingleton('srv', ServiceB);
      },
      (err: unknown) => {
        return err instanceof DuplicateRegistrationError;
      },
    );
  });

  await t.test('should allow duplicate registrations if overwrite is true', async () => {
    class ServiceA {
      public name = 'A';
    }
    class ServiceB {
      public name = 'B';
    }

    const container = new Container();
    container.register({
      token: 'srv',
      useClass: ServiceA,
      lifetime: ServiceLifetime.SINGLETON,
    });

    container.register({
      token: 'srv',
      useClass: ServiceB,
      lifetime: ServiceLifetime.SINGLETON,
      overwrite: true,
    });

    const s = container.resolve<{ name: string }>('srv');
    assert.strictEqual(s.name, 'B');
  });

  await t.test('should throw ServiceNotFoundError on unknown tokens', async () => {
    const container = new Container();
    assert.throws(
      () => {
        container.resolve('unknown');
      },
      (err: unknown) => {
        return err instanceof ServiceNotFoundError;
      },
    );
  });

  await t.test(
    'should detect circular dependency graphs and throw CircularDependencyError',
    async () => {
      class A {
        constructor(public b: unknown) {}
      }
      class B {
        constructor(public c: unknown) {}
      }
      class C {
        constructor(public a: unknown) {}
      }

      const container = new Container();
      container.registerSingleton('A', A, ['B']);
      container.registerSingleton('B', B, ['C']);
      container.registerSingleton('C', C, ['A']);

      assert.throws(
        () => {
          container.resolve('A');
        },
        (err: unknown) => {
          return (
            err instanceof CircularDependencyError &&
            err.message.includes('Circular dependency detected: A -> B -> C -> A')
          );
        },
      );
    },
  );

  await t.test('should resolve nested dependencies recursively', async () => {
    class Database {
      public query() {
        return 'data';
      }
    }
    class Repository {
      constructor(public db: Database) {}
    }
    class Service {
      constructor(public repo: Repository) {}
    }

    const container = new Container();
    container.registerSingleton('Database', Database);
    container.registerSingleton('Repository', Repository, ['Database']);
    container.registerSingleton('Service', Service, ['Repository']);

    const svc = container.resolve<Service>('Service');
    assert.ok(svc instanceof Service);
    assert.ok(svc.repo instanceof Repository);
    assert.ok(svc.repo.db instanceof Database);
    assert.strictEqual(svc.repo.db.query(), 'data');
  });

  await t.test('should support strongly typed InjectionToken resolutions', async () => {
    interface Logger {
      log(msg: string): void;
    }
    const LoggerToken = new InjectionToken<Logger>('LoggerToken');

    class ConsoleLogger implements Logger {
      public log(_msg: string): void {
        // noop
      }
    }

    const container = new Container();
    container.registerSingleton(LoggerToken, ConsoleLogger);

    const logger = container.resolve(LoggerToken);
    assert.ok(logger instanceof ConsoleLogger);
  });
});
