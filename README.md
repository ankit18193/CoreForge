# CoreForge

> Enterprise Backend Infrastructure Platform

CoreForge is an enterprise-grade reusable backend framework for Node.js and TypeScript. Unlike standard application boilerplates or specific services, CoreForge provides a modular infrastructure platform that developers can plug into any Node.js application to handle mission-critical capabilities with absolute reliability.

---

## 1. Vision

Modern backend engineering is plagued by rebuilding the same foundation over and over: authentication, rate limiting, audit logging, queues, and notification dispatching. CoreForge solves this by providing modular, highly cohesive packages that plug seamlessly into a unified backend engine. It is designed from the ground up for performance, type safety, low coupling, and developer ergonomics.

---

## 2. Architecture

CoreForge implements a **Monorepo Architecture** designed for high cohesion and loose coupling.

```
                    ┌─────────────────────────┐
                    │     sdk (Entrypoint)    │
                    └───────────┬─────────────┘
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
      ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
      │     core     │   │    config    │   │    shared    │
      └──────┬───────┘   └──────────────┘   └──────────────┘
             │
             ▼
      [Future Modules]
 (Auth, DB, Cache, Queue...)
```

### Core Architecture Principles

1. **Single Responsibility Principle (SRP):** Every package has exactly one focus area.
2. **Open/Closed Principle (OCP):** The framework's core registry is open for extension via modules but closed for modification.
3. **Dependency Inversion Principle (DIP):** Internal components rely on abstract interfaces, never on concrete infrastructure engines.
4. **Composition over Inheritance:** Dynamic capability assembly is achieved through middleware and module registration rather than deep class inheritance hierarchies.
5. **No Circular Dependencies:** Package dependencies flow strictly one-way (e.g., `core` does not import from `sdk`).

---

## 3. Folder Structure

```
coreforge/
├── apps/
│   ├── dashboard/       # Administrative management interface (Future)
│   └── playground/      # Developer testbed and reference workspace
├── packages/
│   ├── config/          # Central configuration management system
│   ├── core/            # The main framework execution engine
│   ├── sdk/             # Public unified client developer toolkit (Rollup package)
│   └── shared/          # Shared interfaces, utilities, and constants
├── docs/                # Comprehensive architectural and user documentation
├── scripts/             # Workspace automation and build-management helpers
└── .github/             # GitHub Actions configurations for continuous integration
```

---

## 4. Installation

Prerequisites:

- **Node.js**: >= 18.x.x
- **npm**: >= 9.x.x

Install all workspace dependencies and link the local packages:

```bash
npm install
```

---

## 5. Development

To run the compiler in watch mode (rebuilding workspace packages automatically on changes):

```bash
npm run dev
```

To run ESLint checking across the codebase:

```bash
npm run lint
```

To automatically format the code utilizing Prettier:

```bash
npm run format
```

---

## 6. Build

To compile all packages and applications inside the workspaces using TypeScript project references:

```bash
npm run build
```

This compiles each workspace project in topological dependency order into its respective `dist/` directory, generating both Javascript and TypeScript declarations.

To clean up all built folders and compilation state files:

```bash
npm run clean
```

---

## 7. Future Modules

CoreForge is architected to dynamically register modules at initialization. Future modules will include:

- **Authentication & RBAC**: Session, JWT, OAuth, and Role-Based Access Control.
- **Cache & Queue**: High-performance redis bindings and BullMQ work distribution.
- **Monitoring & Logging**: Structured JSON logging, Audit logs, Prometheus metrics, and Health Check status endpoints.
- **Scheduler**: Cron and timed event emission.
- **Notifications**: Email, SMS, and webhook dispatching.
- **File Upload**: Cloud storage object orchestration.

---

## 8. Contribution Guide

We maintain strict standards for extending CoreForge:

1. **Strict Types**: All code must conform to the strict TypeScript environment specified in `tsconfig.base.json`.
2. **Clean Exports**: Every package must expose its public APIs exclusively through its root `index.ts`. Deep imports (e.g., `@coreforge/core/src/...`) are strictly forbidden and enforced by import-ordering lint criteria.
3. **No Operation Placeholders**: Never write TODO comments or mock classes. Code must be either fully implemented or absent.
4. **Architectural Isolation**: Place infrastructure dependencies (e.g., `pg`, `redis`) behind abstractions within the modules, keeping `core` lightweight.
