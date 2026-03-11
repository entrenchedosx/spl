# SPL Standard Library

Built-in functions available in every SPL program. Optional **stdlib modules** (e.g. `import("math")`) re-export subsets of these under a namespace.

**Notation:** In function signatures, `[, x]` or “optional” means the argument can be omitted (e.g. `clear(r, g, b [, a])` – `a` defaults if not provided).

---

## I/O & debug

| Function | Description |
|----------|-------------|
| `print(...)` | Print arguments to stdout, separated by space, then newline. |
| `readline([prompt])` | Read one line from stdin; optional prompt printed first. Returns string. |
| `inspect(x)` | Return string representation of value `x`. |

---

## Math

| Function | Description |
|----------|-------------|
| `sqrt(x)` | Square root of `x`. |
| `pow(x, y)` | `x` raised to power `y`. |
| `sin(x)` | Sine of `x` (radians). |
| `cos(x)` | Cosine of `x` (radians). |
| `tan(x)` | Tangent of `x` (radians). |
| `floor(x)` | Largest integer ≤ `x`. |
| `ceil(x)` | Smallest integer ≥ `x`. |
| `round(x)` | Round to nearest integer. |
| `abs(x)` | Absolute value. |
| `log(x)` | Natural logarithm. |
| `atan2(y, x)` | Arc tangent of y/x (radians). |
| `sign(x)` | Sign of x (-1, 0, or 1). |
| `deg_to_rad(deg)` | Convert degrees to radians. |
| `rad_to_deg(rad)` | Convert radians to degrees. |
| `min(a, b)` | Minimum of two values. |
| `max(a, b)` | Maximum of two values. |
| `clamp(x, lo, hi)` | Clamp `x` to [lo, hi]. |
| `round_to(x, decimals)` | Round to N decimal places. |
| `lerp(a, b, t)` | Linear interpolation: a + (b - a) * t. |
| `PI` | Constant π (float). |
| `E` | Constant e (float). |

---

## Type conversion

| Function | Description |
|----------|-------------|
| `str(...)` | Concatenate arguments as strings. |
| `int(x)` | Convert to integer. |
| `float(x)` | Convert to float. |
| `parse_int(s)` | Parse string to integer; returns nil on failure. |
| `parse_float(s)` | Parse string to float; returns nil on failure. |
| `chr(n)` | Integer code point to single-character string (ASCII/UTF-8). |
| `ord(s)` | First character of string to integer code point. |
| `hex(n)` | Integer to hexadecimal string (e.g. `"ff"`). |
| `bin(n)` | Integer to binary string (e.g. `"1010"`). |

---

## Collections & length

| Function | Description |
|----------|-------------|
| `array(...)` | Build array from arguments. |
| `len(x)` | Length of array, string, or map. |
| `push(arr, x)` | Append `x` to array; returns array. |
| `push_front(arr, x)` | Prepend `x` to array; returns array. |
| `slice(arr, start, end)` | Subarray from index start to end (or to end if omitted). |
| `keys(m)` | Array of keys of map `m`. |
| `values(m)` | Array of values of map `m`. |
| `has(m, key)` | True if map has key. |
| `copy(x)` | Deep copy of value (array, map, or primitive). |
| `freeze(x)` | Deep copy (immutable by convention). |
| `deep_equal(a, b)` | Structural equality for arrays and maps. |
| `insert_at(arr, index, value)` | Insert value at index (in place); returns array. |
| `remove_at(arr, index)` | Remove element at index (in place); returns removed value or nil. |

**Spread in array literals:** `[...arr]` flattens `arr` into the new array, e.g. `[...a, ...b]` concatenates arrays. See [language_syntax.md](language_syntax.md).

---

## Testing

| Function | Description |
|----------|-------------|
| `assert_eq(a, b [, message])` | Assert deep equality; throws with optional message on failure (for tests). |

---

## Advanced (encoding, CSV, time, stack, env)

