# @coreforge/runtime

The core execution host and process lifecycle controller of the CoreForge framework.

---

## 1. Responsibility

The Runtime is responsible for:

- Managing the application's process execution lifecycle.
- Orchestrating startup validation steps and executing the bootstrap phase sequence.
- Listening for and intercepting process signals (`SIGINT`, `SIGTERM`) to trigger graceful system shutdowns.
- Calculating active uptime status variables via a decoupled tracking clock (`RuntimeClock`).
- Providing an isolation boundary so low-level system events do not bleed into business applications.

---

## 2. State Machine

The runtime transitions through a strict, guarded set of execution states:

```
  CREATED
     │
     ▼
BOOTSTRAPPING
     │
     ▼
  STARTING
     │
     ▼
  RUNNING
     │
     ▼
  STOPPING
     │
     ▼
  STOPPED
```

_If an error is thrown at any step, the machine shifts to the `FAILED` state._

### Lifecycle Transition Guards

Concurrently calling `start()` or `stop()`, or calling invalid transitions (e.g. going from `CREATED` directly to `RUNNING`) will raise an execution guard exception. State changes are atomic and prevent promise interleaving.

---

## 3. Bootstrap Pipeline Phase Hooks

`BootstrapPipeline` coordinates the 10 core startup stages:

1. `LOAD_ENVIRONMENT`
2. `LOAD_CONFIGURATION`
3. `INITIALIZE_LOGGER`
4. `ASSEMBLE_CONTAINER`
5. `START_EVENT_BUS`
6. `DISCOVER_MODULES`
7. `REGISTER_MODULES`
8. `CONFIGURE_MODULES`
9. `INITIALIZE_MODULES`
10. `APPLICATION_READY`

### Registering Extensions

To integrate custom adapters, other packages hook into the pipeline during the registration phase:

```typescript
runtime.pipeline.registerHook(PipelinePhase.LOAD_CONFIGURATION, async () => {
  // Config parsing logic
});
```

---

## 4. Signal Handling Isolation

Process signal actions are decoupled into `ProcessSignalManager`. This isolates node-specific `process.on` calls so that runtime logic remains testable and host-independent.
