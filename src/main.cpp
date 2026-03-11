/**
 * SPL (Simple Programming Language) - Main entry point
 * Compiles and runs .spl files or starts the REPL.
 * Modes: spl file.spl | spl --ast file | spl --bytecode file | spl --check file | spl --fmt file
 */

#include "compiler/lexer.hpp"
#include "compiler/parser.hpp"
#include "compiler/codegen.hpp"
#include "compiler/ast.hpp"
#include "vm/vm.hpp"
#include "vm/value.hpp"
#include "vm/builtins.hpp"
#include "vm/bytecode.hpp"
#include "errors.hpp"
#include "import_resolution.hpp"
#ifdef SPL_BUILD_GAME
#include "game/game_builtins.hpp"
#endif
#include <iostream>
#include <unordered_set>
#include <variant>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <cctype>

using namespace spl;

static const char* opcodeName(Opcode op) {
    switch (op) {
        case Opcode::CONST_I64: return "CONST_I64";
        case Opcode::CONST_F64: return "CONST_F64";
        case Opcode::CONST_STR: return "CONST_STR";
        case Opcode::CONST_TRUE: return "CONST_TRUE";
        case Opcode::CONST_FALSE: return "CONST_FALSE";
        case Opcode::CONST_NULL: return "CONST_NULL";
        case Opcode::LOAD: return "LOAD";
        case Opcode::STORE: return "STORE";
        case Opcode::LOAD_GLOBAL: return "LOAD_GLOBAL";
        case Opcode::STORE_GLOBAL: return "STORE_GLOBAL";
        case Opcode::POP: return "POP";
        case Opcode::DUP: return "DUP";
        case Opcode::ADD: return "ADD";
        case Opcode::SUB: return "SUB";
        case Opcode::MUL: return "MUL";
        case Opcode::DIV: return "DIV";
        case Opcode::MOD: return "MOD";
        case Opcode::POW: return "POW";
        case Opcode::NEG: return "NEG";
        case Opcode::EQ: return "EQ";
        case Opcode::NE: return "NE";
        case Opcode::LT: return "LT";
        case Opcode::LE: return "LE";
        case Opcode::GT: return "GT";
        case Opcode::GE: return "GE";
        case Opcode::AND: return "AND";
        case Opcode::OR: return "OR";
        case Opcode::NOT: return "NOT";
        case Opcode::BIT_AND: return "BIT_AND";
        case Opcode::BIT_OR: return "BIT_OR";
        case Opcode::BIT_XOR: return "BIT_XOR";
        case Opcode::SHL: return "SHL";
        case Opcode::SHR: return "SHR";
        case Opcode::JMP: return "JMP";
        case Opcode::JMP_IF_FALSE: return "JMP_IF_FALSE";
        case Opcode::JMP_IF_TRUE: return "JMP_IF_TRUE";
        case Opcode::LOOP: return "LOOP";
        case Opcode::TRY_BEGIN: return "TRY_BEGIN";
        case Opcode::TRY_END: return "TRY_END";
        case Opcode::THROW: return "THROW";
        case Opcode::RETHROW: return "RETHROW";
        case Opcode::DEFER: return "DEFER";
        case Opcode::FOR_IN_NEXT: return "FOR_IN_NEXT";
        case Opcode::FOR_IN_ITER: return "FOR_IN_ITER";
        case Opcode::CALL: return "CALL";
        case Opcode::RETURN: return "RETURN";
        case Opcode::BUILD_FUNC: return "BUILD_FUNC";
        case Opcode::SET_FUNC_ARITY: return "SET_FUNC_ARITY";
        case Opcode::SET_FUNC_PARAM_NAMES: return "SET_FUNC_PARAM_NAMES";
        case Opcode::SET_FUNC_NAME: return "SET_FUNC_NAME";
        case Opcode::NEW_OBJECT: return "NEW_OBJECT";
        case Opcode::BUILD_ARRAY: return "BUILD_ARRAY";
        case Opcode::SPREAD: return "SPREAD";
        case Opcode::GET_FIELD: return "GET_FIELD";
        case Opcode::SET_FIELD: return "SET_FIELD";
        case Opcode::GET_INDEX: return "GET_INDEX";
        case Opcode::SET_INDEX: return "SET_INDEX";
        case Opcode::SLICE: return "SLICE";
        case Opcode::NEW_INSTANCE: return "NEW_INSTANCE";
        case Opcode::INVOKE_METHOD: return "INVOKE_METHOD";
        case Opcode::LOAD_THIS: return "LOAD_THIS";
        case Opcode::ALLOC: return "ALLOC";
        case Opcode::FREE: return "FREE";
        case Opcode::MEM_COPY: return "MEM_COPY";
        case Opcode::PRINT: return "PRINT";
        case Opcode::BUILTIN: return "BUILTIN";
        case Opcode::NOP: return "NOP";
        case Opcode::HALT: return "HALT";
        default: return "?";
    }
}

