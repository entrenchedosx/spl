# How to Code SPL — Deep Reference

This document is the **canonical SPL coding reference**: exact syntax, builtin names, and patterns. Use it to write correct SPL (no Python/JS/C++ syntax mixed in).

---

## 1. Files and execution

- **Extension:** `.spl`
- **Run:** `spl script.spl` or `spl_game script.spl` (game globals only for the latter)
- **One entry script per run.** Use `import("other.spl")` or `import("math")` inside the script to load more.

---

## 2. Comments

```spl
// single line
/* multi
   line */
```

---

## 3. Variables

| Declaration | Example | Notes |
|-------------|---------|--------|
| `let` (mutable) | `let x = 5` | Preferred |
| `var` (alias for let) | `var name = "hi"` | Same as let |
| `const` (immutable) | `const pi = 3.14159` | Binding cannot be reassigned |
| Type hint (optional) | `let x: int = 10` or `int x = 10` | Types: int, float, string, bool, array, map, void, etc. |

No semicolons required; newline or `;` can separate statements.

---

## 4. Literals

- **Numbers:** `0`, `42`, `-7`, `3.14`, `.5`, `1e-2`; separators: `1_000_000`, `0xFF_FF`
- **Strings:** `"double"`, `'single'`; escapes: `\n`, `\t`, `\\`, `\"`, `\'`
- **F-strings:** `f"Hello {name}!"` — expressions in `{ }`
- **Multi-line strings:** `"""line1"""` or `'''line2'''`
- **Booleans:** `true`, `false`
- **Null:** `null` (also `nil` in some contexts)
- **Time:** `2s`, `500ms`, `5m`, `1h` — evaluate to seconds (float); e.g. `sleep(2s)`
- **Arrays:** `[1, 2, 3]`
- **Maps:** `{ "key": value }` — string keys only

---

## 5. Operators

- **Arithmetic:** `+ - * / % **`
- **Comparison:** `== != < > <= >=`
- **Logical:** `&& || !` and keywords `and` / `or`
- **Bitwise:** `& | ^ << >>`
- **Assignment:** `= += -= *= /= %= &= |= ^= <<= >>=`
- **Ternary:** `cond ? then_expr : else_expr`
- **Null coalescing:** `a ?? b` — use `b` when `a` is null or false
- **Optional chaining:** `obj?.prop` — no crash if obj is null
- **Optional index:** `arr?[i]` — null if arr is null, else element (or null if OOB)

---

## 6. Control flow

**if / elif / else** — braces or single-statement colon:

```spl
if (cond) { stmt }
if cond: singleStmt
elif (cond) { stmt }
else { stmt }
```

**Loops:**

```spl
for i in 1..10 { }
for i in 1..100 step 5 { }
for i in range(0, 5) { }
for (let i = 0; i < n; i++) { }
for x in arr { }
for key, value in map { }
while (cond) { }
```

**break / continue** — optionally with label:

```spl
label: for i in 1..10 {
    for j in 1..10 {
        if done break label
        if skip continue
    }
}
```

**repeat** — run block n times:

```spl
repeat 3 { print("hi") }
```

---

## 7. Functions

**Definition** — braces or colon for single expression:

```spl
def add(a, b) { return a + b }
def greet(name): str("Hello, ", name)
def withDefault(n, d = 2) { return n + d }
```

**Named arguments:** `greet(name = "Ahmed", age = 20)` — order independent.

**Multiple returns:** `return a, b` returns array `[a, b]`. Receive with destructuring: `let [q, r] = divide(10, 3)`.

**Lambdas / arrow:** `(x, y) => x + y` or `(x) => x * 2`

**Call:** `name(arg1, arg2)`

---

## 8. Error handling

**try / catch / else / finally** — SPL uses `catch`, not `except`:

```spl
try {
    read_file(path)
} catch (e) {
    print(error_message(e))
} else {
    print("no error")
} finally {
    cleanup()
}
```

**Catch by type** — one catch per try; rethrows if type doesn’t match:

```spl
try {
    risky()
} catch (ValueError e) {
    print(error_message(e))
} catch (e) {
    print("other:", error_message(e))
}
```

**throw / rethrow:**

```spl
throw "message"
throw Error("msg")
throw ValueError("bad value")
rethrow   // inside catch: rethrow current exception
```

**defer** — runs when leaving scope (after return or block end); last defined runs first:

```spl
defer { close(f) }
```

**assert:** `assert condition` or `assert condition, "message"`

---

## 9. Error values (maps)

- **Construct:** `Error("msg")`, `Error("msg", "CODE")`, `Error("msg", "CODE", cause)`  
  `ValueError("msg")`, `TypeError("msg")`, `RuntimeError("msg")`, `OSError("msg")`, `KeyError("msg")`  
  `panic("msg")` — same as `Error("msg")`; idiom: `throw panic("fatal")`
- **Inspect:** `error_message(err)`, `error_name(err)`, `error_cause(err)`, `is_error_type(err, "ValueError")`

---

## 10. Pattern matching

