/**
 * SPL standard library modules – import math; math.sqrt(2)
 */
#ifndef SPL_STDLIB_MODULES_HPP
#define SPL_STDLIB_MODULES_HPP

#include "vm/vm.hpp"
#include "vm/value.hpp"
#include <string>

namespace spl {

ValuePtr createStdlibModule(VM& vm, const std::string& name);
bool isStdlibModuleName(const std::string& name);

} // namespace spl

#endif
