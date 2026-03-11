# SPL Examples

Run from project root (so `lib` and paths resolve):

```powershell
.\build\Release\spl.exe examples\01_hello.spl
```

| File | Description |
|------|-------------|
| 01_hello.spl | Minimal: print |
| 02_variables.spl | let, const, types |
| 03_conditionals.spl | if, elif, else |
| 04_loops.spl | for range(), while |
| 05_functions.spl | def, return, recursion |
| 06_arrays.spl | array(), push, len, index |
| 07_maps.spl | map literal, keys, access |
| 08_strings.spl | str, len, slice |
| 09_import_stdlib.spl | import("math"), import("sys") |
| 10_file_io.spl | write_file, read_file, delete_file |
| 11_try_catch.spl | try/catch, throw, error_message |
| 12_lambda.spl | lambda, call |
| 13_graphics.spl | g2d (requires Raylib build) |
| 14_match.spl | match/case statement |
| 15_bouncy_ball.spl | g2d bouncy ball (requires Raylib) |

Graphics examples (13, 15) need SPL built with Raylib; they exit with a message if g2d is not available.
