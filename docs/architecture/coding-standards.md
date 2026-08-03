# CoreForge Coding Standards & Conventions

To maintain codebase uniformity as the project expands, all packages must adhere to these coding standards.

---

## 1. Naming Conventions

- **Folders:** Always `kebab-case`.
- **Files:** `PascalCase` for classes (e.g. `EventBus.ts`), `camelCase` for utilities (e.g. `dateUtils.ts`).
- **Interfaces:** Standard naming **without** the `I` prefix (e.g., `Module`, `Container`, `Logger`).
- **Classes:** Always `PascalCase` (e.g. `EventBus`).
- **Functions:** `camelCase` (e.g. `parseEnvString`).
- **Constants & Enums:** `UPPER_SNAKE_CASE` (e.g. `DEFAULT_PORT`, `FrameworkEnv.PRODUCTION`).
- **Generics:** Single capital letter (`T`, `U`) or camelCase prefixed with `T` (e.g. `TResponse`).
- **Private Members:** Prefix with a leading underscore (e.g. `_container`).

---

## 2. API Policies

### Public APIs

Public APIs are exported exclusively through the root `index.ts` file of the package.

```typescript
// Allowed:
import { CoreForgeApp } from '@coreforge/core';

// Forbidden (Deep import):
import { CoreForgeApp } from '@coreforge/core/src/CoreForgeApp';
```

### Internal APIs

Shared utilities used across workspace packages (but not exposed to users) are placed inside `internal/` folders (e.g., `@coreforge/container/internal`).

### Private APIs

Kept in local source subfolders. They are private to the defining package and are not exported.
