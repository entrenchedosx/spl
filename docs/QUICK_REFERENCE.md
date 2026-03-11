# SPL Quick Reference

One-page cheat sheet for SPL (Simple Programming Language).

---

## Run & CLI

| Command | Description |
|---------|-------------|
| `spl script.spl` | Run script. |
| `spl` | Start REPL. |
| `spl --check file.spl` | Compile only (exit 0 if OK). |
| `spl --lint file.spl` | Same as `--check`. |
| `spl --fmt file.spl` | Format (indent by braces). |
| `spl --ast file.spl` | Dump AST. |
| `spl --bytecode file.spl` | Dump bytecode. |
| `spl --version` / `spl -v` | Print version. |

---

## Basics

```spl
let x = 10
const name = "SPL"
print("Hello", name)

if (x > 0) { print("positive") }
elif (x < 0) { print("negative") }
else { print("zero") }

for (i in range(0, 10)) { print(i) }
for (i in range(0, 20, 2)) { print(i) }   // step 2
while (x > 0) { x = x - 1 }
```

---

## Functions

```spl
def add(a, b) { return a + b }
def greet(name = "world") { return "Hello, " + name }
def multi() { return 1, 2, 3 }   // returns array
let f = lambda (x) => x * 2
```

---

## Types & conversion

```spl
str(42)           // "42"
int("100")        // 100
float("3.14")     // 3.14
chr(65)           // "A"
ord("A")          // 65
hex(255)          // "ff"
bin(10)           // "1010"
parse_int("x")    // nil on failure
round_to(3.14159, 2)  // 3.14
is_string(x)
is_array(x)
is_map(x)
is_number(x)
is_function(x)
```

---

## Collections

```spl
let arr = [1, 2, 3]
let combined = [...a, ...b]   // spread: flatten arrays into new array
x |> sqrt                    // pipeline: sqrt(x)
[ for x in arr : x * 2 ]     // list comprehension (optional: if cond)
let m = {"a": 1, "b": 2}
len(arr)
push(arr, 4)
slice(arr, 0, 2)
keys(m)
values(m)
has(m, "a")
copy(x)           // deep copy
deep_equal(a, b)
insert_at(arr, i, x)   // insert at index
remove_at(arr, i)      // remove at index, returns value
```

---

## Strings

```spl
upper(s)
lower(s)
replace(s, old, new)
join(arr, sep)
split(s, sep)
trim(s)
repeat(s, n)
starts_with(s, prefix)
ends_with(s, suffix)
format("{} + {} = {}", a, b, a + b)
```

---

## I/O & system

```spl
print(...)
readline()        // one line from stdin
readline("> ")    // with prompt
read_file(path)
write_file(path, content)
cli_args()        // argv as array
env_get("HOME")
time()            // seconds
sleep(1.0)
exit_code(0)
```

---

## Error handling

```spl
try {
  // ...
} catch (e) {
  print(error_message(e))
} finally {
  // ...
}
throw ValueError("bad value")
defer cleanup()
assert (x > 0), "x must be positive"
assert_eq(got, expected, "test failed")
```

---

## Modules

```spl
import "math"
math.sqrt(2)
math.PI
math.clamp(x, 0, 1)

import "string"
string.upper("hi")

import "json"
json.json_parse(str)
json.json_stringify(obj)

import "io"
io.readline("> ")
```

---

## Testing

```spl
assert_eq(actual, expected)
assert_eq(actual, expected, "custom message")
```

---

## Advanced

```spl
base64_encode(s) / base64_decode(s)
uuid()                           // UUID v4-style string
hash_fnv(s)                      // 64-bit FNV-1a hash
csv_parse(s)                     // array of rows
csv_stringify(rows)
time_format("%Y-%m-%d", t?)
stack_trace_array()              // [{name, line, column}, ...]
is_nan(x) / is_inf(x)
env_all()                        // map of all env vars
escape_regex(s)
```

## OS & process (programs, scripts, tools)

```spl
cwd()                            // current working directory
chdir(path)                      // change directory
hostname()                       // machine hostname
getpid()                         // process ID
cpu_count()                      // hardware thread count
temp_dir()                       // system temp dir
realpath(path)                   // canonical path
file_size(path)                  // bytes or nil
glob("*.spl" [, base_dir])       // match * and ?
monotonic_time()                 // seconds for deltas
env_set(name, value)             // set env (nil = unset on POSIX)
```

---

## More

- Full builtins: [standard_library.md](standard_library.md)
- Syntax: [language_syntax.md](language_syntax.md)
- Build: [GETTING_STARTED.md](GETTING_STARTED.md)
