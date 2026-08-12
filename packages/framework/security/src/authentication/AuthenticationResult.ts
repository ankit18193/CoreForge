import { Identity } from './Identity';
import { Principal } from '../context/Principal';

export class AuthenticationResult {
  public readonly success: boolean;
  public readonly principal: Principal | undefined;
  public readonly identity: Identity | undefined;
  public readonly providerName: string | undefined;
  public readonly error: Error | undefined;

  private constructor(params: {
    success: boolean;
    principal?: Principal | undefined;
    identity?: Identity | undefined;
    providerName?: string | undefined;
    error?: Error | undefined;
  }) {
    this.success = params.success;
    this.principal = params.principal;
    this.identity = params.identity;
    this.providerName = params.providerName;
    this.error = params.error;
    Object.freeze(this);
  }

  public static successResult(
    principal: Principal,
    identity: Identity,
    providerName: string,
  ): AuthenticationResult {
    return new AuthenticationResult({
      success: true,
      principal,
      identity,
      providerName,
    });
  }

  public static failedResult(error: Error, providerName?: string): AuthenticationResult {
    return new AuthenticationResult({
      success: false,
      error,
      providerName,
    });
  }

  public static anonymousResult(): AuthenticationResult {
    return new AuthenticationResult({
      success: true,
    });
  }
}
