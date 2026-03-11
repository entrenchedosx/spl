# Direct memory access and low-level features (SPL)

SPL provides direct memory access and low-level primitives so you can build operating systems, drivers, and systems software in SPL while keeping code readable. The API is **comparable to C/C++** in power (alloc, pointers, peek/poke, mem_*, volatile, alignment) while the **syntax stays SPL**: a unique mix of Python, JavaScript, C++, Rust, and Go—readable and consistent.

## Pointers

- **`alloc(n)`** – Allocate `n` bytes on the heap. Returns a **ptr** (pointer). Returns a null ptr if `n` is 0.
- **`free(ptr)`** – Free a pointer previously returned by `alloc`. No-op if ptr is null.
- **`ptr_address(ptr)`** – Return the numeric address of a pointer (as an integer).
- **`ptr_from_address(addr)`** – Create a pointer from an integer address (e.g. for MMIO at a fixed address).
- **`ptr_offset(ptr, bytes)`** – Same as `ptr + bytes`: return a new pointer at `ptr + bytes`.

## Pointer arithmetic (readable syntax)

- **`ptr + n`** – Pointer plus integer: new pointer at `ptr + n` bytes.
- **`n + ptr`** – Same as `ptr + n`.
- **`ptr - n`** – Pointer minus integer: new pointer at `ptr - n` bytes.
- **`ptr1 - ptr2`** – Difference of two pointers: number of **bytes** between them (integer).

Example:

```spl
let buf = alloc(64)
let at_8 = buf + 8
let diff = at_8 - buf   # 8
free(buf)
```

## Reading and writing memory

All addresses are in bytes. Use the size that matches your data.

| Function        | Size  | Description                    |
|----------------|-------|--------------------------------|
| `peek8(ptr)`   | 1 byte| Read unsigned 8-bit            |
| `peek16(ptr)`  | 2 bytes | Read unsigned 16-bit         |
| `peek32(ptr)`  | 4 bytes | Read unsigned 32-bit         |
| `peek64(ptr)`  | 8 bytes | Read unsigned 64-bit         |
| `poke8(ptr, v)`  | 1 byte | Write 8-bit (v truncated)   |
| `poke16(ptr, v)` | 2 bytes | Write 16-bit               |
| `poke32(ptr, v)` | 4 bytes | Write 32-bit               |
| `poke64(ptr, v)` | 8 bytes | Write 64-bit               |

**Signed reads** (sign-extended, like C++ `int8_t` … `int64_t`):

| Function        | Size  | Description                    |
|-----------------|-------|--------------------------------|
| `peek8s(ptr)`   | 1 byte| Read signed 8-bit              |
| `peek16s(ptr)`  | 2 bytes | Read signed 16-bit           |
| `peek32s(ptr)`  | 4 bytes | Read signed 32-bit           |
| `peek64s(ptr)`  | 8 bytes | Read signed 64-bit           |

Values are passed as integers; low bits are used for the given width (e.g. `poke8(p, 255)` writes 0xFF).

Example:

```spl
let p = alloc(4)
poke32(p, 0x12345678)   # use decimal: 305419896 if no hex literal
print(peek32(p))
free(p)
```

## Block operations

- **`mem_copy(dest, src, n)`** – Copy `n` bytes from `src` to `dest`. Same as C `memcpy`.
- **`mem_set(ptr, byte, n)`** – Set `n` bytes at `ptr` to `byte` (0–255). Same as C `memset`.
- **`mem_cmp(a, b, n)`** – Compare `n` bytes at pointers `a` and `b`. Returns `-1`, `0`, or `1` (like C `memcmp`).
- **`mem_move(dest, src, n)`** – Move `n` bytes from `src` to `dest`; safe for overlapping regions. Same as C `memmove`.
- **`mem_swap(dest, src, n)`** – Swap `n` bytes between two regions (like C++ swap of two buffers). Safe for non-overlapping regions.

## Bulk byte array read/write

