#!/usr/bin/env python3
"""Builds the roadmap page into dist/ (system-template ARCHITECTURE.md §3).

dist/index.html  the small page: only the style sheet is inlined
dist/js/*.js     one bundle per region (+ shared chunks), names carry a content hash

    python3 build.py          build
    python3 build.py --check  fail if dist/ is not exactly what src/ builds
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
FORBIDDEN = ["NOTION_TOKEN", "secret_", "ntn_"]


def bundle() -> dict:
    out = subprocess.run(
        ["node", str(ROOT / "tools" / "bundle.mjs"), str(ROOT / "src")],
        check=True, capture_output=True, text=True, cwd=ROOT,
    )
    return json.loads(out.stdout)


def page(regions: dict) -> str:
    template = (ROOT / "page" / "index.html").read_text(encoding="utf-8")
    style = (ROOT / "src" / "roadmap" / "style.css").read_text(encoding="utf-8").strip()
    scripts = "\n".join(
        f'<script type="module" src="{path}"></script>' for _, path in sorted(regions.items())
    )
    return template.replace("/*STYLE*/", style).replace("<!--SCRIPTS-->", scripts)


def build(into: Path) -> None:
    made = bundle()
    if into.exists():
        shutil.rmtree(into)
    (into / "js").mkdir(parents=True)
    for f in made["files"]:
        text = f["text"]
        for bad in FORBIDDEN:
            if bad in text:
                sys.exit(f"build: {f['path']} contains forbidden text {bad!r}")
        (into / f["path"]).write_text(text, encoding="utf-8")
    (into / "index.html").write_text(page(made["regions"]), encoding="utf-8")


def listing(folder: Path) -> dict:
    return {
        str(p.relative_to(folder)): p.read_bytes()
        for p in sorted(folder.rglob("*")) if p.is_file()
    }


def main() -> None:
    if "--check" in sys.argv:
        with tempfile.TemporaryDirectory() as tmp:
            fresh = Path(tmp) / "dist"
            build(fresh)
            if not DIST.exists() or listing(fresh) != listing(DIST):
                sys.exit("build --check: dist/ is not what src/ builds — run python3 build.py")
        print("build --check: dist/ matches src/")
        return
    build(DIST)
    print(f"built {DIST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
