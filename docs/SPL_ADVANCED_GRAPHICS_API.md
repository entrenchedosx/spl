# SPL Advanced Graphics API (gfx)

**Design document** for an extremely advanced 2D graphics API for SPL. This API is intended to be implemented as a new module (e.g. `import "gfx"` or `import gfx`) and to sit alongside or eventually supersede the simpler 2dgraphics module for demanding visuals: layers, paths, gradients, shaders, batching, particles, tilemaps, and post-processing.

**Status:** Design / specification. Implementation in the SPL runtime is planned; this doc defines the full contract for SPL code.

---

## Design goals

- **SPL-only usable:** All features are exposed as SPL functions and objects; no C++ knowledge required.
- **Layered & composable:** Multiple render targets (layers), blend modes, masking, and a clear draw order.
- **Vector-first:** Paths (moveTo, lineTo, bezier, arc), strokes (caps, joins, dash), and gradient/pattern fills.
- **Shader-capable:** Load and use custom fragment/vertex shaders, uniforms, and full-screen post effects.
- **Performance-minded:** Sprite/texture batching, tilemap rendering, and optional GPU particles.
- **Consistent:** One context, one coordinate system, explicit transform stack and layer stack.

---

## 1. Core context and window

Everything runs in a **graphics context** tied to a window. You create the context once; all other APIs operate on it.

| Function | Description |
|----------|-------------|
| `gfx.create(width, height [, title])` | Create window and graphics context. Returns context object or nil on failure. |
| `gfx.createContext(windowWidth, windowHeight [, title])` | Same; alias. |
| `gfx.destroy()` | Close window and destroy context. |
| `gfx.isOpen()` | True if window is open and not requested close. |
| `gfx.shouldClose()` | True if user requested close (e.g. window X). |
| `gfx.setSize(width, height)` | Resize window and default canvas. |
| `gfx.width()` | Current window/canvas width in pixels. |
| `gfx.height()` | Current window/canvas height in pixels. |
| `gfx.setTitle(title)` | Set window title. |
| `gfx.toggleFullscreen()` | Toggle fullscreen. |
| `gfx.setTargetFps(fps)` | Target frame rate (e.g. 60). |
| `gfx.setVsync(on)` | Enable (true) or disable (false) vsync. |

**Frame lifecycle**

| Function | Description |
|----------|-------------|
| `gfx.beginFrame()` | Start a new frame. Call once per frame. |
| `gfx.endFrame()` | End frame and swap buffers. |
| `gfx.clear(r, g, b [, a])` | Clear the **current draw target** (default canvas or current layer). 0–255. |
| `gfx.present()` | Alias for endFrame when using default loop. |

**Run loop (high-level)**

| Function | Description |
|----------|-------------|
| `gfx.run(update_fn, draw_fn)` | Loop: each frame calls `update_fn()` then `draw_fn()` until close. Handles beginFrame/endFrame. |
| `gfx.deltaTime()` | Seconds since last frame. |
| `gfx.fps()` | Current frames per second. |

Example:

```spl
import gfx
gfx.create(1280, 720, "My Game")
gfx.run(
  () => { /* update */ },
  () => {
    gfx.clear(10, 10, 20)
    gfx.setColor(255, 200, 100)
    gfx.fillRect(100, 100, 200, 80)
  }
)
gfx.destroy()
```

---

## 2. Layers (render targets)

Draw to offscreen **layers**, then composite them onto the screen or onto another layer. Each layer has its own size and can be used as a texture.

| Function | Description |
|----------|-------------|
| `gfx.createLayer(width, height)` | Create a new layer (render target). Returns layer id (≥0) or -1. |
| `gfx.createLayerSameSize()` | Create layer with same size as main canvas. |
| `gfx.destroyLayer(layerId)` | Release layer and its texture. |
| `gfx.setTarget(layerId)` | Set current draw target. `layerId` nil or -1 = main canvas. |
| `gfx.getTarget()` | Current target layer id (-1 = main canvas). |
| `gfx.layerWidth(layerId)` | Width of layer (or main canvas if -1). |
| `gfx.layerHeight(layerId)` | Height of layer (or main canvas if -1). |
| `gfx.drawLayer(layerId, x, y [, w, h, r, g, b, a])` | Draw a layer as a texture at (x,y). Optional size and tint. |
| `gfx.drawLayerEx(layerId, x, y, originX, originY, scaleX, scaleY, rotation, tint)` | Draw with origin, scale, rotation (degrees), tint [r,g,b,a]. |

