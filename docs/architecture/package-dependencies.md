# CoreForge Package Dependencies and Graph

To prevent cyclic dependencies and structure degradation as the framework scales, CoreForge enforces strict boundary limits on package dependencies.

---

## 1. Dependency Graph

All dependency paths flow strictly **downward**:

```
                    ┌─────────────────────────┐
                    │     apps (playground)   │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │     framework/core      │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │    framework/runtime    │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│framework/event│       │framework/conta│       │framework/confi│
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │    foundation/utils     │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │    foundation/errors    │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  foundation/contracts   │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │    foundation/types     │
                    └─────────────────────────┘
```

---

## 2. Dependency Matrix

| Source Package           | Allowed Imports                                                                     | Forbidden Imports                                         |
| :----------------------- | :---------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **foundation/types**     | _None_                                                                              | All other packages                                        |
| **foundation/contracts** | `types`                                                                             | `errors`, `utils`, `framework/*`, `apps/*`                |
| **foundation/errors**    | `types`, `contracts`                                                                | `utils`, `framework/*`, `apps/*`                          |
| **foundation/utils**     | `types`, `contracts`                                                                | `errors`, `framework/*`, `apps/*`                         |
| **framework/config**     | `types`, `contracts`, `errors`, `utils`                                             | `runtime`, `container`, `events`, `core`, `apps/*`        |
| **framework/container**  | `types`, `contracts`, `errors`, `utils`                                             | `runtime`, `config`, `events`, `core`, `apps/*`           |
| **framework/events**     | `types`, `contracts`, `errors`, `utils`                                             | `runtime`, `container`, `config`, `core`, `apps/*`        |
| **framework/runtime**    | `types`, `contracts`, `errors`, `utils`, `config`, `container`, `events`            | `core`, `apps/*`                                          |
| **framework/core**       | `types`, `contracts`, `errors`, `utils`, `config`, `container`, `events`, `runtime` | `apps/*`                                                  |
| _*apps/* (playground)_*  | `framework/core`                                                                    | `framework/{config,container,events,runtime}` (internals) |

---

## 3. Project Reference Compilation Sequence

```
packages/foundation/types
           │
           ▼
packages/foundation/contracts
           │
           ▼
packages/foundation/errors
           │
           ▼
packages/foundation/utils
           │
           ▼
packages/framework/config / container / events (Siblings)
           │
           ▼
packages/framework/runtime
           │
           ▼
packages/framework/core
           │
           ▼
apps/playground
```
