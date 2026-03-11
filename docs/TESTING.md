# SPL Testing

How to run the example suite and integrate testing into your workflow.

---

## run_all_tests.ps1

**Purpose:** Run every `.spl` file in a folder with `spl.exe` and report pass/fail (exit code 0 = success for all, 1 = at least one failed or timed out).

**Location:** Repository root: `run_all_tests.ps1`

**Usage:**

```powershell
.\run_all_tests.ps1 [ -Exe path\to\spl.exe ] [ -Examples path\to\examples ] [ -Skip @("file.spl") ] [ -TimeoutSeconds N ]
```

**Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| **-Exe** | `build\Release\spl.exe` | Path to the SPL executable (relative to script dir or absolute). |
| **-Examples** | `examples` | Folder containing `.spl` files to run. |
| **-Skip** | `@()` | Array of script names to skip (e.g. `"graphics_test.spl"`). Skipped scripts are not run and are counted in "Skipped". |
| **-TimeoutSeconds** | `30` | Max seconds per script; script is killed and reported as failed if it exceeds this. Minimum effective timeout is 5 seconds. |

**Examples:**

```powershell
# Default: build\Release\spl.exe, examples folder, 30s timeout
.\run_all_tests.ps1

# Use FINAL package executable
.\run_all_tests.ps1 -Exe FINAL\bin\spl.exe

# Skip graphics tests when not built with game
.\run_all_tests.ps1 -Skip @("graphics_test.spl", "2dgraphics_shapes.spl", "2dgraphics_game_loop.spl")

# Longer timeout for slow examples (e.g. super_advanced_test)
.\run_all_tests.ps1 -TimeoutSeconds 90
```

**Output:** For each file: `[PASS] name.spl`, `[FAIL] name.spl (exit N)` or `(timeout)`, or `[SKIP] name.spl (known issue)`. At the end: summary (Passed, Failed, Skipped, Total). Exit code 1 if any failure.

---

## build_FINAL.ps1 and tests

When you run `.\build_FINAL.ps1` **without** `-SkipTests` and **without** `-Quick`:

1. It runs the **full test suite** via `run_all_tests.ps1` with a **skip list**:
   - If you use `-NoGame`, it skips: `graphics_test.spl`, `2dgraphics_shapes.spl`, `2dgraphics_game_loop.spl` (they require the 2dgraphics module).
   - It always skips `super_advanced_test.spl` (long-running; run manually if needed).
2. Timeout for the full suite is 90 seconds per script (see the script for the exact value).
3. If some tests fail, the script may continue and still package (see the script output).

To **skip all tests** when building: use `-SkipTests` or `-Quick` (Quick runs only smoke tests).

---

## Smoke tests (build_FINAL.ps1)

When using **-Quick** or when the full suite is skipped, `build_FINAL.ps1` runs **smoke tests**: it runs `00_full_feature_smoke.spl` (and in non-Quick mode, `super_advanced_test.spl` in a job) with a timeout. These verify that the interpreter runs and basic features work.

---

## Running a single example

To run one script and see its output or errors:

```powershell
build\Release\spl.exe examples\00_full_feature_smoke.spl
# Or with arguments (available in script via cli_args()):
build\Release\spl.exe examples\80_cli_args.spl arg1 arg2
```

For game scripts that use **global** game builtins (no import):

```powershell
build\Release\spl_game.exe examples\game_simple_draw.spl
```

See [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) for which runner to use for each example.

---

## Exit codes

- **0** – Script finished successfully (or REPL exited normally).
- **Non-zero** (typically 1) – Compile error, runtime error, or (when using run_all_tests.ps1) timeout or process failure.

See [CLI_AND_REPL.md](CLI_AND_REPL.md) and [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more on errors and exit codes.

---

## Related documentation

- [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) – What each example does and which runner to use.
- [GETTING_STARTED.md](GETTING_STARTED.md) – Build and run.
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) – Common issues (e.g. tests failing for graphics when game not built).
