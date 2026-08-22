import { ResolutionStack } from '../context/ResolutionStack';
import { CircularDependencyError } from '../errors/DependencyErrors';
import { InjectionToken } from '../types/dependencyTypes';

export class CircularDependencyDetector {
  public static checkCycle(stack: ResolutionStack, token: InjectionToken): void {
    if (stack.contains(token)) {
      const cyclePath = stack.getCyclePath(token);
      throw new CircularDependencyError(cyclePath);
    }
  }
}
