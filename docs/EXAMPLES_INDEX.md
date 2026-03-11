# SPL Examples Index

This document lists the example scripts in the **examples/** folder, with a short description and which runner to use.

---

## How to run

- **spl** – `spl examples/<file>.spl` (use for stdlib, import math/game/2dgraphics, most demos).
- **spl_repl** – Interactive; paste or type the same code.
- **spl_game** – Only for scripts that use **global** game builtins (`window_create`, `key_down`, etc.) with **no** `import`. Use: `spl_game examples/<file>.spl`.

Scripts that use `import "2dgraphics"` or `import "game"` must be run with **spl** (or spl_repl), not spl_game. When the project is built **without** game support (`-DSPL_BUILD_GAME=OFF`), skip graphics/game examples or they will fail (e.g. import returns nil).

---

## Smoke and feature demos

| File | Description | Runner |
|------|-------------|--------|
| **00_full_feature_smoke.spl** | Broad smoke test of language features. | spl |
| **features_demo.spl** | Newer features: multiple returns, range/step, time literals, optional indexing, loop labels. | spl |
| **advanced_features_demo.spl** | Advanced language features demo. | spl |
| **advanced_test.spl** | Additional advanced tests. | spl |
| **super_advanced_test.spl** | Long-running comprehensive test; run manually if needed. | spl |
| **minimal.spl** | Minimal script. | spl |
| **hello.spl** | Hello world. | spl |
| **just1.spl** | Trivial script. | spl |
| **input_demo.spl** | readline(), cli_args(), chr/ord/hex/bin. | spl |
| **test_assert_eq.spl** | assert_eq() for tests. | spl |
| **spread_advanced.spl** | Spread in array literal: [...a, ...b]. | spl |
| **os_and_system.spl** | cwd, chdir, hostname, cpu_count, temp_dir, getpid, monotonic_time, file_size, glob, env_set. | spl |
| **types_and_arrays.spl** | is_string, is_array, is_map, is_number, is_function, round_to, insert_at, remove_at. | spl |
| **pipeline_and_comprehension.spl** | Pipeline `x |> f`, list comprehension `[ for x in iter : expr ]` and `if` filter. | spl |

---

## Language basics (numbered)

| File | Description | Runner |
|------|-------------|--------|
| **01_arithmetic.spl** | Arithmetic operators. | spl |
| **02_variables.spl** | Variables (let, const). | spl |
| **03_conditionals.spl** | if / else. | spl |
| **04_for_range.spl** | for with range. | spl |
| **05_while.spl** | while loop. | spl |
| **06_functions.spl** | Function definitions and calls. | spl |
| **07_math.spl** | Math builtins. | spl |
| **08_strings.spl** | String operations. | spl |
| **09_arrays.spl** | Arrays and indexing. | spl |
| **10_comparison.spl** | Comparison operators. | spl |
| **11_logical.spl** | Logical operators. | spl |
| **12_ternary.spl** | Ternary operator. | spl |
| **13_nested_loops.spl** | Nested loops. | spl |
| **14_fibonacci.spl** | Fibonacci. | spl |
| **15_factorial.spl** | Factorial. | spl |
| **16_default_args.spl** | Default arguments. | spl |
| **17_scope.spl** | Scoping. | spl |
| **18_time.spl** | time(), sleep(). | spl |
| **19_inspect.spl** | inspect() builtin. | spl |
| **20_file_io.spl** | read_file, write_file. | spl |
| **20_fstrings.spl** | F-strings. | spl |
| **21_bitwise.spl** | Bitwise operators. | spl |
| **21_multiline_strings.spl** | Multi-line strings. | spl |
| **22_compound_assign.spl** | +=, -=, etc. | spl |
| **22_optional_chaining.spl** | Optional chaining ?. | spl |
| **22b_map_field.spl** | Map field access. | spl |
| **22c_debug_map.spl** | Map debugging. | spl |
| **22d_index_access.spl** | Index access. | spl |
| **22e_simple_map.spl** | Simple map. | spl |
| **22f_opt_simple.spl** | Optional simple. | spl |
| **22g_no_opt.spl** | Optional (no). | spl |
| **22h_null_only.spl** | Null only. | spl |
| **22i_assign_opt.spl** | Assign optional. | spl |
| **23_float_ops.spl** | Float operations. | spl |
| **23_destructuring.spl** | Destructuring. | spl |
| **23b_array_lit.spl** | Array literals. | spl |
| **23c_array_builtin.spl** | array() builtin. | spl |
| **24_break_continue.spl** | break / continue. | spl |
| **24_default_args.spl** | Default args. | spl |
| **24b_simple_default.spl** | Simple default. | spl |
| **24c_no_default.spl** | No default. | spl |
| **25_type_dir.spl** | type(), dir(). | spl |
| **25_nested_blocks.spl** | Nested blocks. | spl |
| **26_multiple_returns.spl** | Multiple return values. | spl |
| **27_expression_only.spl** | Expression only. | spl |
| **28_string_concat.spl** | String concatenation. | spl |
| **29_array_index.spl** | Array indexing. | spl |
| **30_elif_chain.spl** | elif chain. | spl |
| **31_sum_loop.spl** | Sum loop. | spl |
| **32_pow_loop.spl** | pow in loop. | spl |
| **33_compare_floats.spl** | Float comparison. | spl |
| **34_null.spl** | null. | spl |
| **35_boolean_ops.spl** | Boolean operations. | spl |
| **36_func_no_return.spl** | Function with no return. | spl |
| **37_pass_array.spl** | Pass array to function. | spl |
| **38_global_modify.spl** | Modify global. | spl |
| **39_nested_if.spl** | Nested if. | spl |
| **40_comments.spl** | Comments. | spl |
| **41_negative.spl** | Negative numbers. | spl |
| **42_many_locals.spl** | Many locals. | spl |
| **43_chain_calls.spl** | Chained calls. | spl |
| **44_empty_block.spl** | Empty block. | spl |
| **45_single_line.spl** | Single line. | spl |
| **46_equality.spl** | Equality. | spl |
| **47_while_cond.spl** | while condition. | spl |
| **48_for_single.spl** | for single. | spl |
| **49_zero.spl** | Zero. | spl |
| **50_large_num.spl** | Large numbers. | spl |
| **51_escape_str.spl** | String escapes. | spl |
| **52_multiline_str.spl** | Multiline string. | spl |
| **53_return_early.spl** | Early return. | spl |
| **54_map_like.spl** | Map-like. | spl |
| **55_math_precision.spl** | Math precision. | spl |
| **56_try_catch.spl** | try / catch. | spl |
| **57_map_literal.spl** | Map literal. | spl |
| **58_for_in_array.spl** | for-in array. | spl |
| **59_slice.spl** | Slicing. | spl |
| **60_match.spl** | match expression. | spl |
| **61_break_continue.spl** | break/continue. | spl |
| **62_match_destructure.spl** | Match destructuring. | spl |
| **63_assert.spl** | assert. | spl |
| **64_match_guards.spl** | Match guards. | spl |
| **65_profile_cycles.spl** | profile_cycles(). | spl |
| **66_hybrid_syntax.spl** | Hybrid syntax styles. | spl |
| **67_chained_assignment.spl** | Chained assignment. | spl |
| **68_null_coalescing.spl** | Null coalescing ??. | spl |
| **69_repeat_defer_random.spl** | repeat, defer, random. | spl |
| **70_map_filter_reduce.spl** | map, filter, reduce. | spl |
| **70b_direct_lambda.spl** | Direct lambda. | spl |
| **71_advanced_error_handling.spl** | Advanced error handling. | spl |
| **72_advanced_errors.spl** | try/catch/else/finally, catch by type, Error cause, error_name, is_error_type. | spl |
| **72_builtins_math_constants.spl** | PI, E. | spl |
| **73_builtins_string_ops.spl** | String builtins. | spl |
| **74_range_builtin.spl** | range() builtin. | spl |
| **75_copy_deep_equal.spl** | copy(), deep_equal(). | spl |
| **76_random_builtins.spl** | Random builtins. | spl |
| **77_nested_structures.spl** | Nested structures. | spl |
| **78_slice_negative_index.spl** | Negative slice index. | spl |
| **79_file_exists_list_dir.spl** | fileExists, listDir. | spl |
| **80_cli_args.spl** | cli_args(). | spl |
| **81_lambda_reduce_multiple_params.spl** | Lambda reduce. | spl |
| **82_for_in_map.spl** | for-in map. | spl |
| **83_defer_order.spl** | defer execution order. | spl |
| **84_inspect_type_dir.spl** | inspect, type, dir. | spl |
| **85_constant_folding.spl** | Constant folding. | spl |

---

## Modules and imports

| File | Description | Runner |
|------|-------------|--------|
| **test_import_math.spl** | import "math"; math.sqrt, etc. | spl |
| **game_module_demo.spl** | import "game"; use game.*. | spl |
| **json_demo.spl** | json_parse, json_stringify. | spl |
| **test_one_func.spl** | Single function test. | spl |

---

## Game and 2D graphics

| File | Description | Runner |
|------|-------------|--------|
| **game_simple_draw.spl** | Minimal game: window, draw_rect, key_down, game_loop. Uses **global** game builtins. | spl **or** spl_game |
| **game_pong_demo.spl** | Pong-style demo. Global game builtins. | spl or spl_game |
| **game_camera_demo.spl** | Camera (camera_set, camera_zoom). | spl or spl_game |
| **graphics_test.spl** | 2dgraphics module: createWindow, run(update, draw), shapes, text. **Requires** SPL_BUILD_GAME. | spl |
| **2dgraphics_shapes.spl** | 2dgraphics: setColor, fillRect, drawCircle, drawPolygon, rgb, hexColor. **Requires** SPL_BUILD_GAME. | spl |
| **2dgraphics_game_loop.spl** | 2dgraphics: manual loop, isKeyDown, beginFrame/endFrame, moving rectangle. **Requires** SPL_BUILD_GAME. | spl |

---

## Low-level memory

| File | Description | Runner |
|------|-------------|--------|
| **low_level_memory.spl** | alloc, free, peek/poke, pointer arithmetic, mem_set, mem_copy, alignment. See [LOW_LEVEL_AND_MEMORY.md](LOW_LEVEL_AND_MEMORY.md). | spl |

---

## Running all examples as tests

From the repo root:

```powershell
.\run_all_tests.ps1 -Exe build\Release\spl.exe -Examples examples
```

When building **without** game support (`build_FINAL.ps1 -NoGame`), use a skip list so graphics/game examples are not run (e.g. **build_FINAL.ps1** adds `graphics_test.spl`, `2dgraphics_shapes.spl`, `2dgraphics_game_loop.spl` to the skip list when `-NoGame` is used).

See also [TESTING.md](TESTING.md) (run_all_tests.ps1 options, skip list, timeout), [GETTING_STARTED.md](GETTING_STARTED.md), and [CLI_AND_REPL.md](CLI_AND_REPL.md).
