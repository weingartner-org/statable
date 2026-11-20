#!/bin/bash
# Statable ohne Netz starten (Mac). Doppelklick; beim ersten Mal: Rechtsklick → Öffnen.
cd "$(dirname "$0")" || exit 1
exec /usr/bin/perl start/server.pl
