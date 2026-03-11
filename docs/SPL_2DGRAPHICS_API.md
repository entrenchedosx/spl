# SPL 2D Graphics API (g2d)

Built-in module for 2D graphical applications and games. Available when SPL is built with **Raylib** (`-DSPL_BUILD_GAME=ON` and Raylib installed).

**Module name:** `"g2d"` (use `import("g2d")`). The name `"2dgraphics"` is also accepted as an alias.

## Usage

```spl
let g = import("g2d")

g.createWindow(800, 600, "SPL Game")

while g.isOpen() {
    g.beginFrame()
    g.clear(20, 20, 30)
    g.setColor(255, 100, 50)
    g.fillRect(100, 100, 200, 80)
    g.drawLine(0, 0, 800, 600)
    g.drawText("Hello!", 10, 10)
    g.endFrame()
}

g.closeWindow()
```

Or use the high-level **run loop**:

```spl
g.createWindow(800, 600, "My Game")
g.run(update, draw)
g.closeWindow()
```

---

## Window

| Function | Description |
|----------|-------------|
| `create(width, height [, title])` | Open window (default 800×600, "SPL 2D"). |
| `createWindow(width, height [, title])` | Same; default title "SPL Game". |
| `close()` / `closeWindow()` | Close the window. |
| `is_open()` / `isOpen()` | Returns true if window is open and not closing. |
| `should_close()` | Returns true if user requested close. |
| `setWindowSize(width, height)` | Resize window (when open). |
| `toggleFullscreen()` | Toggle fullscreen. |
| `set_title(title)` | Set window title. |
| `width()` | Current window width in pixels. |
| `height()` | Current window height in pixels. |

---

## Render loop

| Function | Description |
|----------|-------------|
| `beginFrame()` | Start a new frame; enables camera 2D if set. Call once per frame. |
| `endFrame()` | End frame and swap buffers. |
| `clear(r, g, b [, a])` | Clear background (0–255). Use inside beginFrame/endFrame or with run(). |
| `present()` | End frame and swap (alternative to endFrame when not using beginFrame). |
| `setTargetFps(fps)` | Set target FPS (default 60). |
| `setVsync(on)` | Enable (true) or disable (false) vsync. |

**Manual game loop:**

```spl
g.createWindow(800, 600, "Game")
g.setTargetFps(60)

while g.isOpen() {
    g.beginFrame()
    # ... clear, draw, input ...
    g.endFrame()
}
g.closeWindow()
```

---

## Drawing primitives

All shape functions use **current color** from `setColor(r, g, b, a)` unless you pass color explicitly (see tables).

| Function | Description |
|----------|-------------|
| `setColor(r, g, b [, a])` | Set current draw color (0–255). Also accepts one array: `setColor([r,g,b,a])`. |
| `drawLine(x1, y1, x2, y2 [, color...])` | Line segment. Optional: r,g,b,a or [r,g,b,a]. |
| `drawRect(x, y, w, h [, color...])` | Rectangle outline. |
| `fillRect(x, y, w, h [, color...])` | Filled rectangle. |
| `drawCircle(x, y, radius [, color...])` | Circle outline. |
| `fillCircle(x, y, radius [, color...])` | Filled circle. |
| `drawPolygon(points [, color...])` | Polygon outline. `points` = array of [x,y], e.g. `[[0,0], [50,0], [25,50]]`. |

Legacy names (explicit color at end): `line`, `stroke_rect`, `fill_rect`, `stroke_circle`, `fill_circle` — same behavior, optional r,g,b,a at end.

---

## Text

| Function | Description |
|----------|-------------|
| `loadFont(path, size)` | Load TTF font; returns font id (≥0) or -1. |
| `drawText(text, x, y [, fontId, r, g, b, a])` | Draw text. Uses current color if no color given. If `fontId` is provided, uses that font. **Argument order:** text first, then x, y. |
| `text(str, x, y [, fontSize, r, g, b])` | Draw text with default font (font size 20 if omitted). **Argument order:** string first, then x, y, then optional fontSize and r, g, b. |