static void dumpStmt(const Stmt* s, int indent) {
    if (!s) return;
    std::string pre(indent, ' ');
    if (auto* x = dynamic_cast<const FunctionDeclStmt*>(s)) {
        std::cout << pre << "FunctionDecl " << x->name << "(" << x->params.size() << " params) L" << x->line << "\n";
        if (x->body) dumpStmt(x->body.get(), indent + 2);
    } else if (auto* x = dynamic_cast<const ClassDeclStmt*>(s)) {
        std::cout << pre << "ClassDecl " << x->name << " L" << x->line << "\n";
        for (const auto& m : x->methods) dumpStmt(m.get(), indent + 2);
    } else if (auto* x = dynamic_cast<const VarDeclStmt*>(s)) {
        std::cout << pre << "VarDecl " << x->name << " L" << x->line << "\n";
    } else if (auto* x = dynamic_cast<const BlockStmt*>(s)) {
        std::cout << pre << "Block " << x->statements.size() << " stmts\n";
        for (const auto& c : x->statements) dumpStmt(c.get(), indent + 2);
    } else if (dynamic_cast<const IfStmt*>(s)) std::cout << pre << "If L" << s->line << "\n";
    else if (dynamic_cast<const ForRangeStmt*>(s)) std::cout << pre << "ForRange L" << s->line << "\n";
    else if (dynamic_cast<const ForInStmt*>(s)) std::cout << pre << "ForIn L" << s->line << "\n";
    else if (dynamic_cast<const WhileStmt*>(s)) std::cout << pre << "While L" << s->line << "\n";
    else if (dynamic_cast<const ReturnStmt*>(s)) std::cout << pre << "Return L" << s->line << "\n";
    else if (dynamic_cast<const TryStmt*>(s)) std::cout << pre << "Try L" << s->line << "\n";
    else if (dynamic_cast<const MatchStmt*>(s)) std::cout << pre << "Match L" << s->line << "\n";
    else std::cout << pre << "Stmt L" << s->line << "\n";
}

static void dumpAst(Program* program) {
    if (!program) return;
    std::cout << "Program\n";
    for (const auto& s : program->statements)
        dumpStmt(s.get(), 2);
}

static void dumpBytecode(const Bytecode& code, const std::vector<std::string>& constants) {
    for (size_t i = 0; i < code.size(); ++i) {
        const auto& inst = code[i];
        std::cout << (i + 1) << "\t" << opcodeName(inst.op);
        if (inst.operand.index() == 1) std::cout << " " << std::get<int64_t>(inst.operand);
        else if (inst.operand.index() == 2) std::cout << " " << std::get<double>(inst.operand);
        else if (inst.operand.index() == 3) std::cout << " \"" << std::get<std::string>(inst.operand) << "\"";
        else if (inst.operand.index() == 4) {
            size_t idx = std::get<size_t>(inst.operand);
            if (inst.op == Opcode::CONST_STR || inst.op == Opcode::LOAD_GLOBAL || inst.op == Opcode::STORE_GLOBAL ||
                inst.op == Opcode::GET_FIELD || inst.op == Opcode::SET_FIELD)
                std::cout << " " << (idx < constants.size() ? constants[idx] : "?");
            else
                std::cout << " " << idx;
        }
        std::cout << "\n";
    }
}

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
#ifdef SPL_BUILD_GAME
        for (const std::string& n : getGameBuiltinNames()) declaredGlobals.insert(n);
#endif
        declaredGlobals.insert("__import");
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

