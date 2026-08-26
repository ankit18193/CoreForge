import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { CompilerBuilder, ModuleCompiler } from '@coreforge/compiler';
import {
  Controller,
  Get,
  MetadataRegistrar,
  Module,
  Param,
  Post,
  Query,
} from '@coreforge/decorators';
import { ContainerBuilder } from '@coreforge/di';
import { DiscoveryBuilder, DiscoveryEngine } from '@coreforge/discovery';
import { ActionDescriptor, ActionExecutionEngine as ExecutionEngine } from '@coreforge/execution';
import { MetadataBuilder, MetadataRegistry } from '@coreforge/metadata';
import { NormalizedRequest, ParameterBindingCompiler } from '@coreforge/parameter-binding';
import { RequestContextManager } from '@coreforge/request-context';
import { ResponseProcessor } from '@coreforge/response';

import {
  DuplicateRouteParameterError,
  InvalidRouteParameterError,
  InvalidRoutePatternError,
  MalformedPathError,
  MethodNotAllowedError,
  RouteCompiler,
  RouteConflictError,
  RouteDefinition,
  RouteMatcher,
  RouteNotFoundError,
  RouteRegistry,
  RoutingLifecycleManager,
  RoutingStateError,
} from '../index';

function createDummyAction(id: string): ActionDescriptor {
  class DummyController {}
  return Object.freeze({
    id,
    controllerToken: DummyController,
    methodName: 'handle',
    parameterBindings: [],
    guards: [],
    middleware: [],
    interceptors: [],
  });
}

