# ADR 0003: Core Contracts Isolation

- **Status:** Approved
- **Date:** 2026-08-03

## Context

Framework engines (DI, logging, modules) need to reference other service types without importing their actual executable code.

## Decision

We isolated all abstract contracts and interface shapes into `@coreforge/contracts` under the `foundation` layer.

## Consequences

- Clean separation of interface from implementation.
- Avoids type-resolution circular imports.
