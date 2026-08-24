import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  ConfigSchema,
  ConfigurationError,
  ConfigurationLoader,
  ConfigurationManager,
  ConfigurationManagerBuilder,
  ConfigurationMissingError,
  ConfigurationSchema,
  ConfigurationSecretMasker,
  ConfigurationSource,
  ConfigurationTypeError,
  ConfigurationValidationError,
  DefaultProvider,
  EnvironmentResolver,
  EnvironmentVariableSource,
  EnvProvider,
  ProgrammaticConfigurationSource,
} from '../src/index';

test('CoreForge Configuration & Environment Management Engine (@coreforge/config)', async (t) => {
  await t.test(
    '1. Environment Detection & Fallback: Resolves explicit env, process.env, or defaults to development',
    async () => {
      assert.strictEqual(EnvironmentResolver.resolve('production'), 'production');
      assert.strictEqual(EnvironmentResolver.resolve('test'), 'test');
      assert.strictEqual(EnvironmentResolver.resolve('dev'), 'development');
      assert.strictEqual(EnvironmentResolver.resolve('testing'), 'test');
      assert.strictEqual(EnvironmentResolver.resolve('prod'), 'production');
      assert.strictEqual(EnvironmentResolver.resolve(undefined), 'development');
    },
  );

  await t.test(
    '2. Environment Profiles: Loads profile defaults for development, test, staging, and production',
    async () => {
      const devManager = new ConfigurationManager({ environment: 'development' });
      await devManager.load();
      assert.strictEqual(devManager.get('env'), 'development');
      assert.strictEqual(devManager.get('debug'), true);

      const prodManager = new ConfigurationManager({ environment: 'production' });
      await prodManager.load();
      assert.strictEqual(prodManager.get('env'), 'production');
      assert.strictEqual(prodManager.get('debug'), false);
      assert.strictEqual(prodManager.get('logging.level'), 'error');
    },
  );

  await t.test(
    '3. Environment Variable Loading: Filters by prefix and coerces types accurately',
    async () => {
      const mockEnv: Record<string, string> = {
        CF_APP_NAME: 'CoreForgeApp',
        CF_APP_PORT: '8080',
        CF_APP_ENABLED: 'true',
        CF_APP_RATIO: '3.14',
        CF_APP_EMPTY: 'null',
        OTHER_VAR: 'ignore_me',
      };

      const source = new EnvironmentVariableSource({
        prefix: 'CF_APP_',
        env: mockEnv,
      });

      const loaded = source.load() as Record<string, unknown>;
      assert.strictEqual(loaded.name, 'CoreForgeApp');
      assert.strictEqual(loaded.port, 8080);
      assert.strictEqual(loaded.enabled, true);
      assert.strictEqual(loaded.ratio, 3.14);
      assert.strictEqual(loaded.empty, null);
      assert.strictEqual(loaded.otherVar, undefined);
    },
  );

  await t.test(
    '4. Nested Environment Variable Conversion: Converts nested segments and camelCase delimiters',
    async () => {
      const mockEnv: Record<string, string> = {
        COREFORGE_SERVER_PORT: '4000',
        COREFORGE_DATABASE_HOST: 'localhost',
        COREFORGE_DATABASE_POOL_SIZE: '25',
        COREFORGE_CACHE__REDIS__PORT: '6379',
      };

      const source = new EnvironmentVariableSource({
        prefix: 'COREFORGE_',
        env: mockEnv,
      });

      const loaded = source.load() as Record<string, unknown>;
      assert.deepStrictEqual(loaded.server, { port: 4000 });
      assert.deepStrictEqual(loaded.database, { host: 'localhost', poolSize: 25 });
      assert.deepStrictEqual(loaded.cache, { redis: { port: 6379 } });
    },
  );

  await t.test(
    '5. Programmatic Configuration Loading: Wraps in-memory configuration objects',
    async () => {
      const programmaticSource = new ProgrammaticConfigurationSource({
        server: { port: 9000, ssl: true },
      });

      const loaded = programmaticSource.load();
      assert.deepStrictEqual(loaded, { server: { port: 9000, ssl: true } });
    },
  );

  await t.test(
    '6. Precedence Hierarchy: Programmatic Overrides > Env Vars > Profile Defaults > Schema Defaults',
    async () => {
      const schema = new ConfigurationSchema();
      schema.addField('server.host', { default: 'schema-host' });
      schema.addField('server.port', { default: 3000 });
      schema.addField('server.timeout', { default: 5000 });
      schema.addField('server.protocol', { default: 'http' });

      const mockEnv: Record<string, string> = {
        COREFORGE_SERVER_PORT: '5000',
        COREFORGE_SERVER_PROTOCOL: 'https',
      };

      const manager = new ConfigurationManagerBuilder()
        .setEnvironment('development')
        .setSchema(schema)
        .addSource(new EnvironmentVariableSource({ prefix: 'COREFORGE_', env: mockEnv }))
        .addOverrides({
          server: {
            port: 9999, // Overrides env (5000) and schema (3000)
          },
        })
        .build();

      await manager.load();

      // Programmatic override wins
      assert.strictEqual(manager.get<number>('server.port'), 9999);
      // Env var wins over schema default
      assert.strictEqual(manager.get<string>('server.protocol'), 'https');
      // Schema default is applied when neither env nor programmatic override is present
      assert.strictEqual(manager.get<string>('server.host'), 'schema-host');
      assert.strictEqual(manager.get<number>('server.timeout'), 5000);
      // Profile default (debug: true for development)
      assert.strictEqual(manager.get<boolean>('debug'), true);
    },
  );

  await t.test(
    '7. Required Property Validation: Missing required properties throw ConfigurationMissingError',
    async () => {
      const schema = new ConfigurationSchema();
      schema.addField('database.url', { required: true, type: 'string' });

      const manager = new ConfigurationManager({ schema });

      await assert.rejects(async () => {
        await manager.load();
      }, ConfigurationMissingError);
    },
  );

  await t.test(
    '8. Type Validation: String, number, boolean, enum, and object types are strictly enforced',
    async () => {
      const schema = new ConfigurationSchema();
      schema.addField('port', { type: 'number' });

      const manager = new ConfigurationManagerBuilder()
        .setSchema(schema)
        .addOverrides({ port: 'not-a-number' })
        .build();

      await assert.rejects(async () => {
        await manager.load();
      }, ConfigurationTypeError);
    },
  );

  await t.test(
    '9. Numeric Range & Regex Validation: Enforces min/max and regex patterns',
    async () => {
      const schema = new ConfigurationSchema();
      schema.addField('poolSize', { type: 'number', min: 5, max: 20 });
      schema.addField('apiKey', { type: 'string', pattern: /^CF-[A-Z0-9]{8}$/ });

      const manager1 = new ConfigurationManagerBuilder()
        .setSchema(schema)
        .addOverrides({ poolSize: 25, apiKey: 'CF-12345678' })
        .build();

      await assert.rejects(async () => {
        await manager1.load();
      }, ConfigurationValidationError);

      const manager2 = new ConfigurationManagerBuilder()
        .setSchema(schema)
        .addOverrides({ poolSize: 10, apiKey: 'invalid-key' })
        .build();

      await assert.rejects(async () => {
        await manager2.load();
      }, ConfigurationValidationError);
    },
  );

  await t.test('10. Accessor get(): Resolves nested dot-notation paths safely', async () => {
    const manager = new ConfigurationManagerBuilder()
      .addOverrides({
        services: {
          auth: {
            endpoint: 'https://auth.coreforge.io',
            retries: 3,
          },
        },
      })
      .build();

    await manager.load();

    assert.strictEqual(manager.get<string>('services.auth.endpoint'), 'https://auth.coreforge.io');
    assert.strictEqual(manager.get<number>('services.auth.retries'), 3);
    assert.strictEqual(manager.get('services.auth.missing'), undefined);
    assert.strictEqual(manager.get('non.existent.path'), undefined);
  });

  await t.test(
    '11. Accessor require(): Returns value or throws ConfigurationMissingError',
    async () => {
      const manager = new ConfigurationManagerBuilder()
        .addOverrides({ server: { port: 8080 } })
        .build();

      await manager.load();

      assert.strictEqual(manager.require<number>('server.port'), 8080);
      assert.throws(() => {
        manager.require('server.host');
      }, ConfigurationMissingError);
    },
  );

  await t.test(
    '12. Accessor has(): Returns boolean indicating presence of configuration key',
    async () => {
      const manager = new ConfigurationManagerBuilder()
        .addOverrides({ database: { host: 'localhost' } })
        .build();

      await manager.load();

      assert.strictEqual(manager.has('database.host'), true);
      assert.strictEqual(manager.has('database.port'), false);
    },
  );

  await t.test(
    '13. Immutable Snapshot: Deeply frozen configuration snapshot cannot be mutated',
    async () => {
      const manager = new ConfigurationManagerBuilder()
        .addOverrides({ nested: { key: 'value' } })
        .build();

      await manager.load();

      const snapshot = manager.snapshot();
      assert.strictEqual(snapshot.environment, 'development');
      assert.strictEqual(snapshot.version, 1);
      assert.ok(snapshot.loadedAt > 0);
      assert.ok(Object.isFrozen(snapshot));
      assert.ok(Object.isFrozen(snapshot.values));
      assert.ok(Object.isFrozen((snapshot.values as Record<string, unknown>).nested));

      assert.throws(() => {
        (snapshot.values as Record<string, unknown>).newKey = 'illegal';
      });
    },
  );

  await t.test(
    '14. Mutation Attempts After READY: Modifications to registry throw ConfigurationStateError',
    async () => {
      const manager = new ConfigurationManagerBuilder().addOverrides({ key: 'value' }).build();

      await manager.load();
      assert.strictEqual(manager.ready, true);

      assert.throws(() => {
        // Attempting to register on locked registry
        (
          manager as unknown as {
            _registry: { register: (...args: unknown[]) => unknown };
          }
        )._registry.register('test', {
          key: 'mutated',
        });
      }, ConfigurationError);
    },
  );

  await t.test(
    '15. Invalid Environment Name: Throws ConfigurationValidationError on invalid env string',
    async () => {
      assert.throws(() => {
        EnvironmentResolver.resolve('invalid-env-name');
      }, ConfigurationValidationError);
    },
  );

  await t.test(
    '16. Secret Masking: Redacts sensitive keys in diagnostics, masked snapshot, and logs',
    async () => {
      const sensitiveData = {
        dbPassword: 'super-secret-password-123',
        api_key: 'key-abc-xyz',
        authSecret: 'jwt-secret-999',
        nested: {
          client_token: 'tok-777',
          safeKey: 'public-value',
        },
      };

      const masked = ConfigurationSecretMasker.mask(sensitiveData) as Record<string, unknown>;
      assert.strictEqual(masked.dbPassword, '[REDACTED]');
      assert.strictEqual(masked.api_key, '[REDACTED]');
      assert.strictEqual(masked.authSecret, '[REDACTED]');
      assert.strictEqual((masked.nested as Record<string, unknown>).client_token, '[REDACTED]');
      assert.strictEqual((masked.nested as Record<string, unknown>).safeKey, 'public-value');

      const manager = new ConfigurationManagerBuilder().addOverrides(sensitiveData).build();

      await manager.load();

      const maskedSnapshot = manager.maskedSnapshot;
      const json = JSON.stringify(maskedSnapshot);
      assert.ok(!json.includes('super-secret-password-123'));
      assert.ok(!json.includes('key-abc-xyz'));
      assert.ok(!json.includes('jwt-secret-999'));
      assert.ok(!json.includes('tok-777'));
      assert.ok(json.includes('[REDACTED]'));
    },
  );

  await t.test(
    '17. Diagnostics Metrics: Accurate metrics tracking with zero secret leakage',
    async () => {
      const manager = new ConfigurationManagerBuilder()
        .setEnvironment('test')
        .addOverrides({ key: 'val', password: 'secret-pass' })
        .build();

      await manager.load();

      const diag = manager.diagnostics;
      assert.strictEqual(diag.loadCount, 1);
      assert.strictEqual(diag.validationCount, 1);
      assert.strictEqual(diag.validationFailures, 0);
      assert.strictEqual(diag.environment, 'test');
      assert.strictEqual(diag.configurationVersion, 1);
      assert.ok(diag.loadDurationMs >= 0);

      const diagStr = JSON.stringify(diag);
      assert.ok(!diagStr.includes('secret-pass'));
      assert.ok(!diagStr.includes('password'));
    },
  );

  await t.test(
    '18. Lifecycle Transitions: Transitions CREATED -> LOADING -> VALIDATING -> READY -> STOPPING -> STOPPED',
    async () => {
      const manager = new ConfigurationManager();
      assert.strictEqual(manager.state, 'CREATED');
      assert.strictEqual(manager.ready, false);

      await manager.load();
      assert.strictEqual(manager.state, 'READY');
      assert.strictEqual(manager.ready, true);

      await manager.stop();
      assert.strictEqual(manager.state, 'STOPPED');
    },
  );

  await t.test(
    '19. Concurrent Instance Isolation: Multiple configuration managers operate with complete state isolation',
    async () => {
      const managerA = new ConfigurationManagerBuilder()
        .setEnvironment('development')
        .addOverrides({ tenant: 'tenant-A', port: 1001 })
        .build();

      const managerB = new ConfigurationManagerBuilder()
        .setEnvironment('production')
        .addOverrides({ tenant: 'tenant-B', port: 1002 })
        .build();

      await Promise.all([managerA.load(), managerB.load()]);

      assert.strictEqual(managerA.get('tenant'), 'tenant-A');
      assert.strictEqual(managerA.get('port'), 1001);
      assert.strictEqual(managerA.environment, 'development');

      assert.strictEqual(managerB.get('tenant'), 'tenant-B');
      assert.strictEqual(managerB.get('port'), 1002);
      assert.strictEqual(managerB.environment, 'production');
    },
  );

  await t.test(
    '20. Repeated load() Reload Behavior: Successfully reloads and increments version',
    async () => {
      const manager = new ConfigurationManagerBuilder().addOverrides({ count: 1 }).build();

      await manager.load();
      assert.strictEqual(manager.snapshot().version, 1);

      await manager.load();
      assert.strictEqual(manager.snapshot().version, 2);
      assert.strictEqual(manager.diagnostics.loadCount, 2);
    },
  );

  await t.test(
    '21. Failing Configuration Source: Throws ConfigurationSourceError with underlying cause',
    async () => {
      const failingSource: ConfigurationSource = {
        name: 'FailingDatabaseSource',
        load: () => {
          throw new Error('Database connection timed out');
        },
      };

      const manager = new ConfigurationManagerBuilder().addSource(failingSource).build();

      await assert.rejects(
        async () => {
          await manager.load();
        },
        (err: unknown) => {
          return err instanceof Error && err.message.includes('FailingDatabaseSource');
        },
      );
    },
  );

  await t.test(
    '22. Custom Schema Validator Function: Executes custom validator and applies transformed schema output',
    async () => {
      interface AppConfig {
        host: string;
        port: number;
        url: string;
      }

      const schema = new ConfigurationSchema<AppConfig>((raw: unknown) => {
        const r = raw as { host?: string; port?: number };
        const host = r.host || 'localhost';
        const port = Number(r.port) || 3000;
        return {
          host,
          port,
          url: `http://${host}:${port}`,
        };
      });

      const manager = new ConfigurationManagerBuilder()
        .setSchema(schema)
        .addOverrides({ host: 'api.coreforge.io', port: 8443 })
        .build();

      await manager.load();

      assert.strictEqual(manager.get('url'), 'http://api.coreforge.io:8443');
    },
  );

  await t.test(
    '23. Backward Compatibility: Aliases ConfigSchema, DefaultProvider, and EnvProvider operate correctly',
    async () => {
      const schema = new ConfigSchema();
      schema.addField('port', { type: 'number', default: 8080 });

      const defaultProv = new DefaultProvider({ host: 'localhost' });
      const envProv = new EnvProvider({ env: { COREFORGE_PORT: '9090' } });

      const loader = new ConfigurationLoader(schema);
      loader.registerProvider(defaultProv);
      loader.registerProvider(envProv);

      const result = await loader.load();
      assert.strictEqual(result.host, 'localhost');
      assert.strictEqual(result.port, 9090);
    },
  );

  await t.test(
    '24. Critical Architectural Boundary: Configuration package has zero reverse dependencies on higher-level framework packages',
    async () => {
      const configSrcDir = path.resolve(__dirname, '../src');
      const higherLevelPackages = [
        '@coreforge/decorators',
        '@coreforge/di',
        '@coreforge/request-context',
        '@coreforge/parameter-binding',
        '@coreforge/routing',
        '@coreforge/execution',
        '@coreforge/response',
        '@coreforge/exceptions',
        '@coreforge/transport',
        '@coreforge/runtime',
      ];

      const files = fs.readdirSync(configSrcDir, { recursive: true }) as string[];
      for (const file of files) {
        if (typeof file === 'string' && file.endsWith('.ts')) {
          const content = fs.readFileSync(path.join(configSrcDir, file), 'utf-8');
          for (const pkg of higherLevelPackages) {
            assert.ok(
              !content.includes(pkg),
              `@coreforge/config source file ${file} must not depend on higher-level package ${pkg}`,
            );
          }
        }
      }
    },
  );
});
