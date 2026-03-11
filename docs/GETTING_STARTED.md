# Getting Started with SPL

This guide gets you from zero to running SPL scripts and using the REPL, game, and 2dgraphics modules.

**Why SPL?** SPL is an **advanced, multi-paradigm** language with modern syntax, a rich standard library, low-level control when needed, and optional graphics and game APIs. See [LANGUAGE_OVERVIEW.md](LANGUAGE_OVERVIEW.md).

**If you only write SPL (not C++):** See [SPL_ONLY_GUIDE.md](SPL_ONLY_GUIDE.md) for a confirmation that everything in the docs is implemented and a quick table of what to run (spl / spl_repl / spl_game) for each feature.

---

## 1. Build the project

### Prerequisites

- **C++17** compiler (e.g. MSVC, GCC, Clang)
- **CMake** 3.14 or later
- **Raylib** (optional, only for game and 2dgraphics)

### Build without game support (core only)

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

You get:

- **spl** – run scripts and use `import "math"`, `import "string"`, etc.
- **spl_repl** – interactive REPL with the same modules.

### Build with game and 2dgraphics (Raylib)

**Option A – vcpkg (recommended)**

```bash
vcpkg install raylib
cmake -B build -DSPL_BUILD_GAME=ON -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE=[path]/vcpkg/scripts/buildsystems/vcpkg.cmake
cmake --build build --config Release
```

**Option B – Raylib installed elsewhere**

Point CMake to Raylib (e.g. `CMAKE_PREFIX_PATH` or `find_path`/`find_library`), then:

```bash
cmake -B build -DSPL_BUILD_GAME=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

With game support you get:

- **spl** – run scripts + `import "game"` and `import "2dgraphics"`
- **spl_repl** – same, with game and 2dgraphics in REPL
- **spl_game** – run a single script with **game builtins as globals** (no `import`; no 2dgraphics module)

### Windows: full build and package

From the repo root (PowerShell):

```powershell
.\build_FINAL.ps1
```

Options:

- Default build includes Raylib/game (spl.exe has g2d/game). Use `-NoGame` to build without.
- `-Quick` – configure + build, smoke test only
- `-BuildOnly` – no tests, no package
- `-SkipTests` – build and package, skip full test suite
- `-Clean` – clean rebuild
- `-BuildIDE` – build Electron IDE (spl-ide)
- `-NoPackage` – do not create FINAL folder

Binaries (by default) end up in `build\Release\` (e.g. `spl.exe`, `spl_repl.exe`, `spl_game.exe` when game is enabled).

---

## 2. Run your first script

Create a file `hello.spl`:

```spl
print("Hello, SPL!")
let x = 10
let y = 20
print("Sum:", x + y)
```

Run it:

```bash
build/Release/spl.exe hello.spl
```

Or from the FINAL package:

```bash
FINAL/bin/spl.exe hello.spl
```

---

## 3. Which executable to use

| Executable | Use when |
|------------|----------|
| **spl** | Run any script; use `import "math"`, `import "string"`, `import "game"`, `import "2dgraphics"` (game/2dgraphics only if built with Raylib). |
| **spl_repl** | Interactive REPL; same imports as spl. |
| **spl_game** | Run a **single** game script that uses **global** game builtins (`window_create`, `draw_rect`, `key_down`, etc.) with **no** `import`. 2dgraphics is **not** available in spl_game (no `import "2dgraphics"`). |

Summary:

- **Normal scripts and modules:** use **spl** (or spl_repl).
- **Game scripts with module style:** use **spl** and `import "game"` or `import "2dgraphics"`.
- **Legacy game scripts that call `window_create`, `key_down`, etc. as globals:** use **spl_game**.

---

## 4. Using modules

### Standard library modules (always available with spl / spl_repl)

```spl
import "math"
print(math.sqrt(2))
print(math.PI)

import "string"
print(string.upper("hello"))

