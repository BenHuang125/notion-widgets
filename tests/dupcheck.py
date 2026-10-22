#!/usr/bin/env python3
"""重複檢查：同名函式定義兩次、或一大段一模一樣的程式出現在兩個地方 → 失敗。
已存在的舊重複列在 tests/dup-baseline.txt（只准變少，不准新增）。"""
import re, sys, os, hashlib
ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
SRC = os.path.join(ROOT, "src")
BASE = os.path.join(ROOT, "tests", "dup-baseline.txt")
MIN_LINES = 8          # 連續幾行一模一樣才算重複一段
FN = re.compile(r'^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(|^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*(?::[^=;]+)?=>|[A-Za-z_$][\w$]*\s*=>)')
def norm(l): return re.sub(r'\s+', ' ', l.strip())
def trivial(l): return (not l) or l.startswith(('//','/*','*')) or re.fullmatch(r'[{}()\[\];,]*', l) is not None
defs, lines_by = {}, {}
for d, _, fs in os.walk(SRC):
    for f in fs:
        if not f.endswith(('.js', '.ts')): continue
        p = os.path.relpath(os.path.join(d, f), ROOT)
        L = open(os.path.join(d, f), encoding='utf-8').read().split('\n')
        lines_by[p] = L
        depth = 0
        for i, l in enumerate(L, 1):
            if depth == 0:                       # 只看最外層的函式
                m = FN.match(l)
                if m: defs.setdefault(m.group(1) or m.group(2), []).append(f"{p}:{i}")
            depth += l.count('{') - l.count('}')
            if depth < 0: depth = 0
found = set()
for n, locs in defs.items():
    if len(locs) > 1: found.add(f"FUNC {n} ({' / '.join(sorted(locs))})")
seen = {}
for p, L in lines_by.items():
    C = [(i, norm(l)) for i, l in enumerate(L, 1) if not trivial(norm(l))]
    for k in range(len(C) - MIN_LINES + 1):
        w = [c[1] for c in C[k:k+MIN_LINES]]
        if sum(len(x) for x in w) < 240: continue   # 太短的樣板不算
        h = hashlib.md5('\n'.join(w).encode()).hexdigest()
        here = (p, C[k][0])
        if h in seen and seen[h][0] != here[0] or (h in seen and here[1] - seen[h][1] >= MIN_LINES):
            a = seen[h]; found.add(f"BLOCK {a[0]}:{a[1]} == {p}:{C[k][0]}")
        seen.setdefault(h, here)
# 相鄰重疊的區塊只報第一個
blocks = sorted(x for x in found if x.startswith('BLOCK'))
dedup, last = [], {}
for b in blocks:
    m = re.match(r'BLOCK (.+):(\d+) == (.+):(\d+)', b); key = (m[1], m[3])
    a, c = int(m[2]), int(m[4])
    if key in last and abs(a - last[key][0]) < MIN_LINES*3 and abs(c - last[key][1]) < MIN_LINES*3:
        last[key] = (a, c); continue
    last[key] = (a, c); dedup.append(b)
found = sorted(x for x in found if x.startswith('FUNC')) + dedup
def key(x): return re.sub(r':\d+', '', x)   # 行號會移動，比對時忽略
base = set(open(BASE, encoding='utf-8').read().split('\n')) - {''} if os.path.exists(BASE) else set()
from collections import Counter
have = Counter(key(b) for b in base if not b.startswith('#'))
now = Counter(key(x) for x in found)
new = [x for x in found if now[key(x)] > have[key(x)]]   # 份數變多也算新增
basekeys = have
if '--write-baseline' in sys.argv:
    open(BASE, 'w', encoding='utf-8').write("# 舊的重複（2026-10-05 起記錄）。只准刪不准加；整理掉一條就把那條刪掉。\n" + '\n'.join(found) + '\n')
    print(f"baseline written: {len(found)}"); sys.exit(0)
if new:
    print("發現新的重複（請改成沿用原本那段，不要另寫一份）："); [print("  " + x) for x in new]; sys.exit(1)
print(f"DUP: PASS（舊的重複 {sum(have.values())} 條，沒有新增）")