Layers are drawn in order: draw background layer first, then foreground layers on top. Use `setTarget` to draw into a layer; then set target back to main and use `drawLayer` to composite.

---

## 3. Transform stack

All drawing (primitives, paths, images, text) is affected by the **current transform**. Transforms are stacked: push, apply operations, draw, pop.

| Function | Description |
|----------|-------------|
| `gfx.save()` | Push current transform (and optionally state) onto stack. |
| `gfx.restore()` | Pop transform (and state) from stack. |
| `gfx.translate(x, y)` | Translate by (x, y). |
| `gfx.scale(sx, sy)` | Scale. If one argument: uniform scale. |
| `gfx.rotate(angle)` | Rotate by angle in **radians**. |
| `gfx.rotateDeg(angle)` | Rotate by angle in degrees. |
| `gfx.skew(skewX, skewY)` | Skew (shear) in radians. |
| `gfx.transform(a, b, c, d, e, f)` | Set additional 2D affine: `x' = a*x + c*y + e`, `y' = b*x + d*y + f`. |
| `gfx.setMatrix(m)` | Set full 3×2 matrix. `m` = array of 6 numbers [a,b,c,d,e,f] or 3×2. |
| `gfx.getMatrix()` | Get current 3×2 matrix as array [a,b,c,d,e,f]. |
| `gfx.identity()` | Reset current transform to identity. |

Coordinate system: origin (0,0) at top-left by default; Y increases downward. Transform applies to everything until restored.

---

## 4. Current draw state

| Function | Description |
|----------|-------------|
| `gfx.setColor(r, g, b [, a])` | Set current fill/stroke color (0–255). |
| `gfx.setColorArray([r, g, b, a])` | Set color from array. |
| `gfx.getColor()` | Get current color as [r, g, b, a]. |
| `gfx.setBlendMode(mode)` | Set blend mode (see Blend modes below). |
| `gfx.setGlobalAlpha(a)` | Global alpha multiplier 0.0–1.0. |
| `gfx.setShader(shaderId)` | Set current shader. nil or -1 = default (no shader). |
| `gfx.setLineWidth(w)` | Stroke line width in pixels. |
| `gfx.setLineCap(cap)` | `"butt"`, `"round"`, `"square"`. |
| `gfx.setLineJoin(join)` | `"miter"`, `"round"`, `"bevel"`. |
| `gfx.setMiterLimit(limit)` | Miter limit for sharp corners. |
| `gfx.setDash(segments [, offset])` | Dash pattern. `segments` = array of lengths (e.g. [10, 5]). `offset` = phase. |
| `gfx.setDashOff()` | Solid line (no dash). |

---

## 5. Blend modes

Used with `gfx.setBlendMode(mode)`. String or constant.

| Mode | Description |
|------|-------------|
| `"normal"` | Default alpha blending. |
| `"add"` | Additive (brightens). |
| `"multiply"` | Multiply (darkens). |
| `"screen"` | Screen (lightens). |
| `"overlay"` | Overlay (contrast). |
| `"darken"` | Darken (min of components). |
| `"lighten"` | Lighten (max of components). |
| `"color_dodge"` | Color dodge. |
| `"color_burn"` | Color burn. |
| `"hard_light"` | Hard light. |
| `"soft_light"` | Soft light. |
| `"difference"` | Difference. |
| `"exclusion"` | Exclusion. |

---

## 6. Primitives (immediate)

Quick drawing without building a path. Use current color, transform, and blend mode.

