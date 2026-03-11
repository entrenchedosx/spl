# SPL — Simple Programming Language

This repository contains the full source code, documentation, and tooling for **SPL** (Simple Programming Language): interpreter, standard library, examples, tests, and the SPL IDE.

## Contents

| Path | Description |
|------|-------------|
| **src/** | Interpreter (C++17): lexer, parser, codegen, VM, builtins, g2d/game/process modules |
| **lib/spl/** | Standard library (.spl modules) |
| **examples/** | Example SPL scripts (hello, variables, loops, graphics, bouncy ball, etc.) |
| **tests/** | Test scripts and runner |
| **docs/** | Language docs, APIs, getting started, troubleshooting |
| **spl-ide/** | Electron-based IDE (Monaco editor, run/check/fmt, terminal) |
| **build.ps1** | Windows: build interpreter + IDE, create installer |
| **installer.nsi** | NSIS script for Windows installer |
| **spl_for_dummies.txt** | Introductory SPL guide |

## Quick start

### Build the interpreter (Windows)

```powershell
.\build.ps1
```

Options: `-SkipIDE`, `-SkipInstaller`, `-NoGame`. Output: `BUILD\` (binaries, modules, examples, installer).

### Build the interpreter (CMake, any OS)

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

With Raylib (g2d/game): set `-DSPL_BUILD_GAME=ON` and provide Raylib (e.g. vcpkg). See **docs/GETTING_STARTED.md**.

### Run a script

```bash
# From repo root so examples can find lib/spl
./build/Release/spl examples/01_hello.spl
# or after build.ps1:
./BUILD/bin/spl.exe examples/01_hello.spl
```

### SPL IDE

```bash
cd spl-ide
npm install
npm start
```

Packaging: `npm run build:win` (or use `build.ps1` from repo root to build IDE into `BUILD`).

## Documentation

- **docs/GETTING_STARTED.md** — Prerequisites, build, first script, REPL
- **docs/LANGUAGE_OVERVIEW.md** — Language overview and features
- **docs/CLI_AND_REPL.md** — Command-line and REPL usage
- **docs/PROJECT_STRUCTURE.md** — Codebase layout
- **docs/TROUBLESHOOTING.md** — Common issues (e.g. SPL_LIB, imports)
- **docs/README.md** — Full doc index

## License

See repository license file (if present). SPL IDE uses MIT; interpreter and docs follow project terms.
