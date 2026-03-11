# SPL Advanced Features Roadmap

This document organizes requested runtime, tooling, and language features by category and implementation phase.

---

## 1. Advanced Runtime / Execution

| Feature | Phase | Notes |
|--------|-------|--------|
| **Hot Module Replacement (HMR)** | 2 | Reload modules without restart. Needs module registry and recompile/reload; fits REPL/live coding. |
| **Lazy Evaluation** | 2 | `lazy expr` → thunk; VM value type or wrapper that evaluates on first access. |
| **JIT Compilation** | 3 | Compile hot paths to native code; requires JIT backend (e.g. LLVM or custom). |
| **Runtime Profiling** | 1 | VM cycle counter, function timings, optional `profile_start`/`profile_stop` builtins. |
| **Memory Snapshots / Checkpoints** | 2 | Serialize heap/globals for restore; simplified version for REPL state. |
| **GC Tuning** | 2 | Currently ref-counted (`shared_ptr`); optional incremental/generational or manual control if GC is added. |

---

## 2. Developer Ergonomics

| Feature | Phase | Notes |
|--------|-------|--------|
| **Intelligent Autocomplete / AI Suggestions** | 2 | IDE/LSP: suggest names, calls, snippets from AST/symbol table. |
| **Code Linter / Formatter** | 1–2 | Linter: AST pass for style/warnings. Formatter: pretty-print or style rules. |
| **Integrated Documentation** | 2 | Hover docs, param hints; requires symbol → doc mapping (e.g. comments, annotations). |
| **Inline Unit Testing** | 2 | Annotate with `@test` or `test "name":`; run in REPL or test runner. |

---

## 3. Advanced Data Handling

| Feature | Phase | Notes |
|--------|-------|--------|
| **Streams** | 2 | Iterator-like protocol; `for line in stream` with lazy/pull-based reading. |
| **Reactive / Observables** | 3 | Auto-update dependents; needs dependency tracking and update propagation. |
| **Custom Iterators** | 2 | Protocol for `for x in obj`: e.g. `iterator()` method or well-known symbol. |

---

## 4. Parallelism / Concurrency

| Feature | Phase | Notes |
|--------|-------|--------|
| **Coroutines** | 2 | Yield/resume; VM support for suspended frames and scheduler. |
| **Futures / Promises** | 2 | Async tasks; event loop or thread pool + safe VM invocation. |
| **Parallel Collections** | 3 | map/filter/reduce on threads; thread-safe VM or worker model. |
| **Actor Model** | 3 | Message passing; new concurrency model and runtime. |

---

## 5. Meta-programming / Reflection

| Feature | Phase | Notes |
|--------|-------|--------|
| **Dynamic Code Execution** | 1 | `eval("let x = 5")`; builtin that compiles and runs in current VM scope. |
| **Compile-time Reflection** | 2 | Inspect types/classes/functions during compilation; compiler plugin or API. |
| **Decorators & Function Wrappers** | 2 | Wrap functions/classes at definition time; AST or runtime wrapper. |
| **Macros** | 3 | Code that runs at compile time and produces AST. |
| **AST Manipulation** | 2 | Expose AST to scripts or tools; safety and API design. |

---

## 6. Advanced OOP

| Feature | Phase | Notes |
|--------|-------|--------|
| **Traits / Mixins** | 2 | Reusable behavior; composition in classes. |
| **Property Observers** | 2 | `onChange` on fields; intercept SET_FIELD in VM or codegen. |
| **Method Missing / Dynamic Dispatch** | 2 | Hook for undefined method calls; fallback handler. |

---

## 7. Pattern Matching & Destructuring

| Feature | Phase | Notes |
|--------|-------|--------|
| **Match guards** | 1 | `case x if x > 10 =>`; optional guard expression per case. |
| **Array/tuple patterns** | 2 | `[1, 2, *_]`; extend match codegen for array patterns and rest. |
| **Conditional destructuring** | 1 | Same as guards; match on value + condition. |

---

## 8. Graphics & Multimedia (Optional)

