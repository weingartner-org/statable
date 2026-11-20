#!/bin/bash
# Baut die ganze Engine aus einem PSPP-Quellbaum neu: configure, make, linken → <Bauplatz>/wasm/out/pspp.{mjs,wasm}.
# Für den Wechsel auf eine neue PSPP-Version (zuerst so am 29.10.2026: 2.1.1 → 2.1.3 + zwei Upstream-Commits danach).
#
# Vorher (einmal je Version), im Bauplatz B (z. B. ~/Entwicklung/pspp-bau):
#   1. Tarball von ftp.gnu.org/gnu/pspp nach B/pspp-<V> entpacken (der Tarball hat configure, Git braucht Bootstrap).
#   2. Upstream-Commits nach dem Release, falls gewünscht: git format-patch … -- src/ | patch -p1 (siehe patches/README.md).
#   3. patches/0001-engine-aenderungen.diff mit patch -p0 anwenden, patches/json.c nach src/output/json.c kopieren.
#   B/emsdk (Emscripten 6.0.11), B/wasm/prefix (GSL, libxml2, zlib für WASM) und B/wasm/stubs stehen schon.
#
# Aufruf: bash wasm/engine-bauen.sh ~/Entwicklung/pspp-bau 2.1.3
# Danach: cp B/wasm/out/pspp.{mjs,wasm} app/public/wasm/  und die ganze Testsuite (npx vitest run, node scripts/pruef-suite.mjs).
set -e
B="$(cd "$1" && pwd)"; V="$2"
W="$B/wasm"; Q="$B/pspp-$V"; WB="$W/wbuild-$V"
test -f "$Q/configure" || { echo "kein Quellbaum $Q"; exit 1; }
test -f "$Q/src/output/json.c" || { echo "json.c fehlt in $Q/src/output (Schritt 3)"; exit 1; }
source "$B/emsdk/emsdk_env.sh" >/dev/null 2>&1
E="$(dirname "$(which emcc)")"
mkdir -p "$WB"; cd "$WB"

if [ ! -f config.status ]; then
  # Cross-Modus (--host), sonst hängt ein gnulib-Laufzeittest. CAIRO_* gesetzt, nicht leer (Attrappe in stubs/pspp-cairo).
  # Relativer Pfad wie beim Bau von 2.1.1: so stehen in den Meldungen der Engine (assert, __FILE__) „../../pspp-<V>/…“, kein Heimordner.
  emconfigure "../../pspp-$V/configure" --build=aarch64-apple-darwin --host=i686-pc-linux-musl \
    --without-gui --without-perl-module --without-libpq --disable-nls --disable-shared --disable-rpath \
    pspp_cv_have_clicksequence=yes \
    CPPFLAGS="-I$W/prefix/include" LDFLAGS="-L$W/prefix/lib" LIBS="-lz -lm" \
    PKG_CONFIG_PATH= PKG_CONFIG_LIBDIR="$E/cache/sysroot/local/lib/pkgconfig:$E/cache/sysroot/lib/pkgconfig" \
    CAIRO_CFLAGS="-I$W/stubs/pspp-cairo" CAIRO_LIBS=-lm \
    LIBXML2_CFLAGS="-I$W/prefix/include/libxml2" LIBXML2_LIBS="-L$W/prefix/lib -lxml2" \
    GSL_CFLAGS="-I$W/prefix/include" GSL_LIBS="-L$W/prefix/lib -lgsl -lgslcblas" > configure.log 2>&1
fi

# Erzeugte Header zuerst, gnulib mit den Standard-Flags, dann die PSPP-Bibliotheken mit wasm-fixup.h (musl-struct file_handle).
printf 'statable-kopfdateien: $(BUILT_SOURCES)\n' > kopfdateien.mk
emmake make -k -f Makefile -f kopfdateien.mk statable-kopfdateien > hdr.log 2>&1 || true
emmake make -k gl/libgl.la > gl.log 2>&1 || true
FL="-O2 -include $W/stubs/wasm-fixup.h -Wno-unknown-warning-option -Wno-macro-redefined"
# -k: die Cairo-Dateien in liboutput scheitern (keine echte Cairo-Bibliothek); build-wasm.sh packt die übrigen .o.
emmake make -k CFLAGS="$FL" src/libpspp/liblibpspp.la src/data/libdata.la src/libpspp-core.la \
  src/math/libpspp-math.la src/output/liboutput.la lib/linreg/liblinreg.la lib/tukey/libtukey.la src/language/liblanguage.la > lib.log 2>&1 || true
for a in src/language/.libs/liblanguage.a src/math/.libs/libpspp-math.a src/.libs/libpspp-core.a \
         src/data/.libs/libdata.a src/libpspp/.libs/liblibpspp.a gl/.libs/libgl.a; do
  test -f "$a" || { echo "fehlt: $WB/$a (siehe $WB/*.log)"; exit 1; }
done
PSPP_VERSION="$V" bash "$W/build-wasm.sh"
