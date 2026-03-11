/**
 * SPL process module – implementation (Windows: OpenProcess, ReadProcessMemory, etc.).
 */
#include "process_module.hpp"
#include "vm/vm.hpp"
#include "vm/value.hpp"
#include <vector>
#include <unordered_map>
#include <string>
#include <cstdint>
#include <cstring>

#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <tlhelp32.h>
#endif

namespace spl {

static int64_t toInt(ValuePtr v) {
    if (!v) return 0;
    if (v->type == Value::Type::INT) return std::get<int64_t>(v->data);
    if (v->type == Value::Type::FLOAT) return static_cast<int64_t>(std::get<double>(v->data));
    return 0;
}

static uint64_t toU64(ValuePtr v) {
    if (!v) return 0;
    if (v->type == Value::Type::INT) return static_cast<uint64_t>(std::get<int64_t>(v->data));
    if (v->type == Value::Type::FLOAT) return static_cast<uint64_t>(std::get<double>(v->data));
    return 0;
}

static double toFloat(ValuePtr v) {
    if (!v) return 0;
    if (v->type == Value::Type::INT) return static_cast<double>(std::get<int64_t>(v->data));
    if (v->type == Value::Type::FLOAT) return std::get<double>(v->data);
    return 0;
}

static std::string toString(ValuePtr v) {
    if (!v) return "";
    return v->toString();
}

#ifdef _WIN32
static const DWORD PROCESS_ACCESS = PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_QUERY_INFORMATION | PROCESS_VM_OPERATION;

static std::vector<HANDLE> s_processHandles;

static HANDLE getHandle(int64_t h) {
    if (h < 0 || static_cast<size_t>(h) >= s_processHandles.size()) return nullptr;
    HANDLE ph = s_processHandles[static_cast<size_t>(h)];
    if (ph == nullptr || ph == INVALID_HANDLE_VALUE) return nullptr;
    return ph;
}
#endif

static const size_t PROCESS_BASE = 350;

static void registerProcessToVM(VM& vm, std::function<void(const std::string&, ValuePtr)> onFn) {
    size_t i = PROCESS_BASE;
    auto add = [&vm, &i, &onFn](const std::string& name, VM::BuiltinFn fn) {
        vm.registerBuiltin(i, std::move(fn));
        auto f = std::make_shared<FunctionObject>();
        f->isBuiltin = true;
        f->builtinIndex = static_cast<int>(i);
        onFn(name, std::make_shared<Value>(Value::fromFunction(f)));
        ++i;
    };

#ifdef _WIN32
    add("list", [](VM*, std::vector<ValuePtr>) {
        std::vector<ValuePtr> out;
        HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (snap == INVALID_HANDLE_VALUE) return Value::fromArray(std::move(out));
        PROCESSENTRY32W pe = {};
        pe.dwSize = sizeof(pe);
        if (Process32FirstW(snap, &pe)) {
            do {
                auto m = std::make_shared<Value>(Value::fromMap(std::unordered_map<std::string, ValuePtr>()));
                std::get<std::unordered_map<std::string, ValuePtr>>(m->data)["pid"] = std::make_shared<Value>(Value::fromInt(static_cast<int64_t>(pe.th32ProcessID)));
                std::string name;
                for (int k = 0; pe.szExeFile[k] != 0 && k < MAX_PATH; ++k)
                    name += static_cast<char>(pe.szExeFile[k] <= 127 ? pe.szExeFile[k] : '?');
                std::get<std::unordered_map<std::string, ValuePtr>>(m->data)["name"] = std::make_shared<Value>(Value::fromString(name));
                out.push_back(m);
            } while (Process32NextW(snap, &pe));
        }
        CloseHandle(snap);
        return Value::fromArray(std::move(out));
    });

    add("find", [](VM*, std::vector<ValuePtr> args) {
        if (args.empty() || !args[0]) return Value::fromInt(-1);
        std::string target = toString(args[0]);
        HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (snap == INVALID_HANDLE_VALUE) return Value::fromInt(-1);
        PROCESSENTRY32W pe = {};
        pe.dwSize = sizeof(pe);
        int64_t found = -1;
        if (Process32FirstW(snap, &pe)) {
            do {
                std::string name;
                for (int k = 0; pe.szExeFile[k] != 0 && k < MAX_PATH; ++k)
                    name += static_cast<char>(pe.szExeFile[k] <= 127 ? pe.szExeFile[k] : '?');
                if (name == target || (target.size() <= name.size() && name.compare(name.size() - target.size(), target.size(), target) == 0)) {
                    found = static_cast<int64_t>(pe.th32ProcessID);
                    break;
                }
            } while (Process32NextW(snap, &pe));
        }
        CloseHandle(snap);
        return Value::fromInt(found);
    });

    add("open", [](VM*, std::vector<ValuePtr> args) {
        if (args.empty()) throw VMError("process.open(pid) requires a process id", 0, 0, 1);
        DWORD pid = static_cast<DWORD>(toInt(args[0]));
        if (pid == 0) throw VMError("process.open: invalid pid 0", 0, 0, 3);
        HANDLE h = OpenProcess(PROCESS_ACCESS, FALSE, pid);
        if (!h || h == INVALID_HANDLE_VALUE) throw VMError("process.open: access denied or process not found (run with sufficient privileges)", 0, 0, 1);
        size_t idx = s_processHandles.size();
        s_processHandles.push_back(h);
        return Value::fromInt(static_cast<int64_t>(idx));
    });

    add("close", [](VM*, std::vector<ValuePtr> args) {
        if (args.empty()) return Value::nil();
        int64_t h = toInt(args[0]);
        if (h >= 0 && static_cast<size_t>(h) < s_processHandles.size()) {
            HANDLE ph = s_processHandles[static_cast<size_t>(h)];
            s_processHandles[static_cast<size_t>(h)] = nullptr;
            if (ph && ph != INVALID_HANDLE_VALUE) CloseHandle(ph);
        }
        return Value::nil();
    });

    add("read_u8", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) throw VMError("process.read_u8(handle, address) requires 2 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.read_u8: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        uint8_t val = 0;
        SIZE_T read = 0;
        if (!ReadProcessMemory(ph, reinterpret_cast<LPCVOID>(addr), &val, sizeof(val), &read) || read != sizeof(val))
            throw VMError("process.read_u8: ReadProcessMemory failed (invalid address or access denied)", 0, 0, 1);
        return Value::fromInt(static_cast<int64_t>(val));
    });

