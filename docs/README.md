# SPL Documentation Index

All official documentation for **SPL (Simple Programming Language)**. Start with **Start here** for build, syntax, and stdlib; use **APIs and libraries** for game, 2dgraphics, and low-level memory.

**Fully integrated:** Every builtin is available globally and via stdlib modules (`import "math"`, `import "io"`, `import "path"`, etc.). The SPL IDE and VS Code (snippets, tasks, grammar) support the full language.

**I only write SPL (not C++):** See [**SPL_ONLY_GUIDE.md**](SPL_ONLY_GUIDE.md) — what’s implemented, how to run (spl / spl_repl / spl_game), and where each feature is documented.

---

## Start here

| Document | Purpose |
|----------|---------|
| [**LANGUAGE_OVERVIEW.md**](LANGUAGE_OVERVIEW.md) | Why SPL is advanced: multi-paradigm, hybrid syntax, stdlib, low-level, graphics. |
| [**SPL_ONLY_GUIDE.md**](SPL_ONLY_GUIDE.md) | SPL-only developers: run commands, doc map, quick reference. |
| [**GETTING_STARTED.md**](GETTING_STARTED.md) | Install, build, first script, spl / spl_repl / spl_game, modules. |
| [**language_syntax.md**](language_syntax.md) | Full syntax: variables, types, control flow, functions, classes, operators, modules. |
| [**standard_library.md**](standard_library.md) | Built-ins and stdlib modules (`import "math"`, etc.). |

---

## APIs and libraries

| Document | Purpose |
|----------|---------|
| [**SPL_GAME_API.md**](SPL_GAME_API.md) | Game runtime (Raylib): window, draw, input, sound, camera, game loop. **spl** or **spl_game**. |
| [**SPL_2DGRAPHICS_API.md**](SPL_2DGRAPHICS_API.md) | 2dgraphics: `import "2dgraphics"` — window, primitives, sprites, text, camera. **spl** / **spl_repl**. |
| [**SPL_ADVANCED_GRAPHICS_API.md**](SPL_ADVANCED_GRAPHICS_API.md) | Advanced graphics spec (future gfx): layers, shaders, particles, tilemaps. |
| [**LOW_LEVEL_AND_MEMORY.md**](LOW_LEVEL_AND_MEMORY.md) | Pointers, alloc/free, peek/poke, mem_copy, realloc, alignment. |
| [**SPL_UNIQUE_SYNTAX_AND_LOW_LEVEL.md**](SPL_UNIQUE_SYNTAX_AND_LOW_LEVEL.md) | SPL’s mix of Python/JS/C++/Rust/Go and low-level memory. |

---

## Language design

| Document | Purpose |
|----------|---------|
| [**SPL_HYBRID_SYNTAX.md**](SPL_HYBRID_SYNTAX.md) | Multi-language hybrid: which syntax styles (Python, JS, C++, Rust, Go) are supported. |
| [**ROADMAP.md**](ROADMAP.md) | Future plans: runtime, ergonomics, graphics, security, phases. |

---

## Examples and reference

| Document | Purpose |
|----------|---------|
| [**QUICK_REFERENCE.md**](QUICK_REFERENCE.md) | One-page cheat sheet: run, CLI, types, collections, I/O, modules, testing. |
| [**EXAMPLES_INDEX.md**](EXAMPLES_INDEX.md) | All example scripts: description, runner (spl / spl_game), categories. |
| [**TESTING.md**](TESTING.md) | Test suite: run_all_tests.ps1, build_FINAL.ps1 test/skip behavior. |
| [**TROUBLESHOOTING.md**](TROUBLESHOOTING.md) | Common issues: build, import, undefined variable, cli_args, game/2dgraphics, REPL. |
| [**GLOSSARY.md**](GLOSSARY.md) | Terms: AST, bytecode, VM, builtin, module, spl/spl_repl/spl_game. |
| [**ADVANCED_ERROR_HANDLING.md**](ADVANCED_ERROR_HANDLING.md) | Error categories, stack traces, try/catch, panic. |

---

## Project

| Document | Purpose |
|----------|---------|
| [**PROJECT_STRUCTURE.md**](PROJECT_STRUCTURE.md) | Repo layout, source tree, build targets. |
| [**CLI_AND_REPL.md**](CLI_AND_REPL.md) | Command line: `spl script.spl`, `--ast`, `--bytecode`, REPL, exit codes. |
| [**HOW_TO_CODE_SPL.md**](HOW_TO_CODE_SPL.md) | How to write SPL code and use the language. |

---

## Quick reference

- **Run:** `spl script.spl` · **REPL:** `spl_repl` · **Game:** `spl_game script.spl`
- **Import:** `import "math"`, `import "2dgraphics"` (when built with Raylib), `import "game"`
- **Build (with Raylib/game):** `.\build_FINAL.ps1` (Windows). Use `-NoGame` to build without.
- **Examples:** [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) · **Tests:** [TESTING.md](TESTING.md) · **Problems:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md) · **Terms:** [GLOSSARY.md](GLOSSARY.md)
