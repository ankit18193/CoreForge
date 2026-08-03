# CoreForge Module Lifecycle

Every pluggable modular service must implement the standard `Module` contract. The application bootstrap coordinator (`framework/core`) orchestrates state transitions.

---

## 1. Lifecycle States

```
  Created
     │
     ▼
 Registered
     │
     ▼
 Configured
     │
     ▼
Initialized
     │
     ▼
  Started
     │
     ▼
   Ready <───────┐
     │           │ (Recovery/Errors)
     ▼           │
 Stopping ───────┘
     │
     ▼
 Shutdown
     │
     ▼
 Disposed
```

### State Rationale and Operations

1. **Created:** Instantiated in memory. Constructor only. Heavy IO operations are forbidden.
2. **Registered:** The core bootstrapper discovers and validates module dependencies.
3. **Configured:** Config boundaries are injected into the module. Sub-settings are parsed.
4. **Initialized:** The module initializes resource pools, database connections, and external clients.
5. **Started:** The module starts internal tickers, cron tasks, and queue listeners.
6. **Ready:** The module is fully functional and ready to process traffic.
7. **Stopping:** Pre-shutdown state. The module stops accepting incoming connections and starts draining active pools.
8. **Shutdown:** Sockets are closed and database connections are gracefully released.
9. **Disposed:** References are deleted, memory is freed, and the process completes cleanup.

---

## 2. Transition Rules

- **Legal Path:** Must transition sequentially (`Created` → `Registered` → `Configured` → `Initialized` → `Started` → `Ready` → `Stopping` → `Shutdown` → `Disposed`).
- **Illegal Path:** Direct jumps that skip states (e.g. `Created` to `Initialized`) are blocked. Backwards loops (e.g. `Ready` to `Configured`) are illegal.
- **Failures:** Exceptions during startup transition the module straight to `Stopping` → `Shutdown` → `Disposed`.
