# SPL Troubleshooting

Common issues, error messages, and how to fix them.

---

## Build

### Raylib not found (SPL_BUILD_GAME=ON)

**Symptom:** CMake reports "Raylib not found" or game targets are not built.

**Fix:**

- Install Raylib, e.g. with vcpkg: `vcpkg install raylib`
- Configure with the vcpkg toolchain:  
  `cmake -B build -DSPL_BUILD_GAME=ON -DCMAKE_TOOLCHAIN_FILE=[path]/vcpkg/scripts/buildsystems/vcpkg.cmake`
- Or set `CMAKE_PREFIX_PATH` (or `RAYLIB_INCLUDE_DIR` / `RAYLIB_LIBRARY`) so CMake can find `raylib.h` and the raylib library.

### import("lib/spl/...") or file not found

**Symptom:** Script runs from one folder but fails with "import: file not found" when run from another.

**Cause:** File-based imports are resolved relative to the current working directory, then (if set) to the `SPL_LIB` environment variable.

**Fix:**

- Run scripts from the **project root** (where `lib/spl/` exists), e.g. `spl examples/foo.spl`.
- Or set **SPL_LIB** to the project root so imports resolve from that path:
  - PowerShell: `$env:SPL_LIB = "D:\simple_programming_language"`
  - Then run `spl` from any directory; `import("lib/spl/algo.spl")` will look under `SPL_LIB/lib/spl/algo.spl`.

### spl.exe not found after build

**Symptom:** `run_all_tests.ps1` or scripts fail with "spl.exe not found", or `spl` is not recognized in a terminal.

**Fix:**

- Build with: `cmake --build build --config Release`
- On multi-config generators (e.g. Visual Studio), the executable is under `build/Release/spl.exe` or `build/Debug/spl.exe`. Use the path that matches your config.
- If you use `build_FINAL.ps1`, it builds to `build\Release\` by default.
- **Add SPL to PATH** so you can run `spl` from any folder:
  - **Current session only:**  
    `.\add_spl_to_path.ps1`  
    (adds `build\Release` or `FINAL\bin` to PATH for that terminal).
  - **Permanently (user):**  
    `.\add_spl_to_path.ps1 -User`  
    Then restart terminals/IDE so new windows see the updated PATH.
  - **See what would be added:**  
    `.\add_spl_to_path.ps1 -WhatIf`

### LNK1104 or "cannot open file spl.exe"

**Symptom:** Linker error or "file in use" when rebuilding.

**Fix:**

- Close any running `spl.exe`, `spl_repl.exe`, or `spl_game.exe` (e.g. from a previous run or IDE).
- On Windows you can run: `Stop-Process -Name spl,spl_repl,spl_game -Force -ErrorAction SilentlyContinue` before rebuilding.

### All builtins return null in the IDE (alloc, peek32, align_up, etc.)

**Symptom:** When you "Run current code" (or run a script) from the SPL IDE, output shows `null` for everything: `ptr_address(buf): null`, `peek32(buf): null`, `align_up(100, 4096): null`, even `size_of_ptr(): null`. The same script run from the command line with `spl script.spl` works and prints numbers.

**Cause:** The IDE runs your script by spawning an **spl** executable. It looks for it in this order: (when packaged) next to the IDE exe or in `bin\`; (when not packaged) `FINAL\bin\spl.exe`, `FINAL\spl.exe`, `build\Release\spl.exe`, `build\Debug\spl.exe`, then plain `spl` from your system **PATH**. If the IDE ends up using **spl from PATH** (or an old/copy that doesn’t have the full runtime), that binary may not be your project’s build, so builtins can be missing or mismatched and return null.

**Fix:**

- **Open the IDE from the project root** (the folder that contains `build\`, `FINAL\`, `spl-ide\`). Then the IDE’s `getSplPath()` will resolve to `build\Release\spl.exe` or `FINAL\bin\spl.exe`, which have all builtins.
- **Run the script from the command line** to confirm it works:  
  `D:\simple_programming_language\build\Release\spl.exe D:\simple_programming_language\examples\low_level_memory.spl`  
  (or use `FINAL\bin\spl.exe` if you use the packaged layout.)
- **Avoid a stray `spl` on PATH** that isn’t your project’s build. If you have an old or minimal `spl.exe` on PATH, the IDE might use it when it doesn’t find the project’s exe; remove or rename it, or open the IDE from the project root so the correct exe is found first.
- **Packaged IDE:** If you install the IDE and copy the FINAL package, put `spl.exe` (and `spl_repl.exe`) in the same folder as the IDE exe, or in a `bin` subfolder next to it, so the IDE finds them and uses the full runtime.

The low-level builtins (alloc, free, peek*, poke*, align_up, ptr_address, etc.) **are implemented** in the SPL runtime; they only appear to “return null” when the wrong executable is used.

### IDE build fails (electron-builder / network timeout)

**Symptom:** `build_FINAL.ps1 -BuildIDE` fails with errors like:
- `dial tcp ... connectex: ... connected party did not properly respond` or `connection ... failed`
- `Get "https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-resources-...`
- `ERR_ELECTRON_BUILDER_CANNOT_EXECUTE` or `app-builder.exe process failed`

