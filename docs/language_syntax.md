# SPL Language Syntax

Reference for SPL syntax: variables, types, control flow, functions, classes, operators, and modules.

**Script files:** The interpreter typically expects source in `.spl` files (e.g. `spl script.spl`). You run **one entry script** per `spl` invocation; that script can then `import "other.spl"` to load and run additional files. See [CLI_AND_REPL.md](CLI_AND_REPL.md).

---

## Comments

- **Single-line:** `// comment`
- **Multi-line:** `/* comment */`

---

## Variables

- **let** (mutable): `let x = 5`
- **var** (alias for let): `var name = "hello"`
- **const** (immutable binding): `const pi = 3.14159`
- **Optional type hints:** `let x: int = 10` or `int x = 10` (C-style); type can be omitted when initializer is present.

---

## Literals

- **Integers:** `0`, `42`, `-7`; numeric separators: `1_000_000`, `0xFF_FF`
- **Floats:** `3.14`, `.5`, `1e-2`
- **Strings:** `"double"`, `'single'` with escapes `\n`, `\t`, `\\`, `\"`, `\'`
- **Booleans:** `true`, `false`
- **Null:** `null`
- **Time literals:** `2s`, `500ms`, `5m`, `1h` (evaluate to seconds as float; e.g. for `sleep(2s)`)

---

## Operators

| Category    | Operators |
|------------|-----------|
| Arithmetic | `+ - * / % **` |
| Comparison | `== != < > <= >=` |
| Logical    | `&& \|\| !` (and `and` / `or`) |
| Bitwise    | `& \| ^ << >>` |
| Pipeline   | `\|>` (pass left as argument to right: `x \|> f` → `f(x)`) |
| Assignment | `= += -= *= /= %= &= \|= ^= <<= >>=` |

**Precedence** (high to low): unary `!`, `-` → `**` → `*` `/` `%` → `+` `-` → `<<` `>>` → `<` `<=` `>` `>=` → `==` `!=` → `&` → `^` → `|` → `&&` → `||` → ternary `? :` → assignment.

---

## Control flow

- **if / elif / else:** `if (cond) { }` or `if cond: stmt`
- **Ternary:** `cond ? then_expr : else_expr`
- **for (range):** `for i in range(start, end):` or `for i in range(start, end, step):`
- **for (range syntax):** `for i in 1..10 { }` or `for i in 1..100 step 5 { }`
- **for (C-style):** `for (let i = 0; i < n; i++) { }`
- **for-in:** `for x in array { }` or `for key, value in map { }`
- **while:** `while (cond) { }`
- **break** / **continue** (in loops)
- **Loop labels:** `label: for ... { ... break label` / `continue label }`

---

## Functions

- **Definition:** `def name(arg1, arg2) { ... }` or `def name(arg1, arg2): expr`
- **Default arguments:** `def greet(name = "User", age = 0) { }`
- **Named arguments:** `greet(name = "Ahmed", msg = "Hi")` (order independent)
- **Return:** `return expr` or `return`; **multiple returns:** `return a, b` (returns array `[a, b]`)
- **Call:** `name(a, b)`
- **Lambdas / arrow:** `(x, y) => x * y` or `(x) => x + 1`

---

## Error handling

- **try / catch / else / finally:** `try { } catch (e) { } else { } finally { }` — else runs only when try completes without throwing (Python-style).
- **catch by type:** `catch (ValueError e) { }` — only catches when `error_name(e) == "ValueError"`; otherwise rethrows.
- **throw:** `throw "message"` or `throw expr` (e.g. `throw Error("msg")`, `throw ValueError("bad value")`).
- **defer:** `defer { ... }` – run block when leaving current scope (e.g. after return or end of block). Defer blocks run in **reverse order** of their definition (last defined runs first). See `examples/83_defer_order.spl`.
- **assert:** `assert condition` or `assert condition, "message"`

---

## Pattern matching

- **match / case:** `match value { case 1 => stmt case 2 => stmt case _ => stmt }`
- **Match guards:** `case x if x > 10 => stmt`
- **Destructuring in case:** `case { x: 0, y: yVal } =>` (object pattern)
- Use `_` for default/wildcard case.

---

## Collections

