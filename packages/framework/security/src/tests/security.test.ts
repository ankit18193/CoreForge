import * as assert from 'node:assert';
import { test } from 'node:test';

import { SecurityContext as ISecurityContext } from '@coreforge/contracts';

import { SecurityAuthenticationProvider } from '../authentication/AuthenticationProvider';
import { Identity } from '../authentication/Identity';
import { SecurityAuthorizationPolicy } from '../authorization/AuthorizationPolicy';
import { SecurityContext } from '../context/SecurityContext';
import { ForbiddenError } from '../errors/SecurityErrors';
import { SecurityState } from '../lifecycle/SecurityState';
import { SecurityBuilder } from '../security/SecurityBuilder';
import { SecurityManager } from '../security/SecurityManager';

class SimpleProvider implements SecurityAuthenticationProvider {
  public readonly name: string;
  private readonly _identity: Identity | undefined;

  constructor(name: string, identity?: Identity) {
    this.name = name;
    this._identity = identity;
  }

  public async authenticate(_context: ISecurityContext): Promise<Identity | undefined> {
    return this._identity;
  }
}

class ThrowingProvider implements SecurityAuthenticationProvider {
  public readonly name = 'ThrowingProvider';
  public async authenticate(): Promise<Identity | undefined> {
    throw new Error('Provider error');
  }
}

class SimplePolicy implements SecurityAuthorizationPolicy {
  public readonly name: string;
  private readonly _allowed: boolean;

  constructor(name: string, allowed: boolean) {
    this.name = name;
    this._allowed = allowed;
  }

  public async authorize(): Promise<boolean> {
    return this._allowed;
  }
}