**Cause:** electron-builder downloads NSIS and other binaries from GitHub. The download can time out due to network, firewall, or GitHub being slow/unreachable.

**Fix:**

- **Retry:** Run `.\build_FINAL.ps1 -BuildIDE` again; transient network issues often clear.
- **Build without IDE:** Omit `-BuildIDE`. You still get `spl.exe`, `spl_repl.exe`, and the FINAL package; only the SPL IDE installer is skipped. Run the IDE in dev mode with: `cd spl-ide; npm start`.
- **Build IDE manually later:** From project root: `cd spl-ide; npm install; npm run build:win`. If it still times out, try a different network (e.g. different Wi‑Fi or VPN) or wait and retry.
- The main build (spl, spl_repl, tests, FINAL folder) now **continues** even if the IDE build fails; you get a warning and the rest of the script completes.

---

## Running scripts

### "Possible undefined variable 'x'. Did you mean to define it first?"

**Symptom:** A warning (or error, depending on configuration) about a global name that was not defined.

**Cause:** The script uses a global name (e.g. `x` or a function) that was not previously defined and is not a builtin or an imported module.

**Fix:**

- Define the variable or function before use, or
- If it comes from a module, add `import("math")` (or the right module) and use `math.x`, or
- If you meant a builtin, use the correct builtin name (see [standard_library.md](standard_library.md)).

### import("2dgraphics") or import("game") returns nil / does nothing

**Symptom:** After `import("2dgraphics")` or `import("game")`, the value is nil or calling e.g. `2dgraphics.createWindow` fails.

**Cause:**

- The project was built **without** game support (`SPL_BUILD_GAME=OFF`). The 2dgraphics and game modules are only available when built with Raylib and `-DSPL_BUILD_GAME=ON`.
- You are using **spl_game**: it does not support `import`; it only exposes game builtins as globals. Use **spl** (not spl_game) to run scripts that use `import("game")` or `import("2dgraphics")`.

**Fix:**

- Rebuild with: `cmake -B build -DSPL_BUILD_GAME=ON` (and Raylib), then run with `spl script.spl`.
- If you want to use 2dgraphics/game as a module, run with `spl`, not `spl_game`.

### import("path.spl") returns nil or shows errors on stderr

**Symptom:** `import("other.spl")` returns nil, or you see "import: path: ..." errors on stderr.

**Cause:** File imports run the script in a sub-context; the return value for file scripts is nil. Compile or runtime errors in the imported file are now **printed to stderr** (e.g. `import: other.spl: Expected expression at 3:1` or `import: other.spl runtime error: ...`).

**Fix:**

- Check stderr for the import error message.
- Run the imported file directly: `spl other.spl` to see full error output and source snippet.

### Script arguments: cli_args() shows wrong values

**Symptom:** `cli_args()` returns something unexpected (e.g. only program name, or wrong indices).

**Cause:** `cli_args()` returns the **full** argv of the process. Typically `args[0]` is the executable name and `args[1]` is the script path; user arguments start at `args[2]`.

**Fix:**

- Use indices 2 and beyond for "arguments to my script", e.g. `let userArgs = slice(cli_args(), 2, len(cli_args()))`.
- See [CLI_AND_REPL.md](CLI_AND_REPL.md) and [standard_library.md](standard_library.md) for **cli_args**.

---

## Errors and environment

### Compile-time (syntax and file) errors

**Symptom:** Script does not run; reporter shows a compile error.

**Common categories:**

- **SyntaxError** – Invalid syntax (unclosed string, invalid token, missing `)` or `}`, etc.). Check the reported line and the hint (e.g. "Did you forget a closing parenthesis?").
- **FileError** – File not found (e.g. `spl missing.spl` or `import "missing.spl"`). Check path and working directory.

