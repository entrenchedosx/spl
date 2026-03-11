# SPL: Unique mix of languages and low-level power

SPL is designed as a **unique mix** of programming languages: it takes the best syntax and ideas from Python, JavaScript, C++, Rust, and Go, and blends them into one coherent language. At the same time, it offers **low-level memory access comparable to C++**, so you can write systems code, drivers, or high-performance logic without leaving SPL. This document explains how that mix works and how low-level fits in without turning SPL into a C++ clone.

---

## Why a unique mix?

- **One language, many styles.** You can write Python-style `for x in arr:`, C-style `for (let i = 0; i < n; i++)`, or range-style `for i in 1..10 step 2`. You can use `let` (Rust/JS), `var` (Go/JS), or `const` (everywhere). Functions can be `def name():` (Python) or `def name() { }` (C++/Rust). That flexibility keeps SPL **readable and familiar** no matter which language you come from.
- **High-level by default.** Arrays, maps, strings, pattern matching, optional chaining (`?.`), null coalescing (`??`), and a rich standard library mean most code stays short and clear. You don’t touch pointers unless you need to.
- **Low-level when you need it.** When you do need C++-level control—alloc, raw pointers, peek/poke, mem_*, volatile, alignment—you use the **same language**. No separate “unsafe” dialect: the same SPL syntax and idioms, with a small set of explicit builtins for memory.

So SPL is **unique** in combining:

- **Syntax:** Hybrid (Python + JS + C++ + Rust + Go), not “C with a different name.”
- **Semantics:** Dynamic typing, optional type hints, first-class functions, pattern matching, multiple returns, defer.
- **Memory:** Explicit, C++-comparable API (pointers, signed/unsigned read/write, block ops, bytes_read/write, ptr_is_null, size_of_ptr) without changing the rest of the language.

---

## How low-level fits the SPL style

### Same syntax, explicit memory

- **Pointers are values.** You write `let p = alloc(64)`, `let q = p + 8`, `free(p)`. No `*` or `&` in the syntax; pointer arithmetic is `p + n` and `p - q` (byte difference). That keeps SPL readable while staying precise.
- **Read/write by name.** You use `peek32(p)`, `poke_float(p, x)`, `peek8s(p)` (signed), `bytes_read(p, n)`, `bytes_write(p, arr)` instead of C’s `*(int32_t*)p`. Same idea as C++, but with explicit size and no cast syntax—clear and safe from misinterpretation.
- **Block ops as functions.** `mem_copy(dest, src, n)`, `mem_move`, `mem_cmp`, `mem_swap` mirror C’s `memcpy`/`memmove`/`memcmp` and common C++ patterns. You stay in SPL; the names are the same as in C docs.

### No “unsafe” block

SPL doesn’t have a separate `unsafe { }` block. Low-level builtins are **always available**. You keep safety by **convention**: only use pointers you got from `alloc`, `realloc`, or `ptr_from_address` for addresses you control, and don’t use them after `free`. The language doesn’t stop you from shooting yourself in the foot—like C/C++—but the **syntax stays one language**, not two.

### Unique SPL touches

- **Time literals:** `sleep(2s)`, `let t = 500ms`—useful in scripts and tools; no need to remember “seconds as float.”
- **Multiple returns:** `return a, b` and `let [x, y] = f()`—clean for functions that return a pointer and a size, or two pointers.
- **Defer:** `defer { free(p) }`—ensures cleanup on every exit path; no manual branches like in C.
- **Optional chaining / null coalescing:** `p?.field`, `x ?? default`—same syntax whether you’re working with high-level values or pointer-like results (e.g. `alloc` returning null).
- **Pattern matching:** `match tag { case 0 => ... case 1 => ... }`—fits tagged unions or enum-like values in low-level protocols.

So the **coding style** is SPL-first: loops, functions, and control flow look like SPL (hybrid syntax); only the memory operations use the explicit low-level API.

---

## Comparable to C++, still SPL

| C++ concept              | SPL equivalent                          | SPL twist |
|--------------------------|------------------------------------------|-----------|
| `malloc` / `free`        | `alloc(n)`, `free(ptr)`                  | Same idea; `ptr` is a value, no `*` syntax. |
| Pointer arithmetic       | `ptr + n`, `ptr - n`, `ptr1 - ptr2`     | Byte-based; readable. |
| Unsigned load/store      | `peek8`–`peek64`, `poke8`–`poke64`      | Explicit size in name. |
| Signed load/store        | `peek8s`–`peek64s`                      | Sign-extended; no separate “signed” store (use poke and value). |
| Float/double at address  | `peek_float`, `poke_float`, `peek_double`, `poke_double` | Same as C++ reinterpretation at address. |
| `memcpy` / `memmove`     | `mem_copy`, `mem_move`                  | Same semantics. |
| Swap two buffers         | Custom loop or `std::swap` ranges        | `mem_swap(dest, src, n)` builtin. |
| Byte buffer as array     | Manual loop or `std::vector<uint8_t>`   | `bytes_read(ptr, n)` → array; `bytes_write(ptr, arr)`. |
| Null pointer check       | `ptr == nullptr`                        | `ptr_is_null(ptr)` or `ptr == null`. |
| Pointer size             | `sizeof(void*)`                         | `size_of_ptr()`. |
| Alignment                | Manual or `alignas`                     | `align_up`/`align_down`, `ptr_align_up`/`ptr_align_down`. |
| Volatile / ordering      | `volatile`, `std::atomic` (simplified)   | `memory_barrier`, `volatile_load*`/`volatile_store*`. |
| Cleanup on exit          | RAII or manual                          | `defer { free(p) }`. |

So: **capability** is comparable to C++; **syntax and style** stay uniquely SPL.

---

## Summary

- SPL is a **unique mix** of Python, JavaScript, C++, Rust, and Go: one syntax, many familiar styles.
- **Low-level memory** is first-class: alloc/free, pointers, signed/unsigned peek/poke, mem_*, bytes_read/write, ptr_is_null, size_of_ptr, alignment, volatile. That makes SPL **comparable to C++** for systems and performance-sensitive code.
- The **coding and syntax** remain SPL: no `*`/`&`, no separate unsafe dialect, same loops, functions, and idioms. You get C++-level control without turning SPL into C++.

For the full low-level API, see [LOW_LEVEL_AND_MEMORY.md](LOW_LEVEL_AND_MEMORY.md). For the big picture of the language, see [LANGUAGE_OVERVIEW.md](LANGUAGE_OVERVIEW.md) and [SPL_HYBRID_SYNTAX.md](SPL_HYBRID_SYNTAX.md).
