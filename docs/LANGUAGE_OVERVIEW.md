# SPL: An Advanced Programming Language

SPL is a **serious, multi-paradigm programming language** with a modern design, a rich standard library, and the flexibility to go from high-level scripting to low-level control. It is built to be both **approachable** and **powerful**—suitable for learning, prototyping, tools, games, and systems-style code.

---

## What makes SPL advanced

### 1. Multi-paradigm design

- **Imperative** – Variables, loops, procedures; C-style `for`, `while`, `break`/`continue`, loop labels.
- **Functional** – First-class functions, lambdas `(x, y) => x + y`, `map`/`filter`/`reduce`/`flat_map`/`flatten`/`zip`/`chunk`/`sort_by`, immutability via `freeze` and `copy`.
- **Object-oriented** – Classes, `constructor`, `this`, inheritance with `extends`, methods and overrides.
- **Data-oriented** – Pattern matching with `match`/`case`, guards (`case x if x > 10 =>`), destructuring in match and in assignment (`let [a, b] = arr`; `let { x, y } = map`).

You can mix styles in one codebase: procedural game loops, functional data pipelines, and class-based entities in the same project.

---

### 2. Hybrid syntax (polyglot)

SPL deliberately combines the best syntax ideas from several languages so you can write in the style that fits:

- **Variables:** `let` / `var` / `const`; optional type hints: `let x: int = 10` or `int x = 10`.
- **Functions:** `def name(params) { }` or `def name(params): expr`; default and **named arguments**; arrow functions `(x) => x * 2`.
- **Control flow:** Braces `if (cond) { }` or Python-style `if cond: stmt`; `match value { case 1 => ... case _ => ... }`.
- **Loops:** `for i in range(0, n)`, `for i in 1..10`, `for i in 1..100 step 5`, C-style `for (let i = 0; i < n; i++)`, `for x in array`, `for key, value in map`.
- **Literals:** Numeric separators `1_000_000`, `0xFF_FF`; time literals `2s`, `500ms`; f-strings `f"Hello {name}!"`; multi-line strings.

See [SPL_HYBRID_SYNTAX.md](SPL_HYBRID_SYNTAX.md) for the full matrix.

---

### 3. Modern ergonomics

- **Multiple return values:** `return a, b` returns `[a, b]`; receive with `let [q, r] = divide(10, 3)`.
- **Optional chaining:** `obj?.prop` — no crash if `obj` is null.
- **Null coalescing:** `a ?? b` — use `b` when `a` is null or false.
- **Safe optional indexing:** `arr?[i]` — null if array is null, else element (or null if out of bounds).
- **Defer:** `defer { cleanup() }` runs when leaving scope (after return or end of block); reverse order (last defined runs first).
- **Try/catch/finally** and **throw** with values; **assert** with optional message.
- **Range and step:** `1..10`, `1..100 step 5` in loops and as values.

These features reduce boilerplate and make robust, readable code the default.

---

### 4. Rich standard library

Hundreds of built-in functions, organized by domain:

- **I/O & debug:** `print`, `inspect`, `type`, `dir`.
- **Math:** `sqrt`, `pow`, `sin`/`cos`/`tan`, `floor`/`ceil`/`round`, `abs`, `log`, `atan2`, `min`/`max`/`clamp`/`lerp`, `PI`, `E`.
- **Collections:** `array`, `len`, `push`/`push_front`, `slice`, `keys`/`values`/`has`, `copy`/`freeze`, `deep_equal`; **combinators:** `map`, `filter`, `reduce`, `flat_map`, `flatten`, `zip`, `chunk`, `unique`, `reverse`, `find`, `sort`/`sort_by`, `first`/`last`, `take`/`drop`, `cartesian`, `window`.
- **Strings:** `upper`/`lower`, `replace`, `join`/`split`, `trim`, `starts_with`/`ends_with`, `repeat`, `pad_left`/`pad_right`, `split_lines`, `format`, `regex_match`/`regex_replace`.
- **File system:** `read_file`/`write_file`, `fileExists`, `listDir`/`listDirRecursive`, `create_dir`, `is_file`/`is_dir`, `copy_file`/`delete_file`/`move_file`.
- **Time:** `time()`, `sleep(seconds)`.
- **JSON:** `json_parse`, `json_stringify`.
- **Random:** `random`, `random_int`, `random_choice`, `random_shuffle`.
- **System:** `cli_args`, `env_get`, `panic`, `Error`, `stack_trace`, `assertType`.
- **Reflection:** `type(x)`, `dir(x)`.
- **Profiling:** `profile_cycles`, `profile_fn`.

