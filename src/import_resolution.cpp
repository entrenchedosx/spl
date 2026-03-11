/**
 * SPL import resolution – shared implementation for main and REPL.
 */
#ifdef _MSC_VER
#define _CRT_SECURE_NO_WARNINGS 1
#endif
#include "import_resolution.hpp"
#include "compiler/lexer.hpp"
#include "compiler/parser.hpp"
#include "compiler/codegen.hpp"
#include "compiler/ast.hpp"
#include "stdlib_modules.hpp"
#include "process/process_module.hpp"
#ifdef SPL_BUILD_GAME
#include "game/game_builtins.hpp"
#include "modules/g2d/g2d.h"
#endif
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <cstdlib>

namespace spl {

namespace {

/** Reject path traversal (e.g. import("../../../etc/passwd")). */
static bool pathHasTraversal(const std::string& path) {
    const std::string sep = path.find('\\') != std::string::npos ? "\\" : "/";
    if (path.find(".." + sep) != std::string::npos) return true;
    if (path.find(sep + "..") != std::string::npos) return true;
    if (path.size() >= 2 && path.compare(0, 2, "..") == 0) return true;
    return false;
}

/** Resolve file path: try path, then SPL_LIB/path if SPL_LIB is set. */
static std::string resolveImportPath(const std::string& path) {
    if (pathHasTraversal(path)) return "";
    std::ifstream f(path);
    if (f) return path;
    const char* lib = std::getenv("SPL_LIB");
    if (lib && lib[0]) {
        std::string candidate = std::string(lib);
        if (candidate.back() != '/' && candidate.back() != '\\')
            candidate += '/';
        candidate += path;
        if (pathHasTraversal(candidate)) return "";
        std::ifstream f2(candidate);
        if (f2) return candidate;
    }
    return "";
}

static Value runImportBuiltin(VM* v, std::vector<ValuePtr> args) {
    if (!v || args.empty() || !args[0] || args[0]->type != Value::Type::STRING)
        return Value::nil();
    std::string path = std::get<std::string>(args[0]->data);
    std::string base = path;
    if (base.size() >= 4 && base.compare(base.size() - 4, 4, ".spl") == 0)
        base = base.substr(0, base.size() - 4);

#ifdef SPL_BUILD_GAME
    if (path == "game" || path == "game.spl" || base == "game") {
        ValuePtr mod = createGameModule(*v);
        return mod ? *mod : Value::nil();
    }
    if (path == "g2d" || path == "g2d.spl" || path == "2dgraphics" || path == "2dgraphics.spl" || base == "g2d" || base == "2dgraphics") {
        ValuePtr mod = create2dGraphicsModule(*v);
        return mod ? *mod : Value::nil();
    }
#endif
    if (base == "g2d" || base == "2dgraphics") {
        std::cerr << "import: 'g2d' (2D graphics) is not available in this build." << std::endl;
        std::cerr << "  To enable: install Raylib (e.g. vcpkg install raylib), then reconfigure and rebuild." << std::endl;
        return Value::nil();
    }
    if (base == "game") {
        std::cerr << "import: 'game' is not available. Rebuild with Raylib." << std::endl;
        return Value::nil();
    }
    if (base == "process") {
        ValuePtr mod = createProcessModule(*v);
        return mod ? *mod : Value::nil();
    }
    if (isStdlibModuleName(base)) {
        ValuePtr mod = createStdlibModule(*v, base);
        return mod ? *mod : Value::nil();
    }

    if (path.find('.') == std::string::npos)
        path += ".spl";
    std::string resolved = resolveImportPath(path);
    if (resolved.empty()) {
        std::cerr << "import: file not found: " << path << std::endl;
        return Value::nil();
    }
    std::ifstream f(resolved);
    if (!f) return Value::nil();
    std::stringstream buf;
    buf << f.rdbuf();
    std::string source = buf.str();
    try {
        Lexer lexer(source);
        std::vector<Token> tokens = lexer.tokenize();
        Parser parser(std::move(tokens));
        std::unique_ptr<Program> program = parser.parse();
        CodeGenerator gen;
        Bytecode code = gen.generate(std::move(program));
        v->runSubScript(code, gen.getConstants(), gen.getValueConstants());
    } catch (const LexerError& e) {
        std::cerr << "import: " << resolved << ": " << e.what() << " (line " << e.line << ")" << std::endl;
    } catch (const ParserError& e) {
        std::cerr << "import: " << resolved << ": " << e.what() << std::endl;
    } catch (const VMError& e) {
        std::cerr << "import: " << resolved << " runtime error: " << e.what() << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "import: " << resolved << ": " << e.what() << std::endl;
    } catch (...) {
        std::cerr << "import: " << resolved << ": unknown error" << std::endl;
    }
    return Value::nil();
}

} // namespace

void registerImportBuiltin(VM& vm) {
    auto importFn = std::make_shared<FunctionObject>();
    importFn->isBuiltin = true;
    importFn->builtinIndex = IMPORT_BUILTIN_INDEX;
    vm.setGlobal("__import", std::make_shared<Value>(Value::fromFunction(importFn)));
    vm.registerBuiltin(IMPORT_BUILTIN_INDEX, [](VM* v, std::vector<ValuePtr> args) { return runImportBuiltin(v, args); });
}

} // namespace spl