| Function | Description |
|----------|-------------|
| `gfx.fillRect(x, y, w, h [, color])` | Filled rectangle. Optional [r,g,b,a]. |
| `gfx.strokeRect(x, y, w, h [, color])` | Rectangle outline. |
| `gfx.fillCircle(x, y, radius [, color])` | Filled circle. |
| `gfx.strokeCircle(x, y, radius [, color])` | Circle outline. |
| `gfx.fillEllipse(x, y, rx, ry [, color])` | Filled ellipse. |
| `gfx.strokeEllipse(x, y, rx, ry [, color])` | Ellipse outline. |
| `gfx.fillPolygon(points [, color])` | Filled polygon. `points` = array of [x,y]. |
| `gfx.strokePolygon(points [, color])` | Polygon outline. |
| `gfx.drawLine(x1, y1, x2, y2 [, color])` | Line segment. |
| `gfx.drawLineStrip(points [, color])` | Connected line through points. |
| `gfx.drawLineLoop(points [, color])` | Closed line through points. |
| `gfx.setPixel(x, y [, color])` | Single pixel (current or given color). |

---

## 7. Paths (vector drawing)

Build a path with commands, then fill or stroke it. Supports line caps, joins, and dash set via state.

| Function | Description |
|----------|-------------|
| `gfx.beginPath()` | Start a new path (clears current path). |
| `gfx.moveTo(x, y)` | Move pen to (x, y). |
| `gfx.lineTo(x, y)` | Line to (x, y). |
| `gfx.quadTo(cx, cy, x, y)` | Quadratic Bézier to (x,y) with control (cx,cy). |
| `gfx.bezierTo(c1x, c1y, c2x, c2y, x, y)` | Cubic Bézier to (x,y) with controls (c1x,c1y), (c2x,c2y). |
| `gfx.arc(x, y, radius, startAngle, endAngle [, counterClockwise])` | Arc (angles in radians). |
| `gfx.arcTo(x1, y1, x2, y2, radius)` | Arc tangent to two segments. |
| `gfx.ellipse(x, y, rx, ry [, rotation, startAngle, endAngle, ccw])` | Ellipse arc. |
| `gfx.rectPath(x, y, w, h)` | Add rectangle to path (does not clear path). |
| `gfx.closePath()` | Close current subpath with a line. |
| `gfx.fillPath([color])` | Fill current path; optional color override. |
| `gfx.strokePath([color])` | Stroke current path with current line style. |
| `gfx.clipPath()` | Use current path as clip region (push clip). Must eventually pop (see Masking). |

Path objects (reusable):

| Function | Description |
|----------|-------------|
| `gfx.createPath()` | Create an empty path object. Returns path id. |
| `gfx.pathMoveTo(pathId, x, y)` | Same as moveTo but on path object. |
| `gfx.pathLineTo(pathId, x, y)` | Same as lineTo on path object. |
| `gfx.pathQuadTo(pathId, cx, cy, x, y)` | Quadratic on path object. |
| `gfx.pathBezierTo(pathId, c1x, c1y, c2x, c2y, x, y)` | Cubic on path object. |
| `gfx.pathArc(pathId, x, y, r, start, end [, ccw])` | Arc on path object. |
| `gfx.pathClose(pathId)` | Close subpath on path object. |
| `gfx.drawPath(pathId, fill)` | Draw path object: fill true = fill, false = stroke. |
| `gfx.destroyPath(pathId)` | Release path object. |

---

## 8. Gradients and pattern fills

**Gradients** are used as fill (and optionally stroke) instead of solid color.

**Linear gradient**

| Function | Description |
|----------|-------------|
| `gfx.createLinearGradient(x1, y1, x2, y2)` | Create gradient from (x1,y1) to (x2,y2). Returns gradient id. |
| `gfx.gradientAddStop(gradientId, t, r, g, b [, a])` | Add color stop. `t` = 0.0–1.0 along gradient. |
| `gfx.gradientAddStopHex(gradientId, t, hex)` | Add stop with hex color "#rrggbb" or "#rrggbbaa". |
| `gfx.setFillGradient(gradientId)` | Use gradient as current fill. |
| `gfx.setFillGradientOff()` | Back to solid fill color. |

