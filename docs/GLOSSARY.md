# SPL Glossary

Definitions of terms and concepts used in SPL and its documentation.

---

## Language and runtime

**SPL** – Simple Programming Language. An **advanced, multi-paradigm** language: dynamically typed with optional type hints, supporting imperative, functional (first-class functions, map/filter/reduce), object-oriented (classes, inheritance), and data-oriented (pattern matching, destructuring) styles. It has a rich standard library, low-level memory control (pointers, peek/poke, mem_*), and optional graphics and game APIs. See [LANGUAGE_OVERVIEW.md](LANGUAGE_OVERVIEW.md).

**AST** – Abstract Syntax Tree. The result of parsing source code; a tree of statements and expressions used by the code generator.

**Bytecode** – The instruction sequence (opcodes + operands) produced by the code generator and executed by the VM. Not machine code; an intermediate representation.

**VM** – Virtual Machine. The component that executes bytecode: stack, locals, globals, call frames, and builtin dispatch.

**Builtin** – A function implemented in C++ and registered with the VM (e.g. `print`, `sqrt`, `alloc`). Called by index when the VM executes a CALL to a function value that has `isBuiltin` set.

**Value** – The runtime representation of any SPL value: NIL, BOOL, INT, FLOAT, STRING, ARRAY, MAP, FUNCTION, CLASS, INSTANCE, or PTR. Implemented as a variant plus optional shared state (e.g. array elements, map entries).

**defer** – A block that runs when leaving the current scope (e.g. after return or at end of block). Defer blocks execute in reverse order of definition (last defined runs first).

**Module** – A namespace of functions and values. In SPL, stdlib modules (`math`, `string`, etc.) and optional modules (`game`, `2dgraphics`) are implemented as maps returned by `__import("name")` when the script runs `import "name"`.

---

## Executables

**spl** – Main CLI. Compiles and runs a script file; supports `--ast` and `--bytecode`; registers builtins and `__import` (stdlib + game + 2dgraphics when built with game).

**spl_repl** – Interactive REPL. Same VM and `__import` as spl; no script file or dump modes.

**spl_game** – Game runner. Runs a single script with **game builtins as globals**; no `import` system and no 2dgraphics module. Built only when SPL_BUILD_GAME=ON.

---

## Import and modules

**__import** – The builtin function that backs `import "X"`. Resolves "game" / "2dgraphics" to createGameModule / create2dGraphicsModule (when SPL_BUILD_GAME), "math" / "string" / etc. to createStdlibModule, or loads and runs a file script.

**Stdlib module** – A standard library namespace created by `createStdlibModule`: math, string, json, random, sys, io, array, map, env, types, debug, log, time, memory, util, profiling, path, errors, iter, collections, fs. Each is a map of name → builtin function (or constant) from the core builtin list.

**File import** – `import "path.spl"` compiles and runs the file via the VM’s runSubScript; the return value of `__import` for file scripts is currently nil.

---

## Game and graphics

**Game builtins** – Functions such as window_create, draw_rect, key_down, game_loop. Available as globals when using spl_game, or as fields of the map returned by `import "game"` when using spl/spl_repl.

**2dgraphics** – Optional module for 2D graphics: window, primitives, text, images, sprites, input, camera. Used via `import "2dgraphics"` or `import("2dgraphics")` only in spl or spl_repl when built with SPL_BUILD_GAME.

**Raylib** – The C library used for windowing, drawing, input, and sound when SPL_BUILD_GAME is ON.

---

## Memory and low-level

**Pointer (ptr)** – A value of type PTR representing an address. Created by `alloc`, `ptr_from_address`, or pointer arithmetic. Used with peek/poke, mem_copy, etc.

**alloc** – Builtin that allocates a block of bytes on the heap and returns a pointer.

**peek / poke** – Builtins that read or write 1–8 bytes (or float/double) at a pointer address.

**Volatile access** – Read/write that the compiler must not optimize away or reorder (volatile_load8/16/32/64, volatile_store8/16/32/64). Used for hardware or concurrency.

---

## Build and project

**SPL_BUILD_GAME** – CMake option (default OFF). When ON, Raylib is required; game_builtins and g2d_builtins are linked into spl and spl_repl, and spl_game is built.

**build_FINAL.ps1** – Windows PowerShell script that configures CMake, builds Release, runs tests (optional), and optionally packages to the FINAL folder (bin, examples, IDE).

**run_all_tests.ps1** – Runs every `.spl` in a given examples directory with a given spl executable and optional skip list and timeout.

---

## Error reporting

**ErrorReporter** – Component (errors.cpp, errors.hpp) that reports compile and runtime errors with line/column and optional hints. Respects NO_COLOR for disabling ANSI colors.

**LexerError / ParserError** – Exceptions thrown by the lexer or parser on invalid input.

**VMError** – Exception thrown by the VM on runtime errors (e.g. type error, division by zero, wrong argument count). Carries category, line, column, and message.

---

## See also

- [README.md](README.md) – Documentation index
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) – Repository and source layout
- [GETTING_STARTED.md](GETTING_STARTED.md) – Build and run
