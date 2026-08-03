# ADR 0002: Package Layering

- **Status:** Approved
- **Date:** 2026-08-03

## Context

As the codebase grows, packages can become tightly coupled, causing cyclic imports and structural degradation.

## Decision

We divide the packages into distinct layered categories:

1. `foundation/` (types, contracts, errors, utils)
2. `framework/` (config, container, events, runtime, core)
3. `modules/` (future domain implementations)

## Consequences

- Imports can only point downward.
- Prevents compilation circularities automatically.
