/**
 * SPL process module – external process memory inspection (list, open, read/write, scan).
 * Use: let process = import("process"); let handle = process.open(pid); process.read_u32(handle, addr);
 * Windows: OpenProcess, ReadProcessMemory, WriteProcessMemory, CloseHandle, TlHelp32.
 */
#ifndef SPL_PROCESS_MODULE_HPP
#define SPL_PROCESS_MODULE_HPP

#include "vm/value.hpp"
#include <memory>

namespace spl {
class VM;

/** Create the process module (map of name -> function). Used by import("process"). */
ValuePtr createProcessModule(VM& vm);
} // namespace spl

#endif