| Function | Description |
|----------|-------------|
| `base64_encode(s)` | Encode string to Base64. |
| `base64_decode(s)` | Decode Base64 string. |
| `uuid()` | Generate a UUID v4-style string (random hex). |
| `hash_fnv(s)` | FNV-1a 64-bit hash of string (integer). |
| `csv_parse(s)` | Parse CSV string; returns array of rows (each row = array of strings). Supports quoted fields. |
| `csv_stringify(rows)` | Serialize array of rows to CSV string. |
| `time_format(fmt [, t])` | strftime-style format; `t` = time() or current. e.g. `time_format("%Y-%m-%d %H:%M")`. |
| `stack_trace_array()` | Current call stack as array of `{name, line, column}` maps. |
| `is_nan(x)` | True if x is NaN. |
| `is_inf(x)` | True if x is ±infinity. |
| `env_all()` | All environment variables as map (key → value). |
| `escape_regex(s)` | Escape regex special characters in string. |

### Type predicates (fully integrated)

| Function | Description |
|----------|-------------|
| `is_string(x)` | True if x is a string. |
| `is_array(x)` | True if x is an array. |
| `is_map(x)` | True if x is a map. |
| `is_number(x)` | True if x is int or float. |
| `is_function(x)` | True if x is a function. |

---

## Array combinators

| Function | Description |
|----------|-------------|
| `map(arr, fn)` | New array: fn applied to each element. |
| `filter(arr, fn)` | New array: elements for which fn is truthy. |
| `reduce(arr, fn, init)` | Fold left with fn(acc, elem). |
| `flat_map(arr, fn)` | Map then flatten one level. |
| `flatten(arr)` | Flatten one level. |
| `zip(arr1, arr2)` | Array of [a, b] pairs; length = min of both. |
| `chunk(arr, n)` | Split into chunks of size n. |
| `unique(arr)` | Deduplicate by string representation. |
| `reverse(arr)` | New reversed array (or in-place depending on impl). |
| `find(arr, value)` | Index of first match, or -1. |
| `sort(arr)` | In-place sort (by string representation). |
| `sort_by(arr, fn)` | In-place sort; fn(a, b) true ⇒ a before b. |
| `first(arr)` | First element; nil if empty. |
| `last(arr)` | Last element; nil if empty. |
| `take(arr, n)` | First n elements. |
| `drop(arr, n)` | Skip first n elements. |
| `cartesian(arr1, arr2)` | Cartesian product; array of [a, b] pairs. |
| `window(arr, n)` | Sliding window; array of consecutive subarrays of size n. |

---

## String

| Function | Description |
|----------|-------------|
| `upper(s)` | Uppercase. |
| `lower(s)` | Lowercase. |
| `replace(s, from, to)` | Replace occurrences of `from` with `to`. |
| `join(arr, sep)` | Join array of strings with separator. |
| `split(s, sep)` | Split string into array. |
| `trim(s)` | Trim leading/trailing whitespace. |
| `starts_with(s, prefix)` | True if string starts with prefix. |
| `ends_with(s, suffix)` | True if string ends with suffix. |
| `repeat(s, n)` | Repeat string n times. |
| `pad_left(s, n)` | Pad left to length n (spaces). |
| `pad_right(s, n)` | Pad right to length n (spaces). |
| `split_lines(s)` | Split into lines (array of strings). |
| `format(fmt, ...)` | printf-style formatting (%s, %d, %f, %%). |
| `regex_match(s, pattern)` | True if string matches regex. |
| `regex_replace(s, pattern, repl)` | Replace all matches of pattern with repl. |

---

## File I/O

| Function | Description |
|----------|-------------|
| `read_file(path)` | Read entire file as string; null on error. |
| `write_file(path, content)` | Write string to file; returns true/false. |
| `readFile(path)` | Alias for read_file. |
| `writeFile(path, content)` | Alias for write_file. |
| `fileExists(path)` | True if file exists. |
| `listDir(path)` | Array of names in directory. |
| `listDirRecursive(path)` | Array of full paths under directory. |
| `create_dir(path)` | Create directory (and parents). |
| `is_file(path)` | True if path is a file. |
| `is_dir(path)` | True if path is a directory. |
| `copy_file(src, dest)` | Copy file. |
| `delete_file(path)` | Remove file or empty directory. |
| `move_file(src, dest)` | Rename/move file. |

