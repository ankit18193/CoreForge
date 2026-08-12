import * as assert from 'node:assert';
import { test } from 'node:test';

import { ActionContext, HttpRequest } from '@coreforge/contracts';

import { BindingBuilder } from '../binder/BindingBuilder';
import { RequestBinder } from '../binder/RequestBinder';
import { ConversionResult } from '../converter/ConversionResult';
import { CustomConverter } from '../converter/TypeConverter';
import { ConversionError, ValidationException } from '../errors/BindingErrors';
import { BindingMetadata } from '../metadata/BindingMetadata';
import { BindingSource } from '../registry/BindingSource';
import { ValidationRule } from '../validator/ValidationRule';

enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

class DummyRequest implements HttpRequest {
  public readonly method = 'GET';
  public readonly url = '/';
  public readonly path = '/';
  public readonly query: Readonly<Record<string, unknown>>;
  public readonly headers: Readonly<Record<string, unknown>>;
  public readonly cookies: Readonly<Record<string, unknown>>;
  public readonly body: unknown;
  public readonly parameters: Readonly<Record<string, unknown>>;
  public readonly remoteAddress = '127.0.0.1';
  public readonly protocol = 'HTTP/1.1';
  public readonly requestId = 'req-123';

  constructor(params: {
    query?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    cookies?: Record<string, unknown>;
    body?: unknown;
    parameters?: Record<string, unknown>;
  }) {
    this.query = Object.freeze(params.query || {});
    this.headers = Object.freeze(params.headers || {});
    this.cookies = Object.freeze(params.cookies || {});
    this.body = params.body;
    this.parameters = Object.freeze(params.parameters || {});
  }
}

class CustomValidatorRule implements ValidationRule {
  public readonly ruleName = 'is-even';
  public validate(value: unknown, path: string) {
    const num = Number(value);
    if (num % 2 !== 0) {
      return { valid: false, message: `Parameter "${path}" must be even.` };
    }
    return { valid: true };
  }
}

class CustomTypeConverter implements CustomConverter {
  public convert(value: unknown, targetType: string): ConversionResult {
    const str = String(value);
    return new ConversionResult({
      success: true,
      value: `custom-${str}`,
      error: null,
      sourceType: typeof value,
      targetType,
    });
  }
}

