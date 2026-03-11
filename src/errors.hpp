/**
 * SPL Advanced Error Handling
 * Categories, stack traces, colored output, source snippets, summary.
 */

#ifndef SPL_ERRORS_HPP
#define SPL_ERRORS_HPP

#include <string>
#include <vector>
#include <cstddef>

namespace spl {

// ----- Error categories -----
enum class ErrorCategory {
    SyntaxError,
    RuntimeError,
    TypeError,
    ValueError,
    FileError,
    ReferenceError,
    ArgumentError,
    IndexError,
    DivisionError,
    Other
};

inline const char* categoryName(ErrorCategory c) {
    switch (c) {
        case ErrorCategory::SyntaxError:    return "SyntaxError";
        case ErrorCategory::RuntimeError:   return "RuntimeError";
        case ErrorCategory::TypeError:      return "TypeError";
        case ErrorCategory::ValueError:     return "ValueError";
        case ErrorCategory::FileError:      return "FileError";
        case ErrorCategory::ReferenceError: return "ReferenceError";
        case ErrorCategory::ArgumentError:  return "ArgumentError";
        case ErrorCategory::IndexError:    return "IndexError";
        case ErrorCategory::DivisionError:  return "DivisionError";
        default: return "Error";
    }
}

/** Map VM error category (int) to ErrorCategory. Used by main/repl/game when catching VMError. */
inline ErrorCategory vmErrorCategory(int cat) {
    switch (cat) {
        case 1: return ErrorCategory::RuntimeError;
        case 2: return ErrorCategory::TypeError;
        case 3: return ErrorCategory::ValueError;
        case 4: return ErrorCategory::DivisionError;
        case 5: return ErrorCategory::ArgumentError;
        case 6: return ErrorCategory::IndexError;
        default: return ErrorCategory::RuntimeError;
    }
}

// ----- Stack frame (for runtime) -----
struct StackFrame {
    std::string functionName;  // "main", "<lambda>", "foo", etc.
    int line = 0;
    int column = 0;
};

// ----- Single error or warning -----
struct ReportedItem {
    ErrorCategory category = ErrorCategory::Other;
    std::string message;
    std::string filename;   // empty = stdin/REPL
    int line = 0;
    int column = 0;
    int columnEnd = 0;      // optional span for underline (0 = single caret)
    std::vector<StackFrame> stackTrace;
    std::string codeSnippet;  // line of code with optional caret/underline
    std::string hint;        // "Did you forget ...?"
    bool isWarning = false;
};

// ----- Global error reporter (counts + optional colors) -----
class ErrorReporter {
public:
    ErrorReporter();
    void setUseColors(bool use) { useColors_ = use; }
    void setSourceLines(std::vector<std::string> lines) { sourceLines_ = std::move(lines); }
    void setFilename(const std::string& name) { filename_ = name; }
    void setSource(const std::string& source);  // splits into lines

    // Report compile-time (lexer/parser) error
    void reportCompileError(ErrorCategory cat, int line, int column,
                           const std::string& message,
                           const std::string& hint = "");

    // Report runtime error with optional stack
    void reportRuntimeError(ErrorCategory cat, int line, int column,
                           const std::string& message,
                           const std::vector<StackFrame>& stack = {},
                           const std::string& hint = "");

    void reportWarning(int line, int column, const std::string& message);

    // Print to stderr with colors and optional snippet
    void print(const ReportedItem& item) const;

    int errorCount() const { return errorCount_; }
    int warningCount() const { return warningCount_; }
    void resetCounts() { errorCount_ = 0; warningCount_ = 0; }
    void printSummary() const;

private:
    bool useColors_ = true;
    std::string filename_;
    std::vector<std::string> sourceLines_;
    int errorCount_ = 0;
    int warningCount_ = 0;

    std::string getLineSnippet(int line, int column, int contextLines = 3, int columnEnd = 0) const;
    std::string colorRed(const std::string& s) const;
    std::string colorYellow(const std::string& s) const;
    std::string colorBlue(const std::string& s) const;
    std::string colorCyan(const std::string& s) const;
    std::string colorGreen(const std::string& s) const;
    std::string colorDim(const std::string& s) const;
};

// Global instance for use from main/repl/vm
extern ErrorReporter g_errorReporter;

} // namespace spl

#endif // SPL_ERRORS_HPP
