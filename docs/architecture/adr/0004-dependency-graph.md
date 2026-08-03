# ADR 0004: Infrastructure Service Siblings

- **Status:** Approved
- **Date:** 2026-08-03

## Context

Config, Container, and Events are core framework components. If they depend on the runtime engine or each other, swapping or testing them becomes extremely difficult.

## Decision

We structured `config`, `container`, and `events` as sibling infrastructure services depending only on the foundation layer.

## Consequences

- No coupling between DI container and Event Bus.
- Components are fully testable in isolation.
