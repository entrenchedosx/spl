# SPL Project Structure

This document maps the repository layout to logical layers. The codebase is organized as follows.

## Directory layout

```
d:\simple_programming_language\
├── CMakeLists.txt          # Build: spl, spl_repl, spl_game (optional)
├── VERSION                 # Version string for --version and spl_version()
├── src/
│   ├── main.cpp            # CLI entry: run file, --check, --fmt, --ast, --bytecode, REPL fallback
│   ├── repl/
│   │   └── repl_main.cpp   # REPL entry (same VM + import as spl)
│   ├── compiler/           # Core: lexer, parser, codegen, AST, tokens
│   │   ├── lexer.cpp/.hpp
│   │   ├── parser.cpp/.hpp
│   │   ├── codegen.cpp/.hpp
│   │   ├── ast.hpp
│   │   └── token.hpp
│   ├── vm/                 # Core: interpreter and runtime
│   │   ├── vm.cpp/.hpp
│   │   ├── value.cpp/.hpp
│   │   ├── bytecode.hpp
│   │   ├── script_code.hpp
│   │   └── builtins.hpp    # All core builtins (single header)
│   ├── errors.cpp/.hpp     # Error reporting
│   ├── stdlib_modules.cpp/.hpp  # Virtual modules: math, sys, io, array, ...
│   ├── import_resolution.cpp/.hpp  # Shared __import (file + g2d + game + process + stdlib)
│   ├── process/
│   │   └── process_module.cpp/.hpp  # import("process")
│   ├── game/               # Graphics/game builtins (Raylib)
│   │   ├── game_main.cpp   # spl_game entry (no __import)
│   │   └── game_builtins.cpp/.hpp
│   └── modules/
│       └── g2d/            # import("g2d") – 2D graphics API
│           ├── g2d.cpp/.h
│           ├── window.cpp/.h, renderer.cpp/.h, shapes.cpp/.h, text.cpp/.h, colors.cpp/.h
├── lib/
│   └── spl/                # Standard library .spl modules (file-based import)
│       └── *.spl
├── examples/               # Example scripts
├── tests/                  # Test scripts (optional runner)
├── docs/                   # Documentation
└── spl-ide/                # Electron IDE
```

## Logical layers

| Layer        | Location              | Responsibility |
|-------------|------------------------|----------------|
| **Core**    | src/compiler/, src/vm/ | Lexer, parser, AST, codegen, VM, value types, core builtins |
| **Runtime** | src/errors.cpp, src/stdlib_modules.cpp, src/import_resolution.cpp | Error reporting, virtual stdlib modules, import resolution |
| **Builtins**| src/vm/builtins.hpp    | All core builtins (math, io, types, memory, etc.) |
| **Modules** | src/modules/g2d/, src/process/, src/game/ | g2d, process, game (Raylib) |
| **CLI**     | src/main.cpp, src/repl/repl_main.cpp | Entry points, argument parsing, run/check/fmt |

## Executables

- **spl** – Main CLI. Runs scripts, supports `--check`, `--fmt`, `--ast`, `--bytecode`. Has `__import` (stdlib, g2d, game, process, file). When built with Raylib, includes g2d and game.
- **spl_repl** – REPL. Same VM and import as spl.
- **spl_game** – Minimal game runner. Compiles and runs one script with game builtins only; no `__import`, no stdlib/process. Used when you want a single script with graphics only.

## Import resolution (import_resolution.cpp)

Used by both spl and spl_repl. Resolves in order:

1. **game** – C++ game module (if SPL_BUILD_GAME).
2. **g2d** – C++ 2D graphics module (if SPL_BUILD_GAME).
3. **process** – C++ process module.
4. **stdlib by name** – math, sys, io, array, etc. (virtual; see stdlib_modules.cpp).
5. **File path** – Tries path as-is, then `SPL_LIB` + path if env `SPL_LIB` is set. Use `import("lib/spl/algo.spl")` with CWD = project root, or set `SPL_LIB` to project root for file imports.

## Library and examples

- **lib/spl/** – User-facing .spl modules. Loaded via `import("lib/spl/...")` with correct CWD or `SPL_LIB`.
- **examples/** – Example scripts. Run with CWD = project root (or FINAL) so that `lib/spl` is available when examples use file imports.
