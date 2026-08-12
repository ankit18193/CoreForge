import { ActionArguments as IActionArguments } from '@coreforge/contracts';

export class ActionArguments implements IActionArguments {
  public readonly positionals: readonly unknown[];
  public readonly named: Readonly<Record<string, unknown>>;
  public readonly rawValues: Readonly<Record<string, unknown>>;

  constructor(
    positionals: readonly unknown[],
    named: Record<string, unknown>,
    rawValues: Record<string, unknown>,
  ) {
    this.positionals = Object.freeze([...positionals]);
    this.named = Object.freeze({ ...named });
    this.rawValues = Object.freeze({ ...rawValues });
    Object.freeze(this);
  }
}