- **`bytes_read(ptr, n)`** – Read `n` bytes at `ptr`; returns an **array of integers** 0–255 (one per byte). Useful for binary parsing or inspection.
- **`bytes_write(ptr, byte_array)`** – Write bytes from an array of integers (0–255) to `ptr`. Array length determines how many bytes are written.

Example:

```spl
let p = alloc(4)
bytes_write(p, [0x48, 0x65, 0x6c, 0x6c])   # "Hell"
print(bytes_read(p, 4))                     # [72, 101, 108, 108]
free(p)
```

## Pointer helpers

- **`ptr_is_null(ptr)`** – Returns true if the pointer is null (no allocation or invalid). Use before dereferencing when a pointer can be null.
- **`size_of_ptr()`** – Returns the size in bytes of a pointer on the current platform (4 or 8). Useful for portability and layout calculations.

## Resizing allocations

- **`realloc(ptr, size)`** – Resize the block previously allocated with `alloc` (or a prior `realloc`). Returns a new pointer (or null on failure). The old pointer is invalid after a successful realloc. Pass null as `ptr` to allocate a new block (same as `alloc(size)` on many platforms).

## Alignment (integers and pointers)

**Integer alignment** (for sizes, offsets, page counts):

- **`align_up(value, align)`** – Smallest integer ≥ `value` that is a multiple of `align`.
- **`align_down(value, align)`** – Largest integer ≤ `value` that is a multiple of `align`.

**Pointer alignment** (for aligning a pointer to a boundary, e.g. struct or page):

- **`ptr_align_up(ptr, align)`** – Return a pointer ≥ `ptr` that is aligned to `align` bytes (e.g. for placing the next struct).
- **`ptr_align_down(ptr, align)`** – Return a pointer ≤ `ptr` that is aligned to `align` bytes (e.g. round down to page start).

Example (page size 4096):

```spl
print(align_up(100, 4096))     # 4096
print(align_down(5000, 4096))  # 4096
let p = alloc(8192)
let page_start = ptr_align_down(p, 4096)
```

## Float and double at a pointer

- **`peek_float(ptr)`** – Read a 4-byte float at `ptr`; returns a number.
- **`poke_float(ptr, value)`** – Write a 4-byte float at `ptr`.
- **`peek_double(ptr)`** – Read an 8-byte double at `ptr`; returns a number.
- **`poke_double(ptr, value)`** – Write an 8-byte double at `ptr`.

Use these when you have a buffer of floats/doubles (e.g. from a C library or binary file).

## Ordering and volatile access

- **`memory_barrier()`** – Compiler memory barrier (prevents reordering of memory accesses across the call). Use for lock-free or device access.

**Volatile read/write** (one byte, two bytes, four bytes, eight bytes):

| Function | Size | Description |
|----------|------|-------------|
| `volatile_load8(ptr)` | 1 byte | Volatile read. |
| `volatile_store8(ptr, v)` | 1 byte | Volatile write (v truncated to 8 bits). |
| `volatile_load16(ptr)` | 2 bytes | Volatile read of 16 bits. |
| `volatile_store16(ptr, v)` | 2 bytes | Volatile write (v truncated to 16 bits). |
| `volatile_load32(ptr)` | 4 bytes | Volatile read of 32 bits. |
| `volatile_store32(ptr, v)` | 4 bytes | Volatile write (v truncated to 32 bits). |
| `volatile_load64(ptr)` | 8 bytes | Volatile read of 64 bits. |
| `volatile_store64(ptr, v)` | 8 bytes | Volatile write. |

Use these when talking to hardware or when you need ordering guarantees and the compiler must not optimize away or reorder the access.

---

## Advanced memory and structs

### Pointer arithmetic helpers

- **`ptr_add(ptr, offset)`** – Return pointer at `ptr + offset` bytes (same as `ptr + offset`).
- **`ptr_sub(ptr, offset)`** – Return pointer at `ptr - offset` bytes (same as `ptr - offset`).
- **`is_aligned(ptr, boundary)`** – Return true if the pointer’s address is a multiple of `boundary` (e.g. 4, 8, 4096).