- **Array literal:** `[1, 2, 3]`
- **Map literal:** `{ "key": value, "key2": value2 }` (string keys)
- **Slicing:** `arr[start:end]` or `arr[start:end:step]` (null = default)
- **Destructuring:** `let [x, y] = arr`; `let { a, b } = map`
- **Optional indexing:** `arr?[i]` – if `arr` is null, result is null; else same as `arr[i]`
- **Spread / rest:** Rest in parameter list. **Array spread:** `[...expr]` inside array literals flattens the array into the new array (e.g. `[1, ...a, 2]`).
- **Pipeline:** `expr |> func` — passes `expr` as the single argument to `func` (e.g. `16 |> sqrt` → `sqrt(16)`). Left-associative: `x |> f |> g` → `g(f(x))`.
- **List comprehension:** `[ for x in iter : expr ]` builds an array by iterating and evaluating `expr` for each element. Optional filter: `[ for x in arr if x > 0 : x * 2 ]`.

---

## Other expressions

- **Optional chaining:** `obj?.prop`, `null?.x`
- **Null coalescing:** `a ?? b` – use `b` when `a` is null or false
- **do block:** `do { let x = 5; print(x) }` – inline block with its own scope
- **F-strings:** `f"Hello {name}!"` – interpolate expressions in strings
- **Multi-line strings:** `"""line1\nline2"""` and `'''...'''`

---

## Classes (current implementation)

- **Declaration:** `class Name { }` or `class Name extends Base { }`
- **constructor:** `constructor() { }`; **this:** `this.name`
- **public / private / protected** (parser support; enforcement may be partial)
- **Methods:** `def methodName() { }`; override in subclass

---

## Modules and import

- **Import (call form):** `import("math")` – the module name must be in quotes inside parentheses. Loads the module and binds it to the name (e.g. `math`). Use: `import("math")` then `math.sqrt(2)`.
- **Import as:** `import("module_name") as alias` – bind the module to a different name (if supported).
- **Available stdlib modules:** `"math"`, `"string"`, `"json"`, `"random"`, `"sys"`, `"io"`, `"array"`, `"map"`, `"env"`, `"types"`, `"debug"`, `"log"`, `"time"`, `"memory"`, `"util"`, `"profiling"`, `"path"`, `"errors"`, `"iter"`, `"collections"`, `"fs"`. See [standard_library.md](standard_library.md).
- **Optional modules (when built with game):** `"game"`, `"2dgraphics"`. See [SPL_GAME_API.md](SPL_GAME_API.md) and [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md).
- **File import:** `import("path/to/script.spl")` – compiles and runs the file in a sub-script context. The return value for file scripts is **nil**. If the file is not found, a message is written to stderr. Compile/runtime errors inside the imported file may not be surfaced to the caller.

**Note:** The result of `import("X")` is the module value (a map), bound to the name derived from X (e.g. `import("2dgraphics")` binds to `2dgraphics`). Use: `import("2dgraphics")` then `2dgraphics.createWindow(800, 600, "Game")`.

---

## Precedence (summary, high to low)

1. Unary: `!`, `-`
2. `**`
3. `*`, `/`, `%`
4. `+`, `-`
5. `<<`, `>>`
6. `<`, `<=`, `>`, `>=`
7. `==`, `!=`
8. `&`, `^`, `|`
9. `&&`, `||`
10. Pipeline: `expr |> func` (left-associative)
11. Ternary: `cond ? then : else`
12. Assignment: `=`, `+=`, etc.

---

## Related documentation

- [HOW_TO_CODE_SPL.md](HOW_TO_CODE_SPL.md) – **Deep SPL reference:** exact syntax, builtin names, and patterns (no Python/JS mix).
- [standard_library.md](standard_library.md) – All builtins and stdlib modules.
- [SPL_HYBRID_SYNTAX.md](SPL_HYBRID_SYNTAX.md) – Which syntax styles (Python, JS, C++, etc.) are supported.
- [standard_library.md](standard_library.md) – Built-ins; [ROADMAP.md](ROADMAP.md) – Planned features.
- [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) – Index of example scripts (e.g. 83_defer_order.spl for defer).
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) – Common issues and fixes.