### Path helpers

| Function | Description |
|----------|-------------|
| `basename(path)` | Last component of path (file or directory name). |
| `dirname(path)` | Directory part of path. |
| `path_join(part1, part2, ...)` | Join path segments (e.g. `path_join("dir", "file.txt")`). |
| `cwd()` | Current working directory (string). |
| `chdir(path)` | Change working directory; returns true on success. |
| `realpath(path)` | Resolve to absolute canonical path; nil on error. |
| `temp_dir()` | System temp directory path. |
| `file_size(path)` | File size in bytes; nil if not a file or error. |
| `glob(pattern [, base_dir])` | List paths matching pattern (`*` and `?`); base_dir defaults to cwd. |

---

## OS & process (for programs, scripts, tools)

| Function | Description |
|----------|-------------|
| `getpid()` | Current process ID. |
| `hostname()` | Machine hostname. |
| `cpu_count()` | Number of hardware threads (for parallelism). |
| `monotonic_time()` | Seconds since arbitrary point (for timing deltas, not wall clock). |
| `env_set(name, value)` | Set environment variable (value = nil to unset on POSIX). |

---

## Time

| Function | Description |
|----------|-------------|
| `time()` | Current Unix timestamp (seconds). |
| `sleep(seconds)` | Block for given seconds (float). |

---

## Error handling & system

| Function | Description |
|----------|-------------|
| `panic(msg)` | Return a simple error map (throw it to abort). |
| `error_message(err)` | Extract message from caught error (map or string). |
| `Error(msg [, code [, cause]])` | Build error map; optional code and chained cause. |
| `error_name(err)` | Exception type name (e.g. `"ValueError"`) or `"Error"`. |
| `error_cause(err)` | Chained cause error or nil. |
| `is_error_type(err, typeName)` | True if error's name equals typeName. |
| `ValueError(msg)` | Build error with name `"ValueError"`. |
| `TypeError(msg)` | Build error with name `"TypeError"`. |
| `RuntimeError(msg)` | Build error with name `"RuntimeError"`. |
| `OSError(msg)` | Build error with name `"OSError"`. |
| `KeyError(msg)` | Build error with name `"KeyError"`. |
| `cli_args()` | Array of command-line arguments (argv). |
| `env_get(name)` | Environment variable value; nil if not set. |
| `stack_trace()` | Current call stack as string. |
| `assertType(value, typeStr)` | Throw if value's type doesn't match (e.g. "number", "string"). |

---

## JSON

| Function | Description |
|----------|-------------|
| `json_parse(s)` | Parse JSON string to value (array/map); nil on error. |
| `json_stringify(x)` | Serialize value to JSON string. |

---

## Random

| Function | Description |
|----------|-------------|
| `random()` | Random float in [0, 1). |
| `random_int(lo, hi)` | Random integer in [lo, hi] inclusive. |
| `random_choice(arr)` | Random element from array. |
| `random_shuffle(arr)` | Shuffle array in place. |

---

## Logging

| Function | Description |
|----------|-------------|
| `log_info(msg)` | Log info message. |
| `log_warn(msg)` | Log warning. |
| `log_error(msg)` | Log error. |
| `log_debug(msg)` | Log debug message. |

---

## Reflection

| Function | Description |
|----------|-------------|
| `type(x)` | Type name of value (e.g. "number", "string", "array"). |
| `dir(x)` | Attributes/keys of value (e.g. map keys, or builtin list for types). |

---

## Profiling

| Function | Description |
|----------|-------------|
| `profile_cycles()` | VM cycle count since last run (or since reset). |
| `profile_cycles(1)` | Reset cycle counter and return previous count. |
| `profile_fn(fn, iterations)` | Run function N times; return total cycle count. |

---

## Utilities

