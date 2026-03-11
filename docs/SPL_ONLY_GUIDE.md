# SPL-Only Developer Guide

**You write only SPL code.** This guide confirms that **everything described in the documentation is implemented** in the SPL runtime and works when you run your scripts. It also tells you exactly how to run your code and what to expect.

---

## 1. Running your SPL code

- **Run a script:** `spl myfile.spl`  
  (Use the path to `spl.exe` from your build, e.g. `build\Release\spl.exe myfile.spl`.)

- **Interactive (REPL):** `spl_repl`  
  Type SPL and press Enter; you can use everything below there too.

- **Game scripts that use global game functions** (e.g. `window_create`, `key_down` with **no** `import`):  
  `spl_game mygame.spl`  
  Only use this for scripts that do **not** use `import "game"` or `import "2dgraphics"`.

**Important:** If your script uses `import "game"` or `import "2dgraphics"`, you **must** run it with **spl** (or spl_repl), and the project must be **built with game support** (Raylib). Otherwise `import` returns nil and those features are unavailable.

---

## 2. What is implemented (everything in the docs)

Everything listed in the docs below is implemented. You can use it in your SPL programs as written.

### Language (syntax) – [language_syntax.md](language_syntax.md)

- **Variables:** `let`, `var`, `const`, optional type hints.
- **Literals:** numbers, strings, `true`/`false`, `null`, time literals (`2s`, `500ms`).
- **Operators:** arithmetic, comparison, logical, bitwise, assignment (including `**` for power).
- **Control flow:** `if`/`elif`/`else`, `for` (range, C-style, for-in), `while`, `break`/`continue`, loop labels, ternary `? :`.
- **Functions:** `def`, default and named arguments, `return` (including `return a, b`), lambdas `(x, y) => x + y`.
- **Error handling:** `try`/`catch`/`finally`, `throw`, `defer`, `assert`.
- **Pattern matching:** `match` with `case`, guards (`case x if x > 10 =>`), destructuring.
- **Collections:** arrays `[1,2,3]`, maps `{ "a": 1 }`, slicing, destructuring, optional indexing `arr?[i]`.
- **Other:** optional chaining `obj?.prop`, null coalescing `a ?? b`, `do` blocks, f-strings `f"Hi {name}"`, multiline strings, classes (declaration, constructor, methods, extends).
- **Modules:** `import "math"`, `import "string"`, `import "2dgraphics"`, `import "path.spl"`, etc. as described.

All of the above are implemented in the compiler and VM; you can use them in your SPL files.

### Standard library (builtins) – [standard_library.md](standard_library.md)

Every function and constant listed there exists and works from SPL:

- **I/O & debug:** `print(...)`, `inspect(x)`.
- **Math:** `sqrt`, `pow`, `sin`, `cos`, `tan`, `floor`, `ceil`, `round`, `abs`, `log`, `atan2`, `sign`, `deg_to_rad`, `rad_to_deg`, `min`, `max`, `clamp`, `lerp`, `PI`, `E`.
- **Type conversion:** `str`, `int`, `float`, `parse_int`, `parse_float`.
- **Collections:** `array`, `len`, `push`, `push_front`, `slice`, `keys`, `values`, `has`, `copy`, `freeze`, `deep_equal`.
- **Array combinators:** `map`, `filter`, `reduce`, `flat_map`, `flatten`, `zip`, `chunk`, `unique`, `reverse`, `find`, `sort`, `sort_by`, `first`, `last`, `take`, `drop`, `cartesian`, `window`.
- **String:** `upper`, `lower`, `replace`, `join`, `split`, `trim`, `starts_with`, `ends_with`, `repeat`, `pad_left`, `pad_right`, `split_lines`, `format`, `regex_match`, `regex_replace`.
- **File I/O:** `read_file`, `write_file`, `readFile`, `writeFile`, `fileExists`, `listDir`, `listDirRecursive`, `create_dir`, `is_file`, `is_dir`, `copy_file`, `delete_file`, `move_file`.
- **Time:** `time()`, `sleep(seconds)`.
- **Error & system:** `panic`, `error_message`, `Error`, `cli_args`, `env_get`, `stack_trace`, `assertType`.
- **JSON:** `json_parse`, `json_stringify`.
- **Random:** `random`, `random_int`, `random_choice`, `random_shuffle`.
- **Logging:** `log_info`, `log_warn`, `log_error`, `log_debug`.
- **Reflection:** `type(x)`, `dir(x)`.
- **Profiling:** `profile_cycles`, `profile_fn`.
- **Utilities:** `range`, `default`, `merge`, `all`, `any`, `vec2`, `vec3`, `rand_vec2`, `rand_vec3`, `Instance`.