**Radial gradient**

| Function | Description |
|----------|-------------|
| `gfx.createRadialGradient(cx, cy, r0, fx, fy, r1)` | Center (cx,cy) radius r0 to focus (fx,fy) radius r1. |
| `gfx.createRadialGradientSimple(cx, cy, rInner, rOuter)` | Same center; inner and outer radius. |

**Conic gradient** (angle-based around a center)

| Function | Description |
|----------|-------------|
| `gfx.createConicGradient(cx, cy, startAngle)` | Conic gradient; startAngle in radians. |
| `gfx.gradientAddStop(...)` | Same as linear; t is angle fraction 0–1. |

**Pattern (tiled image)**

| Function | Description |
|----------|-------------|
| `gfx.createPattern(textureId, repeatX, repeatY)` | Repeat: "repeat", "clamp", "mirror". Returns pattern id. |
| `gfx.setPatternTransform(patternId, a, b, c, d, e, f)` | 3×2 transform for pattern. |
| `gfx.setFillPattern(patternId)` | Use pattern as fill. |
| `gfx.setFillPatternOff()` | Back to solid/gradient fill. |

**Cleanup**

| Function | Description |
|----------|-------------|
| `gfx.destroyGradient(gradientId)` | Release gradient. |
| `gfx.destroyPattern(patternId)` | Release pattern. |

---

## 9. Shaders

Load custom GLSL (or backend-equivalent) shaders and set uniforms. Useful for full-screen effects and per-draw effects.

| Function | Description |
|----------|-------------|
| `gfx.loadShader(vertexPath, fragmentPath)` | Load shader from files. Returns shader id or -1. |
| `gfx.loadShaderFromSource(vsSource, fsSource)` | Load from strings. Returns shader id or -1. |
| `gfx.unloadShader(shaderId)` | Release shader. |
| `gfx.useShader(shaderId)` | Set current shader. -1 or nil = default (no custom shader). |
| `gfx.setUniformInt(shaderId, name, value)` | Set int uniform. |
| `gfx.setUniformFloat(shaderId, name, value)` | Set float uniform. |
| `gfx.setUniformVec2(shaderId, name, x, y)` | Set vec2. |
| `gfx.setUniformVec3(shaderId, name, x, y, z)` | Set vec3. |
| `gfx.setUniformVec4(shaderId, name, x, y, z, w)` | Set vec4. |
| `gfx.setUniformMat3(shaderId, name, values)` | Set mat3 (9 floats or 3×3 array). |
| `gfx.setUniformTexture(shaderId, name, textureSlot, textureId)` | Bind texture to slot (0–7) and set sampler uniform. |
| `gfx.drawFullscreenQuad()` | Draw a quad covering the current target (for post-processing). |

Built-in default uniforms (when using a custom shader):

- `resolution` (vec2) – size of current draw target.
- `time` (float) – seconds since context creation.
- `modelView` (mat3) – current transform matrix.

---

## 10. Images and textures

| Function | Description |
|----------|-------------|
| `gfx.loadTexture(path)` | Load image from file. Returns texture id (≥0) or -1. |
| `gfx.createTexture(width, height)` | Create empty RGBA texture (e.g. for render-to-texture). Returns id. |
| `gfx.updateTexture(textureId, x, y, w, h, data)` | Update region. `data` = array of r,g,b,a bytes (length 4*w*h) or image data format. |
| `gfx.unloadTexture(textureId)` | Release texture. |
| `gfx.textureWidth(textureId)` | Width of texture. |
| `gfx.textureHeight(textureId)` | Height of texture. |
| `gfx.drawTexture(textureId, x, y [, w, h, tint])` | Draw full texture at (x,y). Optional size and tint [r,g,b,a]. |
| `gfx.drawTextureEx(textureId, x, y, srcX, srcY, srcW, srcH [, tint])` | Draw subregion (src) at (x,y). |
| `gfx.drawTextureRotated(textureId, x, y, originX, originY, scaleX, scaleY, rotationDeg, tint)` | Draw with origin, scale, rotation (degrees), tint. |