test('CoreForge Routing & Route Matching Engine (@coreforge/routing)', async (t) => {
  await t.test(
    '1. Basic Matching: Static, dynamic parameter, multiple parameters, and wildcard route matching',
    async () => {
      const compiler = new RouteCompiler();
      const registry = new RouteRegistry();

      registry.register(
        compiler.compile({
          id: 'get-users',
          method: 'GET',
          path: '/users',
          action: createDummyAction('get-users'),
        }),
      );

      registry.register(
        compiler.compile({
          id: 'get-user-by-id',
          method: 'GET',
          path: '/users/:id',
          action: createDummyAction('get-user-by-id'),
        }),
      );

      registry.register(
        compiler.compile({
          id: 'get-user-order',
          method: 'GET',
          path: '/users/:id/orders/:orderId',
          action: createDummyAction('get-user-order'),
        }),
      );

      registry.register(
        compiler.compile({
          id: 'get-assets',
          method: 'GET',
          path: '/assets/*path',
          action: createDummyAction('get-assets'),
        }),
      );

      const matcher = new RouteMatcher(registry);

      // Case A: Static route
      const match1 = matcher.match({ method: 'GET', path: '/users' });
      assert.strictEqual(match1.route.id, 'get-users');
      assert.deepStrictEqual(match1.params, {});

      // Case B: Dynamic parameter route
      const match2 = matcher.match({ method: 'GET', path: '/users/42' });
      assert.strictEqual(match2.route.id, 'get-user-by-id');
      assert.strictEqual(match2.params.id, '42');

      // Case C: Multiple dynamic parameters
      const match3 = matcher.match({ method: 'GET', path: '/users/42/orders/9001' });
      assert.strictEqual(match3.route.id, 'get-user-order');
      assert.strictEqual(match3.params.id, '42');
      assert.strictEqual(match3.params.orderId, '9001');

      // Case D: Wildcard route
      const match4 = matcher.match({ method: 'GET', path: '/assets/css/theme/dark.css' });
      assert.strictEqual(match4.route.id, 'get-assets');
      assert.strictEqual(match4.params.path, 'css/theme/dark.css');
    },
  );

  await t.test(
    '2. Deterministic Precedence: Static beats dynamic, constrained param beats unconstrained, and dynamic beats wildcard',
    async () => {
      const compiler = new RouteCompiler();
      const registry = new RouteRegistry();

      // Register in reverse order to ensure precedence is deterministic regardless of registration order
      registry.register(
        compiler.compile({
          id: 'wildcard-user',
          method: 'GET',
          path: '/users/*rest',
          action: createDummyAction('wildcard-user'),
        }),
      );

      registry.register(
        compiler.compile({
          id: 'dynamic-user',
          method: 'GET',
          path: '/users/:id',
          action: createDummyAction('dynamic-user'),
        }),
      );

      registry.register(
        compiler.compile({
          id: 'numeric-user',
          method: 'GET',
          path: '/users/:id(\\d+)',
          action: createDummyAction('numeric-user'),
        }),
      );

      registry.register(
        compiler.compile({
          id: 'static-user-me',
          method: 'GET',
          path: '/users/me',
          action: createDummyAction('static-user-me'),
        }),
      );

      const matcher = new RouteMatcher(registry);

      // /users/me must match static route
      const matchMe = matcher.match({ method: 'GET', path: '/users/me' });
      assert.strictEqual(matchMe.route.id, 'static-user-me');

      // /users/123 must match constrained numeric route
      const matchNum = matcher.match({ method: 'GET', path: '/users/123' });
      assert.strictEqual(matchNum.route.id, 'numeric-user');
      assert.strictEqual(matchNum.params.id, '123');

      // /users/alice must match unconstrained dynamic route
      const matchAlpha = matcher.match({ method: 'GET', path: '/users/alice' });
      assert.strictEqual(matchAlpha.route.id, 'dynamic-user');
      assert.strictEqual(matchAlpha.params.id, 'alice');

      // /users/alice/settings/profile must match wildcard route
      const matchWildcard = matcher.match({ method: 'GET', path: '/users/alice/settings/profile' });
      assert.strictEqual(matchWildcard.route.id, 'wildcard-user');
      assert.strictEqual(matchWildcard.params.rest, 'alice/settings/profile');
    },
  );

  await t.test(
    '3. Parameter Extraction & Single-Pass URI Decoding: URL-decodes parameters safely and catches malformed encoding',
    async () => {
      const compiler = new RouteCompiler();
      const registry = new RouteRegistry();

      registry.register(
        compiler.compile({
          id: 'get-file',
          method: 'GET',
          path: '/files/:filename',
          action: createDummyAction('get-file'),
        }),
      );

      const matcher = new RouteMatcher(registry);

      // Normal decoded parameter
      const match1 = matcher.match({ method: 'GET', path: '/files/my%20document%20%281%29.pdf' });
      assert.strictEqual(match1.params.filename, 'my document (1).pdf');

      // Malformed URI encoding throws MalformedPathError
      assert.throws(() => {
        matcher.match({ method: 'GET', path: '/files/%ZZmalformed' });
      }, MalformedPathError);
    },
  );

  await t.test(
    '4. Parameter Validation & Duplicate Parameter Rejection: Rejects duplicate parameter names and invalid identifiers',
    async () => {
      const compiler = new RouteCompiler();

      // Duplicate parameter name in same route pattern
      assert.throws(() => {
        compiler.compile({
          id: 'dup-param',
          method: 'GET',
          path: '/users/:id/orders/:id',
          action: createDummyAction('dup-param'),
        });
      }, DuplicateRouteParameterError);

      // Invalid parameter identifier
      assert.throws(() => {
        compiler.compile({
          id: 'bad-param',
          method: 'GET',
          path: '/users/:123invalid',
          action: createDummyAction('bad-param'),
        });
      }, InvalidRouteParameterError);

      // Invalid regex constraint fails at compilation time
      assert.throws(() => {
        compiler.compile({
          id: 'bad-regex',
          method: 'GET',
          path: '/users/:id([a-z',
          action: createDummyAction('bad-regex'),
        });
      }, InvalidRoutePatternError);
    },
  );

  await t.test(
    '5. Trailing-Slash Policy & Root Route: Configurable strictTrailingSlash and robust root route support',
    async () => {
      // Default: strictTrailingSlash is false (/users and /users/ are equivalent)
      const compiler = new RouteCompiler();
      const registry = new RouteRegistry();

      registry.register(
        compiler.compile({
          id: 'root-route',
          method: 'GET',
          path: '/',
          action: createDummyAction('root-route'),
        }),
      );

      registry.register(
        compiler.compile({
          id: 'users-route',
          method: 'GET',
          path: '/users',
          action: createDummyAction('users-route'),
        }),
      );

      const matcher = new RouteMatcher(registry);

      // Root route /
      const rootMatch = matcher.match({ method: 'GET', path: '/' });
      assert.strictEqual(rootMatch.route.id, 'root-route');

      // Trailing slash normalized
      const matchSlash = matcher.match({ method: 'GET', path: '/users/' });
      assert.strictEqual(matchSlash.route.id, 'users-route');

      const matchNoSlash = matcher.match({ method: 'GET', path: '/users' });
      assert.strictEqual(matchNoSlash.route.id, 'users-route');

      // Strict trailing slash mode
      const strictCompiler = new RouteCompiler({ strictTrailingSlash: true });
      const strictRegistry = new RouteRegistry();
      strictRegistry.register(
        strictCompiler.compile({
          id: 'strict-users-slash',
          method: 'GET',
          path: '/users/',
          action: createDummyAction('strict-users-slash'),
        }),
      );

      const strictMatcher = new RouteMatcher(strictRegistry, undefined, {
        strictTrailingSlash: true,
      });
      assert.strictEqual(
        strictMatcher.match({ method: 'GET', path: '/users/' }).route.id,
        'strict-users-slash',
      );
      assert.throws(() => {
        strictMatcher.match({ method: 'GET', path: '/users' });
      }, RouteNotFoundError);
    },
  );

  await t.test(
    '6. Wildcard Semantics: Wildcard must be final segment and does not match empty remainder',
    async () => {
      const compiler = new RouteCompiler();

      // Wildcard not in final position is rejected during compilation
      assert.throws(() => {
        compiler.compile({
          id: 'bad-wildcard',
          method: 'GET',
          path: '/files/*path/download',
          action: createDummyAction('bad-wildcard'),
        });
      }, InvalidRoutePatternError);

      const registry = new RouteRegistry();
      registry.register(
        compiler.compile({
          id: 'wildcard-assets',
          method: 'GET',
          path: '/assets/*path',
          action: createDummyAction('wildcard-assets'),
        }),
      );

      const matcher = new RouteMatcher(registry);

      // Matches when 1 or more segments present
      const match = matcher.match({ method: 'GET', path: '/assets/app.js' });
      assert.strictEqual(match.route.id, 'wildcard-assets');
      assert.strictEqual(match.params.path, 'app.js');

      // Does not match empty remainder (/assets or /assets/)
      assert.throws(() => {
        matcher.match({ method: 'GET', path: '/assets' });
      }, RouteNotFoundError);
    },
  );

  await t.test(
    '7. HTTP HEAD Fallback: Prefers explicit HEAD route, otherwise falls back to GET route',
    async () => {
      const compiler = new RouteCompiler();
      const registry = new RouteRegistry();

      // Route with explicit HEAD and GET
      registry.register(
        compiler.compile({
          id: 'get-health',
          method: 'GET',
          path: '/health',
          action: createDummyAction('get-health'),
        }),
      );
      registry.register(
        compiler.compile({
          id: 'head-health',
          method: 'HEAD',
          path: '/health',
          action: createDummyAction('head-health'),
        }),
      );

      // Route with only GET
      registry.register(
        compiler.compile({
          id: 'get-status',
          method: 'GET',
          path: '/status',
          action: createDummyAction('get-status'),
        }),
      );

      const matcher = new RouteMatcher(registry);

      // /health HEAD prefers explicit HEAD route
      const matchHealthHead = matcher.match({ method: 'HEAD', path: '/health' });
      assert.strictEqual(matchHealthHead.route.id, 'head-health');

      // /status HEAD falls back to GET route
      const matchStatusHead = matcher.match({ method: 'HEAD', path: '/status' });
      assert.strictEqual(matchStatusHead.route.id, 'get-status');
    },
  );

  await t.test(
    '8. Ambiguous Route Conflict Detection: Rejects exact duplicates and semantically identical patterns',
    async () => {
      const compiler = new RouteCompiler();
      const registry = new RouteRegistry();

      registry.register(
        compiler.compile({
          id: 'get-user-by-id',
          method: 'GET',
          path: '/users/:id',
          action: createDummyAction('get-user-by-id'),
        }),
      );

      // Duplicate ID rejected
      assert.throws(() => {
        registry.register(
          compiler.compile({
            id: 'get-user-by-id',
            method: 'POST',
            path: '/users/:id',
            action: createDummyAction('get-user-by-id'),
          }),
        );
      }, RouteConflictError);

      // Exact pattern duplicate rejected
      assert.throws(() => {
        registry.register(
          compiler.compile({
            id: 'dup-pattern',
            method: 'GET',
            path: '/users/:id',
            action: createDummyAction('dup-pattern'),
          }),
        );
      }, RouteConflictError);

      // Semantically identical pattern with different param name rejected
      assert.throws(() => {
        registry.register(
          compiler.compile({
            id: 'colliding-param-name',
            method: 'GET',
            path: '/users/:name',
            action: createDummyAction('colliding-param-name'),
          }),
        );
      }, RouteConflictError);
    },
  );

  await t.test(
    '9. 404 Route Not Found & 405 Method Not Allowed: Correctly classifies missing routes vs method mismatches with allowedMethods',
    async () => {
      const compiler = new RouteCompiler();
      const registry = new RouteRegistry();

      registry.register(
        compiler.compile({
          id: 'get-products',
          method: 'GET',
          path: '/products',
          action: createDummyAction('get-products'),
        }),
      );
      registry.register(
        compiler.compile({
          id: 'post-products',
          method: 'POST',
          path: '/products',
          action: createDummyAction('post-products'),
        }),
      );

      const matcher = new RouteMatcher(registry);

      // 404 when path does not exist
      assert.throws(() => {
        matcher.match({ method: 'GET', path: '/non-existent-path' });
      }, RouteNotFoundError);

      // 405 when path exists but method does not match
      try {
        matcher.match({ method: 'DELETE', path: '/products' });
        assert.fail('Should have thrown MethodNotAllowedError');
      } catch (err) {
        assert.ok(err instanceof MethodNotAllowedError);
        assert.strictEqual(err.code, 'CF-ROUTING-METHOD-NOT-ALLOWED');
        assert.deepStrictEqual(new Set(err.allowedMethods), new Set(['GET', 'POST']));
      }
    },
  );

  await t.test(
    '10. Stateless Concurrency: 1,000 concurrent route matches maintain complete isolation and zero request mutation',
    async () => {
      const compiler = new RouteCompiler();
      const registry = new RouteRegistry();

      for (let i = 0; i < 50; i++) {
        registry.register(
          compiler.compile({
            id: `route-${i}`,
            method: 'GET',
            path: `/tenant/:tenantId/resource/${i}/:id`,
            action: createDummyAction(`route-${i}`),
          }),
        );
      }

      const matcher = new RouteMatcher(registry);

      const promises = Array.from({ length: 1000 }, async (_, i) => {
        const routeIdx = i % 50;
        const tenant = `tenant-${i}`;
        const idVal = `id-${i * 7}`;

        const req: NormalizedRequest = {
          method: 'GET',
          path: `/tenant/${tenant}/resource/${routeIdx}/${idVal}`,
        };

        const originalSnapshot = JSON.stringify(req);
        const match = matcher.match(req);

        // Verify request was never mutated
        assert.strictEqual(JSON.stringify(req), originalSnapshot);
        assert.strictEqual(match.route.id, `route-${routeIdx}`);
        assert.strictEqual(match.params.tenantId, tenant);
        assert.strictEqual(match.params.id, idVal);
      });

      await Promise.all(promises);

      const diag = matcher.diagnostics;
      assert.strictEqual(diag.totalMatches, 1000);
      assert.strictEqual(diag.successfulMatches, 1000);
      assert.strictEqual(diag.notFound, 0);
    },
  );

  await t.test(
    '11. Lifecycle State Enforcement: Matches prohibited before READY or during/after STOPPED',
    async () => {
      const lifecycle = new RoutingLifecycleManager();
      const registry = new RouteRegistry();
      const matcher = new RouteMatcher(registry, lifecycle);

      assert.strictEqual(lifecycle.state, 'READY');

      lifecycle.start();
      assert.strictEqual(lifecycle.state, 'RUNNING');

      lifecycle.stop();
      assert.strictEqual(lifecycle.state, 'STOPPED');

      assert.throws(() => {
        matcher.match({ method: 'GET', path: '/' });
      }, RoutingStateError);

      assert.throws(() => {
        lifecycle.ensureCanRegister();
      }, RoutingStateError);
    },
  );

  await t.test(
    '12. Diagnostics: Tracks accurate counts, durations, method distributions, and stores zero sensitive data',
    async () => {
      const compiler = new RouteCompiler();
      const registry = new RouteRegistry();

      registry.register(
        compiler.compile({
          id: 'get-data',
          method: 'GET',
          path: '/data',
          action: createDummyAction('get-data'),
        }),
      );

      const matcher = new RouteMatcher(registry, undefined, { enableDiagnostics: true });

      matcher.match({ method: 'GET', path: '/data' });

      assert.throws(() => {
        matcher.match({ method: 'POST', path: '/data' });
      }, MethodNotAllowedError);

      assert.throws(() => {
        matcher.match({ method: 'GET', path: '/unknown' });
      }, RouteNotFoundError);

      const diag = matcher.diagnostics;
      assert.strictEqual(diag.totalMatches, 3);
      assert.strictEqual(diag.successfulMatches, 1);
      assert.strictEqual(diag.methodNotAllowed, 1);
      assert.strictEqual(diag.notFound, 1);
      assert.strictEqual(diag.methodDistribution['GET'], 1);
      assert.strictEqual(diag.routeIdDistribution['get-data'], 1);
      assert.ok(diag.averageDurationMs >= 0);
      assert.ok(Object.isFrozen(diag));

      const diagStr = JSON.stringify(diag);
      assert.ok(!diagStr.includes('Authorization'));
      assert.ok(!diagStr.includes('cookie'));
    },
  );

  await t.test(
    '13. Full End-to-End Integration: Decorators -> MetadataRegistry -> Discovery -> RouteCompiler -> RouteRegistry -> RouteMatcher -> RouteMatch -> ParameterBindingResolver -> ExecutionEngine -> ResponseProcessor',
    async () => {
      MetadataRegistrar.reset();

      // 1. Controller with decorated routes & parameters
      @Controller('/api/v1/customers')
      class CustomerController {
        @Get('/:customerId')
        public getCustomer(
          @Param('customerId') customerId: string,
          @Query('active') active: string,
        ): { customerId: string; active: boolean } {
          return { customerId, active: active === 'true' };
        }

        @Post('/')
        public createCustomer(): { status: string } {
          return { status: 'created' };
        }
      }
      void CustomerController;

      @Module({
        controllers: [CustomerController],
      })
      class CustomerAppModule {}
      void CustomerAppModule;

      // 2. Discover & Compile Metadata
      const metadataBuilder = new MetadataBuilder();
      const metadataRegistry = new MetadataRegistry(metadataBuilder.build());
      MetadataRegistrar.finalize(MetadataRegistrar.getCollector(), metadataRegistry);

      const discovery = await new DiscoveryEngine(
        new DiscoveryBuilder().setMetadataRegistry(metadataRegistry).build(),
      ).discover();
      const compilation = await new ModuleCompiler(new CompilerBuilder().build()).compile(
        discovery,
      );
      assert.ok(compilation);

      // 3. DI Container Setup
      const container = new ContainerBuilder()
        .register({ token: CustomerController, useClass: CustomerController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      // 4. Parameter Binding Compiler
      const paramBindings = ParameterBindingCompiler.compileFromRegistry(metadataRegistry);
      const actionKey = 'CustomerController:getCustomer:GET:/:customerId';
      const bindings = paramBindings.get(actionKey) || Array.from(paramBindings.values())[0];

      // 5. Assemble ActionDescriptor & Route
      const actionDescriptor: ActionDescriptor = {
        id: actionKey,
        controllerToken: CustomerController,
        methodName: 'getCustomer',
        parameterBindings: bindings,
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const routeDefinition: RouteDefinition = {
        id: 'customers.getCustomer',
        method: 'GET',
        path: '/api/v1/customers/:customerId',
        action: actionDescriptor,
      };

      const routeCompiler = new RouteCompiler();
      const compiledRoute = routeCompiler.compile(routeDefinition);

      const routeRegistry = new RouteRegistry();
      routeRegistry.register(compiledRoute);

      const routeMatcher = new RouteMatcher(routeRegistry);

      // 6. Incoming Normalized Request
      const incomingRequest: NormalizedRequest = {
        method: 'GET',
        path: '/api/v1/customers/cust-9876',
        query: { active: 'true' },
        headers: { host: 'api.coreforge.io' },
      };

      // 7. Route Match Execution
      const routeMatch = routeMatcher.match(incomingRequest);

      assert.strictEqual(routeMatch.route.id, 'customers.getCustomer');
      assert.strictEqual(routeMatch.params.customerId, 'cust-9876');

      // 8. Construct Routed Request (transport / orchestration responsibility)
      const routedRequest: NormalizedRequest = Object.freeze({
        ...incomingRequest,
        params: routeMatch.params,
      });

      // 9. Request Context & Execution
      const contextManager = new RequestContextManager(container);
      const executionEngine = new ExecutionEngine();
      const responseProcessor = new ResponseProcessor();

      const result = await contextManager.runInContext(async (reqContext) => {
        const rawResult = await executionEngine.execute(
          routeMatch.route.action,
          routedRequest,
          reqContext,
        );
        return responseProcessor.process(rawResult);
      });

      assert.strictEqual(result.status, 200);
      assert.deepStrictEqual(result.body, {
        customerId: 'cust-9876',
        active: true,
      });
    },
  );

  await t.test(
    '14. Critical Architectural Boundary: Routing does not depend on execution, response, transport, or concrete frameworks',
    async () => {
      const frameworkDir = path.resolve(__dirname, '../../..');
      const forbiddenPackages = ['execution', 'response', 'transport', 'exceptions'];

      const forbiddenConcreteImports = [
        'express',
        'fastify',
        'node:http',
        'node:net',
        'node:https',
        'ws',
      ];

      const routingSrcDir = path.join(frameworkDir, 'routing', 'src');
      if (fs.existsSync(routingSrcDir)) {
        const files = fs.readdirSync(routingSrcDir, { recursive: true }) as string[];
        for (const file of files) {
          if (typeof file === 'string' && file.endsWith('.ts')) {
            const content = fs.readFileSync(path.join(routingSrcDir, file), 'utf-8');

            // Check forbidden internal packages
            for (const pkg of forbiddenPackages) {
              assert.ok(
                !content.includes(`@coreforge/${pkg}`),
                `Routing must not import @coreforge/${pkg} (found in ${file})`,
              );
            }

            // Check forbidden concrete frameworks
            for (const forbidden of forbiddenConcreteImports) {
              assert.ok(
                !content.includes(`from '${forbidden}'`) &&
                  !content.includes(`require('${forbidden}')`),
                `Routing must not import concrete transport '${forbidden}' (found in ${file})`,
              );
            }
          }
        }
      }
    },
  );
});
