import { ProviderDescriptorHelper, TokenFormatter } from './ProviderDescriptor';
import { DuplicateProviderError, ProviderRegistrationError } from '../errors/DependencyErrors';
import { InjectionToken, ProviderDescriptor } from '../types/dependencyTypes';

export class ProviderRegistry {
  private readonly _providers = new Map<string | symbol, Readonly<ProviderDescriptor<unknown>>>();
  private readonly _allowOverride: boolean;

  constructor(allowOverride = false) {
    this._allowOverride = allowOverride;
  }

  public register<T>(provider: ProviderDescriptor<T>): void {
    if (!provider || !provider.token) {
      throw new ProviderRegistrationError('Invalid provider descriptor: token is required.');
    }

    const hasClass = provider.useClass !== undefined;
    const hasValue = provider.useValue !== undefined;
    const hasFactory = provider.useFactory !== undefined;

    const definitionsCount = (hasClass ? 1 : 0) + (hasValue ? 1 : 0) + (hasFactory ? 1 : 0);

    if (definitionsCount !== 1) {
      const tokenName = TokenFormatter.format(provider.token);
      throw new ProviderRegistrationError(
        `Provider for token "${tokenName}" must specify exactly one of "useClass", "useValue", or "useFactory". Found ${definitionsCount}.`,
      );
    }

    const key = TokenFormatter.toKey(provider.token);
    const existing = this._providers.get(key);

    if (existing && !this._allowOverride) {
      const tokenName = TokenFormatter.format(provider.token);
      throw new DuplicateProviderError(tokenName);
    }

    const frozenDesc = ProviderDescriptorHelper.create(provider);
    this._providers.set(key, frozenDesc as Readonly<ProviderDescriptor<unknown>>);
  }

  public get<T>(token: InjectionToken<T>): Readonly<ProviderDescriptor<T>> | undefined {
    const key = TokenFormatter.toKey(token);
    return this._providers.get(key) as Readonly<ProviderDescriptor<T>> | undefined;
  }

  public has(token: InjectionToken): boolean {
    const key = TokenFormatter.toKey(token);
    return this._providers.has(key);
  }

  public getAll(): readonly Readonly<ProviderDescriptor<unknown>>[] {
    return Object.freeze(Array.from(this._providers.values()));
  }

  public get size(): number {
    return this._providers.size;
  }
}
