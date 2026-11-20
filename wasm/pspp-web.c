/* PSPP embedded as a library for WebAssembly (feasibility spike).

   One long-lived session; each call runs a chunk of syntax against it and
   writes the output items as JSON lines to /out.ndjson in the in-memory file
   system.  The host (JavaScript) reads that file after every call. */

#include <config.h>

#include <emscripten.h>
#include <stdlib.h>
#include <string.h>

#include "data/dataset.h"
#include "data/file-handle-def.h"
#include "data/session.h"
#include "data/settings.h"
#include "gsl/gsl_errno.h"
#include "language/command.h"
#include "language/lexer/lexer.h"
#include "libpspp/i18n.h"
#include "libpspp/message.h"
#include "libpspp/string-map.h"
#include "math/random.h"
#include "output/driver.h"
#include "output/output-item.h"

static struct session *the_session;
static bool initialized;

static void
output_msg (const struct msg *m_, struct lexer *lexer)
{
  struct msg_location *location = m_->location;
  if (!location && lexer)
    {
      location = lex_get_location (lexer, 0, 0);
      msg_location_remove_columns (location);
    }

  struct msg m = {
    .category = m_->category,
    .severity = m_->severity,
    .stack = m_->stack,
    .n_stack = m_->n_stack,
    .location = location,
    .command_name = output_get_uppercase_command_name (),
    .text = m_->text,
  };

  output_item_submit (message_item_create (&m));

  free (m.command_name);
  if (m.location != m_->location)
    msg_location_destroy (m.location);
}

/* Starts the session.  Returns 0 on success. */
EMSCRIPTEN_KEEPALIVE int
pspp_web_init (void)
{
  if (initialized)
    return 0;

  i18n_init ();
  gsl_set_error_handler_off ();

  output_engine_push ();
  fh_init ();
  settings_init ();
  random_init ();

  /* Users' syntax must not touch the host: no HOST, no writing outside the
     in-memory file system. */
  settings_set_safer_mode ();

  struct string_map options = STRING_MAP_INITIALIZER (options);
  string_map_insert (&options, "format", "json");
  string_map_insert (&options, "output-file", "/out.ndjson");
  struct output_driver *driver = output_driver_create (&options);
  string_map_destroy (&options);
  if (!driver)
    return 1;
  output_driver_register (driver);

  the_session = session_create (NULL);
  dataset_create (the_session, "");
  session_set_default_syntax_encoding (the_session, "UTF-8");

  initialized = true;
  return 0;
}

/* Runs SYNTAX (UTF-8).  Returns 0 if no error message was issued. */
EMSCRIPTEN_KEEPALIVE int
pspp_web_run (const char *syntax)
{
  if (!initialized)
    return -1;

  msg_ui_reset_counts ();

  struct lexer *lexer = lex_create ();
  lex_set_message_handler (lexer, output_msg);
  lex_append (lexer, lex_reader_for_string (syntax, "UTF-8"));

  lex_get (lexer);
  for (;;)
    {
      int result = cmd_parse (lexer, session_active_dataset (the_session));
      if (result == CMD_EOF || result == CMD_FINISH)
        break;
      if (cmd_result_is_failure (result) && lex_token (lexer) != T_STOP
          && result == CMD_CASCADING_FAILURE)
        {
          msg (SE, "Stopping syntax processing here to avoid a cascade of "
               "dependent command failures.");
          lex_discard_noninteractive (lexer);
        }
      if (msg_ui_too_many_errors ())
        lex_discard_noninteractive (lexer);
    }
  lex_destroy (lexer);

  return msg_ui_any_errors ();
}

EMSCRIPTEN_KEEPALIVE void
pspp_web_shutdown (void)
{
  if (!initialized)
    return;
  output_engine_pop ();
  session_destroy (the_session);
  random_done ();
  settings_done ();
  fh_done ();
  i18n_done ();
  initialized = false;
}
