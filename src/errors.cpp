/**
 * SPL Advanced Error Handling - Implementation
 */

#include "errors.hpp"
#include <iostream>
#include <sstream>
#include <algorithm>
#include <cstdlib>
#include <cstdio>

#ifdef _WIN32
#include <io.h>
#include <stdio.h>
#else
#include <unistd.h>
#endif

namespace spl {

ErrorReporter g_errorReporter;

static bool stderrIsTty() {
#ifdef _WIN32
    return _isatty(_fileno(stderr)) != 0;
#else
    return isatty(STDERR_FILENO) != 0;
#endif
}

ErrorReporter::ErrorReporter() {
#if defined(_WIN32) && defined(_MSC_VER)
#pragma warning(push)
#pragma warning(disable : 4996)
#endif
    const char* noColor = std::getenv("NO_COLOR");
#if defined(_WIN32) && defined(_MSC_VER)
#pragma warning(pop)
#endif
    useColors_ = (noColor == nullptr || noColor[0] == '\0') && stderrIsTty();
}

void ErrorReporter::setSource(const std::string& source) {
    sourceLines_.clear();
    std::istringstream in(source);
    std::string line;
    while (std::getline(in, line)) sourceLines_.push_back(line);
}

std::string ErrorReporter::getLineSnippet(int line, int column, int contextLines, int columnEnd) const {
    if (sourceLines_.empty() || line < 1 || line > static_cast<int>(sourceLines_.size()))
        return "";
    std::ostringstream out;
    int start = std::max(1, line - contextLines);
    int end = std::min(static_cast<int>(sourceLines_.size()), line + contextLines);
    const int numWidth = 4;
    for (int i = start; i <= end; ++i) {
        std::string num = std::to_string(i);
        while (static_cast<int>(num.size()) < numWidth) num = " " + num;
        out << colorDim(" " + num + " | ");
        out << sourceLines_[static_cast<size_t>(i - 1)];
        if (i == line && column >= 1) {
            const std::string& srcLine = sourceLines_[static_cast<size_t>(i - 1)];
            int spanEnd = (columnEnd > column && columnEnd <= static_cast<int>(srcLine.size()) + 1)
                ? columnEnd : (column + 1);
            out << "\n" << colorDim(std::string(numWidth + 2, ' ') + "| ");
            for (int c = 1; c < column; ++c) out << " ";
            int span = spanEnd - column;
            if (span > 1) {
                for (int k = 0; k < span - 1; ++k) out << colorRed("~");
                out << colorRed("^");
            } else {
                out << colorRed("^");
            }
        }
        if (i < end) out << "\n";
    }
    return out.str();
}

std::string ErrorReporter::colorRed(const std::string& s) const {
    if (!useColors_) return s;
    return "\033[1;31m" + s + "\033[0m";
}

std::string ErrorReporter::colorYellow(const std::string& s) const {
    if (!useColors_) return s;
    return "\033[1;33m" + s + "\033[0m";
}

std::string ErrorReporter::colorBlue(const std::string& s) const {
    if (!useColors_) return s;
    return "\033[1;34m" + s + "\033[0m";
}

std::string ErrorReporter::colorCyan(const std::string& s) const {
    if (!useColors_) return s;
    return "\033[36m" + s + "\033[0m";
}

std::string ErrorReporter::colorGreen(const std::string& s) const {
    if (!useColors_) return s;
    return "\033[1;32m" + s + "\033[0m";
}

std::string ErrorReporter::colorDim(const std::string& s) const {
    if (!useColors_) return s;
    return "\033[2m" + s + "\033[0m";
}

void ErrorReporter::print(const ReportedItem& item) const {
    std::ostream& out = std::cerr;
    const std::string filePart = item.filename.empty() ? "<repl>" : item.filename;
    const std::string loc = item.filename.empty()
        ? ("line " + std::to_string(item.line) + ", column " + std::to_string(item.column))
        : (item.filename + ":" + std::to_string(item.line) + ":" + std::to_string(item.column));

    if (item.stackTrace.empty()) {
        // ----- Compile-time / single location (C++/GCC + Python style) -----
        out << colorGreen(filePart);
        if (item.line > 0) out << colorCyan(":" + std::to_string(item.line) + ":" + std::to_string(item.column));
        out << colorDim(": ");
        if (item.isWarning) {
            out << colorYellow("warning: ");
        } else {
            out << colorRed(categoryName(item.category)) << ": ";
        }
        out << item.message << "\n";

        if (!item.codeSnippet.empty()) {
            out << "\n" << item.codeSnippet << "\n";
        }
    } else {
        // ----- Runtime: Python-style traceback -----
        out << colorBlue("Traceback (most recent call last):") << "\n";
        for (size_t i = 0; i < item.stackTrace.size(); ++i) {
            const auto& f = item.stackTrace[i];
            out << colorDim("  File ");
            out << "\"" << colorGreen(filePart) << "\"";
            out << colorDim(", line ") << colorCyan(std::to_string(f.line));
            out << colorDim(", in ") << (f.functionName.empty() ? "<module>" : f.functionName);
            out << "\n";
            if (i == 0 && item.line > 0 && !sourceLines_.empty() &&
                item.line >= 1 && item.line <= static_cast<int>(sourceLines_.size())) {
                const std::string& ln = sourceLines_[static_cast<size_t>(item.line - 1)];
                out << colorDim("    ") << ln << "\n";
                if (item.column >= 1) {
                    out << colorDim("    ");
                    for (int c = 1; c < item.column; ++c) out << " ";
                    out << colorRed("^") << "\n";
                }
            }
        }
        out << colorRed(categoryName(item.category)) << ": " << item.message << "\n";

        if (!item.codeSnippet.empty() && item.stackTrace.size() <= 1) {
            out << "\n" << item.codeSnippet << "\n";
        }
    }

    if (!item.hint.empty()) {
        out << colorYellow("  Hint: ") << item.hint << "\n";
    }
}

void ErrorReporter::reportCompileError(ErrorCategory cat, int line, int column,
                                       const std::string& message,
                                       const std::string& hint) {
    errorCount_++;
    ReportedItem item;
    item.category = cat;
    item.message = message;
    item.filename = filename_;
    item.line = line;
    item.column = column;
    item.hint = hint;
    item.codeSnippet = getLineSnippet(line, column, 3, 0);
    print(item);
}

void ErrorReporter::reportRuntimeError(ErrorCategory cat, int line, int column,
                                       const std::string& message,
                                       const std::vector<StackFrame>& stack,
                                       const std::string& hint) {
    errorCount_++;
    ReportedItem item;
    item.category = cat;
    item.message = message;
    item.filename = filename_;
    item.line = line;
    item.column = column;
    item.stackTrace = stack;
    item.hint = hint;
    item.codeSnippet = getLineSnippet(line, column, 3, 0);
    print(item);
}

void ErrorReporter::reportWarning(int line, int column, const std::string& message) {
    warningCount_++;
    ReportedItem item;
    item.category = ErrorCategory::Other;
    item.message = message;
    item.filename = filename_;
    item.line = line;
    item.column = column;
    item.isWarning = true;
    item.codeSnippet = getLineSnippet(line, column, 3, 0);
    print(item);
}

void ErrorReporter::printSummary() const {
    if (errorCount_ == 0 && warningCount_ == 0) return;
    std::cerr << "\n";
    std::cerr << colorDim("--- ");
    if (errorCount_ > 0) std::cerr << colorRed(std::to_string(errorCount_) + " error(s)");
    if (errorCount_ > 0 && warningCount_ > 0) std::cerr << colorDim(", ");
    if (warningCount_ > 0) std::cerr << colorYellow(std::to_string(warningCount_) + " warning(s)");
    std::cerr << colorDim(" ---") << "\n";
}

} // namespace spl
