/**
 * SPL Game builtins - Window, rendering, input, timing, sound, text (Raylib backend).
 * Graphics/game are exposed as a module (Python-style): import game; game.window_create(...)
 * Use createGameModule() for __import("game"). Use registerGameBuiltins() only for spl_game (globals).
 */
#ifndef SPL_GAME_BUILTINS_HPP
#define SPL_GAME_BUILTINS_HPP

#include <vector>
#include <string>
#include <memory>
#include "vm/value.hpp"

namespace spl {
class VM;

/** Register game builtins as globals (for spl_game runner). */
void registerGameBuiltins(VM& vm);
/** Create the game module (map of name -> function). Use for import game. */
ValuePtr createGameModule(VM& vm);
std::vector<std::string> getGameBuiltinNames();

/** Shared graphics window (used by game and 2dgraphics). */
bool graphicsWindowOpen();
void graphicsInitWindow(int width, int height, const std::string& title);
void graphicsCloseWindow();
/** Begin/end a drawing frame (for 2dgraphics manual frame). */
void graphicsBeginFrame();
void graphicsEndFrame();
/** Camera (used by 2dgraphics and game). */
void graphicsSetCameraTarget(float x, float y);
void graphicsMoveCameraTarget(float dx, float dy);
void graphicsSetCameraZoom(float zoom);
void graphicsSetCameraEnabled(bool enable);
void graphicsBegin2D();
void graphicsEnd2D();
/** Window (for 2dgraphics). */
void graphicsSetWindowSize(int width, int height);
void graphicsToggleFullscreen();
} // namespace spl

#endif