### Performance helpers

- **`mem_set_zero(ptr, size)`** – Set `size` bytes at `ptr` to zero. Optimized for large blocks.
- **`ptr_tag(ptr, tag)`** – Store a small integer tag in unused bits of the pointer (platform-dependent). Returns tagged ptr.
- **`ptr_untag(ptr)`** – Remove tag; returns the original pointer.
- **`ptr_get_tag(ptr)`** – Return the tag stored in the pointer (0 if none).

### Struct layout (custom types)

You can define struct layouts by name and use them for offset/size calculations (no C structs at runtime; layout is metadata only).

- **`struct_define(name, layout)`** – Register a struct named `name`. `layout` is an array of `[field_name, size_in_bytes]` pairs, e.g. `[["x", 4], ["y", 4]]` for a 8-byte “Point”.
- **`offsetof_struct(struct_name, field_name)`** – Return the byte offset of the field in the struct (like C `offsetof`).
- **`sizeof_struct(struct_name)`** – Return total size in bytes of the struct.

Example: allocate a block, then use `ptr + offsetof_struct("Point", "y")` to access the `y` field.

### Memory pools

Preallocated blocks for fast fixed-size allocation (reduces fragmentation and allocator overhead).

- **`pool_create(block_size, count)`** – Create a pool of `count` blocks of `block_size` bytes. Returns a pool id (integer).
- **`pool_alloc(pool_id)`** – Allocate one block from the pool. Returns a ptr or null if the pool is exhausted.
- **`pool_free(ptr, pool_id)`** – Return the block to the pool (no-op if ptr is null).
- **`pool_destroy(pool_id)`** – Destroy the pool and free all its memory. Do not use the pool id or pool pointers after this.

### Big-endian read/write

For network or file formats that use big-endian byte order:

| Function | Size | Description |
|----------|------|-------------|
| `read_be16(ptr)` | 2 bytes | Read big-endian unsigned 16-bit. |
| `read_be32(ptr)` | 4 bytes | Read big-endian unsigned 32-bit. |
| `read_be64(ptr)` | 8 bytes | Read big-endian unsigned 64-bit. |
| `write_be16(ptr, v)` | 2 bytes | Write big-endian 16-bit. |
| `write_be32(ptr, v)` | 4 bytes | Write big-endian 32-bit. |
| `write_be64(ptr, v)` | 8 bytes | Write big-endian 64-bit. |

**Little-endian** (explicit; portable across hosts):

| Function | Size | Description |
|----------|------|-------------|
| `read_le16(ptr)` | 2 bytes | Read little-endian unsigned 16-bit. |
| `read_le32(ptr)` | 4 bytes | Read little-endian unsigned 32-bit. |
| `read_le64(ptr)` | 8 bytes | Read little-endian unsigned 64-bit. |
| `write_le16(ptr, v)` | 2 bytes | Write little-endian 16-bit. |
| `write_le32(ptr, v)` | 4 bytes | Write little-endian 32-bit. |
| `write_le64(ptr, v)` | 8 bytes | Write little-endian 64-bit. |

**Allocation**

- **`alloc_zeroed(n)`** – Allocate `n` bytes and zero them (like C `calloc`). Returns a pointer or nil. Same 256 MiB cap as `alloc`.
- **`alloc_aligned(n, alignment)`** – Allocate `n` bytes with the given alignment (must be a power of 2, e.g. 8, 16, 4096). Returns an aligned pointer or nil. Use **`free(ptr)`** to release (the runtime frees the underlying block). Same 256 MiB cap as `alloc`.
- **`ptr_eq(a, b)`** – Returns true if both pointers are null or point to the same address. Useful for comparing pointers without converting to integers.

### String and bytes conversion