test('Authentication & Authorization Pipeline Package', async (t) => {
  await t.test('Authentication - successful path resolves identity', async () => {
    const identity = new Identity({
      id: 'user1',
      roles: ['user'],
      claims: { email: 'user1@test.com' },
      provider: 'MockProvider',
    });

    const builder = new SecurityBuilder().registerProvider(
      new SimpleProvider('MockProvider', identity),
    );
    const manager = new SecurityManager(builder.build());

    const context = new SecurityContext({ requestId: 'req1' });
    await manager.authenticate(context);

    assert.ok(context.principal);
    assert.strictEqual(context.principal.authenticated, true);
    assert.strictEqual(context.principal.id, 'user1');
    assert.strictEqual(context.principal.roles.includes('user'), true);
    assert.strictEqual(context.principal.claims['email'], 'user1@test.com');
    assert.strictEqual(context.identity?.provider, 'MockProvider');
  });

  await t.test(
    'Authentication - anonymous request is processed when no provider matches',
    async () => {
      const builder = new SecurityBuilder();
      const manager = new SecurityManager(builder.build());

      const context = new SecurityContext({ requestId: 'req2' });
      await manager.authenticate(context);

      assert.ok(context.principal);
      assert.strictEqual(context.principal.authenticated, false);
      assert.strictEqual(context.principal.id, 'anonymous');
      assert.strictEqual(context.identity, undefined);
    },
  );

  await t.test('Provider Priority - first successful provider wins', async () => {
    const sessionIdentity = new Identity({ id: 'sessionUser', roles: [], claims: {}, provider: 'Session' });
    const jwtIdentity = new Identity({ id: 'jwtUser', roles: [], claims: {}, provider: 'JWT' });

    const builder = new SecurityBuilder()
      .registerProvider(new SimpleProvider('JWT', undefined))
      .registerProvider(new SimpleProvider('Session', sessionIdentity))
      .registerProvider(new SimpleProvider('APIKey', jwtIdentity));

    const manager = new SecurityManager(builder.build());
    const context = new SecurityContext({ requestId: 'req3' });
    await manager.authenticate(context);

    assert.strictEqual(context.principal?.id, 'sessionUser');
    assert.strictEqual(context.identity?.provider, 'Session');
  });

  await t.test('Authentication - failure result on throwing provider', async () => {
    const builder = new SecurityBuilder().registerProvider(new ThrowingProvider());
    const manager = new SecurityManager(builder.build());

    const context = new SecurityContext({ requestId: 'req4' });
    await manager.authenticate(context);

    assert.strictEqual(context.principal, undefined);
    assert.strictEqual(context.authenticationResult?.success, false);
    assert.strictEqual(context.authenticationResult?.error?.message, 'Provider error');
  });

  await t.test('Authorization - successful evaluation passes', async () => {
    const builder = new SecurityBuilder().registerPolicy(new SimplePolicy('AdminOnly', true));
    const manager = new SecurityManager(builder.build());

    const context = new SecurityContext({ requestId: 'req5' });
    await manager.authorizeWithPolicies(context, ['AdminOnly']);

    assert.strictEqual(context.authorizationResult?.success, true);
  });

  await t.test(
    'Authorization - failed evaluation throws ForbiddenError inside pipeline execution',
    async () => {
      const builder = new SecurityBuilder().registerPolicy(new SimplePolicy('AdminOnly', false));
      const manager = new SecurityManager(builder.build());

      const context = new SecurityContext({ requestId: 'req6' });
      await assert.rejects(async () => {
        await manager.executePipeline(context, ['AdminOnly']);
      }, ForbiddenError);

      assert.strictEqual(context.authorizationResult?.success, false);
      assert.deepStrictEqual(context.authorizationResult?.failingPolicies, ['AdminOnly']);
    },
  );

  await t.test('Multiple Policies - execute in order', async () => {
    const list: string[] = [];
    const policyA = {
      name: 'PolicyA',
      authorize: async () => {
        list.push('A');
        return true;
      },
    };
    const policyB = {
      name: 'PolicyB',
      authorize: async () => {
        list.push('B');
        return true;
      },
    };

    const builder = new SecurityBuilder().registerPolicy(policyA).registerPolicy(policyB);
    const manager = new SecurityManager(builder.build());

    const context = new SecurityContext({ requestId: 'req7' });
    await manager.executePipeline(context, ['PolicyA', 'PolicyB']);

    assert.deepStrictEqual(list, ['A', 'B']);
  });

  await t.test('Lifecycle & Diagnostics - metrics trace attempts correctly', async () => {
    const builder = new SecurityBuilder()
      .registerProvider(new SimpleProvider('Mock', undefined))
      .registerPolicy(new SimplePolicy('AdminOnly', true));
    const manager = new SecurityManager(builder.build());

    assert.strictEqual(manager.state, SecurityState.READY);

    const context = new SecurityContext({ requestId: 'req8' });
    await manager.executePipeline(context, ['AdminOnly']);

    const snap = manager.diagnostics.getSnapshot();
    assert.strictEqual(snap.anonymousRequests, 1);
    assert.strictEqual(snap.providerUsage['Mock'], 1);
    assert.strictEqual(snap.policyUsage['AdminOnly'], 1);
  });

  await t.test('Immutability - objects are frozen', async () => {
    const identity = new Identity({
      id: 'user',
      roles: ['role'],
      claims: { k: 1 },
      provider: 'Mock',
    });

    assert.throws(() => {
      (identity as unknown as Record<string, unknown>).id = 'mutated';
    });

    assert.throws(() => {
      (identity.roles as unknown as string[]).push('new-role');
    });

    const builder = new SecurityBuilder().registerProvider(new SimpleProvider('Mock', identity));
    const manager = new SecurityManager(builder.build());
    const context = new SecurityContext({ requestId: 'req' });
    await manager.authenticate(context);

    const principal = context.principal;
    assert.ok(principal);

    assert.throws(() => {
      (principal as unknown as Record<string, unknown>).id = 'mutated';
    });

    assert.throws(() => {
      (principal.roles as unknown as string[]).push('new-role');
    });

    assert.throws(() => {
      (principal.claims as unknown as Record<string, unknown>)['k'] = 2;
    });

    const authNRes = context.authenticationResult;
    assert.ok(authNRes);
    assert.throws(() => {
      (authNRes as unknown as Record<string, unknown>).success = false;
    });

    context.freeze();
    assert.throws(() => {
      (context as unknown as Record<string, unknown>).requestId = 'new-id';
    });
  });

  await t.test('Parallel Load - 1000 parallel requests maintain isolated contexts', async () => {
    const builder = new SecurityBuilder();
    const manager = new SecurityManager(builder.build());

    const promises: Promise<void>[] = [];

    for (let i = 0; i < 1000; i++) {
      promises.push(
        (async () => {
          const context = new SecurityContext({ requestId: `req-${i}` });
          await manager.executePipeline(context, []);
          assert.strictEqual(context.requestId, `req-${i}`);
          assert.strictEqual(context.principal?.id, 'anonymous');
        })(),
      );
    }

    await Promise.all(promises);
  });
});
