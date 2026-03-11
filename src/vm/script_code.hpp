/**
 * Script bytecode + constants for imported scripts so functions can be called after import returns.
 */

#ifndef SPL_SCRIPT_CODE_HPP
#define SPL_SCRIPT_CODE_HPP

#include "bytecode.hpp"
#include "value.hpp"
#include <vector>
#include <string>

namespace spl {

struct ScriptCode {
    Bytecode code;
    std::vector<std::string> stringConstants;
    std::vector<Value> valueConstants;
};

} // namespace spl

#endif // SPL_SCRIPT_CODE_HPP
