# CoreForge Future Roadmap

This document outlines the planned integrations for future modules and how they map to the core framework architecture.

---

## 1. Future Workspace Packages Layout

```
packages/
├── foundation/           # Core primitive types, contracts, and error hierarchies
├── framework/            # Config, container, events, runtime, and core bootstrapper
│
├── modules/              # Pluggable modules implementing the `Module` contract
│   ├── auth/             # Session, JWT, and OAuth handlers
│   ├── database/         # PostgreSQL, SQLite, and Prisma connector integrations
│   ├── cache/            # Redis client and key-value memory mapping
│   ├── queue/            # Message queues and BullMQ workers
│   └── scheduler/        # Cron tasks and event dispatchers
│
└── platform/             # Simplified developer adapters and dashboards
    ├── sdk/              # Aggregates public module APIs for client applications
    └── dashboard/        # Administrative web dashboard
```

---

## 2. Integration Strategies

- **Authentication:** Plugs in as a module under `packages/modules/auth`. It registers security middleware and binds authorization policies to the DI container.
- **Database & Caching:** Reside under `packages/modules/database` and `packages/modules/cache`. They open connection pools during `onInitialized()` and close them during `onShutdown()`.
- **SDK facade:** Grouped under the Platform Layer (`packages/platform/sdk` or `packages/sdk`). It acts as an adapter, re-exporting framework components to simplify the developer experience.
