import * as assert from 'node:assert';
import { test } from 'node:test';

import { ConfigurationError } from '@coreforge/errors';
import { FrameworkEnv } from '@coreforge/types';

import { ConfigurationLoader } from '../loader/ConfigurationLoader';
import { DefaultProvider } from '../providers/DefaultProvider';
import { EnvProvider } from '../providers/EnvProvider';
import { ConfigSchema } from '../validator/ConfigSchema';

test('Configuration System', async (t) => {
  const schema = new ConfigSchema();
  schema.addField('env', {
    type: 'enum',
    required: true,
    enumOptions: ['development', 'production', 'testing'],
  });
  schema.addField('server.port', { type: 'number', required: true, default: 3000 });
  schema.addField('server.host', { type: 'string', required: true, default: 'localhost' });
  schema.addField('server.secure', { type: 'boolean', default: false });

  await t.test('should load configuration with default values', async () => {
    const loader = new ConfigurationLoader(schema);
    loader.registerProvider(
      new DefaultProvider({
        env: 'development',
      }),
    );

    const config = await loader.load();
    assert.strictEqual(config.env, FrameworkEnv.Development);
    assert.strictEqual(config.server.port, 3000);
    assert.strictEqual(config.server.host, 'localhost');
    assert.strictEqual((config.server as unknown as Record<string, unknown>).secure, false);
  });

  await t.test('should override defaults with environment variables and parse types', async () => {
    process.env.TEST_PORT = '8080';
    process.env.TEST_HOST = 'coreforge.io';
    process.env.TEST_SECURE = 'true';
    process.env.TEST_ENV = 'production';

    const loader = new ConfigurationLoader(schema);
    loader.registerProvider(
      new DefaultProvider({
        env: 'development',
        'server.port': 3000,
      }),
    );

    loader.registerProvider(
      new EnvProvider({
        env: 'TEST_ENV',
        'server.port': 'TEST_PORT',
        'server.host': 'TEST_HOST',
        'server.secure': 'TEST_SECURE',
      }),
    );

    const config = await loader.load();
    assert.strictEqual(config.env, FrameworkEnv.Production);
    assert.strictEqual(config.server.port, 8080);
    assert.strictEqual(config.server.host, 'coreforge.io');
    assert.strictEqual((config.server as unknown as Record<string, unknown>).secure, true);

    delete process.env.TEST_PORT;
    delete process.env.TEST_HOST;
    delete process.env.TEST_SECURE;
    delete process.env.TEST_ENV;
  });

  await t.test('should fail fast on validation mismatch', async () => {
    process.env.TEST_PORT = 'invalid-number';

    const loader = new ConfigurationLoader(schema);
    loader.registerProvider(
      new EnvProvider({
        'server.port': 'TEST_PORT',
      }),
    );

    await assert.rejects(
      async () => {
        await loader.load();
      },
      (err: unknown) => {
        return err instanceof ConfigurationError && err.code === 'CONFIGURATION_ERROR';
      },
    );

    delete process.env.TEST_PORT;
  });

  await t.test('should fail fast on missing required fields', async () => {
    const requiredSchema = new ConfigSchema();
    requiredSchema.addField('db.password', { type: 'string', required: true });

    const loader = new ConfigurationLoader(requiredSchema);
    loader.registerProvider(new DefaultProvider({}));

    await assert.rejects(
      async () => {
        await loader.load();
      },
      (err: unknown) => {
        return err instanceof ConfigurationError && err.message.includes('Missing required');
      },
    );
  });

  await t.test('should construct a deeply frozen immutable config object', async () => {
    const loader = new ConfigurationLoader(schema);
    loader.registerProvider(
      new DefaultProvider({
        env: 'development',
      }),
    );

    const config = await loader.load();

    assert.throws(() => {
      (config.server as unknown as Record<string, unknown>).port = 9000;
    }, TypeError);

    assert.throws(() => {
      (config as unknown as Record<string, unknown>).env = 'production';
    }, TypeError);
  });

  await t.test('should support validation pattern extension points', async () => {
    const patternSchema = new ConfigSchema();
    patternSchema.addField('server.host', {
      type: 'string',
      pattern: /^[a-z0-9.-]+$/,
    });

    const loader = new ConfigurationLoader(patternSchema);
    loader.registerProvider(
      new DefaultProvider({
        'server.host': 'INVALID_UPPERCASE',
      }),
    );

    await assert.rejects(
      async () => {
        await loader.load();
      },
      (err: unknown) => {
        return err instanceof ConfigurationError && err.message.includes('pattern');
      },
    );
  });
});
