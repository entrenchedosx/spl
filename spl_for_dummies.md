================================================================================
                    SPL FOR DUMMIES — Complete Beginner to Master
                    Simple Programming Language — Full Tutorial
================================================================================

This file teaches you SPL from zero. No prior coding experience required.
Work through each section in order. Type the examples yourself and run them.

--------------------------------------------------------------------------------
PART 0: WHAT IS SPL AND HOW TO RUN IT
--------------------------------------------------------------------------------

SPL (Simple Programming Language) is a modern scripting language. You write
code in files ending in .spl, then run them with the SPL interpreter.

  * Run a script:
      spl myfile.spl
    (Windows: spl.exe myfile.spl, or .\build\Debug\spl.exe myfile.spl)

  * Run the REPL (type code line by line):
      spl
    Then type expressions and press Enter. Type exit or quit to leave.

  * Check if your script compiles (no run):
      spl --check myfile.spl

  * Format your script (indent by braces):
      spl --fmt myfile.spl

You need the SPL binary (spl or spl.exe) built for your system. See the
project README for how to build it.


================================================================================
PART 1: YOUR FIRST PROGRAM
================================================================================

Create a file called hello.spl with exactly this:

    // My first SPL program
    print("Hello, world!")

Run it: spl hello.spl

You should see: Hello, world!

  * // starts a comment: everything after it on that line is ignored.
  * print(...) is a built-in function that prints values to the screen.
  * Strings are in double quotes: "like this".

Try this next:

    print("Hello, world!")
    print(42)
    print(3.14)
    print(true)
    print(null)

You will see a number, a decimal number, true, and null. So: SPL has
numbers (integers and decimals), booleans (true/false), and null (no value).


================================================================================
PART 2: VARIABLES — STORING VALUES
================================================================================

Variables hold values so you can reuse them.

    let x = 10
    print(x)

    let name = "SPL"
    print(name)

  * let creates a variable. You can't assign to it again (it's like a
    constant after the first value). Use it for things that don't change.
  * You can use var if you want to change the value later:

    var count = 0
    count = count + 1
    print(count)

  * const is for real constants (never change):

    const PI = 3.14159
    print(PI)

Names can use letters, numbers, and underscores; they cannot start with
a number. Examples: my_var, score2, PlayerName.


================================================================================
PART 3: NUMBERS AND BASIC MATH
================================================================================

Integers and decimals:

    let a = 42
    let b = 3.14
    let sum = a + b
    print(sum)

Operators:
  * Addition: +
  * Subtraction: -
  * Multiplication: *
  * Division: /
  * Remainder: %
  * Power: **

Examples:

    print(10 + 3)    // 13
    print(10 - 3)    // 7
    print(10 * 3)    // 30
    print(10 / 3)    // 3.333...
    print(10 % 3)    // 1
    print(2 ** 4)    // 16

You can use parentheses to control order: (2 + 3) * 4 is 20.


================================================================================
PART 4: STRINGS — TEXT
================================================================================

Strings are text in double or single quotes:

    let greeting = "Hello"
    let also = 'Hello'

Concatenation (glue strings together) with +:

    let name = "World"
    print("Hello, " + name + "!")

F-strings (put values inside the string):

    let name = "Ahmed"
    let age = 15
    print(f"Hello {name}! You are {age}.")

Escape special characters:
  * \" for a quote inside a string
  * \n for newline
  * \t for tab
  * \\ for backslash

    print("Say \"Hi\" and go.\nNew line here.")