    add("read_u16", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) throw VMError("process.read_u16(handle, address) requires 2 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.read_u16: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        uint16_t val = 0;
        SIZE_T read = 0;
        if (!ReadProcessMemory(ph, reinterpret_cast<LPCVOID>(addr), &val, sizeof(val), &read) || read != sizeof(val))
            throw VMError("process.read_u16: ReadProcessMemory failed", 0, 0, 1);
        return Value::fromInt(static_cast<int64_t>(val));
    });

    add("read_u32", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) throw VMError("process.read_u32(handle, address) requires 2 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.read_u32: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        uint32_t val = 0;
        SIZE_T read = 0;
        if (!ReadProcessMemory(ph, reinterpret_cast<LPCVOID>(addr), &val, sizeof(val), &read) || read != sizeof(val))
            throw VMError("process.read_u32: ReadProcessMemory failed", 0, 0, 1);
        return Value::fromInt(static_cast<int64_t>(val));
    });

    add("read_u64", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) throw VMError("process.read_u64(handle, address) requires 2 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.read_u64: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        uint64_t val = 0;
        SIZE_T read = 0;
        if (!ReadProcessMemory(ph, reinterpret_cast<LPCVOID>(addr), &val, sizeof(val), &read) || read != sizeof(val))
            throw VMError("process.read_u64: ReadProcessMemory failed", 0, 0, 1);
        return Value::fromInt(static_cast<int64_t>(val));
    });

    add("read_i32", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) throw VMError("process.read_i32(handle, address) requires 2 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.read_i32: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        int32_t val = 0;
        SIZE_T read = 0;
        if (!ReadProcessMemory(ph, reinterpret_cast<LPCVOID>(addr), &val, sizeof(val), &read) || read != sizeof(val))
            throw VMError("process.read_i32: ReadProcessMemory failed", 0, 0, 1);
        return Value::fromInt(static_cast<int64_t>(val));
    });

    add("read_float", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) throw VMError("process.read_float(handle, address) requires 2 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.read_float: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        float val = 0;
        SIZE_T read = 0;
        if (!ReadProcessMemory(ph, reinterpret_cast<LPCVOID>(addr), &val, sizeof(val), &read) || read != sizeof(val))
            throw VMError("process.read_float: ReadProcessMemory failed", 0, 0, 1);
        return Value::fromFloat(static_cast<double>(val));
    });

    add("read_double", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) throw VMError("process.read_double(handle, address) requires 2 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.read_double: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        double val = 0;
        SIZE_T read = 0;
        if (!ReadProcessMemory(ph, reinterpret_cast<LPCVOID>(addr), &val, sizeof(val), &read) || read != sizeof(val))
            throw VMError("process.read_double: ReadProcessMemory failed", 0, 0, 1);
        return Value::fromFloat(val);
    });

    add("read_bytes", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 3) throw VMError("process.read_bytes(handle, address, size) requires 3 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.read_bytes: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        int64_t sz = toInt(args[2]);
        if (sz <= 0 || sz > 1024 * 1024) throw VMError("process.read_bytes: size must be 1..1048576", 0, 0, 3);
        std::vector<unsigned char> buf(static_cast<size_t>(sz));
        SIZE_T read = 0;
        if (!ReadProcessMemory(ph, reinterpret_cast<LPCVOID>(addr), buf.data(), static_cast<SIZE_T>(sz), &read))
            throw VMError("process.read_bytes: ReadProcessMemory failed", 0, 0, 1);
        std::vector<ValuePtr> arr;
        for (SIZE_T j = 0; j < read; ++j) arr.push_back(std::make_shared<Value>(Value::fromInt(static_cast<int64_t>(buf[j]))));
        return Value::fromArray(std::move(arr));
    });

    add("write_u8", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 3) throw VMError("process.write_u8(handle, address, value) requires 3 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.write_u8: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        uint8_t val = static_cast<uint8_t>(toInt(args[2]) & 0xFF);
        SIZE_T written = 0;
        if (!WriteProcessMemory(ph, reinterpret_cast<LPVOID>(addr), &val, sizeof(val), &written) || written != sizeof(val))
            throw VMError("process.write_u8: WriteProcessMemory failed (invalid address or access denied)", 0, 0, 1);
        return Value::nil();
    });

    add("write_u32", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 3) throw VMError("process.write_u32(handle, address, value) requires 3 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.write_u32: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        uint32_t val = static_cast<uint32_t>(toInt(args[2]));
        SIZE_T written = 0;
        if (!WriteProcessMemory(ph, reinterpret_cast<LPVOID>(addr), &val, sizeof(val), &written) || written != sizeof(val))
            throw VMError("process.write_u32: WriteProcessMemory failed", 0, 0, 1);
        return Value::nil();
    });

    add("write_float", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 3) throw VMError("process.write_float(handle, address, value) requires 3 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.write_float: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        float val = static_cast<float>(toFloat(args[2]));
        SIZE_T written = 0;
        if (!WriteProcessMemory(ph, reinterpret_cast<LPVOID>(addr), &val, sizeof(val), &written) || written != sizeof(val))
            throw VMError("process.write_float: WriteProcessMemory failed", 0, 0, 1);
        return Value::nil();
    });

    add("write_bytes", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 3) throw VMError("process.write_bytes(handle, address, byte_array) requires 3 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.write_bytes: invalid or closed handle", 0, 0, 1);
        uint64_t addr = toU64(args[1]);
        if (!args[2] || args[2]->type != Value::Type::ARRAY) throw VMError("process.write_bytes: third argument must be an array of bytes", 0, 0, 2);
        auto& arr = std::get<std::vector<ValuePtr>>(args[2]->data);
        if (arr.empty() || arr.size() > 1024 * 1024) throw VMError("process.write_bytes: byte array size must be 1..1048576", 0, 0, 3);
        std::vector<unsigned char> buf(arr.size());
        for (size_t j = 0; j < arr.size(); ++j) buf[j] = static_cast<unsigned char>(toInt(arr[j]) & 0xFF);
        SIZE_T written = 0;
        if (!WriteProcessMemory(ph, reinterpret_cast<LPVOID>(addr), buf.data(), static_cast<SIZE_T>(buf.size()), &written))
            throw VMError("process.write_bytes: WriteProcessMemory failed", 0, 0, 1);
        return Value::nil();
    });

    add("ptr_add", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) return Value::fromInt(0);
        uint64_t ptr = toU64(args[0]);
        int64_t off = toInt(args[1]);
        return Value::fromInt(static_cast<int64_t>(ptr + static_cast<uint64_t>(off)));
    });
    add("ptr_sub", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) return Value::fromInt(0);
        uint64_t ptr = toU64(args[0]);
        int64_t off = toInt(args[1]);
        return Value::fromInt(static_cast<int64_t>(ptr - static_cast<uint64_t>(off)));
    });
    add("ptr_diff", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) return Value::fromInt(0);
        uint64_t a = toU64(args[0]);
        uint64_t b = toU64(args[1]);
        return Value::fromInt(static_cast<int64_t>(a - b));
    });

    add("scan", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 4) throw VMError("process.scan(handle, start_addr, end_addr, value) requires 4 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.scan: invalid or closed handle", 0, 0, 1);
        uint64_t start = toU64(args[1]);
        uint64_t end = toU64(args[2]);
        uint32_t value = static_cast<uint32_t>(toInt(args[3]));
        if (end <= start || (end - start) > 64 * 1024 * 1024) throw VMError("process.scan: invalid range or too large (max 64MB)", 0, 0, 3);
        std::vector<ValuePtr> out;
        const size_t chunk = 256 * 1024;
        std::vector<uint32_t> buf((chunk + 3) / 4, 0);
        for (uint64_t addr = start; addr + 4 <= end; ) {
            SIZE_T toRead = static_cast<SIZE_T>(std::min(chunk, end - addr));
            SIZE_T read = 0;
            if (!ReadProcessMemory(ph, reinterpret_cast<LPCVOID>(addr), buf.data(), toRead, &read)) break;
            size_t n = read / 4;
            for (size_t k = 0; k < n; ++k) {
                if (buf[k] == value) out.push_back(std::make_shared<Value>(Value::fromInt(static_cast<int64_t>(addr + k * 4))));
            }
            addr += read;
        }
        return Value::fromArray(std::move(out));
    });

    add("scan_bytes", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) throw VMError("process.scan_bytes(handle, pattern) requires 2 arguments", 0, 0, 5);
        HANDLE ph = getHandle(toInt(args[0]));
        if (!ph) throw VMError("process.scan_bytes: invalid or closed handle", 0, 0, 1);
        std::vector<unsigned char> pattern;
        if (args[1]->type == Value::Type::STRING) {
            const std::string& s = std::get<std::string>(args[1]->data);
            for (unsigned char c : s) pattern.push_back(c);
        } else if (args[1]->type == Value::Type::ARRAY) {
            auto& arr = std::get<std::vector<ValuePtr>>(args[1]->data);
            for (const auto& v : arr) pattern.push_back(static_cast<unsigned char>(toInt(v) & 0xFF));
        } else throw VMError("process.scan_bytes: pattern must be string or byte array", 0, 0, 2);
        if (pattern.empty() || pattern.size() > 1024) throw VMError("process.scan_bytes: pattern size 1..1024", 0, 0, 3);
        std::vector<ValuePtr> out;
        const size_t chunk = 256 * 1024;
        std::vector<unsigned char> buf(chunk, 0);
        uint64_t addr = 0;
        while (addr < 0x7FFFFFFFFFFF) {
            SIZE_T read = 0;
            if (!ReadProcessMemory(ph, reinterpret_cast<LPCVOID>(addr), buf.data(), chunk, &read) || read == 0) break;
            for (SIZE_T i = 0; i + pattern.size() <= read; ++i) {
                bool match = true;
                for (size_t k = 0; k < pattern.size(); ++k) { if (buf[i + k] != pattern[k]) { match = false; break; } }
                if (match) out.push_back(std::make_shared<Value>(Value::fromInt(static_cast<int64_t>(addr + i))));
            }
            addr += read;
            if (out.size() >= 1000) break;
        }
        return Value::fromArray(std::move(out));
    });

