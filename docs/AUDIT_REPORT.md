# SPL Project Audit Report

**Date:** 2025-03  
**Purpose:** Systematic identification of problems before refactor (Phase 1).

---

## 1. Duplicate Implementations

- **Import handler:** The logic for `__import` (resolve "g2d", "game", "process", stdlib, file) is duplicated in `src/main.cpp` and `src/repl/repl_main.cpp`. Should be shared (e.g. `import_resolution.cpp` / single function).
- **toInt / toFloat / toString:** Repeated in `game_builtins.cpp`, `g2d.cpp`, and possibly elsewhere. Can be centralized in a small VM helper or value.hpp.
- **keyNameToRaylib:** Identical map in both `game_builtins.cpp` and `g2d.cpp`. Should live in one place (e.g. game_builtins or shared input helper).

---

## 2. Dead Code

- No entire C++ source files identified as unused. `spl_game` is intentionally minimal (no __import, no stdlib/process).
- Some example scripts may be obsolete or superseded (e.g. multiple "test_*.spl" with overlapping coverage).

---

## 3. Broken Functions / Runtime Errors

- **File-based import:** Resolves only relative to **current working directory**. Running `spl examples/foo.spl` from repo root works for `import("lib/spl/algo.spl")`; running from another directory fails. No `SPL_LIB` or executable-relative search path.
- **g2d/game when Raylib not found:** Build succeeds with SPL_BUILD_GAME=ON but without Raylib; g2d/game are not linked. `import("g2d")` then returns nil and scripts may not check, leading to "nil method call" at runtime.
- **spl_game:** Does not register `__import`, stdlib, or process. Scripts that use `import("math")` or file imports cannot run under spl_game.

---

## 4. Inconsistent Naming

- **g2d:** Both `create` and `createWindow`, `close` and `closeWindow`, `should_close` and `is_open` / `isOpen`. Mixed snake_case and camelCase.
- **Game builtins:** `window_create` vs g2d's `createWindow`. Same functionality, different naming.
- **Stdlib virtual modules:** Names like "math", "sys", "io" are consistent; "readFile" vs "read_file" in io module (aliases exist but naming is mixed).

---

## 5. Missing Includes / Imports

- All C++ includes appear correct. No missing module references for which a file is expected: g2d/game/process are C++; stdlib is virtual; lib/spl/*.spl files exist when referenced.

---

## 6. Files in Wrong Folders

- Current layout is acceptable: `src/compiler/`, `src/vm/`, `src/game/`, `src/modules/g2d/`, `src/process/`, `src/repl/`. Optional improvement: group under logical names (e.g. core, builtins, modules, cli) without breaking CMake.
- `lib/spl/` and `examples/` are in the right place. Tests could be moved or added under `tests/`.

---

## 7. Modules Referenced but Not Implemented

- All referenced C++/virtual modules are implemented (g2d, game, process, math, sys, io, etc.). File-based `import("lib/spl/...")` requires correct CWD.

---

## 8. Example Scripts That Fail

- **Not run in audit** (read-only). Known failure modes:
  - Any example using `import("lib/spl/...")` when CWD is not project root or FINAL.
  - Graphics examples (e.g. `graphics_test.spl`, `2dgraphics_*.spl`) when build is without Raylib.
  - `process_read_demo.spl` may fail on permissions or missing target process.
- **Expect non-zero exit:** `error_demo_bad.spl`, `error_demo_runtime.spl`, `exit_code_*.spl` (by design).

---

## 9. Runtime Crashes / Memory Safety

- No obvious use-after-free or buffer overflows identified from code review. VM and codegen use shared_ptr for values. Potential areas: ensure g2d/game null checks on window not created; ensure no use of destroyed Raylib handles.

---

## 10. Interpreter / Compiler Errors

- Parser: Newlines in argument lists caused "Expected expression" (fixed in prior change: newlines skipped in argumentList and array/map literals).
- IDE: Previous fixes for `on` not defined, `BUILTINS` before init, `registerCodeActionProvider`, `getCachedSymbols` scope.

---

## 11. Architectural Inconsistencies

- **spl vs spl_repl vs spl_game:** spl and spl_repl share full import and stdlib; spl_game is graphics-only, no import. Documented but can confuse users.
- **Import resolution:** CWD-only for file paths; no standard library path from executable location.
- **Builtins:** Single large `builtins.hpp`; could be split for maintainability (optional).

---

## 12. IDE Tooling

- Path resolution for `spl` executable is fallback-based (packaged, FINAL, build/Release, PATH). Format and check use `--fmt` and `--check`; behavior correct when spl is found.
- Snippets and syntax in renderer.js; previous fixes applied. No VSCode extension or tasks.json was audited in detail.

---

## Summary: Priority Fixes

1. **Centralize import resolution** (main + repl) to one place.
2. **File import path:** Add optional search path (e.g. `SPL_LIB` env or executable-relative `lib/`) so examples work regardless of CWD.
3. **g2d:** Unify naming to a single minimal API (e.g. createWindow, clear, setColor, drawRect, fillRect, drawCircle, run); add null checks.
4. **Examples:** Add a small set of guaranteed-working examples (hello_world, loops, functions, modules, graphics_demo) and document CWD/build requirements.
5. **Tests:** Add `tests/` with runner and basic parser/interpreter/builtin tests.
6. **Documentation:** PROJECT_STRUCTURE.md mapping src/ to logical layers (core, builtins, modules, cli).
