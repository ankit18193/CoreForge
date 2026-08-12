export class AuthorizationResult {
  public readonly success: boolean;
  public readonly failingPolicies: readonly string[];

  private constructor(params: { success: boolean; failingPolicies: readonly string[] }) {
    this.success = params.success;
    this.failingPolicies = Object.freeze([...params.failingPolicies]);
    Object.freeze(this);
  }

  public static successResult(): AuthorizationResult {
    return new AuthorizationResult({
      success: true,
      failingPolicies: [],
    });
  }

  public static failedResult(failingPolicies: readonly string[]): AuthorizationResult {
    return new AuthorizationResult({
      success: false,
      failingPolicies,
    });
  }
}
