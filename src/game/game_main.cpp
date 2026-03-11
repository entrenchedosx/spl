/**
 * SPL Game - Entry point for SPL scripts with game builtins (window, draw, input, etc.).
 * Run: spl_game script.spl
 */
#include "compiler/lexer.hpp"
#include "compiler/parser.hpp"
#include "compiler/codegen.hpp"
#include "vm/vm.hpp"
#include "vm/value.hpp"
#include "vm/builtins.hpp"
#include "vm/bytecode.hpp"
#include "game/game_builtins.hpp"
#include "errors.hpp"
#include <iostream>
#include <unordered_set>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>

using namespace spl;

static bool runSource(VM& vm, const std::string& source, const std::string& filename = "") {
    g_errorReporter.setSource(source);
    g_errorReporter.setFilename(filename);
    try {
        Lexer lexer(source);
        std::vector<Token> tokens = lexer.tokenize();
        Parser parser(std::move(tokens));
        std::unique_ptr<Program> program = parser.parse();
        CodeGenerator gen;
        Bytecode code = gen.generate(std::move(program));
        const std::vector<std::string>& constants = gen.getConstants();
        std::unordered_set<std::string> declaredGlobals;
        for (const std::string& n : getBuiltinNames()) declaredGlobals.insert(n);
        for (const std::string& n : getGameBuiltinNames()) declaredGlobals.insert(n);
        for (const auto& inst : code) {
            if (inst.op != Opcode::STORE_GLOBAL) continue;
            if (inst.operand.index() != 4) continue;
            size_t idx = std::get<size_t>(inst.operand);
            if (idx < constants.size()) declaredGlobals.insert(constants[idx]);
        }
        for (const auto& inst : code) {
            if (inst.op != Opcode::LOAD_GLOBAL) continue;
            if (inst.operand.index() != 4) continue;
            size_t idx = std::get<size_t>(inst.operand);
            if (idx >= constants.size()) continue;
            const std::string& name = constants[idx];
            if (declaredGlobals.find(name) == declaredGlobals.end())
                g_errorReporter.reportWarning(inst.line, 0,
                    "Possible undefined variable '" + name + "'. Did you mean to define it first?");
        }
        vm.setBytecode(code);
        vm.setStringConstants(gen.getConstants());
        vm.setValueConstants(gen.getValueConstants());
        vm.run();
        return true;
    } catch (const LexerError& e) {
        g_errorReporter.reportCompileError(ErrorCategory::SyntaxError, e.line, e.column, e.what(),
            "Check for unclosed strings, invalid characters, or number format.");
        return false;
    } catch (const ParserError& e) {
        std::string hint;
        std::string msg(e.what());
        if (msg.find("Expected expression") != std::string::npos) hint = "Did you forget an expression or use an invalid token?";
        else if (msg.find("')'") != std::string::npos) hint = "Did you forget a closing parenthesis?";
        else if (msg.find("'}'") != std::string::npos) hint = "Did you forget a closing brace?";
        g_errorReporter.reportCompileError(ErrorCategory::SyntaxError, e.line, e.column, msg, hint);
        return false;
    } catch (const VMError& e) {
        std::vector<StackFrame> stack;
        for (const auto& f : vm.getCallStack()) {
            stack.push_back({f.functionName, f.line, f.column});
        }
        std::string hint;
        if (e.category == 4) hint = "Division by zero is undefined.";
        else if (e.category == 5) hint = "Check the number of arguments passed to the function.";
        else if (e.category == 2) hint = "Check the types of operands (e.g. cannot call a non-function).";
        g_errorReporter.reportRuntimeError(vmErrorCategory(e.category), e.line, e.column, e.what(), stack, hint);
        return false;
    }
}

int main(int argc, char** argv) {
    VM vm;
    registerAllBuiltins(vm);
    registerGameBuiltins(vm);
    std::vector<std::string> args;
    for (int i = 0; i < argc; ++i) args.push_back(argv[i]);
    vm.setCliArgs(std::move(args));

    if (argc <= 1) {
        std::cout << "SPL Game - Run a game script: spl_game game.spl" << std::endl;
        return 0;
    }

    std::string path = argv[1];
    std::ifstream f(path);
    if (!f) {
        g_errorReporter.setFilename(path);
        g_errorReporter.reportCompileError(ErrorCategory::FileError, 0, 0,
            "Could not open file: " + path, "Check that the file exists and is readable.");
        g_errorReporter.printSummary();
        return 1;
    }
    std::stringstream buf;
    buf << f.rdbuf();
    bool ok = runSource(vm, buf.str(), path);
    g_errorReporter.printSummary();
    return ok ? 0 : 1;
}
