"""Which parts of the system a change touches, so GitHub only runs the tests that matter
(RULES §3; the way Nx `affected` works: a path → area table, and shared files run everything).

Usage in .github/workflows/check.yml:  python3 tools/changed_parts.py BASE HEAD >> "$GITHUB_OUTPUT"
Prints three lines:
  code=true|false   false when only notes changed (*.md, docs/, snapshots/) -> every test is skipped
  areas=...         unit-test folders to run, e.g. "tests/calendar tests/requests"
  e2e=...           end-to-end files to run, e.g. "tests/e2e/calendar.mjs"
An area is a folder src/<area>/; its unit tests are tests/<area>/, its end-to-end tests
tests/e2e/<area>.mjs. Everything runs when BASE is unknown, when a COMMON area changed, or when a
changed file is outside every area (package-lock.json, tools/, .github/, vendor/, src/index.html,
tests/mock-runtime.js…) or in an area with no tests of its own: a file this table does not know is
never a reason to skip a test.
Check this file itself: python3 tools/changed_parts.py --self-test
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTES = re.compile(r"(\.md$|^docs/|^snapshots/)")
# areas every other area uses: a change there runs every area (add the system's own, e.g. "copy")
COMMON = ("shared",)


def listing(base_dir, pick):
    path = os.path.join(ROOT, base_dir)
    return sorted(pick(n) for n in os.listdir(path) if pick(n)) if os.path.isdir(path) else []


def unit_areas():
    def has_tests(d):
        folder = os.path.join(ROOT, "tests", d)
        return any(f.endswith(".test.ts") for _, _, fs in os.walk(folder) for f in fs)

    def pick(d):
        return d if d != "e2e" and os.path.isdir(os.path.join(ROOT, "tests", d)) and has_tests(d) else None

    return listing("tests", pick)


def e2e_areas():
    return listing("tests/e2e", lambda f: f[: -len(".mjs")] if f.endswith(".mjs") else None)


def area_of(path):
    m = re.match(r"^tests/e2e/([^/]+)\.mjs$", path) or re.match(r"^(?:src|tests)/([^/]+)/", path)
    return m.group(1) if m and m.group(1) != "e2e" else None


def parts(files, units, e2es):
    """(code changed?, unit areas, e2e areas) for the changed `files` (None = unknown)."""
    if files is None:
        return True, units, e2es
    code = [f for f in files if not NOTES.search(f)]
    if not code:
        return False, [], []
    # dist/ is built from src/ (build.py --check proves it); the src/ file behind it picks the tests.
    # Counted as code, dist/index.html (it names every bundle's hash) would run everything every time.
    owners = [area_of(f) for f in code if not f.startswith("dist/")]
    touched = set(owners)
    # outside every area (build tools, CI, vendor/, the page skeleton, test helpers) or in an area
    # with no tests of its own: nothing to pick from, so everything runs
    untested = touched - set(units) - set(e2es)
    if untested or touched & set(COMMON):
        return True, units, e2es
    return True, [a for a in units if a in touched], [a for a in e2es if a in touched]


def changed_files(base, head):
    if not base or set(base) == {"0"}:
        return None
    # --no-renames: a moved file lists its old path too (moving a shared file out runs everything)
    r = subprocess.run(["git", "diff", "--name-only", "--no-renames", base, head], capture_output=True, text=True, cwd=ROOT)
    return r.stdout.split() if r.returncode == 0 else None


def self_test():
    units, e2es = ["calendar", "requests", "shared"], ["calendar", "requests"]
    cases = [
        (["README.md", "docs/a.png"], (False, [], [])),
        (["src/calendar/app.ts"], (True, ["calendar"], ["calendar"])),
        (["src/calendar/app.ts", "dist/index.html", "dist/js/calendar.0123456789.js"], (True, ["calendar"], ["calendar"])),
        (["tests/e2e/requests.mjs"], (True, ["requests"], ["requests"])),
        (["src/shared/core/time.ts"], (True, units, e2es)),
        (["tools/bundle.mjs"], (True, units, e2es)),
        (["package-lock.json"], (True, units, e2es)),
        (["tests/mock-runtime.js"], (True, units, e2es)),
        (["src/js/old.js"], (True, units, e2es)),
        (["LICENSE"], (True, units, e2es)),
        (["vendor/three/three.module.js"], (True, units, e2es)),
        (["src/new-area/index.ts"], (True, units, e2es)),
        (["src/calendar/a.ts", "src/requests/b.ts"], (True, ["calendar", "requests"], e2es)),
        (None, (True, units, e2es)),
    ]
    for files, want in cases:
        got = parts(files, units, e2es)
        assert got == want, f"{files}: {got} != {want}"
    print(f"changed_parts self-test: {len(cases)} cases passed")


def main():
    if sys.argv[1:2] == ["--self-test"]:
        return self_test()
    base, head = (sys.argv[1:3] + ["", "HEAD"])[:2]
    code, units, e2es = parts(changed_files(base, head), unit_areas(), e2e_areas())
    print(f"code={str(code).lower()}")
    print("areas=" + " ".join(f"tests/{a}" for a in units))
    print("e2e=" + " ".join(f"tests/e2e/{a}.mjs" for a in e2es))


if __name__ == "__main__":
    main()