---

## 11. Sprite batching

Submit many textured quads and flush them in one or few draw calls.

| Function | Description |
|----------|-------------|
| `gfx.beginBatch(textureId)` | Start batching for given texture. |
| `gfx.batchSprite(textureId, x, y [, w, h, srcX, srcY, srcW, srcH, rotation, tint])` | Add sprite to batch (same texture). |
| `gfx.endBatch()` | Flush batch to GPU. |
| `gfx.flushBatch()` | Alias for endBatch. |

If you call `batchSprite` with a different texture than the current batch, the implementation may flush and start a new batch automatically (implementation-defined).

---

## 12. Particles

CPU or GPU particle system: emitters, update, draw.

| Function | Description |
|----------|-------------|
| `gfx.createParticleEmitter(config)` | Create emitter. `config` = map: maxParticles, rate, lifeMin, lifeMax, speedMin, speedMax, angleMin, angleMax, sizeStart, sizeEnd, colorStart [r,g,b,a], colorEnd [r,g,b,a], gravityX, gravityY, textureId (optional), blendMode. |
| `gfx.emit(emitterId, count, x, y)` | Spawn `count` particles at (x,y). |
| `gfx.emitDirectional(emitterId, count, x, y, dirX, dirY, spreadAngle)` | Spawn with direction and spread (radians). |
| `gfx.updateParticles(emitterId, dt)` | Advance particles by dt seconds. |
| `gfx.drawParticles(emitterId)` | Draw all living particles (uses current transform). |
| `gfx.destroyParticleEmitter(emitterId)` | Release emitter. |

---

## 13. Tilemaps

Tile-based layers for 2D games.

| Function | Description |
|----------|-------------|
| `gfx.loadTileset(path, tileWidth, tileHeight [, spacing, margin])` | Load tileset image. Returns tileset id. |
| `gfx.createTilemap(tilesetId, layerWidth, layerHeight)` | Create tile layer (in tiles). Returns tilemap id. |
| `gfx.setTile(tilemapId, tx, ty, tileIndex)` | Set tile at grid (tx, ty). tileIndex = index in tileset (row-major). |
| `gfx.getTile(tilemapId, tx, ty)` | Get tile index at (tx, ty). Returns -1 if empty or out of range. |
| `gfx.setAnimatedTile(tilemapId, tx, ty, frameIndices, fps)` | Animated tile: cycle through frameIndices at fps. |
| `gfx.drawTilemap(tilemapId, cameraX, cameraY, screenW, screenH)` | Draw visible tiles (culling by camera and screen). |
| `gfx.drawTilemapEx(tilemapId, ox, oy, scaleX, scaleY, rotation)` | Draw with origin, scale, rotation. |
| `gfx.destroyTilemap(tilemapId)` | Release tilemap. |
| `gfx.destroyTileset(tilesetId)` | Release tileset. |

Optional: collision layer (return collision shape or pass callback). Design may extend to multiple tile layers and tile flipping (horizontal/vertical).

---

## 14. Text and fonts

| Function | Description |
|----------|-------------|
| `gfx.loadFont(path, size)` | Load TTF at given pixel size. Returns font id (≥0) or -1. |
| `gfx.loadFontFromMemory(data, size)` | Load from byte array (if supported). |
| `gfx.unloadFont(fontId)` | Release font. |
| `gfx.measureText(fontId, text)` | Returns { width, height } in pixels. |
| `gfx.measureTextLines(fontId, text, maxWidth)` | Word-wrap and return { width, height, lineCount, lines[] }. |
| `gfx.drawText(fontId, text, x, y [, color])` | Draw at (x,y); optional color. |
| `gfx.drawTextAligned(fontId, text, x, y, alignH, alignV [, color])` | alignH: "left", "center", "right". alignV: "top", "middle", "bottom". |
| `gfx.drawTextWrapped(fontId, text, x, y, maxWidth [, color])` | Word-wrap and draw. |
| `gfx.setDefaultFont(fontId)` | Use this font when fontId is omitted (-1). |

