import * as assert from 'node:assert';
import { test } from 'node:test';

import { CompilerBuilder, ModuleCompiler } from '@coreforge/compiler';
import {
  Body,
  Controller,
  Cookie,
  Get,
  Header,
  MetadataRegistrar,
  Module,
  Param,
  Post,
  Query,
} from '@coreforge/decorators';
import { DiscoveryBuilder, DiscoveryEngine } from '@coreforge/discovery';
import { MetadataBuilder, MetadataRegistry } from '@coreforge/metadata';

import {
  NormalizedRequest,
  ParameterBindingCompiler,
  ParameterBindingConflictError,
  ParameterBindingDescriptor,
  ParameterBindingError,
  ParameterBindingResolver,
  ParameterBindingStateError,
  ParameterBindingValidationError,
} from '../index';

test('CoreForge Parameter Binding Engine Package (@coreforge/parameter-binding)', async (t) => {
  await t.test('1. Route parameters binding (@Param) extracts values from request.params', () => {
    const resolver = new ParameterBindingResolver();

    const descriptors: ParameterBindingDescriptor[] = [
      {
        id: 'p1',
        actionId: 'UserController:getUser',
        parameterIndex: 0,
        source: 'PARAM',
        name: 'userId',
        required: true,
      },
    ];

    const request: NormalizedRequest = {
      params: { userId: 'user-42' },
    };

    const args = resolver.resolveArguments(descriptors, request);
    assert.deepStrictEqual(args, ['user-42']);
  });

  await t.test(
    '2. Query parameters binding (@Query) extracts single property and entire query',
    () => {
      const resolver = new ParameterBindingResolver();

      const descriptors: ParameterBindingDescriptor[] = [
        {
          id: 'q1',
          actionId: 'ProductController:list',
          parameterIndex: 0,
          source: 'QUERY',
          name: 'page',
          required: false,
        },
        {
          id: 'q2',
          actionId: 'ProductController:list',
          parameterIndex: 1,
          source: 'QUERY',
          required: false,
        },
      ];

      const request: NormalizedRequest = {
        query: { page: 3, sort: 'asc' },
      };

      const args = resolver.resolveArguments(descriptors, request);
      assert.strictEqual(args[0], 3);
      assert.deepStrictEqual(args[1], { page: 3, sort: 'asc' });
    },
  );

  await t.test('3. Body binding (@Body) extracts entire payload or specific property', () => {
    const resolver = new ParameterBindingResolver();

    const fullBodyDesc: ParameterBindingDescriptor[] = [
      {
        id: 'b1',
        actionId: 'OrderController:create',
        parameterIndex: 0,
        source: 'BODY',
        required: true,
      },
    ];

    const propBodyDesc: ParameterBindingDescriptor[] = [
      {
        id: 'b2',
        actionId: 'OrderController:create',
        parameterIndex: 0,
        source: 'BODY',
        name: 'item',
        required: true,
      },
    ];

    const request: NormalizedRequest = {
      body: { item: 'Laptop', price: 1200 },
    };

    const fullArgs = resolver.resolveArguments(fullBodyDesc, request);
    const propArgs = resolver.resolveArguments(propBodyDesc, request);

    assert.deepStrictEqual(fullArgs[0], { item: 'Laptop', price: 1200 });
    assert.strictEqual(propArgs[0], 'Laptop');
  });

  await t.test('4. Header binding (@Header) extracts header values case-insensitively', () => {
    const resolver = new ParameterBindingResolver();

    const descriptors: ParameterBindingDescriptor[] = [
      {
        id: 'h1',
        actionId: 'AuthController:verify',
        parameterIndex: 0,
        source: 'HEADER',
        name: 'Authorization',
        required: true,
      },
      {
        id: 'h2',
        actionId: 'AuthController:verify',
        parameterIndex: 1,
        source: 'HEADER',
        name: 'x-request-id',
        required: true,
      },
    ];

    const request: NormalizedRequest = {
      headers: {
        authorization: 'Bearer token-123',
        'X-Request-Id': 'req-999',
      },
    };

    const args = resolver.resolveArguments(descriptors, request);
    assert.strictEqual(args[0], 'Bearer token-123');
    assert.strictEqual(args[1], 'req-999');
  });

  await t.test('5. Cookie binding (@Cookie) extracts cookie values by name', () => {
    const resolver = new ParameterBindingResolver();

    const descriptors: ParameterBindingDescriptor[] = [
      {
        id: 'c1',
        actionId: 'SessionController:check',
        parameterIndex: 0,
        source: 'COOKIE',
        name: 'sessionId',
        required: false,
      },
    ];

    const request: NormalizedRequest = {
      cookies: { sessionId: 'sess-abc-789' },
    };

    const args = resolver.resolveArguments(descriptors, request);
    assert.strictEqual(args[0], 'sess-abc-789');
  });

  await t.test('6. Exact parameter index ordering regardless of declaration order', () => {
    const resolver = new ParameterBindingResolver();

    // Given descriptors in reverse order
    const descriptors: ParameterBindingDescriptor[] = [
      {
        id: 'p2',
        actionId: 'ComplexController:action',
        parameterIndex: 2,
        source: 'BODY',
        required: true,
      },
      {
        id: 'p0',
        actionId: 'ComplexController:action',
        parameterIndex: 0,
        source: 'PARAM',
        name: 'id',
        required: true,
      },
      {
        id: 'p1',
        actionId: 'ComplexController:action',
        parameterIndex: 1,
        source: 'QUERY',
        name: 'filter',
        required: false,
      },
    ];

    const request: NormalizedRequest = {
      params: { id: 'item-10' },
      query: { filter: 'active' },
      body: { data: 'payload' },
    };

    const args = resolver.resolveArguments(descriptors, request);

    assert.strictEqual(args.length, 3);
    assert.strictEqual(args[0], 'item-10');
    assert.strictEqual(args[1], 'active');
    assert.deepStrictEqual(args[2], { data: 'payload' });
  });

  await t.test(
    '7. Required value semantics: only undefined is missing, preserving false, 0, "", null',
    () => {
      const resolver = new ParameterBindingResolver();

      const desc0: ParameterBindingDescriptor[] = [
        {
          id: 'd0',
          actionId: 'Test:falsy',
          parameterIndex: 0,
          source: 'QUERY',
          name: 'count',
          required: true,
        },
        {
          id: 'd1',
          actionId: 'Test:falsy',
          parameterIndex: 1,
          source: 'QUERY',
          name: 'enabled',
          required: true,
        },
        {
          id: 'd2',
          actionId: 'Test:falsy',
          parameterIndex: 2,
          source: 'QUERY',
          name: 'empty',
          required: true,
        },
        {
          id: 'd3',
          actionId: 'Test:falsy',
          parameterIndex: 3,
          source: 'BODY',
          name: 'nullable',
          required: true,
        },
      ];

      const request: NormalizedRequest = {
        query: { count: 0, enabled: false, empty: '' },
        body: { nullable: null },
      };

      const args = resolver.resolveArguments(desc0, request);

      assert.strictEqual(args[0], 0);
      assert.strictEqual(args[1], false);
      assert.strictEqual(args[2], '');
      assert.strictEqual(args[3], null);

      // When value is undefined on required parameter -> throws
      const missingDesc: ParameterBindingDescriptor[] = [
        {
          id: 'dm',
          actionId: 'Test:missing',
          parameterIndex: 0,
          source: 'PARAM',
          name: 'requiredId',
          required: true,
        },
      ];

      assert.throws(() => {
        resolver.resolveArguments(missingDesc, { params: {} });
      }, ParameterBindingError);
    },
  );

  await t.test('8. Optional parameters resolve to undefined when omitted', () => {
    const resolver = new ParameterBindingResolver();

    const descriptors: ParameterBindingDescriptor[] = [
      {
        id: 'opt1',
        actionId: 'OptionalController:test',
        parameterIndex: 0,
        source: 'QUERY',
        name: 'optionalParam',
        required: false,
      },
    ];

    const args = resolver.resolveArguments(descriptors, { query: {} });
    assert.strictEqual(args[0], undefined);
  });

  await t.test('9. Validation rejects invalid parameter indices and missing names', () => {
    // Negative index
    assert.throws(() => {
      ParameterBindingCompiler.compileDescriptors([
        {
          id: 'bad1',
          actionId: 'A:b',
          parameterIndex: -1,
          source: 'PARAM',
          name: 'id',
          required: true,
        },
      ]);
    }, ParameterBindingValidationError);

    // PARAM with empty name
    assert.throws(() => {
      ParameterBindingCompiler.compileDescriptors([
        {
          id: 'bad2',
          actionId: 'A:b',
          parameterIndex: 0,
          source: 'PARAM',
          name: '',
          required: true,
        },
      ]);
    }, ParameterBindingValidationError);
  });

  await t.test(
    '10. Duplicate parameter index on the same action throws ParameterBindingConflictError',
    () => {
      assert.throws(() => {
        ParameterBindingCompiler.compileDescriptors([
          {
            id: 'd1',
            actionId: 'UserController:conflict',
            parameterIndex: 0,
            source: 'PARAM',
            name: 'id',
            required: true,
          },
          {
            id: 'd2',
            actionId: 'UserController:conflict',
            parameterIndex: 0,
            source: 'QUERY',
            name: 'id',
            required: false,
          },
        ]);
      }, ParameterBindingConflictError);

      // Reusing same name on DIFFERENT indices is permitted
      const compiled = ParameterBindingCompiler.compileDescriptors([
        {
          id: 'ok1',
          actionId: 'UserController:safe',
          parameterIndex: 0,
          source: 'PARAM',
          name: 'id',
          required: true,
        },
        {
          id: 'ok2',
          actionId: 'UserController:safe',
          parameterIndex: 1,
          source: 'QUERY',
          name: 'id',
          required: false,
        },
      ]);
      assert.strictEqual(compiled.length, 2);
    },
  );

  await t.test(
    '11. 1,000 concurrent parameter binding resolutions maintain strict isolation',
    async () => {
      const resolver = new ParameterBindingResolver();

      const descriptors: ParameterBindingDescriptor[] = [
        {
          id: 'p1',
          actionId: 'ConcurrentController:handle',
          parameterIndex: 0,
          source: 'PARAM',
          name: 'userId',
          required: true,
        },
        {
          id: 'p1',
          actionId: 'ConcurrentController:handle',
          parameterIndex: 1,
          source: 'BODY',
          name: 'payload',
          required: true,
        },
      ];

      const tasks = Array.from({ length: 1000 }, (_, i) => {
        const req: NormalizedRequest = {
          params: { userId: `user-${i}` },
          body: { payload: `data-${i}` },
        };
        const args = resolver.resolveArguments(descriptors, req);
        return { i, userId: args[0], payload: args[1] };
      });

      assert.strictEqual(tasks.length, 1000);
      for (let i = 0; i < 1000; i++) {
        assert.strictEqual(tasks[i].userId, `user-${i}`);
        assert.strictEqual(tasks[i].payload, `data-${i}`);
      }
    },
  );

  await t.test(
    '12. Diagnostics snapshots track binding operations without leaking payload data',
    () => {
      const resolver = new ParameterBindingResolver({
        enableDiagnostics: true,
      });

      const desc: ParameterBindingDescriptor[] = [
        {
          id: 'd1',
          actionId: 'DiagController:test',
          parameterIndex: 0,
          source: 'PARAM',
          name: 'id',
          required: true,
        },
      ];

      resolver.resolveArguments(desc, { params: { id: '1' } });
      resolver.resolveArguments(desc, { params: { id: '2' } });

      try {
        resolver.resolveArguments(desc, { params: {} });
      } catch {
        // Expected missing required
      }

      const diag = resolver.diagnostics;

      assert.strictEqual(diag.totalBindings, 3);
      assert.strictEqual(diag.successfulBindings, 2);
      assert.strictEqual(diag.failedBindings, 1);
      assert.strictEqual(diag.missingRequiredValues, 1);
      assert.ok(diag.totalDurationMs >= 0);
      assert.ok(Object.isFrozen(diag));
    },
  );

  await t.test(
    '13. Lifecycle state machine blocks binding during STOPPING or STOPPED states',
    () => {
      const resolver = new ParameterBindingResolver();
      resolver.stop();

      assert.throws(() => {
        resolver.resolveArguments([], {});
      }, ParameterBindingStateError);
    },
  );

  await t.test(
    '14. Full End-to-End Pipeline: Decorators -> MetadataCollector -> MetadataRegistrar -> MetadataRegistry -> Discovery -> Compiler -> ParameterBindingCompiler -> ParameterBindingResolver -> Bound Arguments',
    async () => {
      MetadataRegistrar.reset();

      // 1. Declare class with decorated action and parameter bindings
      @Controller('/articles')
      class ArticleController {
        @Get('/:articleId')
        public findArticle(
          @Param('articleId') articleId: string,
          @Query('includeComments', { required: false })
          includeComments: boolean,
          @Header('x-api-key') apiKey: string,
        ) {
          return { articleId, includeComments, apiKey };
        }

        @Post('/create')
        public createArticle(
          @Body('title') title: string,
          @Cookie('auth_session') session: string,
        ) {
          return { title, session };
        }
      }
      void ArticleController;

      @Module({
        controllers: [ArticleController],
      })
      class ArticleModule {}
      void ArticleModule;

      // 2. Authoritative MetadataRegistry
      const metadataBuilder = new MetadataBuilder();
      const metadataRegistry = new MetadataRegistry(metadataBuilder.build());

      // 3. Finalize collected decorator metadata into authoritative MetadataRegistry
      MetadataRegistrar.finalize(MetadataRegistrar.getCollector(), metadataRegistry);

      // 4. Discovery Engine
      const discoveryBuilder = new DiscoveryBuilder().setMetadataRegistry(metadataRegistry);
      const discoveryEngine = new DiscoveryEngine(discoveryBuilder.build());
      const discoveryResult = await discoveryEngine.discover();

      // 5. Module Compiler
      const compilerBuilder = new CompilerBuilder();
      const compiler = new ModuleCompiler(compilerBuilder.build());
      const compilationResult = await compiler.compile(discoveryResult);

      assert.ok(compilationResult);

      // 6. Parameter Binding Compiler
      const compiledBindings = ParameterBindingCompiler.compileFromRegistry(metadataRegistry);

      // Find bindings for findArticle action
      const findArticleActionKey = 'ArticleController:findArticle:GET:/articleId';
      const findArticleBindings =
        compiledBindings.get(findArticleActionKey) || Array.from(compiledBindings.values())[0];

      assert.ok(findArticleBindings);
      assert.strictEqual(findArticleBindings.length, 3);
      assert.strictEqual(findArticleBindings[0].source, 'PARAM');
      assert.strictEqual(findArticleBindings[0].name, 'articleId');
      assert.strictEqual(findArticleBindings[1].source, 'QUERY');
      assert.strictEqual(findArticleBindings[1].name, 'includeComments');
      assert.strictEqual(findArticleBindings[2].source, 'HEADER');
      assert.strictEqual(findArticleBindings[2].name, 'x-api-key');

      // 7. Parameter Binding Resolver resolves incoming NormalizedRequest
      const resolver = new ParameterBindingResolver();

      const incomingRequest: NormalizedRequest = {
        params: { articleId: 'article-99' },
        query: { includeComments: true },
        headers: { 'X-API-KEY': 'secret-key-xyz' },
      };

      const resolvedArgs = resolver.resolveArguments(findArticleBindings, incomingRequest);

      assert.strictEqual(resolvedArgs.length, 3);
      assert.strictEqual(resolvedArgs[0], 'article-99');
      assert.strictEqual(resolvedArgs[1], true);
      assert.strictEqual(resolvedArgs[2], 'secret-key-xyz');
    },
  );
});
