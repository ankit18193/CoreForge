# ADR 0005: Nine-Stage Module Lifecycle

- **Status:** Approved
- **Date:** 2026-08-03

## Context

Pluggable modules require custom resource allocations, configuration validation, queue consumption, and graceful stopping.

## Decision

We established a strict nine-stage module lifecycle: `Created` → `Registered` → `Configured` → `Initialized` → `Started` → `Ready` → `Stopping` → `Shutdown` → `Disposed`.

## Consequences

- Modules start and shutdown in a deterministic order.
- Safe connection draining during redeployment.