| Feature | Phase | Notes |
|--------|-------|--------|
| **2D/3D Drawing API** | 3 | `draw_line`, `draw_circle`, etc.; bindings to SDL/Skia or similar. |
| **Event Handling** | 3 | `on_key_press`, `on_mouse_click`; event loop integration. |
| **Game Loop** | 3 | Update/render callbacks, timers; framework layer. |

---

## 9. Networking & External Integration

| Feature | Phase | Notes |
|--------|-------|--------|
| **Sockets (TCP/UDP)** | 2 | Bindings to OS sockets; async or blocking API. |
| **HTTP / REST Client** | 2 | `http_get`, `http_post`; use libcurl or similar. |
| **WebSocket** | 2 | Real-time; library binding. |

---

## 10. AI / Data Science

| Feature | Phase | Notes |
|--------|-------|--------|
| **Tensor & Matrix Ops** | 3 | High-level math; bindings or pure SPL. |
| **Vectorized Operations** | 2 | Array ops without explicit loops; builtins or SIMD. |
| **Random / Probabilistic** | 1–2 | Weighted sampling, Monte Carlo; extend `random()` builtin. |
| **Mini ML Library** | 3 | Regression, classification, simple NNs; SPL or native. |

---

## 11. Security & Sandboxing

| Feature | Phase | Notes |
|--------|-------|--------|
| **Sandboxed Execution** | 2 | Disable unsafe ops (file, network, alloc); flags or policy. |
| **Resource Limits** | 2 | CPU time, memory, execution steps; VM counters and limits. |
| **Safe File I/O** | 2 | Restrict paths; allowlist of directories. |

---

## Phase Legend

- **Phase 1**: Quick win or foundation; can be done with current codebase.
- **Phase 2**: Medium effort; needs design and some VM/compiler changes.
- **Phase 3**: Large or research; new runtime, JIT, or external deps.
- **Phase 4**: Futuristic / research; novel systems, AI integration, or experimental.

---

## Ultra-Advanced / Futuristic Roadmap

### 1. Ultra-Advanced Runtime

| Feature | Phase | Notes |
|--------|-------|--------|
| **Speculative Execution** | 4 | Predict branches, execute ahead; requires JIT + speculation and rollback. |
| **Adaptive Optimization** | 4 | Profile-driven recompilation; JIT with deopt and tiered compilation. |
| **Hot Patch / Live Update** | 3–4 | Patch running code without restart; multi-thread-safe patching is very hard. |
| **Automatic Parallelization** | 4 | Detect independent loop iterations; compiler + runtime parallel execution. |

### 2. AI & Smart Programming

| Feature | Phase | Notes |
|--------|-------|--------|
| **AI Code Completion** | 2–3 | Context-aware suggestions; LSP + LLM or local model integration. |
| **Automatic Refactoring Suggestions** | 2 | IDE suggests syntax/style/performance fixes; AST analysis or AI. |
| **Code Explanation / Doc Generator** | 2 | Hover or command explains code; AST + templates or LLM. |
| **Automated Test Generation** | 3 | Generate unit tests from signatures; property-based or AI. |

### 3. Data & Computation Enhancements

| Feature | Phase | Notes |
|--------|-------|--------|
| **Immutable Data Streams** | 3 | Reactive streams with auto-update; dependency graph + propagation. |
| **Lazy Collections** | 2 | Compute on access; iterator/thunk wrappers, possibly in VM. |
| **Time-Travel Debugging** | 3–4 | Replay or checkpoint state; persistent structures or event log. |
| **Persistent Data Structures** | 3 | Copy-on-write snapshots; structural sharing, rollback support. |

### 4. Parallelism & Distributed Computing

| Feature | Phase | Notes |
|--------|-------|--------|
| **Cluster Execution** | 4 | Run SPL across machines; distributed runtime, RPC, fault tolerance. |
| **Distributed Arrays / Maps** | 4 | Data split across nodes; unified API, consistency model. |
| **Actor Model** | 3 | Objects as actors; message passing, scheduler, isolation. |
| **GPU Acceleration** | 3–4 | Offload array/math to GPU; CUDA/Metal/OpenCL or compute shaders. |

