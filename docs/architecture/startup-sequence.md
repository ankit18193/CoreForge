# CoreForge Startup Sequence

This document describes the exact bootstrap progression that the framework follows during application startup.

---

## 1. Sequence Diagram

```
[Application Starts]
       │
       ▼
1.  [Environment Resolution] -> Load environmental variables and configuration profiles.
       │
       ▼
2.  [Configuration Loading]  -> Bind config schema and perform validations.
       │
       ▼
3.  [Logging Initialization] -> Initialize the global structured logging interface.
       │
       ▼
4.  [DI Container Assembly]  -> Initialize container and register core dependencies.
       │
       ▼
5.  [Event Bus Startup]       -> Initialize the event bus for decoupled communications.
       │
       ▼
6.  [Module Discovery]       -> Identify and resolve active modules list.
       │
       ▼
7.  [Module Registration]    -> Core registers modules.
       │
       ▼
8.  [Module Configuration]   -> Configure active modules.
       │
       ▼
9.  [Module Initialization]  -> Core allocates socket pools, databases, and listeners.
       │
       ▼
10. [Application Ready]     -> App starts listening for connections.
       │
       ▼
[Graceful Shutdown Trigger]
       │
       ▼
11. [Graceful Shutdown]     -> Clean up resources, invoke shutdown procedures, and exit.
```

---

## 2. Stage Responsibilities

- **Environment Resolution:** Reads process environments, determines the active profile (dev, prod, test), and checks configuration parameters.
- **DI Container Assembly:** Core registers standard adapters (e.g. Logger, EventBus) into the container so they are ready to be injected into modules.
- **Module Discovery:** Locates configured modules, validates dependencies, and checks for circular dependencies.
- **Graceful Shutdown:** Binds OS process signals (`SIGTERM`, `SIGINT`). On signal reception, it triggers the module lifecycle shutdown phases in reverse dependency order, ensuring database connection pools are not closed while active database queries are processing.
