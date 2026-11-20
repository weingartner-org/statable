# Prüfhilfe Block C (PDF/UA): liest ein Chromium-PDF ohne Zusatzpakete (nur Standardbibliothek) und zählt Strukturfehler,
# die PAC meldet: Metadaten (XMP), Figure ohne Alt, Caption-Stellung in Tabellen, Tabellen (TH/Scope/Regelmäßigkeit), Inhalt ohne Tag/Artefakt.
# Aufruf: python -I e2e/probe/pdf-struktur.py datei.pdf [--baum]
import re, sys, zlib, collections
data = open(sys.argv[1], 'rb').read()
objs = {}
for m in re.finditer(rb'(\d+) 0 obj(.*?)endobj', data, re.S):
    objs[int(m.group(1))] = m.group(2)
def stream(n):
    b = objs[n]; m = re.search(rb'stream\r?\n(.*)\r?\nendstream', b, re.S)
    if not m: return b''
    raw = m.group(1)
    return zlib.decompress(raw) if b'FlateDecode' in b[:m.start()] else raw
def d(n): b = objs[n]; i = b.find(b'stream'); return (b if i < 0 else b[:i]).decode('latin1')
cat = next(n for n in objs if re.search(r'/Type\s*/Catalog', d(n)))
c = d(cat)
print('ObjStm vorhanden:', any('/ObjStm' in d(n) for n in objs))
print('Catalog:', re.sub(r'\s+', ' ', c)[:300])
print('MarkInfo/Marked:', '/Marked true' in c, '| Lang:', re.search(r'/Lang\s*\(([^)]*)\)', c) and re.search(r'/Lang\s*\(([^)]*)\)', c).group(1), '| DisplayDocTitle:', 'DisplayDocTitle true' in c)
mm = re.search(r'/Metadata (\d+) 0 R', c)
if mm:
    x = stream(int(mm.group(1))).decode('utf8', 'replace'); print('XMP vorhanden, Länge', len(x), '| pdfuaid:', 'pdfuaid' in x, '| dc:title:', 'dc:title' in x); 
else: print('XMP: KEINE Metadaten im Katalog (kein /Metadata)')
info = [n for n in objs if '/Producer' in d(n)]
print('Info:', [re.sub(r'\s+', ' ', d(n))[:200] for n in info])
root = int(re.search(r'/StructTreeRoot (\d+) 0 R', c).group(1))
def kids(n):
    t = d(n); m = re.search(r'/K\s*(\[[^\]]*\]|\d+ 0 R|\d+)', t)
    if not m: return []
    return [int(x) for x in re.findall(r'(\d+) 0 R', m.group(1))]
def role(n): m = re.search(r'/S\s*/(\w+)', d(n)); return m.group(1) if m else None
cnt = collections.Counter(); figs = []; tabs = []
def walk(n, depth, par):
    r = role(n)
    if r: cnt[r] += 1
    if '--baum' in sys.argv and r and depth < 7: print('  ' * depth + r, d(n).count('/Alt'), re.sub(r'\s+', ' ', d(n))[:0])
    if r == 'Figure': figs.append(n)
    if r == 'Table': tabs.append(n)
    for k in kids(n):
        if k in objs: walk(k, depth + 1, n)
walk(root, 0, None)
print('Rollen:', dict(cnt))
fig_ohne = [n for n in figs if '/Alt' not in d(n) or re.search(r'/Alt\s*\(\s*\)', d(n))]
print(f'Figure: {len(figs)}, ohne Alt: {len(fig_ohne)}')
for n in figs: print('  Figure', n, re.sub(r'\s+', ' ', d(n))[:160])
cap_fehler = 0; reg = 0; th_ohne = 0; leer = 0
for t in tabs:
    ks = [k for k in kids(t) if k in objs]; roles = [role(k) for k in ks]
    cap = [i for i, r in enumerate(roles) if r == 'Caption']
    if cap and cap[0] != 0 and not (cap[0] == len(roles) - 1): cap_fehler += 1
    rows = []
    def zeilen(n):
        for k in kids(n):
            if k not in objs: continue
            if role(k) == 'TR': rows.append(k)
            elif role(k) in ('THead', 'TBody', 'TFoot'): zeilen(k)
    zeilen(t)
    spalten = []; belegt = {}  # belegt: Spalte -> Zeilen, die ein RowSpan noch besetzt
    for ri, r in enumerate(rows):
        col = 0; w = 0
        for z in kids(r):
            if z not in objs: continue
            while belegt.get(col, 0) > 0: belegt[col] -= 1; col += 1; w += 1
            cs = re.search(r'/ColSpan (\d+)', d(z)); rs = re.search(r'/RowSpan (\d+)', d(z))
            cs = int(cs.group(1)) if cs else 1; rs = int(rs.group(1)) if rs else 1
            for k in range(cs):
                if rs > 1: belegt[col + k] = rs - 1
            col += cs; w += cs
            if role(z) == 'TH' and '/Scope' not in d(z) and '/Headers' not in d(z): th_ohne += 1
            if role(z) in ('TD', 'TH') and not kids(z): leer += 1
        while belegt.get(col, 0) > 0: belegt[col] -= 1; col += 1; w += 1
        spalten.append(w)
    if len(set(spalten)) > 1: reg += 1
    print(f'  Table {t}: Kinder {roles[:4]}{"..." if len(roles) > 4 else ""}, Zeilen {len(rows)}, Spaltenbreiten {sorted(set(spalten))}')
print(f'Tabellen {len(tabs)}: Caption falsch gestellt {cap_fehler}, unregelmäßig {reg}, TH ohne Scope/Headers {th_ohne}, Zellen ohne Inhalt {leer}')
# Inhalt: Text/Bild-Operatoren außerhalb von markiertem Inhalt
unmark = 0; art = 0; mc = 0; annots = 0
for n in objs:
    if '/Type /Page' in d(n).replace('/Type/Page', '/Type /Page') and '/Contents' in d(n):
        annots += d(n).count('/Annots')
        cm = re.search(r'/Contents (\d+) 0 R', d(n))
        if not cm: continue
        s = stream(int(cm.group(1))).decode('latin1'); lvl = 0
        for tok in re.finditer(r'(/\w+\s*(?:<<.*?>>|/\w+)?\s*BDC)|(\bBMC\b)|(\bEMC\b)|(\bBT\b|\bDo\b|\bTj\b|\bTJ\b|(?<![\w/])(?:f\*?|F|S|s|B\*?|b\*?|sh)(?![\w/]))', s, re.S):
            if tok.group(1) or tok.group(2):
                lvl += 1; art += 1 if tok.group(1) and tok.group(1).startswith('/Artifact') else 0; mc += 1 if tok.group(1) and 'MCID' in tok.group(1) else 0
            elif tok.group(3): lvl -= 1
            elif lvl <= 0: unmark += 1
print(f'Inhalt: markierte Bereiche mit MCID {mc}, Artefakt-Bereiche {art}, Text/Bild-Operatoren außerhalb jeder Markierung {unmark} (einschließlich Pfade/Rahmen), Seiten mit /Annots {annots}')
