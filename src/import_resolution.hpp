/**
 * SPL import resolution – shared by main and REPL.
 * Registers __import builtin that resolves: game, g2d, process, stdlib, and file-based modules.
 */
#ifndef SPL_IMPORT_RESOLUTION_HPP
#define SPL_IMPORT_RESOLUTION_HPP

#include "vm/vm.hpp"
#include "vm/value.hpp"
#include <string>

namespace spl {

/** Builtin index used for __import (must not clash with other builtins). */
constexpr size_t IMPORT_BUILTIN_INDEX = 200;

/**
 * Register the __import builtin on the given VM.
 * Call once after registerAllBuiltins (and optionally registerGameBuiltins).
 */
void registerImportBuiltin(VM& vm);

} // namespace spl

#endif