Useful string built-ins (you'll see more in Part 15):
  * upper(s), lower(s) — change case
  * len(s) — length of string
  * replace(s, old, new) — replace text
  * split(s, sep), join(arr, sep) — split into array or join array to string
  * trim(s) — remove leading/trailing spaces
  * starts_with(s, prefix), ends_with(s, suffix)


================================================================================
PART 5: BOOLEANS AND COMPARISONS
================================================================================

Booleans are true and false. You get them from comparisons:

    let x = 5
    print(x > 3)   // true
    print(x < 0)   // false
    print(x == 5)  // true (equal)
    print(x != 5)  // false (not equal)
    print(x >= 5)  // true
    print(x <= 10) // true

  * ==  equal
  * !=  not equal
  * <   less than
  * >   greater than
  * <=  less or equal
  * >=  greater or equal

Logical operators:
  * and (or &&) — both must be true
  * or (or ||)  — at least one true
  * !            — not (flip true/false)

    print(true and false)  // false
    print(true or false)   // true
    print(!true)           // false


================================================================================
PART 6: CONDITIONALS — IF / ELIF / ELSE
================================================================================

Run different code depending on conditions:

    let n = 7
    if (n > 10) {
        print("big")
    } elif (n > 5) {
        print("medium")
    } else {
        print("small")
    }

  * if (condition) { ... } — run block only if condition is true.
  * elif (condition) { ... } — else-if; checked only if previous conditions
    were false.
  * else { ... } — run if all above were false.

You can use a single statement with a colon (Python-style):

    if (n > 0): print("positive")

Ternary (choose one of two values):

    let x = 10
    let label = x > 5 ? "big" : "small"
    print(label)


================================================================================
PART 7: LOOPS — REPEAT CODE
================================================================================

FOR with range (like Python):

    for i in range(0, 5) {
        print(i)
    }
    // Prints 0, 1, 2, 3, 4

    for j in range(5, 0) {
        print(j)
    }
    // Counts down: 5, 4, 3, 2, 1

Range with two numbers: range(start, end). The loop variable goes from
start up to (but not including) end, or down if start > end.

Range literal with .. and optional step:

    for i in 1..5 {
        print(i)
    }
    // 1, 2, 3, 4, 5

    for k in 0..10 step 2 {
        print(k)
    }
    // 0, 2, 4, 6, 8, 10

FOR over an array (see Part 9):

    let arr = array(10, 20, 30)
    for x in arr {
        print(x)
    }

WHILE — repeat while a condition is true:

    let i = 0
    while (i < 3) {
        print(i)
        i = i + 1
    }

BREAK and CONTINUE:
  * break — exit the loop immediately.
  * continue — skip the rest of this iteration and go to the next.

    for i in range(0, 10) {
        if (i == 3): break
        print(i)
    }
    // Prints 0, 1, 2


================================================================================
PART 8: FUNCTIONS — REUSABLE CODE
================================================================================

Define a function with def, then call it by name:

    def say_hello() {
        print("Hello!")
    }
    say_hello()

Functions with parameters:

    def add(a, b) {
        return a + b
    }
    print(add(2, 3))   // 5

  * return sends a value back. If you don't return anything, the function
    returns null.

Default arguments (optional parameters):

    def greet(name, greeting = "Hello") {
        return greeting + ", " + name
    }
    print(greet("World"))           // Hello, World
    print(greet("World", "Hi"))     // Hi, World

Multiple return values (returns an array; receive with destructuring):

    def div_mod(a, b) {
        return a / b, a % b
    }
    let [q, r] = div_mod(10, 3)
    print(q)   // 3
    print(r)   // 1

Functions can call themselves (recursion):

    def factorial(n) {
        if (n <= 1) { return 1 }
        return n * factorial(n - 1)
    }
    print(factorial(5))   // 120


================================================================================
PART 9: ARRAYS — LISTS OF VALUES
================================================================================

Create an array with array(...) or a literal [ ... ]:

    let arr = array(1, 2, 3)
    let same = [1, 2, 3]

  * Index from 0: arr[0] is the first element, arr[1] the second.
  * len(arr) gives the length.
  * You can change an element: arr[1] = 99

    print(arr[0])
    arr[2] = 100
    print(len(arr))

Add to the end with push:

    push(arr, 4)
    print(len(arr))

Slice (sub-array): arr[start:end] — elements from index start up to (not
including) end:

    let a = array(0, 1, 2, 3, 4)
    let s = a[1:4]
    print(s[0])   // 1
    print(s[1])   // 2
    print(len(s)) // 3

Other useful array built-ins:
  * push(arr, x), push_front(arr, x)
  * slice(arr, start, end) — like arr[start:end]
  * reverse(arr), sort(arr), find(arr, value)
  * first(arr), last(arr), take(arr, n), drop(arr, n)
  * map(arr, fn), filter(arr, fn), reduce(arr, fn) — see Part 14


================================================================================
PART 10: MAPS — KEY-VALUE STORAGE
================================================================================

A map holds key-value pairs. Create with { "key": value }:

    let person = { "name": "Ali", "age": 20 }
    print(person["name"])
    print(person["age"])

Set a value: person["city"] = "Cairo"

Check if a key exists: has(person, "name") returns true or false.

Get all keys or values:
  * keys(person) — array of keys
  * values(person) — array of values

    let d = { "a": 1, "b": 2 }
    print(keys(d))    // ["a", "b"]
    print(values(d))  // [1, 2]

You can use dot for string keys that look like identifiers in some
contexts; the main way is bracket notation: map["key"].


================================================================================
PART 11: MODULES — IMPORTING LIBRARIES
================================================================================

SPL has built-in modules. You get one with import("module_name"), then
call functions on the returned object:

    let math = import("math")
    print(math.sqrt(16))   // 4
    print(math.PI)

    let io = import("io")
    let content = io.read_file("myfile.txt")

Common modules:
  * math   — sqrt, pow, sin, cos, floor, ceil, min, max, PI, E, etc.
  * string — upper, lower, replace, join, split, trim, format, etc.
  * json   — json_parse, json_stringify
  * random — random, random_int, random_choice, random_shuffle
  * sys    — cli_args, print, panic, repr, spl_version, platform, os_name, arch
  * io     — read_file, write_file, listDir, create_dir, is_file, is_dir, etc.
  * array  — array, len, push, map, filter, reduce, sort, etc.
  * env    — env_get("VARIABLE_NAME")

Importing your own file:

    let mylib = import("mylib.spl")
    // mylib.spl is loaded and runs; any globals it sets are in that script's
    // scope. For reusable code, put values/functions in a map and return it,
    // or use a shared naming convention.

Graphics (when SPL is built with Raylib):

    let g = import("g2d")
    g.createWindow(800, 600, "My Window")
    def draw() { g.clear(30, 30, 40); g.fillRect(100, 100, 50, 50) }
    def update() {}
    g.run(update, draw)


================================================================================
PART 12: ERROR HANDLING — TRY / CATCH / THROW
================================================================================

Wrap risky code in try. If something throws, catch runs:

    try {
        print("trying")
        throw "something went wrong"
    } catch (e) {
        print("Caught: " + str(e))
    } finally {
        print("this always runs")
    }

  * throw value — raise an error. value can be a string or any value.
  * catch (e) — e is the thrown value.
  * finally — runs after try/catch no matter what (even after return).

Assert — crash with a message if a condition is false (for debugging):

    assert 1 + 1 == 2
    assert x > 0, "x must be positive"


================================================================================
PART 13: PATTERN MATCHING — MATCH / CASE
================================================================================

Match a value against several patterns and run the first that fits:

    let x = 2
    match x {
        case 1 => print("one")
        case 2 => print("two")
        case _ => print("other")
    }

  * case value => ... — if the matched value equals this, run the block.
  * case _ => ... — default (matches anything). Usually last.

You can match and destructure (see next part) and use guards:

    match arr {
        case [] => print("empty")
        case [a, b] => print(a + b)
        case _ => print("longer list")
    }


================================================================================
PART 14: DESTRUCTURING, OPTIONAL CHAINING, NULL COALESCING
================================================================================

Destructuring — unpack arrays or maps into variables:

    let [a, b] = array(10, 20)
    print(a)   // 10
    print(b)   // 20

    let person = { "name": "Sam", "age": 25 }
    let { name, age } = person
    print(name)
    print(age)

Optional chaining — safe access when something might be null:
  * obj?.key — if obj is null, the whole expression is null; otherwise obj.key.
  * obj?.a?.b — chain safely.

    let obj = { "a": { "b": 42 } }
    print(obj?.a?.b)   // 42
    let nil_obj = null
    print(nil_obj?.x)  // null (no crash)

Null coalescing — use a default when value is null or missing:
  * a ?? b — if a is null (or falsy in some contexts), use b.

    let x = null ?? 10
    print(x)   // 10
    let y = 5 ?? 99
    print(y)   // 5 (left side is not null, so we keep it). Use ?? when you
               // want a default only when the value is null.


================================================================================
PART 15: DEFER AND REPEAT
================================================================================

defer — run code when leaving the current block (e.g. when you return or
reach the end). Useful for cleanup. Last defer defined runs first (stack order).

    def f() {
        defer print("second")
        defer print("first")
        print("body")
    }
    f()
    // Prints: body, first, second

repeat n { ... } — run the block n times:

    repeat 3 {
        print("hi")
    }
    // Prints hi three times.


================================================================================
PART 16: LAMBDAS AND MAP / FILTER / REDUCE
================================================================================

A lambda is an anonymous function: (params) => expression

    let double = (x) => x * 2
    print(double(5))   // 10

map(arr, fn) — build a new array by applying fn to each element:

    let nums = array(1, 2, 3, 4, 5)
    let doubled = map(nums, (x) => x * 2)
    print(doubled)   // [2, 4, 6, 8, 10]

Or with the lambda keyword:

    let evens = filter(nums, lambda (x) => x % 2 == 0)
    print(evens)   // [2, 4]

filter(arr, fn) — keep only elements where fn(element) is true.

reduce(arr, fn) — combine all elements into one value. The function takes
(accumulator, current) and returns the new accumulator:

    let total = reduce(nums, (a, b) => a + b)
    print(total)   // 15

    let with_start = reduce(nums, (a, b) => a + b, 100)
    print(with_start)   // 115

Other combinators: flat_map, flatten, zip, chunk, unique, sort_by, etc.
Use the same style: pass a lambda or a function.


================================================================================
PART 17: CLASSES — OBJECT-ORIENTED CODE
================================================================================

A class is a blueprint. You define methods (functions) and an initializer.

    class Person {
        init(name, age) {
            this.name = name
            this.age = age
        }
        greet() {
            return "Hi, I'm " + this.name
        }
    }

Create an instance with Instance(ClassName, args...):

    let p = Instance(Person, "Ahmed", 20)
    p.init("Ahmed", 20)   // or pass in Instance and call init
    print(p.greet())
    print(p.name)

  * this refers to the current instance.
  * init(...) is the constructor; call it (or pass args to Instance) to
    set up the object.

Inheritance with extends (if supported):

    class Student extends Person {
        init(name, age, id) {
            super.init(name, age)
            this.id = id
        }
    }


================================================================================
PART 18: GRAPHICS WITH G2D (QUICK START)
================================================================================

When SPL is built with Raylib, you can use the g2d module for 2D graphics.

    let g = import("g2d")
    g.createWindow(800, 600, "My Game")

    def update() {
        // Move things, read input (e.g. g.isKeyDown("LEFT"))
    }

    def draw() {
        g.clear(30, 30, 40)           // background RGB
        g.setColor(255, 0, 0)         // red
        g.fillRect(100, 100, 200, 80) // x, y, width, height
        g.drawCircle(400, 300, 50)   // center x, y, radius
        g.drawText("Hello", 50, 50)
    }

    g.run(update, draw)
    g.closeWindow()

Common g2d functions:
  * createWindow(w, h, title), closeWindow()
  * clear(r, g, b), setColor(r, g, b)
  * fillRect, drawRect, fillCircle, drawCircle, drawLine, drawPolygon
  * drawText(text, x, y), rgb(r,g,b), hexColor("#rrggbb")
  * width(), height(), run(update_fn, draw_fn)
  * isKeyDown("KEY"), isKeyPressed("KEY"), mouseX(), mouseY()

If import("g2d") fails, your SPL build does not include graphics. Rebuild
with Raylib (see project README).


================================================================================
PART 19: USEFUL BUILT-INS CHEAT SHEET
================================================================================

  * print(...)           — print values
  * str(...)             — convert to string
  * int(x), float(x)     — convert to number
  * len(x)               — length of string/array
  * type(x)              — type name as string
  * inspect(x)           — debug string for x
  * copy(x), freeze(x)   — shallow copy, make immutable
  * deep_equal(a, b)     — deep comparison
  * range(start, end)    — range for loops
  * array(...)           — build array
  * push(arr, x)         — append to array
  * keys(map), values(map), has(map, key)
  * read_file(path), write_file(path, content)
  * json_parse(str), json_stringify(value)
  * time()               — current time (seconds)
  * sleep(seconds)       — pause
  * cli_args()           — command-line arguments as array
  * env_get("VAR")       — environment variable
  * repr(x)              — detailed string for debugging
  * spl_version(), platform(), os_name(), arch() — system info
  * panic(msg), Error(msg) — abort or create error value
  * assert cond, "msg"   — abort if cond is false
  * exit_code(n)         — set process exit code (0–255) and stop the script; for scripts used as tools

Use modules (import "math", "string", "io", etc.) for more.


================================================================================
PART 20: TIPS AND MASTERING SPL
================================================================================

  * Run examples: the project's examples/ folder has many .spl files.
    Run them with spl examples/02_variables.spl etc. to see behavior.

  * REPL: run spl with no arguments. Type expressions and small programs.
    Good for trying built-ins and syntax.

  * Format: spl --fmt file.spl to auto-indent by braces.

  * Check: spl --check file.spl to see if the file compiles (no execution).

  * Errors: read the line and column in error messages. Fix the syntax or
    type first (e.g. missing brace, wrong argument count).

  * Style: use let for values that don't change, var when you need to
    reassign. Use const for real constants. Indent blocks (2 or 4 spaces).

  * Files: use io.read_file and io.write_file, or read_file/write_file
    if they're global in your build.

  * Debug: print(x), inspect(x), repr(x), type(x), dir(x) to see what
    a value is.

  * Next steps: try the examples in order (00_full_feature_smoke.spl,
    02_variables.spl through 70_map_filter_reduce.spl, then graphics).
    Read docs/LANGUAGE_OVERVIEW.md and docs/standard_library.md for the
    full language and library reference.

================================================================================
                              END OF SPL FOR DUMMIES
================================================================================