```spl
match value {
    case 1 => stmt
    case 2 => stmt
    case x if x > 10 => stmt
    case { x: 0, y: yVal } => stmt
    case _ => stmt
}
```

Use `_` for default/wildcard.

---

## 11. Collections

- **Array:** `[1, 2, 3]`, `array(1, 2, 3)`; index `arr[i]`; slice `arr[start:end]` or `arr[start:end:step]`
- **Map:** `{ "a": 1, "b": 2 }`; access `m["key"]` or `m.key` when key is identifier
- **Destructuring:** `let [x, y] = arr`; `let { a, b } = map`
- **Builtins:** `len`, `push`, `push_front`, `slice`, `keys`, `values`, `has`, `copy`, `freeze`, `deep_equal`  
  `map`, `filter`, `reduce`, `flat_map`, `flatten`, `zip`, `chunk`, `unique`, `reverse`, `find`, `sort`, `sort_by`, `first`, `last`, `take`, `drop`, `cartesian`, `window`

---

## 12. Modules and import

**Import** — module name is a **string**; use parentheses or space + string:

```spl
import("math")
import "math"
```

Then use the **module name** as the bound variable (e.g. `math.sqrt(2)`). For 2dgraphics, the name is `2dgraphics`:

```spl
import("2dgraphics")
g = 2dgraphics
g.createWindow(800, 600, "Game")
```

**Stdlib modules (string name):** `"math"`, `"string"`, `"json"`, `"random"`, `"sys"`, `"io"`, `"array"`, `"map"`, `"env"`, `"types"`, `"debug"`, `"log"`, `"time"`, `"memory"`, `"util"`, `"profiling"`, `"path"`, `"errors"`, `"iter"`, `"collections"`, `"fs"`.  
**Optional (when built with game):** `"game"`, `"2dgraphics"`.

**File import:** `import("path/to/script.spl")` — runs script in sub-context; return value is nil for file scripts.

---

## 13. Key builtins (exact names)

- **I/O:** `print(...)`, `inspect(x)`, `read_file(path)`, `write_file(path, content)`
- **Math:** `sqrt`, `pow`, `sin`, `cos`, `tan`, `floor`, `ceil`, `round`, `abs`, `log`, `atan2`, `min`, `max`, `clamp`, `lerp`, `PI`, `E`
- **Type:** `str(...)`, `int(x)`, `float(x)`, `type(x)`, `dir(x)`, `parse_int(s)`, `parse_float(s)`
- **Collections:** `array`, `len`, `push`, `slice`, `keys`, `has`, `copy`, `deep_equal`, `map`, `filter`, `reduce`, etc.
- **System:** `cli_args()`, `env_get(name)`, `time()`, `sleep(seconds)`, `stack_trace()`, `assertType(value, typeStr)`
- **JSON:** `json_parse(s)`, `json_stringify(x)`
- **Memory (low-level):** `alloc(n)`, `free(ptr)`, `ptr_address`, `ptr_from_address`, `ptr_offset`, `peek8`–`peek64`, `poke8`–`poke64`, `mem_copy`, `mem_set`, `mem_cmp`, `mem_move`, `realloc`, `align_up`, `align_down`, `read_file` (not `readFile` in SPL docs for consistency; alias may exist)

Use **underscore** names in SPL: `read_file`, `write_file`, `error_message`, `error_name`, `error_cause`, `stack_trace`, etc. (Not camelCase like `readFile` unless the stdlib explicitly documents an alias.)

---

## 14. Classes (current)

```spl
class Name { }
class Dog extends Animal { }
constructor() { this.name = "x" }
def methodName() { }
```

`this`, `extends`; public/private/protected have parser support; enforcement may be partial.

---

## 15. Do block and expression style

- **do block:** `do { let x = 5; print(x) }` — inline block with its own scope.
- **Single-statement forms:** Many constructs allow `stmt` after `:` instead of `{ }` (e.g. `if cond: expr`).

---

## 16. What SPL is NOT

- **No `except`** — use `catch`.
- **No `def name():` without body** — use `def name() { }` or `def name(): expr`.
- **No bare `import module`** — use `import "module"` or `import("module")`.
- **No Python-style `readFile`** — use `read_file` (or the documented alias if any).
- **No semicolons required** — but allowed.
- **No `nil` in docs as primary** — use `null` for “no value” in user-facing SPL.

---

## Quick checklist when writing SPL

1. **Import:** `import("math")` or `import "math"` — string module name.
2. **Errors:** `try { } catch (e) { }` and `throw Error("msg")`; use `error_message(e)`, `error_name(e)`.
3. **File I/O:** `read_file(path)`, `write_file(path, content)`.
4. **Match:** `match x { case 1 => ... case _ => ... }`.
5. **Loops:** `for i in 1..10 { }`, `for x in arr { }`, `while (cond) { }`.
6. **Functions:** `def name(a, b) { return a + b }` or `def name(a): expr`.
7. **Output:** `print(...)`; concatenation with `str(...)` or `f"Hello {name}!"`.

This is the SPL way. Stick to this and you won’t mix in Python or other language syntax.