### 5. Developer Experience / IDE Integration

| Feature | Phase | Notes |
|--------|-------|--------|
| **Smart REPL** | 2 | Predictive, AI-driven suggestions; integrate with completion API. |
| **Inline Visualizations** | 2–3 | Plot graphs, arrays, objects in IDE; data view + chart lib. |
| **Version-aware SPL Execution** | 2 | Run with specific runtime version; embedded version or container. |
| **Project-wide Refactoring** | 2 | Rename symbols globally; LSP + workspace edits, update imports. |

### 6. Meta-Programming / Self-Modification

| Feature | Phase | Notes |
|--------|-------|--------|
| **Compile-time Reflection** | 3 | Inspect/generate/modify code before runtime; compiler plugin API. |
| **AST Macros** | 3 | Code that writes code at compile time; macro expander, hygiene. |
| **Dynamic Language Features** | 2 | Add methods/fields at runtime; method_missing, expandable objects. |
| **Self-Healing Code** | 3 | Warnings suggest fixes for illegal ops; analysis + quick fixes. |

### 7. Security & Isolation

| Feature | Phase | Notes |
|--------|-------|--------|
| **Sandboxed Execution** | 2 | Isolated, memory-safe run; disable unsafe builtins, optional VM cage. |
| **Resource Caps** | 1–2 | CPU, RAM, step limits; VM step limit implemented as foundation. |
| **Secure Networking** | 2 | TLS/HTTPS, safe sockets; library bindings, firewall-aware APIs. |

### 8. Next-Level I/O

| Feature | Phase | Notes |
|--------|-------|--------|
| **Live Data Streams** | 2–3 | Consume live feeds (sensor, network, file); async + backpressure. |
| **Serialization** | 1–2 | JSON, XML, YAML, CSV, binary; builtins or stdlib. |
| **Persistent Memory** | 3 | Transparent persist to disk/DB; object store or ORM-like layer. |

### 9. Graphics, Games & Interactive Media

| Feature | Phase | Notes |
|--------|-------|--------|
| **2D / 3D Rendering API** | 3 | draw_line, draw_circle, sprites; bindings to SDL/Skia/OpenGL. |
| **Event-driven Game Loop** | 3 | update() / render() callbacks; frame timing, input. |
| **Physics Utilities** | 3 | Vectors, collision, gravity; library or builtin math. |
| **Sound API** | 2–3 | Play/stop audio; platform binding (e.g. SDL_mixer). |

### 10. Futuristic / Experimental

| Feature | Phase | Notes |
|--------|-------|--------|
| **Voice / Gesture Input** | 4 | Microphone, motion sensors; platform APIs, recognition. |
| **AR Extensions** | 4 | Render in real-world coordinates; AR framework integration. |
| **Embedded AI Agents** | 4 | Spawn bots/assistants inside SPL; agent runtime, tool use. |
| **Neural Network Primitives** | 4 | Train NNs in SPL; autodiff, tensor ops, or bindings. |
| **Quantum Simulation Mode** | 4 | Quantum-like ops for research; simulation or backend. |

---

## Implemented in This Pass

- **Match guards**: `case x if x > 10 =>` (optional guard expression).
- **Runtime profiling**: VM cycle counter; `profile_cycles()` returns cycles since last run, `profile_cycles(1)` resets and returns.
- **Resource caps (foundation)**: Optional VM step limit; host can set a max instruction count per run for safe execution.

**Using the step limit (resource cap):** Before calling `vm.run()`, the host sets `vm.setStepLimit(n)` with `n > 0`. When the VM executes more than `n` instructions in that run, it throws `VMError("Step limit exceeded", line)`. Use `setStepLimit(0)` to disable. Example (in C++ host): `vm.setStepLimit(1000000); vm.run();`

---

## See also

- [GETTING_STARTED.md](GETTING_STARTED.md) – Build and run SPL today.
- [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md), [SPL_GAME_API.md](SPL_GAME_API.md) – Current graphics and game APIs.