#else
    add("list", [](VM*, std::vector<ValuePtr>) { return Value::fromArray({}); });
    add("find", [](VM*, std::vector<ValuePtr>) { return Value::fromInt(-1); });
    add("open", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only in this build", 0, 0, 1); return Value::nil(); });
    add("close", [](VM*, std::vector<ValuePtr>) { return Value::nil(); });
    add("read_u8", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("read_u16", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("read_u32", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("read_u64", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("read_i32", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("read_float", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("read_double", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("read_bytes", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("write_u8", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("write_u32", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("write_float", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("write_bytes", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("ptr_add", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) return Value::fromInt(0);
        return Value::fromInt(static_cast<int64_t>(toU64(args[0]) + static_cast<uint64_t>(toInt(args[1]))));
    });
    add("ptr_sub", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) return Value::fromInt(0);
        return Value::fromInt(static_cast<int64_t>(toU64(args[0]) - static_cast<uint64_t>(toInt(args[1]))));
    });
    add("ptr_diff", [](VM*, std::vector<ValuePtr> args) {
        if (args.size() < 2) return Value::fromInt(0);
        return Value::fromInt(static_cast<int64_t>(toU64(args[0]) - toU64(args[1])));
    });
    add("scan", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
    add("scan_bytes", [](VM*, std::vector<ValuePtr>) { throw VMError("process module: Windows only", 0, 0, 1); return Value::nil(); });
#endif
}

static std::unordered_map<std::string, ValuePtr> s_processModuleMap;

ValuePtr createProcessModule(VM& vm) {
    if (s_processModuleMap.empty())
        registerProcessToVM(vm, [](const std::string& name, ValuePtr v) { s_processModuleMap[name] = v; });
    return std::make_shared<Value>(Value::fromMap(s_processModuleMap));
}

} // namespace spl
