// Shared Generic Context Interfaces
export interface RequestContext {
  id: string;
  timestamp: number;
  [key: string]: unknown;
}

export interface ResponseContext {
  statusCode: number;
  headers: Record<string, string>;
  [key: string]: unknown;
}

// Primitive Reusable Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Dictionary<T> = Record<string, T>;

// Common Lifecycle Enums
export enum FrameworkEnv {
  Development = 'development',
  Production = 'production',
  Testing = 'testing',
  Staging = 'staging',
}
