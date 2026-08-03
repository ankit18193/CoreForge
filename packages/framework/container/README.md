# @coreforge/container

A lightweight, high-performance, explicit constructor dependency injection container for CoreForge.

---

## 1. Container Architecture

The DI Container follows the **Registry-Resolver** architectural pattern to divide metadata storage from recursive graph resolution:

```
                  ┌───────────────┐
                  │   Container   │ (Façade API)
                  └──────┬────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌────────────────┐              ┌────────────────┐
│ServiceRegistry │              │ServiceResolver │
└────────────────┘              └────────────────┘
(Metadata & Cache)              (Graph Traversal)
```

- **`Container`:** The public façade that coordinates class/value/factory registrations.
- **`ServiceRegistry`:** Stores descriptors and holds singleton instances (caching is tied to descriptors).
- **`ServiceResolver`:** Stateless component navigating the dependency tree recursively.
- **`ResolutionContext`:** Passed during a resolve run to check recursive paths and log dependency traces.

---

## 2. Registration Flow

Services are registered using class constructor types, factory functions, or constant value instances. The registry handles duplicate keys (throwing `DuplicateRegistrationError` unless configured with `overwrite: true`).

```typescript
// Class Registration with explicit dependencies
container.register({
  token: 'Repository',
  useClass: DatabaseRepository,
  dependencies: ['Database'],
  lifetime: ServiceLifetime.SINGLETON,
});

// Shortcut helper
container.registerSingleton('Database', Database);
```

---

## 3. Resolution Flow

When calling `container.resolve(token)`, the flow executes:

```
  Resolve(Token)
        │
        ▼
Push to ResolutionContext Stack
(throws CircularDependencyError on loop)
        │
        ▼
   Get Descriptor from Registry
        │
        ▼
  If Singleton & Cached -> Return
        │
        ▼
Instantiate dependencies recursively ➔ Construct Object
        │
        ▼
Pop ResolutionContext Stack ➔ Return Instance
```

---

## 4. Lifetime Management

- **Singleton:** One shared instance constructed once per container run and cached in `ServiceRegistry`.
- **Transient:** Fresh constructor executions on every `resolve()` call.
- **Scoped:** Abstraction placeholder (currently resolves as singleton per context) preparing the DI graph for scoped request contexts.

---

## 5. Circular Dependency Strategy

Before resolving a token, it is pushed onto the active `ResolutionContext` stack. If the stack already contains the token, it halts execution and raises a `CircularDependencyError` presenting the traversal trace (e.g. `Circular dependency detected: A -> B -> C -> A`).

---

## 6. Future Extension Points

- **Decorators & Reflection:** Metadata parsers will hook into registrations, scanning class prototypes to automatically populate the `dependencies` list.
- **Child Containers & Request Scopes:** The stateless `ServiceResolver` coupled with `ResolutionContext` allows creating child contexts that fallback on parent registries for dependency inheritance.