**Note:** For both `text` and `drawText`, the **string comes first**, then x and y. Using the wrong order (e.g. `text(50, 50, "Hello")`) will draw the numeric values as text or produce wrong positions.

---

## Images & sprites

| Function | Description |
|----------|-------------|
| `load_image(path)` / `loadImage(path)` | Load image; returns texture id (≥0) or -1. |
| `draw_image(id, x, y [, scale, rotation])` | Draw image at (x,y). Optional scale and rotation (degrees). |
| `drawImage(id, x, y)` | Draw image at original size. |
| `drawImageScaled(id, x, y, w, h)` | Draw image scaled to width w, height h. |
| `drawImageRotated(id, x, y, angle)` | Draw image at (x,y) with rotation in degrees. |
| `spriteSheet(imageId, frameWidth, frameHeight)` | Create sprite from image; returns sprite id. |
| `playAnimation(spriteId, speed)` | Advance sprite animation by speed (call each frame). |
| `drawSprite(spriteId, x, y)` | Draw current frame of sprite at (x, y). |

---

## Input

| Function | Description |
|----------|-------------|
| `isKeyPressed(key)` | True if key was pressed this frame. `key` = string: "A", "SPACE", "ESCAPE", "LEFT", "RIGHT", "UP", "DOWN", etc. |
| `isKeyDown(key)` | True if key is held this frame. |
| `mouseX()` | Mouse X in window. |
| `mouseY()` | Mouse Y in window. |
| `isMousePressed(button)` | True if mouse button was pressed this frame. `button`: 0=left, 1=right, 2=middle. |

---

## Camera

| Function | Description |
|----------|-------------|
| `setCamera(x, y)` | Set camera target and enable 2D camera. |
| `moveCamera(dx, dy)` | Move camera target. |
| `zoomCamera(scale)` | Set zoom (1 = normal). |

When the camera is enabled, `beginFrame()` / `endFrame()` (and `run()`) apply 2D camera transforms so drawing coordinates are in world space.

---

## Color utilities

Return a color array `[r, g, b, a]` for use with `setColor([r,g,b,a])` or shape functions that accept a color array.

| Function | Description |
|----------|-------------|
| `rgb(r, g, b)` | Returns [r, g, b, 255]. |
| `rgba(r, g, b, a)` | Returns [r, g, b, a]. |
| `hexColor("#rrggbb")` / `hexColor("#rrggbbaa")` | Parse hex string; returns [r, g, b, a]. |

Example:

```spl
g.setColor(g.rgb(255, 0, 0))
g.fillRect(10, 10, 50, 50)
g.setColor(g.hexColor("#00ff00"))
g.fillCircle(100, 100, 30)
```

---

## Game loop & timing

| Function | Description |
|----------|-------------|
| `run(update_fn, draw_fn)` | Main loop: each frame calls `update_fn()` then `draw_fn()` until window closes. Uses 60 FPS and camera if enabled. |
| `delta_time()` | Time in seconds since last frame. |
| `fps()` | Current frames per second. |

---

## Build

Requires Raylib. Example with vcpkg:

```bash
vcpkg install raylib
cmake -B build -DSPL_BUILD_GAME=ON -DCMAKE_TOOLCHAIN_FILE=[path/to]/vcpkg/scripts/buildsystems/vcpkg.cmake
cmake --build build --config Release
```

Run: `spl your_script.spl` or in REPL: `let g = import("g2d")`.

---

## See also

- [SPL_GAME_API.md](SPL_GAME_API.md) – Game runtime (globals or `import "game"`); alternative API style.
- [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) – **graphics_test.spl**, **2dgraphics_shapes.spl**, **2dgraphics_game_loop.spl** use this module.
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) – Text/drawText argument order, window not showing, import returns nil.