You call them from SPL exactly as in the doc (e.g. `print("Hello")`, `sqrt(2)`, `len(arr)`).

### Standard library modules – [standard_library.md](standard_library.md) (table “Standard library modules”)

These all work with `import "name"` when you use **spl** or **spl_repl**:

- `import "math"` → `math.sqrt(2)`, `math.PI`, etc.
- `import "string"` → `string.upper("hi")`, `string.regex_match(...)`, etc.
- `import "json"` → `json.json_parse(...)`, `json.json_stringify(...)`.
- `import "random"` → `random.random()`, etc.
- `import "sys"` → `sys.cli_args`, `sys.print`, `sys.stack_trace`, `sys.assertType`, etc.
- `import "io"` → `io.read_file`, etc.
- `import "array"` → `array.map`, `array.cartesian`, `array.window`, etc.
- `import "map"` → `map.keys`, `map.merge`, `map.deep_equal`, etc.
- `import "env"` → `env.env_get("HOME")`.
- `import "types"` → `types.str`, `types.int`, `types.parse_int`, etc.
- `import "debug"` → `debug.inspect`, `debug.type`, `debug.dir`, `debug.stack_trace`.
- `import "log"` → `log.log_info`, `log.log_warn`, `log.log_error`, `log.log_debug`.
- `import "time"` → `time.time()`, `time.sleep(seconds)`.
- `import "memory"` → `memory.alloc`, `memory.peek8`, `memory.mem_copy`, etc. (full low-level API).
- `import "util"` → `util.range`, `util.merge`, `util.vec2`, `util.rand_vec2`, etc.
- `import "profiling"` → `profiling.profile_cycles`, `profiling.profile_fn`.

The list in [standard_library.md](standard_library.md) matches what the runtime provides.

### Low-level memory – [LOW_LEVEL_AND_MEMORY.md](LOW_LEVEL_AND_MEMORY.md)

All of these are implemented and callable from SPL:

- **Pointers:** `alloc(n)`, `free(ptr)`, `ptr_address(ptr)`, `ptr_from_address(addr)`, `ptr_offset(ptr, bytes)`, and pointer arithmetic `ptr + n`, `ptr - n`.
- **Peek/poke:** `peek8`–`peek64`, `poke8`–`poke64`; `peek_float`/`poke_float`, `peek_double`/`poke_double`.
- **Block ops:** `mem_copy`, `mem_set`, `mem_cmp`, `mem_move`.
- **Resize:** `realloc(ptr, size)`.
- **Alignment:** `align_up`, `align_down`, `ptr_align_up`, `ptr_align_down`.
- **Volatile:** `memory_barrier`, `volatile_load8`–`volatile_load64`, `volatile_store8`–`volatile_store64`.

You can write SPL scripts that use these exactly as in the doc.

### Game API (global style) – [SPL_GAME_API.md](SPL_GAME_API.md)

When the project is **built with game support** (Raylib), every function in that doc is implemented:

- **Window:** `window_create`, `window_close`, `window_open`, `window_should_close`, `window_set_size`, `window_toggle_fullscreen`.
- **Drawing:** `clear`, `draw_rect`, `draw_circle`, `draw_line`, `draw_triangle`, `present`.
- **Images:** `load_image`, `draw_image`, `draw_image_ex`.
- **Game loop:** `game_loop(update_fn, render_fn)`.
- **Keyboard:** `key_down("LEFT")`, `key_pressed("SPACE")`, `key_released("A")` (and other key names from the doc).
- **Mouse:** `mouse_x()`, `mouse_y()`, `mouse_pressed("LEFT")`, `mouse_down("LEFT")` (and `"RIGHT"`, `"MIDDLE"`).
- **Timing:** `delta_time()`, `set_target_fps(60)`.
- **Sound:** `load_sound(path)`, `play_sound(id)`.
- **Text:** `draw_text(text, x, y, fontSize)` and with color.
- **Collision:** `rect_collision(...)`.
- **Camera:** `camera_set(x, y)`, `camera_zoom(z)`.
- **Debug:** `get_fps()`, `debug_overlay(show)`.
- **Audio:** `set_master_volume(0.5)`.
- **Input mapping:** `bind_action("jump", "SPACE")`, `action_pressed("jump")`, `action_down("jump")`.

You can use them either as **globals** (when you run with **spl_game**) or as **module** (when you run with **spl** and write `import "game"` then `game.window_create(...)` etc.). Both styles are implemented.

### 2dgraphics module – [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md)

When the project is **built with game support**, every function in that doc is implemented. Use them **only** with **spl** (or spl_repl) and after `import "2dgraphics"` or `import("2dgraphics")`, e.g.:

