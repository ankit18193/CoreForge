import { Controller } from '@coreforge/contracts';

import { ControllerState } from '../lifecycle/ControllerState';
import { ActionDescriptor } from '../metadata/ActionDescriptor';
import { ControllerMetadata } from '../metadata/ControllerMetadata';

export interface ControllerDescriptor {
  readonly id: string;
  readonly metadata: ControllerMetadata;
  readonly instance: Controller;
  readonly actions: readonly ActionDescriptor[];
  readonly state: ControllerState;
  readonly createdAt: number;
  readonly enabled: boolean;
}
