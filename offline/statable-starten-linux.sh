#!/bin/sh
# Statable ohne Netz starten (Linux). Im Terminal: sh statable-starten-linux.sh
cd "$(dirname "$0")" || exit 1
exec perl start/server.pl
