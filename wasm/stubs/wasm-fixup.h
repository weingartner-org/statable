/* Force-included when compiling PSPP for Emscripten.
   musl's <fcntl.h> declares a Linux 'struct file_handle' that collides with
   PSPP's own.  Let the system header have the name first, then rename PSPP's. */
#ifndef WASM_FIXUP_H
#define WASM_FIXUP_H
#include <config.h>
#include <fcntl.h>
#define file_handle pspp_file_handle
#endif