| Function | Description |
|----------|-------------|
| `range(n)` | Array [0, 1, ..., n-1]. |
| `range(start, end)` | Array [start, ..., end-1]. |
| `range(start, end, step)` | Array with step. |
| `default(x, fallback)` | Return x if truthy, else fallback. |
| `merge(m1, m2)` | New map with m1 then m2 (m2 overwrites). |
| `all(arr)` | True if all elements truthy. |
| `any(arr)` | True if any element truthy. |
| `vec2(x, y)` | Return [x, y]. |
| `vec3(x, y, z)` | Return [x, y, z]. |
| `rand_vec2()` | Random [x, y] in [0,1). |
| `rand_vec3()` | Random [x, y, z] in [0,1). Optional (lo, hi) range. |
| `Instance` | Used for class instances (internal). |

---

## Memory and pointers

See **[LOW_LEVEL_AND_MEMORY.md](LOW_LEVEL_AND_MEMORY.md)** for full details and examples.

| Function | Description |
|----------|-------------|
| `alloc(size)` | Allocate bytes; returns pointer (ptr). |
| `free(ptr)` | Free block from alloc. |
| `ptr_address(ptr)` | Numeric address of pointer. |
| `ptr_from_address(addr)` | Pointer from integer address. |
| `ptr_offset(ptr, bytes)` | Pointer at ptr + bytes. |
| `ptr + n` / `ptr - n` | Pointer arithmetic (syntax). |
| `peek8`–`peek64`, `poke8`–`poke64` | Read/write 1–8 bytes at pointer. |
| `peek_float(ptr)`, `poke_float(ptr, v)` | 4-byte float. |
| `peek_double(ptr)`, `poke_double(ptr, v)` | 8-byte double. |
| `mem_copy(dest, src, n)` | Copy n bytes. |
| `mem_set(ptr, byte, n)` | Set n bytes to byte. |
| `mem_cmp(a, b, n)` | Compare n bytes; 0 if equal. |
| `mem_move(dest, src, n)` | Move n bytes (overlap-safe). |
| `mem_swap(dest, src, n)` | Swap n bytes between two regions. |
| `realloc(ptr, size)` | Resize block; returns new ptr. |
| `peek8s`–`peek64s` | Signed 8/16/32/64-bit read (sign-extended). |
| `bytes_read(ptr, n)` | Read n bytes as array of 0–255. |
| `bytes_write(ptr, byte_array)` | Write bytes from array to ptr. |
| `ptr_is_null(ptr)` | True if pointer is null. |
| `size_of_ptr()` | Size in bytes of a pointer (4 or 8). |
| `align_up(value, align)` | Smallest ≥ value multiple of align. |
| `align_down(value, align)` | Largest ≤ value multiple of align. |
| `ptr_align_up(ptr, align)` | Pointer rounded up to alignment. |
| `ptr_align_down(ptr, align)` | Pointer rounded down to alignment. |
| `memory_barrier()` | Compiler memory barrier. |
| `volatile_load8`–`volatile_load64`, `volatile_store8`–`volatile_store64` | Volatile read/write. |

---

## Standard library modules (import("name"))

You can group builtins under a namespace with `import("module_name")`. The module name must be in quotes inside the parentheses. The following module names are recognized. Use `import("math")` then e.g. `math.sqrt(2)`.

