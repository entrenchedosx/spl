cmake_minimum_required(VERSION 3.14)
project(SPL LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
if(MSVC)
  set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} /STACK:10485760")
endif()

# Version from VERSION file (for --version and spl_version() builtin)
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/VERSION")
  file(READ "${CMAKE_CURRENT_SOURCE_DIR}/VERSION" SPL_VERSION_RAW)
  string(STRIP "${SPL_VERSION_RAW}" SPL_VERSION)
else()
  set(SPL_VERSION "1.0.0")
endif()

# Default ON so spl.exe includes game + g2d when Raylib is available (no extra flags needed)
option(SPL_BUILD_GAME "Build spl_game and g2d into spl/spl_repl (requires Raylib)" ON)

# Compiler sources
set(COMPILER_SOURCES
    src/compiler/lexer.cpp
    src/compiler/parser.cpp
    src/compiler/codegen.cpp
)

# VM sources
set(VM_SOURCES
    src/vm/value.cpp
    src/vm/vm.cpp
)

# Error reporting
set(ERROR_SOURCES src/errors.cpp)
set(STDLIB_SOURCES src/stdlib_modules.cpp)
set(IMPORT_SOURCES src/import_resolution.cpp)

add_executable(spl src/main.cpp ${COMPILER_SOURCES} ${VM_SOURCES} ${ERROR_SOURCES} ${STDLIB_SOURCES} ${IMPORT_SOURCES} src/process/process_module.cpp)
target_include_directories(spl PRIVATE src ${CMAKE_CURRENT_SOURCE_DIR})
target_compile_definitions(spl PRIVATE SPL_VERSION="${SPL_VERSION}")

# REPL (same binary with repl mode; we use one binary that does both)
add_executable(spl_repl src/repl/repl_main.cpp ${COMPILER_SOURCES} ${VM_SOURCES} ${ERROR_SOURCES} ${STDLIB_SOURCES} ${IMPORT_SOURCES} src/process/process_module.cpp)
target_include_directories(spl_repl PRIVATE src ${CMAKE_CURRENT_SOURCE_DIR})
target_compile_definitions(spl_repl PRIVATE SPL_VERSION="${SPL_VERSION}")

# Graphics (g2d/game): link Raylib when found so spl and spl_repl have import("g2d") and graphics.
# To get graphics: install Raylib then reconfigure (e.g. vcpkg install raylib, then
#   cmake -B build -DCMAKE_TOOLCHAIN_FILE=[vcpkg]/scripts/buildsystems/vcpkg.cmake
# or set RAYLIB_ROOT to raylib install dir).
if(SPL_BUILD_GAME)
  find_package(raylib CONFIG QUIET)
  if(NOT raylib_FOUND)
    if(DEFINED ENV{RAYLIB_ROOT})
      set(RAYLIB_ROOT "$ENV{RAYLIB_ROOT}")
    endif()
    if(RAYLIB_ROOT)
      find_path(RAYLIB_INCLUDE_DIR raylib.h PATHS ${RAYLIB_ROOT}/include ${RAYLIB_ROOT})
      find_library(RAYLIB_LIBRARY NAMES raylib raylib.lib PATHS ${RAYLIB_ROOT}/lib ${RAYLIB_ROOT})
    endif()
    if(NOT RAYLIB_INCLUDE_DIR OR NOT RAYLIB_LIBRARY)
      find_path(RAYLIB_INCLUDE_DIR raylib.h)
      find_library(RAYLIB_LIBRARY NAMES raylib)
    endif()
    if(RAYLIB_INCLUDE_DIR AND RAYLIB_LIBRARY)
      add_library(raylib UNKNOWN IMPORTED)
      set_target_properties(raylib PROPERTIES
        IMPORTED_LOCATION "${RAYLIB_LIBRARY}"
        INTERFACE_INCLUDE_DIRECTORIES "${RAYLIB_INCLUDE_DIR}"
      )
    endif()
  endif()
  if(TARGET raylib)
    set(G2D_SOURCES
      src/modules/g2d/g2d.cpp
      src/modules/g2d/window.cpp
      src/modules/g2d/renderer.cpp
      src/modules/g2d/shapes.cpp
      src/modules/g2d/text.cpp
      src/modules/g2d/colors.cpp
    )
    target_sources(spl PRIVATE src/game/game_builtins.cpp ${G2D_SOURCES})
    target_compile_definitions(spl PRIVATE SPL_BUILD_GAME=1)
    target_link_libraries(spl PRIVATE raylib)
    target_sources(spl_repl PRIVATE src/game/game_builtins.cpp ${G2D_SOURCES})
    target_compile_definitions(spl_repl PRIVATE SPL_BUILD_GAME=1)
    target_link_libraries(spl_repl PRIVATE raylib)
    add_executable(spl_game src/game/game_main.cpp src/game/game_builtins.cpp ${COMPILER_SOURCES} ${VM_SOURCES} ${ERROR_SOURCES})
    target_include_directories(spl_game PRIVATE src ${CMAKE_CURRENT_SOURCE_DIR})
    target_link_libraries(spl_game PRIVATE raylib)
    message(STATUS "SPL: graphics (g2d) integrated into spl and spl_repl - Raylib available")
  else()
    message(WARNING "SPL_BUILD_GAME=ON but Raylib not found. For g2d graphics: install Raylib (e.g. vcpkg install raylib) then reconfigure with -DCMAKE_TOOLCHAIN_FILE=<vcpkg>/scripts/buildsystems/vcpkg.cmake")
  endif()
endif()
