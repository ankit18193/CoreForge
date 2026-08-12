import { SecurityContext as ISecurityContext } from '@coreforge/contracts';

import { Principal } from './Principal';
import { AuthenticationResult } from '../authentication/AuthenticationResult';
import { Identity } from '../authentication/Identity';
import { AuthorizationResult } from '../authorization/AuthorizationResult';

export class SecurityContext implements ISecurityContext {
  private _principal: Principal | undefined;
  private _identity: Identity | undefined;
  private _requestId: string;
  private _authenticationResult: AuthenticationResult | undefined;
  private _authorizationResult: AuthorizationResult | undefined;

  constructor(params: {
    principal?: Principal | undefined;
    identity?: Identity | undefined;
    requestId: string;
    authenticationResult?: AuthenticationResult | undefined;
    authorizationResult?: AuthorizationResult | undefined;
  }) {
    this._principal = params.principal;
    this._identity = params.identity;
    this._requestId = params.requestId;
    this._authenticationResult = params.authenticationResult;
    this._authorizationResult = params.authorizationResult;
  }

  public get principal(): Principal | undefined {
    return this._principal;
  }

  public get identity(): Identity | undefined {
    return this._identity;
  }

  public get requestId(): string {
    return this._requestId;
  }

  public get authenticationResult(): AuthenticationResult | undefined {
    return this._authenticationResult;
  }

  public get authorizationResult(): AuthorizationResult | undefined {
    return this._authorizationResult;
  }

  public setPrincipal(principal?: Principal | undefined): void {
    this._principal = principal;
  }

  public setIdentity(identity?: Identity | undefined): void {
    this._identity = identity;
  }

  public setAuthenticationResult(result: AuthenticationResult): void {
    this._authenticationResult = result;
  }

  public setAuthorizationResult(result: AuthorizationResult): void {
    this._authorizationResult = result;
  }

  public freeze(): void {
    Object.freeze(this);
  }
}
