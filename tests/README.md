# SPL Tests

Run tests from project root (so `lib/spl` and paths resolve), or set `SPL_LIB` to the project root.

```powershell
# From project root
.\build\Release\spl.exe tests\test_parser.spl
.\build\Release\spl.exe tests\test_builtins.spl
```

Or use the project's test runner:

```powershell
.\run_all_tests.ps1 -Examples examples -Exe .\build\Release\spl.exe
```

- **test_parser.spl** – expressions, arrays, maps; no runtime errors.
- **test_builtins.spl** – asserts on sqrt, floor, min, max, type (requires `assert_eq` in scope; use `import("lib/spl/testing.spl")` if your build doesn't provide `assert_eq` globally).

If `assert_eq` is not a core builtin, run test_builtins after importing the testing module, or use a script that only prints and checks output.
