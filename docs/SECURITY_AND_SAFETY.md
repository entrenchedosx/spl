# Security and safety notes

Quick reference for critical and safety-related behavior in the SPL project.

## Addressed

### Path traversal in imports
- **Risk:** `import("../../../path/to/file.spl")` or similar could read outside the project when `SPL_LIB` is set.
- **Mitigation:** `import_resolution.cpp` rejects paths that contain `..` as a path segment (e.g. `../`, `\..`, or path starting with `..`). Such imports resolve to "file not found" instead of reading outside the tree.

### VM and interpreter
- **Array/string index:** GET_INDEX checks bounds; out-of-range returns nil (no crash).
- **SET_INDEX:** Array growth is capped (64M elements); invalid index throws.
- **Jump/catch targets:** All JMP, JMP_IF_*, THROW, RETHROW targets are validated against code size; invalid targets throw.

### IDE (renderer)
- **XSS:** User-facing content (problem messages, file names, outline, search results) is passed through `escapeHtml()` before being used in `innerHTML`.

## Operational notes

### IDE process spawn
- The IDE main process spawns child processes using `cmd` and `args` from the renderer (e.g. `spl`, `spl --check`, terminal shell).
- **Implication:** Any code that can call the spawn API (e.g. compromised renderer or devtools) could request arbitrary command execution. Run only trusted IDE code; devtools and extensions are at the same trust level as the app.

### File I/O
- SPL scripts can read/write files via builtins (`read_file`, `write_file`, etc.) under the process’s permissions and current working directory. Run scripts from a safe CWD and with appropriate user permissions.

### Memory (low-level builtins)
- Builtins such as `alloc`, `peek*`, `poke*`, `mem_copy` allow raw memory access. Use only in trusted scripts; misuse can crash the process or cause undefined behavior.

## Build and installer

- **Build script:** Only removes or writes under the project directory (e.g. `BUILD/`, `build/`). It does not delete or modify files outside the repo.
- **NSIS installer:** Installs under `C:\Program Files\SPL` and adds that path to the system PATH. Uninstall removes the install directory and Start Menu shortcuts; it does not remove the PATH entry (user can edit environment variables if needed).