import "json"
let obj = json.json_parse('{"a":1}')
print(json.json_stringify(obj))
```

Available stdlib module names: **math**, **string**, **json**, **random**, **sys**, **io**, **array**, **env**.  
See [standard_library.md](standard_library.md) for what each exposes.

### Game module (only when built with SPL_BUILD_GAME)

```spl
import "game"
game.window_create(800, 600, "My Game")
# ... use game.clear, game.draw_rect, game.key_down, etc.
game.window_close()
```

See [SPL_GAME_API.md](SPL_GAME_API.md) for the full game API.

### 2dgraphics module (only when built with SPL_BUILD_GAME)

```spl
import("2dgraphics")
g = 2dgraphics
g.createWindow(800, 600, "SPL Game")
while g.isOpen() {
    g.beginFrame()
    g.clear(20, 20, 30)
    g.fillRect(100, 100, 50, 50)
    g.endFrame()
}
g.closeWindow()
```

**Important:** 2dgraphics is available only in **spl** and **spl_repl** via `import "2dgraphics"` or `import("2dgraphics")`. It is **not** available in **spl_game**.  
See [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md) for the full API.

---

## 5. REPL

Start the REPL:

```bash
build/Release/spl_repl.exe
```

Then type SPL statements and expressions. Results are printed after each expression (when not nil). You can:

- Define variables and functions
- `import "math"` (and other modules, including `"game"` and `"2dgraphics"` when built with game)
- Run small experiments

Exit with your OS’s usual EOF (e.g. Ctrl+D on Unix, Ctrl+Z on Windows) or by closing the terminal.

---

## 6. Command-line options (spl)

| Option | Description |
|--------|-------------|
| `spl script.spl` | Compile and run the script. |
| `spl --ast script.spl` | Dump the AST (no run). |
| `spl --bytecode script.spl` | Dump the bytecode (no run). |

Script arguments are available via the **cli_args()** builtin (see [standard_library.md](standard_library.md) or [CLI_AND_REPL.md](CLI_AND_REPL.md)).

---

## 7. Example scripts

- See **[EXAMPLES_INDEX.md](EXAMPLES_INDEX.md)** for a full list of example scripts, what they do, and whether to run them with **spl** or **spl_game**.
- When built **without** game support, skip graphics/game examples (e.g. `graphics_test.spl`, `2dgraphics_shapes.spl`, `2dgraphics_game_loop.spl`) or they will fail.

### Running the SPL IDE

The repo includes an **Electron-based IDE** (spl-ide) with Monaco editor, syntax highlighting, run (F5), script arguments, and output panel.

- **From repo:** `cd spl-ide && npm install && npm start`
- **Build IDE (Windows):** `.\build_FINAL.ps1 -BuildIDE` – output in `spl-ide\dist`
- The IDE looks for `spl` in `build/Release/`, `FINAL/bin/`, or on PATH. Use the **Args** field in the toolbar to pass arguments to your script (available via `cli_args()`).

## 8. Learning path (suggested order)

1. **Build** (section 1) and **run your first script** (section 2).
2. **Language basics:** [language_syntax.md](language_syntax.md) – variables, literals, control flow, functions.
3. **Builtins:** [standard_library.md](standard_library.md) – print, math, strings, arrays, file I/O.
4. **Try examples:** [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) – run e.g. `01_arithmetic.spl` through `09_arrays.spl`, then `features_demo.spl`.
5. **Modules:** Use `import "math"` and `import "string"` (section 4); optionally **game** or **2dgraphics** if built with Raylib.
6. **Game or 2D graphics:** [SPL_GAME_API.md](SPL_GAME_API.md) or [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md) when you want windows and drawing.
7. **Low-level (optional):** [LOW_LEVEL_AND_MEMORY.md](LOW_LEVEL_AND_MEMORY.md) for pointers and memory.

If something fails, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md). For testing the full example suite, see [TESTING.md](TESTING.md).

## 9. Next steps

- **Language:** [language_syntax.md](language_syntax.md)
- **Builtins and stdlib:** [standard_library.md](standard_library.md)
- **Game (globals or module):** [SPL_GAME_API.md](SPL_GAME_API.md)
- **2D graphics module:** [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md)
- **Low-level memory:** [LOW_LEVEL_AND_MEMORY.md](LOW_LEVEL_AND_MEMORY.md)
- **Examples index:** [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md)
- **Running the test suite:** [TESTING.md](TESTING.md)
- **Problems?** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **All docs:** [README.md](README.md) (documentation index)