```spl
import("2dgraphics")
g = 2dgraphics
g.createWindow(800, 600, "My Game")
```

- **Window:** `create`, `createWindow`, `close`, `closeWindow`, `is_open`, `isOpen`, `should_close`, `setWindowSize`, `toggleFullscreen`, `set_title`, `width()`, `height()`.
- **Render loop:** `beginFrame`, `endFrame`, `clear`, `present`, `setTargetFps`, `setVsync`.
- **Drawing:** `setColor`, `drawLine`, `drawRect`, `fillRect`, `drawCircle`, `fillCircle`, `drawPolygon` (and legacy names `line`, `stroke_rect`, `fill_rect`, etc.).
- **Text:** `loadFont`, `drawText`, `text` (argument order: string first, then x, y – see doc).
- **Images:** `load_image`/`loadImage`, `draw_image`, `drawImage`, `drawImageScaled`, `drawImageRotated`.
- **Sprites:** `spriteSheet`, `playAnimation`, `drawSprite`.
- **Input:** `isKeyPressed`, `isKeyDown`, `mouseX`, `mouseY`, `isMousePressed`.
- **Camera:** `setCamera`, `moveCamera`, `zoomCamera`.
- **Color:** `rgb`, `rgba`, `hexColor`.
- **Loop & timing:** `run(update_fn, draw_fn)`, `delta_time`, `fps`.

They are **not** available in **spl_game** (no `import` there). They are implemented and work when you run with **spl** and have built with game.

### Advanced Graphics API (gfx) – [SPL_ADVANCED_GRAPHICS_API.md](SPL_ADVANCED_GRAPHICS_API.md)

This is a **design document** for a future, much more advanced graphics module (`import gfx`). It is **not implemented yet**. The doc describes the full API: layers & render targets, transform stack, paths (moveTo, lineTo, bezier, arc), gradients and patterns, blend modes, custom shaders, texture batching, particles, tilemaps, text layout, masking, post-processing, camera/viewport, and color utilities. When the gfx module is implemented, you will use it the same way as in the doc.

---

## 3. Summary table (for you as SPL-only)

| What you write (SPL) | Where it’s documented | Implemented? | How to run |
|-----------------------|------------------------|--------------|------------|
| Language syntax (variables, loops, functions, match, etc.) | language_syntax.md | Yes | spl myfile.spl or spl_repl |
| All builtins (print, sqrt, map, read_file, alloc, …) | standard_library.md | Yes | spl or spl_repl |
| `import "math"` etc. | standard_library.md | Yes | spl or spl_repl |
| Low-level (alloc, peek, poke, mem_*, align_*, …) | LOW_LEVEL_AND_MEMORY.md | Yes | spl or spl_repl |
| Game globals (window_create, key_down, game_loop, …) | SPL_GAME_API.md | Yes | spl_game script.spl **or** spl with `import "game"` |
| `import "2dgraphics"` then g.createWindow, g.fillRect, … | SPL_2DGRAPHICS_API.md | Yes | spl myfile.spl (not spl_game); build with game |
| Advanced gfx (layers, paths, shaders, particles, …) | SPL_ADVANCED_GRAPHICS_API.md | **Design only** (not yet implemented) | Future: `import gfx` when built |

---

## 4. If something doesn’t work

- **“Possible undefined variable”:** Define the variable or function before use, or use the right module (e.g. `import "math"` then `math.sqrt(2)`).
- **`import "2dgraphics"` or `import "game"` is nil:** Build the project with game support (Raylib) and run with **spl**, not spl_game. See [GETTING_STARTED.md](GETTING_STARTED.md) and [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
- **Function not found or wrong arguments:** Check the exact name and argument order in the doc (e.g. for 2dgraphics `text(str, x, y, ...)` – string first). See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## 5. Where to look next

- **First time setup (build, run, modules):** [GETTING_STARTED.md](GETTING_STARTED.md)
- **Full syntax reference:** [language_syntax.md](language_syntax.md)
- **Every builtin and module:** [standard_library.md](standard_library.md)
- **Game (globals or import "game"):** [SPL_GAME_API.md](SPL_GAME_API.md)
- **2D graphics module:** [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md)
- **Advanced graphics (gfx) design:** [SPL_ADVANCED_GRAPHICS_API.md](SPL_ADVANCED_GRAPHICS_API.md) – layers, paths, shaders, particles, tilemaps, post-fx (spec for future implementation)
- **Memory/pointers:** [LOW_LEVEL_AND_MEMORY.md](LOW_LEVEL_AND_MEMORY.md)
- **Example scripts:** [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md)
- **Problems:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **All docs index:** [README.md](README.md)

Everything in these docs is implemented. You can rely on them when writing SPL.