Rich text (optional extension): markup for color/size per segment, e.g. `drawRichText(fontId, markup, x, y)`.

---

## 15. Masking and clipping

| Function | Description |
|----------|-------------|
| `gfx.pushClipRect(x, y, w, h)` | Intersect current clip with rectangle (in current transform). |
| `gfx.pushClipPath()` | Use current path as clip (same as clipPath). |
| `gfx.popClip()` | Restore previous clip. |
| `gfx.getClipBounds()` | Get current clip as { x, y, w, h } or nil if unclipped. |

Stencil (advanced): optional `gfx.setStencilWrite(mask)`, `gfx.setStencilTest(ref, mask)`, `gfx.clearStencil()` for masking with arbitrary shapes.

---

## 16. Post-processing pipeline

Apply a chain of full-screen effects (e.g. blur, bloom, color correction) to a layer or the main canvas.

| Function | Description |
|----------|-------------|
| `gfx.createPostPipeline()` | Create empty pipeline. Returns pipeline id. |
| `gfx.postAddEffect(pipelineId, shaderId [, params])` | Add effect (shader) to end of chain. params = map of uniform names to values. |
| `gfx.postClear(pipelineId)` | Remove all effects. |
| `gfx.postProcess(pipelineId, sourceLayerId, targetLayerId)` | Run pipeline: source → effect1 → … → target. target -1 = main canvas. |
| `gfx.destroyPostPipeline(pipelineId)` | Release pipeline. |

Common effects (can be provided as built-in shaders): blur (gaussian, radius), bloom (threshold, intensity), vignette, CRT, color grade (LUT or params), scanlines.

---

## 17. Camera and viewport

| Function | Description |
|----------|-------------|
| `gfx.setViewport(x, y, w, h)` | Set viewport (pixels). All drawing is clipped to viewport. |
| `gfx.pushViewport()` | Save current viewport. |
| `gfx.popViewport()` | Restore viewport. |
| `gfx.resetViewport()` | Full target size. |
| `gfx.setCamera2D(x, y, zoom [, rotation])` | Set 2D camera: center (x,y), zoom (1 = 100%), rotation radians. Applied as transform. |
| `gfx.getCamera2D()` | Return { x, y, zoom, rotation }. |
| `gfx.screenToWorld(screenX, screenY)` | Transform screen coords to world (inverse of camera + viewport). Returns { x, y }. |
| `gfx.worldToScreen(worldX, worldY)` | World to screen. Returns { x, y }. |

---

## 18. Color utilities

| Function | Description |
|----------|-------------|
| `gfx.rgb(r, g, b)` | Returns [r, g, b, 255]. |
| `gfx.rgba(r, g, b, a)` | Returns [r, g, b, a]. |
| `gfx.hex(hex)` | Parse "#rrggbb" or "#rrggbbaa"; returns [r, g, b, a]. |
| `gfx.hsl(h, s, l)` | HSL 0–360, 0–1, 0–1; returns [r, g, b, 255]. |
| `gfx.hsla(h, s, l, a)` | HSL + alpha. |
| `gfx.lerpColor(c1, c2, t)` | Interpolate between two [r,g,b,a] arrays; t 0–1. |
| `gfx.gammaCorrect(color, gamma)` | Apply gamma; color = [r,g,b,a], values 0–1 or 0–255 (implementation-defined). |

---

## 19. Input (optional)

If the advanced graphics module owns the window, it can expose input. Otherwise use `import "game"` or `import "2dgraphics"` for input.

| Function | Description |
|----------|-------------|
| `gfx.isKeyPressed(key)` | True this frame. key = "A", "SPACE", "ESCAPE", etc. |
| `gfx.isKeyDown(key)` | True while held. |
| `gfx.mouseX()`, `gfx.mouseY()` | Cursor position in window. |
| `gfx.isMousePressed(button)` | True this frame. button 0=left, 1=right, 2=middle. |
| `gfx.isMouseDown(button)` | True while held. |
| `gfx.scrollX()`, `gfx.scrollY()` | Scroll delta this frame (if available). |

