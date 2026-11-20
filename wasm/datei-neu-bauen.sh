#!/bin/bash
# Baut EINE geänderte PSPP-Datei aus src/language/commands/ neu und linkt die Engine (ohne den ganzen PSPP-Bau).
# Vorher: Bauplatz aus ~/Entwicklung/pspp-web-arbeitsbaum-2026-10-06.tar.gz entpacken (z. B. nach ~/Entwicklung/pspp-bau),
# dort emsdk holen: git clone https://github.com/emscripten-core/emsdk && ./emsdk install 6.0.11 && ./emsdk activate 6.0.11,
# dann Patches anwenden (patches/README.md). Flags wie engine-bauen.sh - geprüft am 29.10.2026: examine.c ohne Änderung
# neu übersetzt ergibt eine bit-gleiche pspp.wasm.
# Aufruf: bash wasm/datei-neu-bauen.sh ~/Entwicklung/pspp-bau crosstabs [2.1.3]   → ~/Entwicklung/pspp-bau/wasm/out/pspp.{mjs,wasm}
# Seit 29.10.2026 ist 2.1.3 der Stand (Baum wbuild-2.1.3, ganzer Bau: wasm/engine-bauen.sh); 2.1.1 lag in wbuild/.
set -e
B="$(cd "$1" && pwd)"; NAME="$2"; V="${3:-2.1.3}"
source "$B/emsdk/emsdk_env.sh" >/dev/null 2>&1
WB=wbuild-$V; [ "$V" = 2.1.1 ] && WB=wbuild
W="$B/wasm"; L="$W/$WB/src/language/.libs/liblanguage.a"
cd "$W/$WB"
mkdir -p "$B/tausch"
emcc -DHAVE_CONFIG_H '-DEXEEXT=""' -I. -I../../pspp-$V -I../../pspp-$V/gl -Igl '-DINSTALLDIR="/usr/local/bin"' \
  -I../../pspp-$V/src -I../../pspp-$V/lib -Isrc -I../../pspp-$V/src/language/commands \
  -I"$W/$WB/src/language/expressions" -I../../pspp-$V/src/language/expressions \
  -I"$W/prefix/include" -I"$W/stubs/pspp-cairo" -I"$W/prefix/include/libxml2" \
  -Wall -Wextra -Wwrite-strings -Wstrict-prototypes -Wpointer-arith -Wno-sign-compare -Wmissing-prototypes \
  -O2 -include "$W/stubs/wasm-fixup.h" -Wno-unknown-warning-option -Wno-macro-redefined \
  -c "../../pspp-$V/src/language/commands/$NAME.c" -o "$B/tausch/$NAME.o"
emar r "$L" "$B/tausch/$NAME.o"
PSPP_VERSION="$V" bash "$W/build-wasm.sh"