| Module | Contents |
|--------|----------|
| **math** | sqrt, pow, sin, cos, tan, floor, ceil, round, abs, min, max, clamp, lerp, log, atan2, sign, deg_to_rad, rad_to_deg, PI, E |
| **string** | upper, lower, replace, join, split, trim, starts_with, ends_with, repeat, pad_left, pad_right, split_lines, format, len, regex_match, regex_replace |
| **json** | json_parse, json_stringify |
| **random** | random, random_int, random_choice, random_shuffle |
| **sys** | cli_args, print, panic, error_message, Error, stack_trace, assertType |
| **io** | read_file, write_file, readFile, writeFile, fileExists, listDir, listDirRecursive, create_dir, is_file, is_dir, copy_file, delete_file, move_file |
| **array** | array, len, push, push_front, slice, map, filter, reduce, reverse, find, sort, flatten, flat_map, zip, chunk, unique, first, last, take, drop, sort_by, copy, cartesian, window, deep_equal |
| **map** | keys, values, has, merge, deep_equal, copy |
| **env** | env_get |
| **types** | str, int, float, parse_int, parse_float |
| **debug** | inspect, type, dir, stack_trace |
| **log** | log_info, log_warn, log_error, log_debug |
| **time** | time, sleep |
| **memory** | alloc, free, ptr_address, ptr_from_address, ptr_offset, peek8–peek64, peek8s–peek64s, poke8–poke64, peek_float, poke_float, peek_double, poke_double, mem_copy, mem_set, mem_cmp, mem_move, mem_swap, realloc, bytes_read, bytes_write, ptr_is_null, size_of_ptr, align_up, align_down, ptr_align_up, ptr_align_down, memory_barrier, volatile_load/store 8/16/32/64 |
| **util** | range, default, merge, all, any, vec2, vec3, rand_vec2, rand_vec3 |
| **profiling** | profile_cycles, profile_fn |
| **path** | basename, dirname, path_join, read_file, write_file, fileExists, listDir, listDirRecursive, create_dir, is_file, is_dir, copy_file, delete_file, move_file |
| **errors** | Error, panic, error_message, error_name, error_cause, ValueError, TypeError, RuntimeError, OSError, KeyError, is_error_type |
| **iter** | range, map, filter, reduce, all, any, cartesian, window |
| **collections** | array, len, push, push_front, slice, keys, values, has, map, filter, reduce, reverse, find, sort, flatten, flat_map, zip, chunk, unique, first, last, take, drop, sort_by, copy, merge, deep_equal, cartesian, window |
| **fs** | Same as **io** (alias): read_file, write_file, fileExists, listDir, create_dir, is_file, is_dir, copy_file, delete_file, move_file, etc. |
| **process** | *(Native module)* process.list, process.find, process.open, process.close, process.read_* / process.write_*, process.ptr_add, process.ptr_sub, process.ptr_diff, process.scan, process.scan_bytes. See **Process module** below. |

### Python-inspired modules (SPL names)

These modules re-export builtins under names similar to Python’s standard library (with SPL-style names):

| SPL module | Python analogue | Contents |
|------------|-----------------|----------|
| **regex** | re | regex_match, regex_replace, escape_regex |
| **csv** | csv | csv_parse, csv_stringify |
| **b64** | base64 | base64_encode, base64_decode |
| **logging** | logging | log_info, log_warn, log_error, log_debug |
| **hash** | hashlib | hash_fnv |
| **uuid** | uuid | uuid |
| **os** | os | cwd, chdir, getpid, hostname, cpu_count, env_get, env_all, env_set, listDir, create_dir, is_file, is_dir, temp_dir, realpath |
| **copy** | copy | copy, deep_equal |
| **datetime** | datetime | time, sleep, time_format, monotonic_time |
| **secrets** | secrets | random, random_int, random_choice, random_shuffle, uuid |
| **itools** | itertools | range, map, filter, reduce, all, any, cartesian, window |
| **cli** | argparse | cli_args |
| **encoding** | — | base64_encode, base64_decode, string_to_bytes, bytes_to_string |
| **run** | — | cli_args, exit_code |

Optional SPL libraries (import by file path; add globals): **lib/spl/stats.spl** (mean, median, variance, stdev), **lib/spl/funtools.spl** (partial, memoize, compose), **lib/spl/textwrap.spl** (wrap, shorten, fill), **lib/spl/html.spl** (escape, unescape), **lib/spl/counter.spl** (count_elements, most_common). See also **lib/spl/algo.spl**, **lib/spl/result.spl**.

Example:

```spl
import("math")
print(math.sqrt(2))
print(math.PI)

import("types")
let n = types.parse_int("42")

import("memory")
let p = memory.alloc(64)
memory.mem_set(p, 0, 64)
memory.free(p)

import("log")
log.log_info("Started")
```

---

## Process module (external process memory)

**import("process")** returns a module for inspecting and modifying another process’s memory (e.g. debugging tools, memory scanners, educational use). **Windows only** in the default build; on other platforms the module is stubbed (list returns [], open throws).

### Process lifecycle

| Function | Description |
|----------|-------------|
| `process.list()` | Returns an array of maps `{ "pid": number, "name": string }` for running processes. |
| `process.find(name)` | Returns the PID of a process whose executable name matches `name`, or -1. |
| `process.open(pid)` | Opens the process with the given PID; returns a handle (integer). Throws if access denied or process not found. |
| `process.close(handle)` | Closes the handle; no further read/write with it. |

