import * as assert from 'node:assert';
import { test } from 'node:test';

import { Module } from '@coreforge/contracts';

import { ModuleState } from '../descriptors/ModuleDescriptor';
import {
  CircularModuleDependencyError,
  ModuleAlreadyRegisteredError,
  ModuleDependencyError,
  ModuleLifecycleError,
  ModuleStateTransitionError,
} from '../errors/ModuleErrors';
import { ModuleLoader } from '../loader/ModuleLoader';

test('Module Loader & Lifecycle', async (t) => {
  await t.test('should support modules without dependencies', async () => {
    class ModA implements Module {
      public readonly name = 'ModA';
      public readonly dependencies = [];
    }

    const loader = new ModuleLoader();
    loader.register(ModA);

    const context = await loader.start();
    assert.strictEqual(context.totalModules, 1);
    assert.deepStrictEqual(context.startupOrder, ['ModA']);
    assert.strictEqual(loader.status('ModA'), ModuleState.READY);

    await loader.stop();
    assert.strictEqual(loader.status('ModA'), ModuleState.DISPOSED);
  });

  await t.test('should support multiple independent dependency graphs', async () => {
    class ModA implements Module {
      public readonly name = 'ModA';
      public readonly dependencies = [];
    }
    class ModB implements Module {
      public readonly name = 'ModB';
      public readonly dependencies = [];
    }

    const loader = new ModuleLoader();
    loader.register(ModA);
    loader.register(ModB);

    const context = await loader.start();
    assert.strictEqual(context.totalModules, 2);
    assert.strictEqual(loader.status('ModA'), ModuleState.READY);
    assert.strictEqual(loader.status('ModB'), ModuleState.READY);

    await loader.stop();
  });

  await t.test('should support deep dependency chains', async () => {
    class ModA implements Module {
      public readonly name = 'ModA';
      public readonly dependencies = ['ModB'];
    }
    class ModB implements Module {
      public readonly name = 'ModB';
      public readonly dependencies = ['ModC'];
    }
    class ModC implements Module {
      public readonly name = 'ModC';
      public readonly dependencies = [];
    }

    const loader = new ModuleLoader();
    loader.register(ModA);
    loader.register(ModB);
    loader.register(ModC);

    const context = await loader.start();
    assert.deepStrictEqual(context.startupOrder, ['ModC', 'ModB', 'ModA']);

    await loader.stop();
    assert.deepStrictEqual(context.shutdownOrder, ['ModA', 'ModB', 'ModC']);
  });

  await t.test('should throw ModuleDependencyError on missing dependencies', async () => {
    class ModA implements Module {
      public readonly name = 'ModA';
      public readonly dependencies = ['MissingMod'];
    }

    const loader = new ModuleLoader();
    loader.register(ModA);

    await assert.rejects(
      async () => {
        await loader.start();
      },
      (err: unknown) => {
        return err instanceof ModuleDependencyError && err.message.includes('missing module');
      },
    );
  });

  await t.test('should throw CircularModuleDependencyError on loop detection', async () => {
    class ModA implements Module {
      public readonly name = 'ModA';
      public readonly dependencies = ['ModB'];
    }
    class ModB implements Module {
      public readonly name = 'ModB';
      public readonly dependencies = ['ModC'];
    }
    class ModC implements Module {
      public readonly name = 'ModC';
      public readonly dependencies = ['ModA'];
    }

    const loader = new ModuleLoader();
    loader.register(ModA);
    loader.register(ModB);
    loader.register(ModC);

    await assert.rejects(
      async () => {
        await loader.start();
      },
      (err: unknown) => {
        return (
          err instanceof CircularModuleDependencyError &&
          err.message.includes('Circular module dependency detected')
        );
      },
    );
  });

  await t.test('should throw ModuleAlreadyRegisteredError on duplicate names', async () => {
    class ModA implements Module {
      public readonly name = 'ModA';
      public readonly dependencies = [];
    }

    const loader = new ModuleLoader();
    loader.register(ModA);

    assert.throws(
      () => {
        loader.register(ModA);
      },
      (err: unknown) => {
        return err instanceof ModuleAlreadyRegisteredError;
      },
    );
  });

  await t.test('should execute rollback on startup failure midway', async () => {
    const events: string[] = [];

    class ModA implements Module {
      public readonly name = 'ModA';
      public readonly dependencies = ['ModB'];
      onInitialized() {
        events.push('ModA-Init');
      }
      onStopping() {
        events.push('ModA-Stop');
      }
    }
    class ModB implements Module {
      public readonly name = 'ModB';
      public readonly dependencies = [];
      onInitialized() {
        events.push('ModB-Init');
        throw new Error('Failure during B initialization');
      }
      onStopping() {
        events.push('ModB-Stop');
      }
      onShutdown() {
        events.push('ModB-Shutdown');
      }
      onDisposed() {
        events.push('ModB-Dispose');
      }
    }

    const loader = new ModuleLoader();
    loader.register(ModA);
    loader.register(ModB);

    await assert.rejects(
      async () => {
        await loader.start();
      },
      (err: unknown) => {
        return (
          err instanceof ModuleLifecycleError &&
          err.message.includes('Failure during B initialization')
        );
      },
    );

    assert.strictEqual(loader.status('ModB'), ModuleState.FAILED);
    assert.strictEqual(loader.status('ModA'), ModuleState.DISPOSED);
  });

  await t.test('should handle repeated start() and stop() calls safely', async () => {
    class ModA implements Module {
      public readonly name = 'ModA';
      public readonly dependencies = [];
    }

    const loader = new ModuleLoader();
    loader.register(ModA);

    const c1 = await loader.start();
    const c2 = await loader.start();
    assert.strictEqual(c1.startTimestamp, c2.startTimestamp);

    await loader.stop();
    await loader.stop();
  });

  await t.test('should fail when invalid state transitions are requested', async () => {
    class ModA implements Module {
      public readonly name = 'ModA';
      public readonly dependencies = [];
    }

    const loader = new ModuleLoader();
    loader.register(ModA);

    const descriptors = loader.resolve();
    assert.strictEqual(descriptors[0].state, ModuleState.CREATED);

    assert.throws(
      () => {
        descriptors[0].transitionTo(ModuleState.READY);
      },
      (err: unknown) => {
        return err instanceof ModuleStateTransitionError;
      },
    );
  });
});
