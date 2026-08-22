import { DecoratorMetadata, MetadataType } from '@coreforge/contracts';

export class DecoratorRegistration implements DecoratorMetadata {
  public readonly id: string;
  public readonly type: MetadataType;
  public readonly target: string;
  public readonly targetRef?: unknown;
  public readonly propertyKey?: string | symbol | undefined;
  public readonly parameterIndex?: number | undefined;
  public readonly parentId?: string | undefined;
  public readonly properties: Readonly<Record<string, unknown>>;
  public readonly timestamp: number;

  constructor(params: {
    id: string;
    type: MetadataType;
    target: string;
    targetRef?: unknown;
    propertyKey?: string | symbol | undefined;
    parameterIndex?: number | undefined;
    parentId?: string | undefined;
    properties?: Record<string, unknown>;
    timestamp?: number;
  }) {
    this.id = params.id;
    this.type = params.type;
    this.target = params.target;
    this.targetRef = params.targetRef;
    this.propertyKey = params.propertyKey;
    this.parameterIndex = params.parameterIndex;
    this.parentId = params.parentId;
    this.properties = Object.freeze(params.properties ? { ...params.properties } : {});
    this.timestamp = params.timestamp ?? Date.now();
    Object.freeze(this);
  }
}