test('Validation & Request Binding Package', async (t) => {
  await t.test(
    'Extraction and conversion of multiple sources and primitive types',
    async () => {
      const builder = new BindingBuilder();
      builder.registry.register({
        controllerId: 'UserController',
        actionName: 'getProfile',
        parameters: [
          new BindingMetadata({
            source: BindingSource.ROUTE,
            parameterName: 'id',
            targetType: 'number',
            required: true,
          }),
          new BindingMetadata({
            source: BindingSource.QUERY,
            parameterName: 'active',
            targetType: 'boolean',
            required: true,
          }),
          new BindingMetadata({
            source: BindingSource.HEADER,
            parameterName: 'x-version',
            targetType: 'string',
          }),
          new BindingMetadata({
            source: BindingSource.COOKIE,
            parameterName: 'session-id',
            targetType: 'string',
          }),
          new BindingMetadata({
            source: BindingSource.BODY,
            parameterName: 'tags',
            targetType: 'string[]',
          }),
        ],
      });

      const binder = new RequestBinder(builder.build());
      const request = new DummyRequest({
        parameters: { id: '42' },
        query: { active: 'true' },
        headers: { 'x-version': '1.0.0' },
        cookies: { 'session-id': 'session-xyz' },
        body: { tags: 'admin,moderator' },
      });

      const context: ActionContext = {
        request,
        controllerDescriptor: { id: 'UserController' },
        actionDescriptor: { metadata: { actionName: 'getProfile' } },
      } as unknown as ActionContext;

      const args = await binder.bind(context);

      assert.deepStrictEqual(args.positionals, [
        42,
        true,
        '1.0.0',
        'session-xyz',
        ['admin', 'moderator'],
      ]);
      assert.strictEqual(args.named.id, 42);
      assert.strictEqual(args.named.active, true);
      assert.strictEqual(args.rawValues.id, '42');
    },
  );

  await t.test('Default values applied on missing parameter', async () => {
    const builder = new BindingBuilder();
    builder.registry.register({
      controllerId: 'UserController',
      actionName: 'getProfile',
      parameters: [
        new BindingMetadata({
          source: BindingSource.QUERY,
          parameterName: 'limit',
          targetType: 'number',
          defaultValue: 10,
        }),
      ],
    });

    const binder = new RequestBinder(builder.build());
    const request = new DummyRequest({});
    const context = {
      request,
      controllerDescriptor: { id: 'UserController' },
      actionDescriptor: { metadata: { actionName: 'getProfile' } },
    } as unknown as ActionContext;

    const args = await binder.bind(context);
    assert.strictEqual(args.named.limit, 10);
  });

  await t.test('Enum conversion maps correctly', async () => {
    const builder = new BindingBuilder();
    builder.registry.register({
      controllerId: 'UserController',
      actionName: 'getProfile',
      parameters: [
        new BindingMetadata({
          source: BindingSource.QUERY,
          parameterName: 'role',
          targetType: 'enum',
        }),
      ],
    });

    const typeConverter = builder.build().typeConverter;
    const res = typeConverter.convert(
      'ADMIN',
      'enum',
      UserRole as unknown as Record<string, unknown>,
    );
    assert.strictEqual(res.value, UserRole.ADMIN);
  });

  await t.test('Invalid primitive conversion throws ConversionError', async () => {
    const builder = new BindingBuilder();
    builder.registry.register({
      controllerId: 'UserController',
      actionName: 'getProfile',
      parameters: [
        new BindingMetadata({
          source: BindingSource.QUERY,
          parameterName: 'age',
          targetType: 'number',
        }),
      ],
    });

    const binder = new RequestBinder(builder.build());
    const request = new DummyRequest({ query: { age: 'not-a-number' } });
    const context = {
      request,
      controllerDescriptor: { id: 'UserController' },
      actionDescriptor: { metadata: { actionName: 'getProfile' } },
    } as unknown as ActionContext;

    await assert.rejects(async () => {
      await binder.bind(context);
    }, ConversionError);
  });

  await t.test('Validation collection gathers multiple rules failures', async () => {
    const builder = new BindingBuilder();
    builder.registry.register({
      controllerId: 'UserController',
      actionName: 'register',
      parameters: [
        new BindingMetadata({
          source: BindingSource.QUERY,
          parameterName: 'email',
          targetType: 'string',
          required: true,
        }),
        new BindingMetadata({
          source: BindingSource.QUERY,
          parameterName: 'age',
          targetType: 'number',
          required: true,
        }),
      ],
    });

    const binder = new RequestBinder(builder.build());
    const request = new DummyRequest({ query: {} });
    const context = {
      request,
      controllerDescriptor: { id: 'UserController' },
      actionDescriptor: { metadata: { actionName: 'register' } },
    } as unknown as ActionContext;

    await assert.rejects(
      async () => {
        await binder.bind(context);
      },
      (err: unknown) => {
        assert.ok(err instanceof ValidationException);
        const details = err.details as unknown[];
        assert.strictEqual(details.length, 2);
        return true;
      },
    );
  });

  await t.test('Custom converter registration', async () => {
    const builder = new BindingBuilder();
    builder.registerConverter('custom-string', new CustomTypeConverter());
    builder.registry.register({
      controllerId: 'UserController',
      actionName: 'custom',
      parameters: [
        new BindingMetadata({
          source: BindingSource.QUERY,
          parameterName: 'test',
          targetType: 'custom-string',
        }),
      ],
    });

    const binder = new RequestBinder(builder.build());
    const request = new DummyRequest({ query: { test: 'hello' } });
    const context = {
      request,
      controllerDescriptor: { id: 'UserController' },
      actionDescriptor: { metadata: { actionName: 'custom' } },
    } as unknown as ActionContext;

    const args = await binder.bind(context);
    assert.strictEqual(args.named.test, 'custom-hello');
  });

  await t.test('Custom validator registration', async () => {
    const builder = new BindingBuilder();
    builder.registerValidator('is-even', new CustomValidatorRule());
    builder.registry.register({
      controllerId: 'UserController',
      actionName: 'validateEven',
      parameters: [
        new BindingMetadata({
          source: BindingSource.QUERY,
          parameterName: 'count',
          targetType: 'number',
        }),
      ],
    });

    const binder = new RequestBinder(builder.build());

    const requestValid = new DummyRequest({ query: { count: '4' } });
    const contextValid = {
      request: requestValid,
      controllerDescriptor: { id: 'UserController' },
      actionDescriptor: { metadata: { actionName: 'validateEven' } },
    } as unknown as ActionContext;
    const argsValid = await binder.bind(contextValid);
    assert.strictEqual(argsValid.named.count, 4);

    const requestInvalid = new DummyRequest({ query: { count: '5' } });
    const contextInvalid = {
      request: requestInvalid,
      controllerDescriptor: { id: 'UserController' },
      actionDescriptor: { metadata: { actionName: 'validateEven' } },
    } as unknown as ActionContext;
    await assert.rejects(async () => {
      await binder.bind(contextInvalid);
    }, ValidationException);
  });

  await t.test('1000 concurrent bindings are isolated safely', async () => {
    const builder = new BindingBuilder();
    builder.registry.register({
      controllerId: 'UserController',
      actionName: 'concurrent',
      parameters: [
        new BindingMetadata({
          source: BindingSource.QUERY,
          parameterName: 'index',
          targetType: 'number',
        }),
      ],
    });

    const binder = new RequestBinder(builder.build());
    const promises: Promise<void>[] = [];

    for (let i = 0; i < 1000; i++) {
      const request = new DummyRequest({ query: { index: String(i) } });
      const context = {
        request,
        controllerDescriptor: { id: 'UserController' },
        actionDescriptor: { metadata: { actionName: 'concurrent' } },
      } as unknown as ActionContext;

      promises.push(
        binder.bind(context).then((args) => {
          assert.strictEqual(args.named.index, i);
        }),
      );
    }

    await Promise.all(promises);
  });
});