- **`string_to_bytes(s)`** – Returns an **array of integers** 0–255 (UTF-8 bytes of the string). Use with `bytes_write` to copy string data into memory.
- **`bytes_to_string(arr)`** – Converts an array of integers 0–255 to a string (interpreted as UTF-8). Use with `bytes_read` to build a string from memory.

### Page size, search, and fill

- **`memory_page_size()`** – Returns the typical memory page size in bytes (e.g. 4096). Useful for alignment and `memory_protect`.
- **`mem_find(ptr, n, byte)`** – Search for the first occurrence of **byte** (0–255) in the first **n** bytes at **ptr**. Returns the zero-based index, or **-1** if not found.
- **`mem_fill_pattern(ptr, n, pattern32)`** – Fill **n** bytes at **ptr** with the 32-bit **pattern32** repeated (little-endian). Useful for padding or sentinel values.
- **`ptr_compare(a, b)`** – Compare two pointers as addresses. Returns **-1** if a < b, **0** if equal, **1** if a > b. Null is treated as less than any non-null pointer.
- **`mem_reverse(ptr, n)`** – Reverse the order of **n** bytes in place (first and last swap, then second and second-last, etc.).
- **`mem_scan(ptr, n, pattern)`** – Find the first occurrence of the byte array **pattern** (array of ints 0–255) in the first **n** bytes at **ptr**. Returns the start index, or **-1** if not found. Useful for binary parsing (e.g. find a magic sequence).
- **`mem_overlaps(ptr_a, ptr_b, n_a, n_b)`** – Returns true if the ranges [ptr_a, ptr_a+n_a) and [ptr_b, ptr_b+n_b) overlap. Use **mem_move** when true, **mem_copy** when false.
- **`get_endianness()`** – Returns the string **"little"** or **"big"** (platform byte order). Use for portable binary I/O.
- **`mem_is_zero(ptr, n)`** – Returns true if all **n** bytes at **ptr** are zero. Fast check for zeroed buffers.
- **`read_le_float(ptr)`** – Read a 32-bit float in little-endian format at **ptr** (portable binary layout).
- **`write_le_float(ptr, x)`** – Write **x** as a 32-bit little-endian float at **ptr**.
- **`read_le_double(ptr)`** – Read a 64-bit double in little-endian format at **ptr** (portable binary layout).
- **`write_le_double(ptr, x)`** – Write **x** as a 64-bit little-endian double at **ptr**.
- **`mem_count(ptr, n, byte)`** – Count how many times **byte** (0–255) appears in the first **n** bytes at **ptr**. Returns an integer.
- **`ptr_min(a, b)`** – Return the pointer with the smaller address; if one is null, return the other.
- **`ptr_max(a, b)`** – Return the pointer with the larger address; if one is null, return the other. Useful for range bounds (e.g. **lo = ptr_min(p, q)**, **hi = ptr_max(p, q)**).
- **`ptr_diff(a, b)`** – Return the signed byte difference **(a − b)**. Both pointers must be non-null. Use for sizes or offsets between two pointers (e.g. **n = ptr_diff(end, start)**).
- **`read_be_float(ptr)`** / **`write_be_float(ptr, x)`** – 32-bit float in **big-endian** (network / file formats).
- **`read_be_double(ptr)`** / **`write_be_double(ptr, x)`** – 64-bit double in **big-endian**.
- **`ptr_in_range(ptr, base, size)`** – Returns **true** if **ptr** is in the range **[base, base+size)** (both **ptr** and **base** must be non-null; **size** &gt; 0). Useful for bounds checks.
- **`mem_xor(dest, src, n)`** – In-place XOR: for each byte in **[0, n)**, **dest[i] ^= src[i]**. Useful for encoding/decoding or simple crypto (e.g. XOR cipher). **dest** and **src** must be valid; they may overlap.
- **`mem_zero(ptr, n)`** – Zero **n** bytes at **ptr**. Same as **mem_set(ptr, 0, n)** but with a shorter signature.

