#include "stdlib_modules.hpp"
#include "vm/builtins.hpp"
#include "vm/value.hpp"
#include <unordered_map>
#include <vector>
#include <string>

namespace spl {

ValuePtr createStdlibModule(VM& vm, const std::string& name) {
    static const std::unordered_map<std::string, std::vector<std::string>> MODULES = {
        // Math: full set including constants (PI, E set below)
        { "math", {
            "sqrt", "pow", "sin", "cos", "tan", "floor", "ceil", "round", "round_to", "abs", "min", "max",
            "clamp", "lerp", "log", "atan2", "sign", "deg_to_rad", "rad_to_deg", "PI", "E"
        }},
        // String: all string builtins including regex
        { "string", {
            "upper", "lower", "replace", "join", "split", "trim", "starts_with", "ends_with",
            "repeat", "pad_left", "pad_right", "split_lines", "format", "len", "regex_match", "regex_replace",
            "chr", "ord", "hex", "bin", "hash_fnv", "escape_regex"
        }},
        { "json", { "json_parse", "json_stringify" }},
        { "random", { "random", "random_int", "random_choice", "random_shuffle" }},
        // System: process, error, and debugging
        { "sys", {
            "cli_args", "print", "panic", "error_message", "Error", "stack_trace", "stack_trace_array", "assertType",
            "error_name", "error_cause", "ValueError", "TypeError", "RuntimeError", "OSError", "KeyError", "is_error_type",
            "repr", "spl_version", "platform", "os_name", "arch", "exit_code", "uuid", "env_all", "env_get",
            "cwd", "chdir", "hostname", "cpu_count", "getpid", "monotonic_time", "env_set"
        }},
        { "io", {
            "read_file", "write_file", "readFile", "writeFile", "readline", "base64_encode", "base64_decode", "csv_parse", "csv_stringify", "fileExists", "listDir", "file_size", "glob",
            "listDirRecursive", "create_dir", "is_file", "is_dir", "copy_file", "delete_file", "move_file"
        }},
        // Array: full combinator set
        { "array", {
            "array", "len", "push", "push_front", "slice", "map", "filter", "reduce", "reverse", "find",
            "sort", "flatten", "flat_map", "zip", "chunk", "unique", "first", "last", "take", "drop",
            "sort_by", "copy", "cartesian", "window", "deep_equal", "insert_at", "remove_at"
        }},
        { "env", { "env_get", "env_all", "env_set" }},
        // Map/object utilities
        { "map", {
            "keys", "values", "has", "merge", "deep_equal", "copy"
        }},
        // Type conversion
        { "types", {
            "str", "int", "float", "parse_int", "parse_float", "is_nan", "is_inf",
            "is_string", "is_array", "is_map", "is_number", "is_function", "type"
        }},
        // Debug and reflection
        { "debug", {
            "inspect", "type", "dir", "stack_trace", "assert_eq"
        }},
        // Logging
        { "log", {
            "log_info", "log_warn", "log_error", "log_debug"
        }},
        // Time
        { "time", {
            "time", "sleep", "time_format", "monotonic_time"
        }},
        // Low-level memory (see LOW_LEVEL_AND_MEMORY.md)
        { "memory", {
            "alloc", "free", "ptr_address", "ptr_from_address", "ptr_offset",
            "peek8", "peek16", "peek32", "peek64", "peek8s", "peek16s", "peek32s", "peek64s",
            "poke8", "poke16", "poke32", "poke64",
            "peek_float", "poke_float", "peek_double", "poke_double",
            "mem_copy", "mem_set", "mem_cmp", "mem_move", "mem_swap", "realloc",
            "align_up", "align_down", "ptr_align_up", "ptr_align_down",
            "memory_barrier",
            "volatile_load8", "volatile_store8", "volatile_load16", "volatile_store16",
            "volatile_load32", "volatile_store32", "volatile_load64", "volatile_store64",
            "bytes_read", "bytes_write", "ptr_is_null", "size_of_ptr",
            "ptr_add", "ptr_sub", "is_aligned", "mem_set_zero", "ptr_tag", "ptr_untag", "ptr_get_tag",
            "struct_define", "offsetof_struct", "sizeof_struct",
            "pool_create", "pool_alloc", "pool_free", "pool_destroy",
            "read_be16", "read_be32", "read_be64", "write_be16", "write_be32", "write_be64",
            "dump_memory", "alloc_tracked", "free_tracked", "get_tracked_allocations",
            "atomic_load32", "atomic_store32", "atomic_add32", "atomic_cmpxchg32",
            "map_file", "unmap_file", "memory_protect",
            "read_le16", "read_le32", "read_le64", "write_le16", "write_le32", "write_le64", "alloc_zeroed",
            "ptr_eq", "alloc_aligned", "string_to_bytes", "bytes_to_string",
            "memory_page_size", "mem_find", "mem_fill_pattern",
            "ptr_compare", "mem_reverse",
            "mem_scan", "mem_overlaps", "get_endianness",
            "mem_is_zero", "read_le_float", "write_le_float",
            "read_le_double", "write_le_double",
            "mem_count", "ptr_min", "ptr_max", "ptr_diff",
            "read_be_float", "write_be_float", "read_be_double", "write_be_double", "ptr_in_range",
            "mem_xor", "mem_zero"
        }},
        // General utilities
        { "util", {
            "range", "default", "merge", "all", "any", "vec2", "vec3", "rand_vec2", "rand_vec3"
        }},
        // Profiling
        { "profiling", {
            "profile_cycles", "profile_fn"
        }},
        // Path and file system (path helpers + file I/O)
        { "path", {
            "basename", "dirname", "path_join", "cwd", "chdir", "realpath", "temp_dir",
            "read_file", "write_file", "fileExists", "listDir", "listDirRecursive",
            "create_dir", "is_file", "is_dir", "copy_file", "delete_file", "move_file", "file_size", "glob"
        }},
        // Errors and exceptions
        { "errors", {
            "Error", "panic", "error_message", "error_name", "error_cause",
            "ValueError", "TypeError", "RuntimeError", "OSError", "KeyError", "is_error_type"
        }},
        // Iteration and sequences
        { "iter", {
            "range", "map", "filter", "reduce", "all", "any", "cartesian", "window"
        }},
        // Collections (arrays and maps)
        { "collections", {
            "array", "len", "push", "push_front", "slice", "keys", "values", "has",
            "map", "filter", "reduce", "reverse", "find", "sort", "flatten", "flat_map",
            "zip", "chunk", "unique", "first", "last", "take", "drop", "sort_by",
            "copy", "merge", "deep_equal", "cartesian", "window"
        }},
        // File system (alias for io)
        { "fs", {
            "read_file", "write_file", "readFile", "writeFile", "fileExists", "listDir",
            "listDirRecursive", "create_dir", "is_file", "is_dir", "copy_file", "delete_file", "move_file"
        }},
        // Python-inspired: re -> regex
        { "regex", { "regex_match", "regex_replace", "escape_regex" }},
        // Python csv
        { "csv", { "csv_parse", "csv_stringify" }},
        // Python base64 -> b64
        { "b64", { "base64_encode", "base64_decode" }},
        // Python logging
        { "logging", { "log_info", "log_warn", "log_error", "log_debug" }},
        // Python hashlib -> hash
        { "hash", { "hash_fnv" }},
        // Python uuid
        { "uuid", { "uuid" }},
        // Python os (env + path + process info)
        { "os", { "cwd", "chdir", "getpid", "hostname", "cpu_count", "env_get", "env_all", "env_set", "listDir", "create_dir", "is_file", "is_dir", "temp_dir", "realpath" }},
        // Python copy
        { "copy", { "copy", "deep_equal" }},
        // Python datetime (time/format)
        { "datetime", { "time", "sleep", "time_format", "monotonic_time" }},
        // Python secrets (random + uuid)
        { "secrets", { "random", "random_int", "random_choice", "random_shuffle", "uuid" }},
        // Python itertools -> itools
        { "itools", { "range", "map", "filter", "reduce", "all", "any", "cartesian", "window" }},
        // Python argparse -> cli
        { "cli", { "cli_args" }},
        // Encoding (bytes/string)
        { "encoding", { "base64_encode", "base64_decode", "string_to_bytes", "bytes_to_string" }},
        // Python run/exit
        { "run", { "cli_args", "exit_code" }},
    };
    (void)vm;
    auto it = MODULES.find(name);
    if (it == MODULES.end()) return nullptr;
    const std::vector<std::string>& builtinNames = getBuiltinNames();
    std::unordered_map<std::string, ValuePtr> out;
    for (const std::string& key : it->second) {
        for (size_t i = 0; i < builtinNames.size(); ++i) {
            if (builtinNames[i] == key) {
                auto fn = std::make_shared<FunctionObject>();
                fn->isBuiltin = true;
                fn->builtinIndex = static_cast<int>(i);
                out[key] = std::make_shared<Value>(Value::fromFunction(fn));
                break;
            }
        }
    }
    if (name == "math") {
        out["PI"] = std::make_shared<Value>(Value::fromFloat(3.14159265358979323846));
        out["E"] = std::make_shared<Value>(Value::fromFloat(2.71828182845904523536));
        out["TAU"] = std::make_shared<Value>(Value::fromFloat(6.28318530717958647692));  // 2*PI
    }
    return std::make_shared<Value>(Value::fromMap(std::move(out)));
}

bool isStdlibModuleName(const std::string& name) {
    return name == "math" || name == "string" || name == "json" || name == "random"
        || name == "sys" || name == "io" || name == "array" || name == "env"
        || name == "map" || name == "types" || name == "debug" || name == "log"
        || name == "time" || name == "memory" || name == "util" || name == "profiling"
        || name == "path" || name == "errors" || name == "iter" || name == "collections" || name == "fs"
        || name == "regex" || name == "csv" || name == "b64" || name == "logging" || name == "hash"
        || name == "uuid" || name == "os" || name == "copy" || name == "datetime" || name == "secrets"
        || name == "itools" || name == "cli" || name == "encoding" || name == "run";
}

} // namespace spl
