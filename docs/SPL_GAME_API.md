# SPL Game API

SPL can run 2D games using a **Raylib**-backed game runtime. When built with game support, **graphics are integrated into the main `spl` executable** (and the REPL), so you run game scripts with `spl game.spl` and use window/draw builtins in the REPL. An optional `spl_game` binary is also built as a script-as-argument entry point.

## Build (requires Raylib)

**Option A – vcpkg (recommended)**

```bash
vcpkg install raylib
cmake -B build -DSPL_BUILD_GAME=ON -DCMAKE_TOOLCHAIN_FILE=[path-to-vcpkg]/scripts/buildsystems/vcpkg.cmake
cmake --build build --config Release
```

**Option B – Raylib installed elsewhere**

Ensure `find_path(raylib.h)` and `find_library(raylib)` can find your Raylib install (e.g. set `CMAKE_PREFIX_PATH`), then:

```bash
cmake -B build -DSPL_BUILD_GAME=ON
cmake --build build --config Release
```

Run a game script with the main interpreter (recommended):

```bash
build/Release/spl.exe examples/game_simple_draw.spl
```

Or with the standalone game runner:

```bash
build/Release/spl_game.exe examples/game_simple_draw.spl
```

## 1. Window

| Function | Description |
|----------|-------------|
| `window_create(width, height, title)` | Create window (call first). |
| `window_close()` | Close the window. |
| `window_open()` | Returns true while window is open (not requested close). |
| `window_should_close()` | True when user requested close. |
| `window_set_size(w, h)` | Resize window. |
| `window_toggle_fullscreen()` | Toggle fullscreen. |

## 2. Drawing

| Function | Description |
|----------|-------------|
| `clear(r, g, b)` | Clear background (0–255). |
| `draw_rect(x, y, w, h, r, g, b)` | Draw rectangle. |
| `draw_circle(cx, cy, radius, r, g, b)` | Draw circle. |
| `draw_line(x1, y1, x2, y2, r, g, b)` | Draw line. |
| `draw_triangle(x1,y1, x2,y2, x3,y3, r,g,b)` | Draw triangle. |
| `present()` | End current drawing frame and show it (use after `clear`/`draw_*` when not using `game_loop`). Inside `game_loop`, the frame is ended automatically. |

## 3. Images

| Function | Description |
|----------|-------------|
| `load_image(path)` | Load PNG/JPG; returns texture id (-1 on error). |
| `draw_image(id, x, y)` | Draw texture at position. |
| `draw_image_ex(id, x, y, scale, rotation)` | Draw with scale and rotation. |

## 4. Game loop

```spl
def update() {
    // move, input, logic
}
def render() {
    clear(0,0,0)
    draw_rect(...)
}
game_loop(update, render)
```

`game_loop(update_fn, render_fn)` runs until the window is closed. Each frame it calls `update()`, then `render()` (with `BeginDrawing`/`EndDrawing` handled by the runtime).

## 5. Keyboard

| Function | Description |
|----------|-------------|
| `key_down("LEFT")` | True while key held. |
| `key_pressed("SPACE")` | True once when key pressed. |
| `key_released("A")` | True once when key released. |

Key names: `LEFT`, `RIGHT`, `UP`, `DOWN`, `SPACE`, `ENTER`, `ESCAPE`, `A`–`Z`, `ZERO`–`NINE`, etc.

## 6. Mouse

| Function | Description |
|----------|-------------|
| `mouse_x()`, `mouse_y()` | Current position. |
| `mouse_pressed("LEFT")` | True once when button pressed. |
| `mouse_down("LEFT")` | True while button held. |

Button: `"LEFT"`, `"RIGHT"`, `"MIDDLE"`.

## 7. Timing

| Function | Description |
|----------|-------------|
| `delta_time()` | Time since last frame (seconds). |
| `set_target_fps(60)` | Cap frame rate. |

## 8. Sound

| Function | Description |
|----------|-------------|
| `load_sound(path)` | Load WAV; returns sound id (-1 on error). |
| `play_sound(id)` | Play once. |

## 9. Text

| Function | Description |
|----------|-------------|
| `draw_text(text, x, y, fontSize)` | Draw text (default white). |
| `draw_text(text, x, y, fontSize, r, g, b)` | Draw text with color. |

## 10. Collision

| Function | Description |
|----------|-------------|
| `rect_collision(x1,y1,w1,h1, x2,y2,w2,h2)` | True if two rectangles overlap. |

## 11. Camera (Phase 2)

| Function | Description |
|----------|-------------|
| `camera_set(x, y)` | Set camera target (world position at screen center). Enables 2D camera. |
| `camera_zoom(z)` | Set zoom (default 1). |

When the camera is set, all drawing in `render()` uses world coordinates; the camera follows the target. Call `camera_set(player_x - 400, player_y - 300)` each frame to follow the player.

## 12. Debug & FPS

| Function | Description |
|----------|-------------|
| `get_fps()` | Current FPS. |
| `debug_overlay(show)` | If true, draws "FPS: N" in the top-left each frame. |

## 13. Audio mixer

| Function | Description |
|----------|-------------|
| `set_master_volume(0.5)` | Master volume 0–1. |

## 14. Input mapping

| Function | Description |
|----------|-------------|
| `bind_action("jump", "SPACE")` | Map action name to key. |
| `action_pressed("jump")` | True once when the key for that action is pressed. |
| `action_down("jump")` | True while the key is held. |

Use instead of hardcoding keys: `bind_action("jump", "SPACE")` then `if action_pressed("jump") { ... }`.

## Example (minimal)

```spl
window_create(800, 600, "My Game")
set_target_fps(60)
let x = 100
let y = 100
def update() {
    if key_down("LEFT") { x = x - 5 }
    if key_down("RIGHT") { x = x + 5 }
}
def render() {
    clear(0,0,0)
    draw_rect(x, y, 50, 50, 255, 0, 0)
}
game_loop(update, render)
window_close()
```

See `examples/game_simple_draw.spl` and `examples/game_pong_demo.spl`.

---

## See also

- [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md) – Module-style 2D graphics (`import "2dgraphics"`) with createWindow, beginFrame/endFrame, sprites, camera.
- [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) – Full list of game and graphics examples and which runner to use.
