#!/bin/bash
# Links the PSPP engine (built by emconfigure/make in wbuild/) with the embedding wrapper into pspp.mjs/pspp.wasm.
set -e
cd "$(dirname "$0")"
source ../emsdk/emsdk_env.sh >/dev/null 2>&1
W=$PWD
# PSPP-Version: Quellbaum ../pspp-$V, Baum wbuild-$V (2.1.1 lag noch in wbuild/).
V="${PSPP_VERSION:-2.1.3}"; WB=wbuild-$V; [ "$V" = 2.1.1 ] && WB=wbuild
Q=$W/../pspp-$V
INC="-DHAVE_CONFIG_H -I$W/$WB -I$Q -I$Q/gl -I$W/$WB/gl -I$Q/src -I$Q/lib -I$W/$WB/src -I$W/prefix/include -I$W/prefix/include/libxml2 -I$W/stubs/pspp-cairo"
mkdir -p out
rm -f out/liboutput-nocairo.a
emar rcs out/liboutput-nocairo.a $(find $WB/src/output $WB/lib/linreg $WB/lib/tukey -name '*.o')
emcc -O2 -include $W/stubs/wasm-fixup.h -Wno-macro-redefined $INC -c pspp-web.c -o out/pspp-web.o
emcc -O2 -include $W/stubs/wasm-fixup.h -Wno-macro-redefined $INC -c stubs/stubs.c -o out/stubs.o
emcc -O2 --no-entry out/pspp-web.o out/stubs.o \
  $WB/src/language/.libs/liblanguage.a $WB/src/math/.libs/libpspp-math.a out/liboutput-nocairo.a $WB/src/.libs/libpspp-core.a $WB/src/data/.libs/libdata.a $WB/src/libpspp/.libs/liblibpspp.a $WB/gl/.libs/libgl.a \
  prefix/lib/libgsl.a prefix/lib/libgslcblas.a prefix/lib/libxml2.a prefix/lib/libz.a \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createPspp -sENVIRONMENT=web,worker,node \
  -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=134217728 -sSTACK_SIZE=2097152 -sFORCE_FILESYSTEM=1 \
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,FS \
  -sEXPORTED_FUNCTIONS=_pspp_web_init,_pspp_web_run,_pspp_web_shutdown,_malloc,_free \
  -o out/pspp.mjs "$@"
ls -la out/pspp.mjs out/pspp.wasm