### Debugging and leak tracking

- **`dump_memory(ptr, size)`** – Return a string of hex bytes for the given region (e.g. `"48 65 6c 6c"`). Useful for inspection.
- **`alloc_tracked(size)`** – Like `alloc(size)` but the pointer is registered for tracking.
- **`free_tracked(ptr)`** – Free the pointer and remove it from the tracked set.
- **`get_tracked_allocations()`** – Return an array of pointer addresses (as integers) for currently allocated tracked pointers; use to detect leaks.

### Atomic operations (32-bit)

For lock-free or shared-memory patterns:

- **`atomic_load32(ptr)`** – Atomic load of 32-bit value at `ptr`.
- **`atomic_store32(ptr, value)`** – Atomic store.
- **`atomic_add32(ptr, delta)`** – Atomic add; returns previous value (or implementation-defined).
- **`atomic_cmpxchg32(ptr, expected, desired)`** – Compare-and-swap: if value at `ptr` equals `expected`, write `desired` and return true; otherwise return false.

### Memory-mapped files and protection

- **`map_file(path)`** – Map the file at `path` into memory. Returns a pointer to the mapped region, or null on failure. The pointer is valid until `unmap_file`.
- **`unmap_file(ptr)`** – Unmap a region previously returned by `map_file(ptr)`.
- **`memory_protect(ptr, size, flags)`** – Change protection for the region (simulates OS protection). `flags`: 0 = no-access, 1 = read-only, 2 = read-write. Returns success (e.g. 1) or failure (0). Implementation uses OS APIs where available (e.g. VirtualProtect / mprotect).

---

## Bytecode-level memory opcodes

The VM also implements these opcodes (if the compiler emits them):

- **ALLOC** – Pop size `n`, push `alloc(n)`.
- **FREE** – Pop ptr, free it.
- **MEM_COPY** – Pop count, src ptr, dest ptr; perform `mem_copy(dest, src, count)`.

Most code will use the builtin functions above instead.

## Examples

- **`examples/low_level_memory.spl`** – Allocation, pointer arithmetic, peek/poke, mem_set, mem_copy, alignment, and free.
- **`examples/advanced_memory.spl`** – Struct layout, memory pools, dump_memory, big-endian I/O, and optional map_file.

## Safety notes

- **No automatic bounds checking** – Invalid pointer use can crash the process or corrupt memory.
- **`ptr_from_address(addr)`** – Use only with addresses you control (e.g. MMIO, or addresses from `alloc`). Dereferencing arbitrary addresses is unsafe.
- **`free(ptr)`** – Do not use the pointer after freeing. Do not free the same pointer twice.
- Prefer **`ptr + n`** and **`ptr - n`** in source for clarity; they map directly to the same operations as `ptr_offset`.

These features make SPL suitable for OS kernels, boot loaders, and low-level tools while keeping the language readable and consistent. With **signed reads**, **mem_swap**, **bytes_read**/**bytes_write**, and **ptr_is_null**/**size_of_ptr**, SPL’s memory model is comparable to C++ while the language syntax remains a unique mix (see [SPL_UNIQUE_SYNTAX_AND_LOW_LEVEL.md](SPL_UNIQUE_SYNTAX_AND_LOW_LEVEL.md)).

---

## See also

- [standard_library.md](standard_library.md) – Summary table of memory builtins (alloc, free, peek/poke, peek*s, mem_*, bytes_read/write, ptr_is_null, size_of_ptr, align_*, volatile_*).
- [SPL_UNIQUE_SYNTAX_AND_LOW_LEVEL.md](SPL_UNIQUE_SYNTAX_AND_LOW_LEVEL.md) – How SPL stays a unique mix of languages while offering C++-level memory control.
- [EXAMPLES_INDEX.md](EXAMPLES_INDEX.md) – **low_level_memory.spl** demonstrates allocation, pointer arithmetic, peek/poke, mem_set, mem_copy, alignment, and free.