---

## 20. Summary: API by category

- **Core:** create, destroy, isOpen, shouldClose, setSize, width, height, setTitle, toggleFullscreen, setTargetFps, setVsync, beginFrame, endFrame, clear, present, run, deltaTime, fps.
- **Layers:** createLayer, createLayerSameSize, destroyLayer, setTarget, getTarget, layerWidth, layerHeight, drawLayer, drawLayerEx.
- **Transforms:** save, restore, translate, scale, rotate, rotateDeg, skew, transform, setMatrix, getMatrix, identity.
- **State:** setColor, setColorArray, getColor, setBlendMode, setGlobalAlpha, setShader, setLineWidth, setLineCap, setLineJoin, setMiterLimit, setDash, setDashOff.
- **Blend modes:** setBlendMode with normal, add, multiply, screen, overlay, darken, lighten, etc.
- **Primitives:** fillRect, strokeRect, fillCircle, strokeCircle, fillEllipse, strokeEllipse, fillPolygon, strokePolygon, drawLine, drawLineStrip, drawLineLoop, setPixel.
- **Paths:** beginPath, moveTo, lineTo, quadTo, bezierTo, arc, arcTo, ellipse, rectPath, closePath, fillPath, strokePath, clipPath; createPath, pathMoveTo, pathLineTo, pathQuadTo, pathBezierTo, pathArc, pathClose, drawPath, destroyPath.
- **Gradients/pattern:** createLinearGradient, createRadialGradient, createConicGradient, gradientAddStop, setFillGradient, createPattern, setFillPattern, destroyGradient, destroyPattern.
- **Shaders:** loadShader, loadShaderFromSource, unloadShader, useShader, setUniform*, drawFullscreenQuad.
- **Textures:** loadTexture, createTexture, updateTexture, unloadTexture, textureWidth, textureHeight, drawTexture, drawTextureEx, drawTextureRotated.
- **Batching:** beginBatch, batchSprite, endBatch.
- **Particles:** createParticleEmitter, emit, emitDirectional, updateParticles, drawParticles, destroyParticleEmitter.
- **Tilemaps:** loadTileset, createTilemap, setTile, getTile, setAnimatedTile, drawTilemap, drawTilemapEx, destroyTilemap, destroyTileset.
- **Text:** loadFont, unloadFont, measureText, measureTextLines, drawText, drawTextAligned, drawTextWrapped, setDefaultFont.
- **Masking:** pushClipRect, pushClipPath, popClip, getClipBounds.
- **Post:** createPostPipeline, postAddEffect, postClear, postProcess, destroyPostPipeline.
- **Camera/viewport:** setViewport, pushViewport, popViewport, resetViewport, setCamera2D, getCamera2D, screenToWorld, worldToScreen.
- **Color:** rgb, rgba, hex, hsl, hsla, lerpColor, gammaCorrect.
- **Input:** (optional) isKeyPressed, isKeyDown, mouseX, mouseY, isMousePressed, isMouseDown, scrollX, scrollY.

---

## Implementation notes

- **Backend:** Can be implemented on top of Raylib, OpenGL, or a minimal GPU abstraction (e.g. OpenGL ES 2/3 or WebGPU later). Paths map to immediate-mode tessellation or to a path renderer (e.g. NV_path_rendering, Skia, or software tessellation).
- **Module name:** e.g. `gfx` or `graphics`; register in the same way as 2dgraphics (builtin module when built with game).
- **SPL types:** IDs (layers, textures, shaders, paths, gradients, etc.) are integers. Config and return values use maps and arrays as shown.
- **Errors:** Functions that can fail (load*, create*) return -1 or nil; success returns id ≥ 0 or a value. No exceptions required.

---

## See also

- [SPL_2DGRAPHICS_API.md](SPL_2DGRAPHICS_API.md) – Current simpler 2D API (implemented).
- [SPL_GAME_API.md](SPL_GAME_API.md) – Game runtime (window, draw, input).
- [ROADMAP.md](ROADMAP.md) – Future plans including game/graphics.
- [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) – Example scripts.
