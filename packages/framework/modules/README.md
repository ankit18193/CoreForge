# @coreforge/modules

CoreForge Module Registry & Orchestration System.

---

## 1. Module Architecture

The Module System coordinates startup and shutdown operations in dependency order. Its components are strictly isolated:

```
┌────────────────────────────────────────────────────────┐
│                      ModuleLoader                      │ (Façade API)
└───────────────────────────┬────────────────────────────┘
                            │
      ┌─────────────────────┼─────────────────────┐
      ▼                     ▼                     ▼
┌───────────┐         ┌───────────┐         ┌───────────┐
│Registry   │         │Resolver   │         │Lifecycle  │
└───────────┘         └───────────┘         └───────────┘
(Storage &            (Topological          (Generic
 Duplicate             Ordering &            Hook Execution
 Checking)             Loops Validation)     Manager)
```

- **`ModuleLoader`:** Public façade coordinating registry storage, sorting resolvers, and execution loops. Exposes `discover()`, `validate()`, `resolve()`, `start()`, and `stop()`.
- **`ModuleRegistry`:** Storage only. Stores registration descriptors and validates duplicate registrations.
- **`DependencyResolver`:** Computes topological startup and shutdown sequences (DFS sort with cycle checks) without prescribing graph algorithms to loader interfaces.
- **`ModuleLifecycleManager`:** Responsible only for executing lifecycle phase transitions. Maps phase enums to optional hooks, updating descriptor states.
- **`ModuleDescriptor`:** Holds runtime state and dependency references, exposing a protected state machine transition engine.
- **`ModuleExecutionContext`:** Diagnoses timelines, startup orders, successful/failed count, and captured failure errors.

---

## 2. Dependency Graph & Topological Sorting

Dependencies are resolved topological-first. If `A depends on B` and `B depends on C`, the resolved order is `C ➔ B ➔ A`.
If a loop exists (e.g. `A ➔ B ➔ C ➔ A`), the `DependencyResolver` throws a `CircularModuleDependencyError` showing the cycle path trail.

---

## 3. Module Lifecycle Flow & States

A module transitions through the following stages:

```
CREATED ➔ REGISTERED ➔ CONFIGURED ➔ INITIALIZED ➔ STARTED ➔ READY
```

On stopping, hooks execute in **reverse topological dependency order**:

```
READY ➔ STOPPING ➔ SHUTDOWN ➔ DISPOSED
```

If a lifecycle callback throws:

- The target module transitions to `FAILED`.
- The loader halts startup and executes a **rollback sequence** on all already-started modules in reverse order (transitioning them to `DISPOSED` cleanly), while the failed module retains its `FAILED` state for APM/logging diagnostics.

---

## 4. Controlled State Transitions

Module states are private to `ModuleDescriptor` and modified only through `transitionTo(targetState)`. Bypassing paths (e.g. transitioning directly from `CONFIGURED` to `READY`) violates validation rules and throws `ModuleStateTransitionError`.
