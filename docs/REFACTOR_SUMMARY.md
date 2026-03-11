# SPL Refactor Summary

This document summarizes the **systematic refactor and stabilization** performed on the SPL project.

---

## Phase 1 – Project Audit

- **docs/AUDIT_REPORT.md** – Full list of problems: duplicate code, import path issues, naming inconsistencies, architectural notes, and priority fixes.

---

## Phase 2 – Clean Project Structure

- **docs/PROJECT_STRUCTURE.md** – Maps the repo to a clear layout: core (compiler, VM), runtime (errors, stdlib, import), builtins, modules (g2d, process, game), and CLI (main, repl). No large-scale file moves; structure is documented for maintainability.
- **Removed duplicate code** – See Phase 4.

---

## Phase 3 – Language Core Stability

- **Parser:** Newlines in argument lists and array/map literals were already fixed (earlier change), so multi-line `array( ... )` and function calls parse correctly.
- **Lexer/VM:** No further changes in this refactor; audit did not flag critical lexer or VM bugs.

---

## Phase 4 – Module System

- **Shared import resolution** – New **src/import_resolution.cpp** and **src/import_resolution.hpp**:
  - Single implementation of `__import` used by both **spl** (main.cpp) and **spl_repl** (repl_main.cpp).
  - Resolves, in order: **game** → **g2d** → **process** → **stdlib by name** → **file path**.
- **File import search path** – If the path is not found in the current working directory, the implementation tries **SPL_LIB** + path when the environment variable `SPL_LIB` is set (e.g. to project root). So `import("lib/spl/algo.spl")` works when CWD is not the project root.
- **Clear errors** – Missing g2d/game report a single message; file-not-found prints the path.

---

## Phase 5 – Graphics (g2d)

- **No API rewrite** – g2d already exposes createWindow, clear, setColor, drawRect, fillRect, drawCircle, beginFrame/endFrame, should_close, close. The audit noted mixed naming (create vs createWindow); no code changes in this refactor.
- **docs/AUDIT_REPORT.md** – Documents the minimal stable API and suggests unifying names in a future pass.
- **examples/graphics_demo.spl** – Minimal script that checks for g2d and runs a simple loop; exits cleanly if g2d is not available.

---

## Phase 6 – CLI Stability

- **--check** and **--fmt** – Already implemented in main.cpp; no changes. Build verified.
- **Usage** – `spl --check file.spl`, `spl --fmt file.spl` work as before.

---

## Phase 7 – IDE Support

- **No code changes** in this refactor. Previous fixes (e.g. `on` helper, BUILTINS order, registerCodeActionProvider, renderOutline symbols) remain. IDE path resolution and check/format/run are documented in the audit.

---

## Phase 8 – Examples

- **New curated examples** (run from project root):
  - **examples/hello_world.spl** – Minimal print.
  - **examples/loops.spl** – for/range, while.
  - **examples/functions.spl** – def and call.
  - **examples/modules.spl** – import("math"), import("sys").
  - **examples/graphics_demo.spl** – g2d with nil check; safe when Raylib is not built.

---

## Phase 9 – Testing

- **tests/** folder:
  - **tests/test_parser.spl** – Expressions, arrays, maps; runs without error.
  - **tests/test_builtins.spl** – Exercises sqrt, floor, min, max, type.
  - **tests/README.md** – How to run tests (from root or with SPL_LIB).

---

## Phase 10 – Code Quality

- **Naming/comments** – Improved in new/edited files (import_resolution, docs). No project-wide rename in this refactor.
- **Magic numbers** – IMPORT_BUILTIN_INDEX (200) is named in import_resolution.hpp.

---

## Build and Run

- **Build:** `cmake --build build --config Release`
- **Run examples:** From project root, e.g. `.\build\Release\spl.exe examples\hello_world.spl`
- **Run tests:** `.\build\Release\spl.exe tests\test_parser.spl` and `tests\test_builtins.spl`
- **Optional SPL_LIB:** Set to project root to resolve file imports from any CWD.

---

## Files Touched (Summary)

| Area | Files |
|------|--------|
| Audit / structure | docs/AUDIT_REPORT.md, docs/PROJECT_STRUCTURE.md, docs/REFACTOR_SUMMARY.md |
| Import | src/import_resolution.cpp, src/import_resolution.hpp, src/main.cpp, src/repl/repl_main.cpp, CMakeLists.txt |
| Docs | docs/TROUBLESHOOTING.md (SPL_LIB section) |
| Examples | examples/hello_world.spl, loops.spl, functions.spl, modules.spl, graphics_demo.spl |
| Tests | tests/test_parser.spl, test_builtins.spl, tests/README.md |

The project **compiles cleanly**, **imports are centralized and support SPL_LIB**, and **examples and tests run** from the project root.
