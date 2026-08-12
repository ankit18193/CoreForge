import * as assert from 'node:assert';
import { test } from 'node:test';

import { InvocationResult } from '@coreforge/contracts';

import { UnsupportedMediaTypeError } from '../errors/SerializationErrors';
import { SerializationState } from '../lifecycle/SerializationState';
import { ResponseModel } from '../mapper/ResponseModel';
import { Serializer } from '../serializer/Serializer';
import { SerializerBuilder } from '../serializer/SerializerBuilder';
import { ContentSerializer } from '../serializers/ContentSerializer';

class CustomJsonSerializer implements ContentSerializer {
  public async serialize(response: ResponseModel): Promise<unknown> {
    return `custom-${JSON.stringify(response.body)}`;
  }
}

test('Serialization & Response Mapping Package', async (t) => {
  await t.test('JSON Serialization - objects become JSON strings', async () => {
    const builder = new SerializerBuilder();
    const serializer = new Serializer(builder.build());

    const result: InvocationResult = { value: { id: 123 } };
    const res = await serializer.serialize(result, 'application/json');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, '{"id":123}');
    assert.strictEqual(res.headers['Content-Type'], 'application/json');
  });

  await t.test('Text Serialization - strings become plain text', async () => {
    const builder = new SerializerBuilder();
    const serializer = new Serializer(builder.build());

    const result: InvocationResult = { value: 'Hello World' };
    const res = await serializer.serialize(result, 'text/plain');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'Hello World');
    assert.strictEqual(res.headers['Content-Type'], 'text/plain');
  });

  await t.test('Binary Serialization - Buffers remain binary data', async () => {
    const builder = new SerializerBuilder();
    const serializer = new Serializer(builder.build());

    const buffer = Buffer.from([1, 2, 3]);
    const result: InvocationResult = { value: buffer };
    const res = await serializer.serialize(result, 'application/octet-stream');

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, buffer);
  });

  await t.test('Content Negotiation - Accept header selects correct media type', async () => {
    const builder = new SerializerBuilder();
    const serializer = new Serializer(builder.build());

    const result1: InvocationResult = { value: 'hello' };
    const res1 = await serializer.serialize(result1, '*/*');
    assert.strictEqual(res1.headers['Content-Type'], 'text/plain');

    const result2: InvocationResult = { value: { key: 'val' } };
    const res2 = await serializer.serialize(result2, '*/*');
    assert.strictEqual(res2.headers['Content-Type'], 'application/json');

    const res3 = await serializer.serialize({ value: { key: 'val' } }, 'text/plain');
    assert.strictEqual(res3.headers['Content-Type'], 'text/plain');
  });

  await t.test('Default Status Mapping - null and undefined map to 204', async () => {
    const builder = new SerializerBuilder();
    const serializer = new Serializer(builder.build());

    const resNull = await serializer.serialize({ value: null }, 'application/json');
    assert.strictEqual(resNull.statusCode, 204);

    const resUndefined = await serializer.serialize({ value: undefined }, 'application/json');
    assert.strictEqual(resUndefined.statusCode, 204);
  });

  await t.test('Unsupported Media Type - Accept application/xml throws error', async () => {
    const builder = new SerializerBuilder();
    const serializer = new Serializer(builder.build());

    await assert.rejects(async () => {
      await serializer.serialize({ value: {} }, 'application/xml');
    }, UnsupportedMediaTypeError);
  });

  await t.test(
    'Registry Override - custom JSON serializer replaces default JSON implementation',
    async () => {
      const builder = new SerializerBuilder().registerSerializer(
        'application/json',
        new CustomJsonSerializer(),
      );

      const serializer = new Serializer(builder.build());
      const res = await serializer.serialize({ value: { id: 1 } }, 'application/json');

      assert.strictEqual(res.body, 'custom-{"id":1}');
    },
  );

  await t.test('Lifecycle & Diagnostics - transitions states and tracks metrics', async () => {
    const builder = new SerializerBuilder();
    const serializer = new Serializer(builder.build());

    assert.strictEqual(serializer.state, SerializationState.READY);

    await serializer.serialize({ value: 'hello' }, 'text/plain');
    await serializer.serialize({ value: { x: 1 } }, 'application/json');

    const snap = serializer.diagnostics.getSnapshot();
    assert.strictEqual(snap.totalSerializations, 2);
    assert.strictEqual(snap.failureCount, 0);
    assert.strictEqual(snap.serializerCounts['TextSerializer'], 1);
    assert.strictEqual(snap.serializerCounts['JsonSerializer'], 1);
  });

  await t.test('Immutability - result is deeply frozen', async () => {
    const builder = new SerializerBuilder();
    const serializer = new Serializer(builder.build());

    const res = await serializer.serialize({ value: 'test' }, 'text/plain');

    assert.throws(() => {
      (res as unknown as Record<string, unknown>).body = 'mutated';
    });

    assert.throws(() => {
      (res.headers as unknown as Record<string, unknown>)['Content-Type'] = 'mutated';
    });
  });

  await t.test('Parallel Load - 1000 concurrent serializations maintain safety', async () => {
    const builder = new SerializerBuilder();
    const serializer = new Serializer(builder.build());

    const promises: Promise<void>[] = [];

    for (let i = 0; i < 1000; i++) {
      promises.push(
        serializer.serialize({ value: { index: i } }, 'application/json').then((res) => {
          assert.strictEqual(res.statusCode, 200);
          assert.strictEqual(res.body, `{"index":${i}}`);
        }),
      );
    }

    await Promise.all(promises);
  });
});
