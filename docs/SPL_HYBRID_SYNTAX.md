# SPL Syntax – Multi-Language Hybrid

SPL is designed as a **polyglot-style** language: a cohesive blend of the best syntax ideas from Python, JavaScript, C++, Rust, Go, and others—readable, modern, and flexible.

---

## 1. Variable Declaration

| Style | Syntax | Status |
|-------|--------|--------|
| **let** (mutable, JS/Rust) | `let x = 10` | ✅ |
| **const** (immutable) | `const y = 3.14` | ✅ |
| **var** (alias for let, JS/Go) | `var name = "Ahmed"` | ✅ |
| **Type hint after name** | `let x: int = 10` | ✅ |
| **Type hint before name** (C-style) | `int x = 10` | ✅ (optional) |
| **Type inference** | Omit type when initializer present | ✅ |

**Types (optional):** `int`, `float`, `string`, `bool`, `array`, `map`, `void`, etc.

---

## 2. Functions

| Style | Syntax | Status |
|-------|--------|--------|
| **def + braces** (C++/Rust) | `def add(a: int, b: int) { return a + b }` | ✅ |
| **def + colon** (Python) | `def greet(name): print("Hello", name)` | ✅ |
| **Default arguments** | `def greet(name="User")` | ✅ |
| **Named arguments** | `greet(age=15)` | ✅ |
| **Return type** | `def add(a, b) -> int { ... }` | ✅ (optional) |
| **Arrow function** (JS) | `let square = (x) => x*x` | ✅ |
| **Nested functions** | def inside def | ✅ |

Overloading and multiple return types are planned (Phase 2).

---

## 3. Control Flow

| Style | Syntax | Status |
|-------|--------|--------|
| **if / elif / else** | `if (x > 10) { }` or `if x: ...` | ✅ (braces or colon) |
| **match** (Rust-style) | `match value { 1 => ... _ => ... }` | ✅ |
| **Match guards** | `case x if x > 10 =>` | ✅ |
| **Destructuring in match** | `case {x:0, y:y_val} =>` | ✅ |
| **for-in** (Python) | `for i in arr { }` or `for i in arr:` | ✅ |
| **for C-style** | `for (let i=0; i<n; i++) { }` | ✅ |
| **for range** | `for i in range(0, 10):` | ✅ (if range builtin) |
| **while** | `while (n > 0) { n -= 1 }` | ✅ |
| **Ternary** | `let msg = x > 5 ? "big" : "small"` | ✅ |
| **try / catch / finally** | `try { } catch err { } finally { }` | ✅ |
| **parallel for** | `parallel for item in arr { }` | 🔲 Planned |
| **Comprehensions** | `[x*2 for x in arr if x>5]` | 🔲 Planned |

---

## 4. Classes / Objects

| Style | Syntax | Status |
|-------|--------|--------|
| **class** | `class Animal { }` | ✅ (AST/codegen partial) |
| **constructor** | `constructor(name) { this.name = name }` | ✅ (parser) |
| **this** | `this.name` | ✅ (VM support) |
| **Inheritance** | `class Dog: Animal` or `extends` | ✅ (parser) |
| **Fields** | `let name: string`, `const id = 1` | 🔲 In progress |
| **Method override** | `def speak() { }` in subclass | ✅ |

Full instance creation, `super()`, and private/public are in progress.

---

## 5. Data Structures

| Style | Syntax | Status |
|-------|--------|--------|
| **Array** (JS/Python) | `let arr = [1, 2, 3]` | ✅ |
| **Map / Dict** | `let m = { "name": "Ahmed", "age": 15 }` | ✅ |
| **Tuple** (Python/Rust) | `let point = (10, 20)` | 🔲 (array or dedicated) |
| **Set** | `let s = {1, 2, 3}` | 🔲 Planned |
| **Slicing** | `arr[0:3]`, `arr[::2]` | ✅ |
| **Destructuring** | `let [x, y, ...rest] = arr` | ✅ (array/object) |
| **Spread** | `let newArr = [0, ...arr, 4]` | 🔲 Planned |

---

## 6. Memory / Low-Level

| Style | Syntax | Status |
|-------|--------|--------|
| **alloc** | `let buffer = alloc(1024)` | ✅ (builtin) |
| **unsafe** block | `unsafe { *ptr = 255 }` | 🔲 Planned |
| **Pointer dereference** | `*ptr` | 🔲 Planned |

---

## 7. Concurrency / Async

| Style | Syntax | Status |
|-------|--------|--------|
| **async / await** | `async def f(): ...` `await f()` | 🔲 Planned |
| **spawn** | `spawn task()` | 🔲 Planned |
| **Channels** (Go) | `channel.send(data)` | 🔲 Planned |

---

## 8. Operators

| Category | Operators | Status |
|----------|------------|--------|
| Arithmetic | `+ - * / % **` | ✅ |
| Comparison | `== != < > <= >=` | ✅ |
| Logical | `&& \|\| !` (and `and` / `or`) | ✅ |
| Bitwise | `& \| ^ << >>` | ✅ |
| Compound | `+= -= *= /= %= &= \|= ^= <<= >>=` | ✅ |

Operator overloading for classes is planned (Phase 2).

---

## 9. Misc Syntax

| Feature | Status |
|----------|--------|
| **Comments** | `//` and `/* */` | ✅ |
| **Optional semicolons** | Newline or `;` | ✅ |
| **do block** | `do { let x = 5; print(x) }` | ✅ |
| **Lambdas** | `(x, y) => x*y` | ✅ |
| **F-strings** | `f"Hello {name}!"` | ✅ |
| **Optional chaining** | `obj?.prop` | ✅ |
| **Multi-line strings** | `""" ... """` | ✅ |

---

## 10. Philosophy

- **Hybrid, not clone:** Python readability, JS flexibility, C++/Rust-style types and braces, Go-style concurrency (when added).
- **Mix and match:** You can use braces or colons, `let` or `var`, type hints or inference in the same project.
- **One ecosystem:** SPL is its own language; no single source language dominates.

---

## Status Legend

- ✅ Implemented
- 🔲 Planned / in progress

See **ROADMAP.md** and **docs/ROADMAP.md** for phased feature plans.
