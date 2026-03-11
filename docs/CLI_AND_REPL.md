# SPL Command-Line Interface and REPL

This document describes how to run the SPL interpreter from the command line and how to use the REPL.

---

## 1. Running scripts (spl)

### Basic usage

```bash
spl script.spl
```

Compiles `script.spl` and runs it. Exit code is 0 on success, non-zero on compile or runtime error. Use **-v** or **--version** to print the SPL version and exit.

### Dump AST (no execution)

```bash
spl --ast script.spl
```

Prints the abstract syntax tree and exits. Useful for debugging the parser.

### Dump bytecode (no execution)

```bash
spl --bytecode script.spl
```

Prints the bytecode instructions and exits. Useful for debugging the code generator and VM.

### One script per run (spl)

**spl** takes a **single** script file: `spl script.spl`. There is no built-in way to pass multiple entry-point files; use `import "other.spl"` inside the script to load and run another file at runtime (see [language_syntax.md](language_syntax.md) – File import).

### Script arguments

Scripts do not receive command-line arguments as a separate list; the full argv is available to the script via the **cli_args()** builtin. For example:

```spl
# my_script.spl
let args = cli_args()
# args[0] is typically the program name (e.g. "spl" or path to spl.exe)
# args[1] is typically the script path
# args[2], args[3], ... are any extra arguments you pass after the script name
if len(args) > 2 {
    print("First argument:", args[2])
}
```

How you pass “arguments” to the script depends on your host: usually you run `spl my_script.spl arg1 arg2`, and the VM’s `cli_args()` returns the full argv (so the script must skip argv[0] and argv[1] if it only wants user args). See [standard_library.md](standard_library.md) for **cli_args**.

---

## 2. REPL (spl_repl)

### Start the REPL

```bash
spl_repl
```

No script file is required. The REPL reads lines (or multi-line input), compiles, and runs each top-level chunk, then prints the result of the last expression (if not nil).

### Behavior

- **Variables and functions** persist across inputs in the same session.
- **Import** is supported: e.g. `import "math"` then `math.sqrt(2)`.
- When built with game support, you can `import "game"` or `import "2dgraphics"` and use them in the REPL.
- **Exit:** type **exit** or **quit**, or send EOF (Ctrl+D on Unix, Ctrl+Z then Enter on Windows), or close the terminal.

### Undefined variable warnings

If you reference a global name that was not defined (and is not a builtin or imported module), the compiler may emit a warning such as “Possible undefined variable 'x'. Did you mean to define it first?”. This is best-effort; defining the variable or importing a module that provides it resolves the warning.

---

## 3. Game runner (spl_game)

### Usage

```bash
spl_game game_script.spl
```

- **spl_game** is only built when **SPL_BUILD_GAME=ON** (Raylib required).
- It runs the given script with **core builtins** plus **game builtins as globals** (e.g. `window_create`, `draw_rect`, `key_down`). There is **no** `import`; you cannot use `import "2dgraphics"` or `import "math"` in spl_game.
- Use **spl** (not spl_game) if you want to use `import "game"` or `import "2dgraphics"` in your script.

---

## 4. Environment and paths

- **Current directory:** Scripts and the REPL resolve relative paths (e.g. in `read_file`, `import "path.spl"`) from the **current working directory** of the process, not necessarily the script’s directory.
- **NO_COLOR:** If the `NO_COLOR` environment variable is set, the error reporter disables ANSI color output (see errors.hpp/errors.cpp).

---

## 5. Exit codes

| Exit code | Meaning |
|-----------|--------|
| 0 | Success (script finished or REPL exited normally). |
| 1 | Compile error (syntax, etc.) or runtime error (e.g. uncaught exception, type error). |

The exact non-zero value may vary; 1 is the typical failure code. Scripts can call **exit_code(n)** to set the process exit code (e.g. 0–255) when they finish.

---

## 6. Related documentation

- [GETTING_STARTED.md](GETTING_STARTED.md) – Build and first run.
- [standard_library.md](standard_library.md) – **cli_args**, **print**, and other builtins.
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) – Where spl, spl_repl, and spl_game are built and what they include.
- [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) – List of example scripts and which runner to use.
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) – Common problems (build, import, cli_args, REPL, etc.).