### Memory read

All addresses are 64-bit integers (e.g. `0x140000000`). Requires an open handle.

| Function | Description |
|----------|-------------|
| `process.read_u8(handle, address)` | Read unsigned 8-bit integer. |
| `process.read_u16(handle, address)` | Read unsigned 16-bit integer. |
| `process.read_u32(handle, address)` | Read unsigned 32-bit integer. |
| `process.read_u64(handle, address)` | Read unsigned 64-bit integer. |
| `process.read_i32(handle, address)` | Read signed 32-bit integer. |
| `process.read_float(handle, address)` | Read 32-bit float. |
| `process.read_double(handle, address)` | Read 64-bit double. |
| `process.read_bytes(handle, address, size)` | Read `size` bytes; returns array of integers (0–255). Max size 1 MiB. |

### Memory write

| Function | Description |
|----------|-------------|
| `process.write_u8(handle, address, value)` | Write one byte. |
| `process.write_u32(handle, address, value)` | Write 32-bit unsigned. |
| `process.write_float(handle, address, value)` | Write 32-bit float. |
| `process.write_bytes(handle, address, byte_array)` | Write bytes from an array of integers (0–255). |

### Pointer utilities

Addresses are 64-bit integers. Use these for pointer arithmetic.

| Function | Description |
|----------|-------------|
| `process.ptr_add(ptr, offset)` | Returns `ptr + offset` as integer. |
| `process.ptr_sub(ptr, offset)` | Returns `ptr - offset` as integer. |
| `process.ptr_diff(ptr_a, ptr_b)` | Returns `ptr_a - ptr_b` as integer. |

### Scanning

| Function | Description |
|----------|-------------|
| `process.scan(handle, start_addr, end_addr, value)` | Scans for 32-bit `value` in [start, end); returns array of addresses. Range max 64 MiB. |
| `process.scan_bytes(handle, pattern)` | Scans process memory for `pattern` (string or byte array); returns array of addresses. Stops after 1000 matches or end of readable memory. |

### Example

```spl
let process = import("process")
let pid = process.find("game.exe")
let handle = process.open(pid)
let x = process.read_float(handle, 0x12345678)
let y = process.read_float(handle, process.ptr_add(0x12345678, 4))
print("X:", x, "Y:", y)
process.close(handle)
```

### Safety notes

- **Permissions:** On Windows, opening another process requires sufficient privileges (e.g. run the SPL interpreter as administrator, or ensure the target process has the same user). Otherwise `process.open` throws.
- **Invalid address:** Read/write to invalid or unmapped addresses throws (e.g. "ReadProcessMemory failed").
- **Handles:** Always call `process.close(handle)` when done to release the OS handle.
- **Use responsibly:** This module is intended for debugging, education, and testing. Do not use to circumvent security or integrity of systems you do not own or have permission to inspect.

---

## Game and 2dgraphics (optional)

When SPL is built with **SPL_BUILD_GAME=ON** (Raylib):

- **import "game"** – Returns a map of game builtins (window, draw, input, sound, camera, etc.). See [SPL_GAME_API.md](SPL_GAME_API.md).
- **import "2dgraphics"** – Returns a map of 2dgraphics builtins (createWindow, beginFrame, fillRect, drawText, sprites, input, camera, etc.). See [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md).

These are **not** part of the core standard library; they are optional modules available only in the **spl** and **spl_repl** executables when built with game support. The **spl_game** executable does not support `import`; it exposes game builtins as globals only and does not provide 2dgraphics.

---

## See also

- [LOW_LEVEL_AND_MEMORY.md](LOW_LEVEL_AND_MEMORY.md) – Full details and examples for alloc, peek/poke, mem_*, alignment, volatile, etc.
- [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) – Example scripts that use builtins (e.g. 07_math.spl, 20_file_io.spl, 70_map_filter_reduce.spl, low_level_memory.spl).
- [SPL_GAME_API.md](SPL_GAME_API.md) and [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md) – Optional game and 2dgraphics APIs when built with Raylib.
