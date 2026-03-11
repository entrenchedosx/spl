/**
 * SPL g2d module – 2D graphics (window, render loop, shapes, text, colors).
 * Use: let g = import("g2d"); g.createWindow(800, 600, "Title"); g.run(update, draw);
 */
#ifndef SPL_G2D_H
#define SPL_G2D_H

#include "vm/value.hpp"
#include <memory>

namespace spl {
class VM;

/** Create the g2d module (map of name -> function). Used by import("g2d"). */
ValuePtr create2dGraphicsModule(VM& vm);
} // namespace spl

#endif