static void printUsage(const char* prog) {
    std::cout << "SPL (Simple Programming Language) " <<
#ifdef SPL_VERSION
        SPL_VERSION
#else
        "1.0.0"
#endif
        << "\n\nUsage:\n"
        << "  " << prog << " [options] [script.spl]\n"
        << "  " << prog << "                    Start REPL (no script).\n\n"
        << "Options:\n"
        << "  --version, -v          Show version and exit.\n"
        << "  --help, -h            Show this help and exit.\n"
        << "  --check <file>        Compile only; exit 0 if OK.\n"
        << "  --lint <file>         Same as --check (lint/syntax check).\n"
        << "  --fmt <file>          Format script (indent by braces).\n"
        << "  --ast <file>          Dump AST and exit.\n"
        << "  --bytecode <file>     Dump bytecode and exit.\n\n"
        << "Modules: import \"math\", \"string\", \"json\", \"g2d\", \"game\", etc.\n"
        << "Docs: docs/GETTING_STARTED.md, spl_for_dummies.txt\n";
}

int main(int argc, char** argv) {
    const char* prog = argc >= 1 ? argv[0] : "spl";
    if (argc >= 2) {
        std::string arg = argv[1];
        if (arg == "--version" || arg == "-v") {
            std::string ver = "1.0.0";
#ifdef SPL_VERSION
            ver = SPL_VERSION;
#else
            std::ifstream vf("VERSION");
            if (vf) {
                std::string line;
                if (std::getline(vf, line)) {
                    while (!line.empty() && (line.back() == '\r' || line.back() == '\n' || std::isspace(static_cast<unsigned char>(line.back())))) line.pop_back();
                    if (!line.empty()) ver = line;
                }
            }
#endif
            std::cout << "SPL " << ver << std::endl;
            return 0;
        }
        if (arg == "--help" || arg == "-h") {
            printUsage(prog);
            return 0;
        }
    }

    VM vm;
    registerAllBuiltins(vm);
    registerImportBuiltin(vm);
    std::vector<std::string> args;
    for (int i = 0; i < argc; ++i) args.push_back(argv[i]);
    vm.setCliArgs(std::move(args));

    if (argc >= 3 && std::string(argv[1]) == "--ast") {
        std::string path = argv[2];
        std::ifstream f(path);
        if (!f) {
            g_errorReporter.setFilename(path);
            g_errorReporter.reportCompileError(ErrorCategory::FileError, 0, 0,
                "Could not open file: " + path, "Check that the file exists and is readable.");
            return 1;
        }
        std::stringstream buf;
        buf << f.rdbuf();
        g_errorReporter.setSource(buf.str());
        g_errorReporter.setFilename(path);
        try {
            Lexer lexer(buf.str());
            std::vector<Token> tokens = lexer.tokenize();
            Parser parser(std::move(tokens));
            std::unique_ptr<Program> program = parser.parse();
            dumpAst(program.get());
            return 0;
        } catch (const LexerError& e) {
            g_errorReporter.reportCompileError(ErrorCategory::SyntaxError, e.line, e.column, e.what(), "");
            g_errorReporter.printSummary();
            return 1;
        } catch (const ParserError& e) {
            g_errorReporter.reportCompileError(ErrorCategory::SyntaxError, e.line, e.column, e.what(), "");
            g_errorReporter.printSummary();
            return 1;
        }
    }

    if (argc >= 3 && std::string(argv[1]) == "--bytecode") {
        std::string path = argv[2];
        std::ifstream f(path);
        if (!f) {
            g_errorReporter.setFilename(path);
            g_errorReporter.reportCompileError(ErrorCategory::FileError, 0, 0,
                "Could not open file: " + path, "Check that the file exists and is readable.");
            return 1;
        }
        std::stringstream buf;
        buf << f.rdbuf();
        g_errorReporter.setSource(buf.str());
        g_errorReporter.setFilename(path);
        try {
            Lexer lexer(buf.str());
            std::vector<Token> tokens = lexer.tokenize();
            Parser parser(std::move(tokens));
            std::unique_ptr<Program> program = parser.parse();
            CodeGenerator gen;
            Bytecode code = gen.generate(std::move(program));
            dumpBytecode(code, gen.getConstants());
            return 0;
        } catch (const LexerError& e) {
            g_errorReporter.reportCompileError(ErrorCategory::SyntaxError, e.line, e.column, e.what(), "");
            g_errorReporter.printSummary();
            return 1;
        } catch (const ParserError& e) {
            g_errorReporter.reportCompileError(ErrorCategory::SyntaxError, e.line, e.column, e.what(), "");
            g_errorReporter.printSummary();
            return 1;
        }
    }

    // --check / --lint: compile only, no run (for CI and IDE)
    if (argc >= 3 && (std::string(argv[1]) == "--check" || std::string(argv[1]) == "--lint")) {
        std::string path = argv[2];
        std::ifstream f(path);
        if (!f) {
            g_errorReporter.setFilename(path);
            g_errorReporter.reportCompileError(ErrorCategory::FileError, 0, 0,
                "Could not open file: " + path, "Check that the file exists and is readable.");
            return 1;
        }
        std::stringstream buf;
        buf << f.rdbuf();
        std::string source = buf.str();
        g_errorReporter.setSource(source);
        g_errorReporter.setFilename(path);
        try {
            Lexer lexer(source);
            std::vector<Token> tokens = lexer.tokenize();
            Parser parser(std::move(tokens));
            std::unique_ptr<Program> program = parser.parse();
            CodeGenerator gen;
            (void)gen.generate(std::move(program));
            g_errorReporter.printSummary();
            return g_errorReporter.errorCount() > 0 ? 1 : 0;
        } catch (const LexerError& e) {
            g_errorReporter.reportCompileError(ErrorCategory::SyntaxError, e.line, e.column, e.what(),
                "Check for unclosed strings or invalid characters.");
            g_errorReporter.printSummary();
            return 1;
        } catch (const ParserError& e) {
            g_errorReporter.reportCompileError(ErrorCategory::SyntaxError, e.line, e.column, e.what(),
                "Check syntax (parentheses, braces, commas).");
            g_errorReporter.printSummary();
            return 1;
        }
    }

    // --fmt: format source (indent by brace level)
    if (argc >= 3 && std::string(argv[1]) == "--fmt") {
        std::string path = argv[2];
        std::ifstream f(path);
        if (!f) {
            std::cerr << "fmt: could not open " << path << std::endl;
            return 1;
        }
        std::stringstream buf;
        buf << f.rdbuf();
        std::string source = buf.str();
        int indent = 0;
        const int indentStep = 2;
        std::string out;
        std::string line;
        std::istringstream is(source);
        while (std::getline(is, line)) {
            size_t start = 0;
            while (start < line.size() && (line[start] == ' ' || line[start] == '\t')) ++start;
            std::string stripped = line.substr(start);
            for (char c : stripped) {
                if (c == '}' && indent >= indentStep) indent -= indentStep;
            }
            if (!stripped.empty()) {
                out += std::string(indent, ' ');
                out += stripped;
            }
            for (char c : stripped) {
                if (c == '{') indent += indentStep;
                else if (c == '}' && indent >= indentStep) indent -= indentStep;
            }
            out += '\n';
        }
        std::ofstream of(path);
        if (!of) { std::cerr << "fmt: could not write " << path << std::endl; return 1; }
        of << out;
        return 0;
    }

    if (argc > 1) {
        std::string path = argv[1];
        std::ifstream f(path);
        if (!f) {
            g_errorReporter.setFilename(path);
            g_errorReporter.reportCompileError(ErrorCategory::FileError, 0, 0,
                "Could not open file: " + path, "Check that the file exists and is readable.");
            return 1;
        }
        std::stringstream buf;
        buf << f.rdbuf();
        bool ok = runSource(vm, buf.str(), path);
        g_errorReporter.printSummary();
        if (!ok) return 1;
        int scriptExit = vm.getScriptExitCode();
        if (scriptExit >= 0) return (scriptExit > 255 ? 255 : scriptExit);
        return 0;
    }

    // REPL
    std::cout << "SPL (Simple Programming Language). Type expressions or statements. help | clear | exit" << std::endl;
    std::string line;
    while (true) {
        std::cout << "> ";
        if (!std::getline(std::cin, line)) break;
        if (line.empty()) continue;
        if (line == "exit" || line == "quit") break;
        if (line == "help" || line == ".help") {
            std::cout << "  help / .help  — show this\n  clear / .clear — clear screen\n  exit / quit   — exit REPL\n  Example: let x = 5   print(x)   print(2+3)\n  Modules: let m = import(\"math\"); print(m.sqrt(4))\n";
            continue;
        }
        if (line == "clear" || line == ".clear") {
#ifdef _WIN32
            std::system("cls");
#else
            std::system("clear");
#endif
            continue;
        }
        g_errorReporter.resetCounts();
        runSource(vm, line);
        g_errorReporter.printSummary();
    }
    return 0;
}
