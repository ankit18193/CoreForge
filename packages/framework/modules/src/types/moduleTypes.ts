import { Module } from '@coreforge/contracts';

export type ModuleConstructor = new (...args: unknown[]) => Module;
