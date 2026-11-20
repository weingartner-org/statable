/* Do-nothing replacements for the cairo/pango parts of PSPP (WASM spike).
   Diagrams are to be drawn in the browser from data, not by cairo. */
#include <stddef.h>
#include <cairo.h>

cairo_surface_t *cairo_surface_reference (cairo_surface_t *s) { return s; }
void cairo_surface_destroy (cairo_surface_t *s) { (void) s; }
cairo_status_t cairo_surface_status (cairo_surface_t *s) { (void) s; return CAIRO_STATUS_READ_ERROR; }
cairo_surface_t *cairo_image_surface_create_from_png_stream (cairo_read_func_t f, void *c) { (void) f; (void) c; return NULL; }
cairo_status_t cairo_surface_write_to_png_stream (cairo_surface_t *s, cairo_write_func_t f, void *c) { (void) s; (void) f; (void) c; return CAIRO_STATUS_WRITE_ERROR; }

/* Chart rendering entry points used by the text/HTML/SPV drivers. */
struct chart;
struct cell_color;
struct file_handle;
struct driver_options;
enum settings_output_devices;

cairo_surface_t *xr_draw_image_chart (const struct chart *c, const struct cell_color *fg, const struct cell_color *bg) { (void) c; (void) fg; (void) bg; return NULL; }
char *xr_write_png_image (cairo_surface_t *s, const char *t, int n) { (void) s; (void) t; (void) n; return NULL; }
char *xr_draw_png_chart (const struct chart *c, const char *t, int n, const struct cell_color *fg, const struct cell_color *bg) { (void) c; (void) t; (void) n; (void) fg; (void) bg; return NULL; }

/* Output formats that need cairo: registered as unavailable. */
struct output_driver;
struct output_driver_factory_stub { const char *extension; const char *default_file_name; struct output_driver *(*create) (struct file_handle *, int, struct driver_options *); };
static struct output_driver *unavailable (struct file_handle *fh, int type, struct driver_options *o) { (void) fh; (void) type; (void) o; return NULL; }
const struct output_driver_factory_stub pdf_driver_factory = { "pdf", "pspp.pdf", unavailable };
const struct output_driver_factory_stub png_driver_factory = { "png", "pspp.png", unavailable };
const struct output_driver_factory_stub ps_driver_factory = { "ps", "pspp.ps", unavailable };
const struct output_driver_factory_stub svg_driver_factory = { "svg", "pspp.svg", unavailable };
