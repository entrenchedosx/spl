# Advanced error handling (Python/C++ style)

SPL provides exception handling similar to **Python** (try/except/else/finally, exception types, chained cause) and **C++** (try/catch by type, rethrow). In SPL you use **try / catch / else / finally** (not except).

## try / catch / else / finally

- **`try { ... }`** — Run the block; if it throws, jump to a matching catch.
- **`catch (e) { ... }`** — Catch any exception; bind it to `e` and run the block.
- **`catch (TypeName e) { ... }`** — Catch only when the exception’s **type name** equals `TypeName` (e.g. `ValueError`, `TypeError`). If it doesn’t match, the exception is **rethrown** so an outer catch can handle it.
- **`else { ... }`** — Runs **only when the try block completes without throwing** (like Python’s try/except/else).
- **`finally { ... }`** — Always runs after try (and catch/else if present), whether or not an exception was thrown.

Order: `try` → `catch` (optional) → `else` (optional) → `finally` (optional).

You can have only **one** catch per try. Use **`catch (TypeName e)`** to match one type (others rethrown) or **`catch (e)`** to match any.

Example:

```spl
try {
    doWork()
} catch (e) {
    print("caught:", error_message(e))
} else {
    print("no error")
} finally {
    cleanup()
}
```

## throw and rethrow

- **`throw expr`** — Throw any value (string, error map, etc.). Execution jumps to the nearest matching catch.
- **`rethrow`** — Re-throw the current exception (the one that was caught in this catch block). Use when you want to handle only a specific case and let the rest propagate.

## Error objects (maps)

Errors are values. The standard shape is a **map** with:

- **`message`** — Human-readable string.
- **`name`** — Exception type name (e.g. `"Error"`, `"ValueError"`).
- **`code`** — Optional string code (e.g. `"ERR_404"`).
- **`cause`** — Optional chained exception (for “caused by” chains).

Constructors:

- **`Error(message)`** — Base error.
- **`Error(message, code)`** — With optional code.
- **`Error(message, code, cause)`** — With optional chained cause (Python/C++ style).
- **`ValueError(message)`**, **`TypeError(message)`**, **`RuntimeError(message)`**, **`OSError(message)`**, **`KeyError(message)`** — Typed errors (name set automatically).
- **`panic(message)`** — Same as `Error(message)`; idiom: `throw panic("fatal")`.

Inspection:

- **`error_message(err)`** — Returns the message string (from a map or the value’s string).
- **`error_name(err)`** — Returns the exception type name (e.g. `"ValueError"`) or `"Error"` for non-map values.
- **`error_cause(err)`** — Returns the chained cause or nil.
- **`is_error_type(err, typeName)`** — True if `error_name(err) == typeName`.

## Catching by type

Use **`catch (TypeName e)`** to handle only that type; others are **rethrown** so an outer try/catch can handle them. One try has exactly one catch block (optionally with a type name).

## Chained exceptions (cause)

Build a “caused by” chain with **`Error(msg, code, cause)`**:

```spl
try {
    read_file(path)
} catch (e) {
    throw OSError("failed to read " + path, Error("io error", nil, e))
}
```

In the catch block you can walk the chain: `error_cause(e)` and again `error_cause(...)`.

## else clause

The **else** block runs only when **no** exception was thrown in try (like Python):

```spl
try {
    let data = getData()
} catch (e) {
    print("getData failed:", e)
} else {
    print("got:", data)
}
```

## stack_trace()

In a catch block, **`stack_trace()`** returns the call stack at the point of the call (useful for logging or attaching to an error map before rethrowing).

## Summary

| Feature            | SPL |
|--------------------|-----|
| try/catch/finally  | ✓   |
| try/catch/else     | ✓   |
| catch by type      | ✓ `catch (ValueError e)` |
| throw / rethrow    | ✓   |
| Error with cause   | ✓ `Error(msg, code, cause)` |
| error_name/cause   | ✓   |
| Typed constructors | ✓ ValueError, TypeError, RuntimeError, OSError, KeyError |

See **`examples/72_advanced_errors.spl`** for a full demo.