Fix the reported line and re-run. Use `spl --ast script.spl` to see the AST (if parsing succeeds) or inspect the error message for the first failing location.

### Disable colored output (e.g. in CI)

**Symptom:** You want plain text errors without ANSI color codes.

**Fix:** Set the environment variable **NO_COLOR** (any non-empty value). The SPL error reporter disables ANSI color when this is set.

### Division by zero / type error / argument count

**Symptom:** Runtime error about division by zero, type error, or wrong number of arguments.

**Cause:** These are VM runtime errors. The error report may show a category:

| Category | Meaning |
|----------|---------|
| **RuntimeError** | General runtime failure. |
| **TypeError** | Wrong type (e.g. calling a non-function, operation on wrong operand types). |
| **ValueError** | Invalid value for an operation. |
| **DivisionError** | Division by zero. |
| **ArgumentError** | Wrong number or kind of arguments passed to a function. |
| **IndexError** | Invalid index (e.g. out-of-range array or map access). |

**Common messages:** "Division by zero" → DivisionError; "Call on null" / "wrong type" → TypeError; "invalid address" / "access denied" → RuntimeError (e.g. process module); "Stack underflow" / "Invalid jump" → RuntimeError.

**Fix:**

- Check the error message and line number.
- For division: ensure divisor is not zero.
- For type errors: ensure operands are the expected type (e.g. don't call a non-function).
- For argument count: ensure you pass the number of arguments the function or builtin expects (see [standard_library.md](standard_library.md), [SPL_GAME_API.md](SPL_GAME_API.md), [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md)).

### Stack trace and debugging

**Symptom:** You want to see the call stack when an error occurs.

**Fix:**

- The runtime may print a short stack (function name + line) for uncaught errors.
- Use the **stack_trace()** builtin in a catch block or before rethrowing to get the current call stack as a string.

---

## Game and 2dgraphics

### Window does not appear or closes immediately

**Symptom:** Game or 2dgraphics window never shows or closes right away.

**Fix:**

- Ensure you have a loop that keeps the window open: e.g. `while g.isOpen() { ... }` for 2dgraphics, or `game_loop(update, render)` for the game API.
- Do not call `closeWindow()` or `window_close()` before the loop; call it after the loop exits.

### 2dgraphics: text() / drawText argument order

**Symptom:** Text draws in the wrong place or wrong size when using `text` or `drawText`.

**Fix:**

- **text(str, x, y, fontSize, r, g, b)** – string first, then x, y, then optional fontSize and color. See [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md).
- **drawText(text, x, y [, fontId, r, g, b, a])** – text first, then x, y, then optional font id and color.

### Tests fail: graphics_test.spl or 2dgraphics_*.spl

**Symptom:** `run_all_tests.ps1` fails on graphics or 2dgraphics examples.

**Cause:** Those scripts require the 2dgraphics module (SPL_BUILD_GAME=ON). If you built without game support, they will fail.

**Fix:**

- Build with game: `cmake -B build -DSPL_BUILD_GAME=ON` (and Raylib), then run tests again, or
- Exclude those scripts when running tests: use `-Skip @("graphics_test.spl", "2dgraphics_shapes.spl", "2dgraphics_game_loop.spl")` with `run_all_tests.ps1`, or run `build_FINAL.ps1 -NoGame` (it adds them to the skip list when building without Raylib).

See [TESTING.md](TESTING.md) for full test-runner options.

---

## REPL

### REPL does not print result

**Symptom:** You type an expression and nothing is printed.

**Cause:** If the last expression evaluates to **nil**, the REPL may not print anything (or prints nothing visible).

**Fix:** Use an expression that has a value (e.g. `1 + 1` or `print("hi")`) to see output.

### Exit REPL

**Symptom:** Not sure how to exit the REPL.

**Fix:** Type **exit** or **quit**, or send **EOF** (Ctrl+D on Unix, Ctrl+Z then Enter on Windows), or close the terminal window.

---

## Related documentation

- [GETTING_STARTED.md](GETTING_STARTED.md) – Build and first run
- [CLI_AND_REPL.md](CLI_AND_REPL.md) – Command-line and REPL usage
- [standard_library.md](standard_library.md) – Builtins (e.g. cli_args, stack_trace)
- [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md) – 2dgraphics API (text, drawText order)
- [docs/README.md](README.md) – Documentation index
