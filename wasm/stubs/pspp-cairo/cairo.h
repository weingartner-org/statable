/* Stub for the WASM spike: the cairo-based drivers are not built. Only the
   types and functions the core still references are declared; stubs/stubs.c
   gives them do-nothing bodies. */
#ifndef STUB_CAIRO_H
#define STUB_CAIRO_H
typedef struct _cairo cairo_t;
typedef struct _cairo_surface cairo_surface_t;
typedef struct _cairo_font_options cairo_font_options_t;
typedef enum { CAIRO_STATUS_SUCCESS = 0, CAIRO_STATUS_READ_ERROR = 10,
               CAIRO_STATUS_WRITE_ERROR = 11 } cairo_status_t;
typedef cairo_status_t (*cairo_read_func_t) (void *, unsigned char *, unsigned);
typedef cairo_status_t (*cairo_write_func_t) (void *, const unsigned char *, unsigned);
cairo_surface_t *cairo_surface_reference (cairo_surface_t *);
void cairo_surface_destroy (cairo_surface_t *);
cairo_status_t cairo_surface_status (cairo_surface_t *);
cairo_surface_t *cairo_image_surface_create_from_png_stream (cairo_read_func_t, void *);
cairo_status_t cairo_surface_write_to_png_stream (cairo_surface_t *, cairo_write_func_t, void *);
#endif