**Modules:** Built-in library modules for namespaced access: `import "math"`, `import "string"`, `import "json"`, `import "random"`, `import "sys"`, `import "io"`, `import "array"`, `import "map"`, `import "env"`, `import "types"`, `import "debug"`, `import "log"`, `import "time"`, `import "memory"`, `import "util"`, `import "profiling"`, `import "path"`, `import "errors"`, `import "iter"`, `import "collections"`, `import "fs"`. See [standard_library.md](standard_library.md).

---

### 5. Low-level control

When you need to go under the hood, SPL does not hide the machine:

- **Pointers:** `alloc(n)`, `free(ptr)`, `ptr_address`, `ptr_from_address`, `ptr_offset`, pointer arithmetic `ptr + n`, `ptr - n`.
- **Memory read/write:** `peek8`–`peek64`, `poke8`–`poke64`; `peek_float`/`poke_float`, `peek_double`/`poke_double`.
- **Block operations:** `mem_copy`, `mem_set`, `mem_cmp`, `mem_move`.
- **Resize:** `realloc(ptr, size)`.
- **Alignment:** `align_up`/`align_down`, `ptr_align_up`/`ptr_align_down`.
- **Volatile access:** `memory_barrier`, `volatile_load8`–`volatile_load64`, `volatile_store8`–`volatile_store64` for hardware or concurrency.

See [LOW_LEVEL_AND_MEMORY.md](LOW_LEVEL_AND_MEMORY.md). This makes SPL suitable for learning systems concepts, FFI preparation, or high-performance hot paths.

---

### 6. Graphics and games

- **2D graphics module** (`import "2dgraphics"`): Window, render loop, primitives (rect, circle, polygon, line), text and fonts, images and sprites (sprite sheets, animation), input (keyboard, mouse), camera, color helpers. See [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md).
- **Game API** (`import "game"` or global with `spl_game`): Window, drawing, keyboard/mouse/gamepad, sound, collision, camera, game loop, input binding. See [SPL_GAME_API.md](SPL_GAME_API.md).
- **Advanced Graphics API (design):** Full spec for a future `gfx` module: layers, transforms, vector paths, gradients, blend modes, custom shaders, batching, particles, tilemaps, masking, post-processing. See [SPL_ADVANCED_GRAPHICS_API.md](SPL_ADVANCED_GRAPHICS_API.md).

Built with Raylib when `SPL_BUILD_GAME=ON`; one language from script to game.

---

### 7. Solid implementation

- **Compilation pipeline:** Lexer → parser → AST → bytecode; clear separation of front-end and VM.
- **Bytecode VM:** Stack-based execution, locals, globals, call frames, builtin dispatch by index.
- **Error reporting:** Line/column, categories, hints; respects `NO_COLOR`.
- **REPL:** Full language and modules in an interactive session (`spl_repl`).
- **Testing:** Test runner over example scripts; optional skip lists and timeouts for graphics/game.

The codebase is structured for extension: new builtins, new syntax, new bytecode opcodes are documented and follow consistent patterns.

---

### 8. Clear documentation and roadmap

- **Docs index** ([README.md](README.md) in docs): Start here, APIs, language design, roadmaps, examples, troubleshooting, glossary.
- **SPL-only guide:** [SPL_ONLY_GUIDE.md](SPL_ONLY_GUIDE.md) confirms that everything in the docs is implemented (or marked as design) and how to run it.
- **Syntax, stdlib, game, 2dgraphics, memory, advanced gfx:** Each has a dedicated reference.
- **Roadmaps:** Language/runtime, performance, game features, IDE—so the direction of the language is explicit.

---

## Summary

SPL is an **extremely advanced** language in the sense that it:

- Supports **multiple paradigms** (imperative, functional, OOP, data-oriented) in one language.
- Offers **modern ergonomics** (multiple returns, optional chaining, null coalescing, defer, pattern matching, ranges).
- Provides a **rich, batteries-included standard library** and **modules**.
- Exposes **low-level control** (pointers, peek/poke, mem_*, volatile) when needed.
- Integrates **graphics and game** APIs and has a **designed advanced graphics API** for the future.
- Uses a **hybrid syntax** that feels familiar from Python, JavaScript, C++, Rust, and Go.
- Is **well documented** and **implemented** with a clear pipeline and extension points.

Whether you are learning programming, building a game, writing a tool, or exploring low-level concepts, SPL is designed to be a **very good** choice: one language that scales from scripts to systems.

---

## See also

- [language_syntax.md](language_syntax.md) – Full syntax reference
- [standard_library.md](standard_library.md) – All builtins and modules
- [SPL_HYBRID_SYNTAX.md](SPL_HYBRID_SYNTAX.md) – Syntax style matrix
- [ROADMAP.md](ROADMAP.md) – Future plans and features
- [GETTING_STARTED.md](GETTING_STARTED.md) – Build and run
- [SPL_ONLY_GUIDE.md](SPL_ONLY_GUIDE.md) – For SPL-only developers
