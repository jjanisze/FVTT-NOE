"""Zip archives for `fvtt backup` (dev/agent/lib/backup.mjs) — Python's zipfile: ZIP64 when needed, CRC test.

    python -I archive.py zip <spec.json>        spec: {"dest": dir, "parts": [{"file", "src", "skip": [names]}]}
    python -I archive.py extract <zip> <dir>

`zip` writes one archive per part (entries named from the parent of `src`, so `worlds/output` becomes
`output/...`), then CRC-tests every archive it wrote. Links and junctions are never followed — a sandbox package
is a folder of junctions into the campaign install — and are listed instead. `skip` names top-level entries of
`src` to leave out. Prints one JSON object on stdout.
"""
import json
import os
import sys
import time
import zipfile

STORED = {".webm", ".webp", ".png", ".jpg", ".jpeg", ".ogg", ".mp3", ".m4a", ".mp4", ".zip", ".gz", ".7z", ".woff2"}


def is_link(p):
    return os.path.islink(p) or os.path.isjunction(p)


def zip_dir(src, out, skip):
    files = size = 0
    links = []
    base = os.path.dirname(src)
    rel = lambda p: os.path.relpath(p, base).replace("\\", "/")
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as z:
        for root, dirs, names in os.walk(src):
            keep = []
            for d in dirs:
                p = os.path.join(root, d)
                if root == src and d in skip:
                    continue
                if is_link(p):
                    links.append(rel(p))
                    continue
                keep.append(d)
            dirs[:] = keep
            for f in names:
                p = os.path.join(root, f)
                if root == src and f in skip:
                    continue
                if is_link(p):
                    links.append(rel(p))
                    continue
                ext = os.path.splitext(f)[1].lower()
                z.write(p, rel(p), compress_type=zipfile.ZIP_STORED if ext in STORED else zipfile.ZIP_DEFLATED)
                files += 1
                size += os.path.getsize(p)
    return files, size, links


def main():
    mode = sys.argv[1]
    if mode == "zip":
        with open(sys.argv[2], encoding="utf-8") as fh:
            spec = json.load(fh)
        parts = []
        for part in spec["parts"]:
            t0 = time.time()
            out = os.path.join(spec["dest"], part["file"])
            files, size, links = zip_dir(part["src"], out, set(part.get("skip", [])))
            with zipfile.ZipFile(out) as z:
                bad = z.testzip()
            parts.append({"file": part["file"], "files": files, "sourceBytes": size, "links": links,
                          "crc": "ok" if bad is None else f"bad: {bad}", "seconds": round(time.time() - t0, 1)})
            print(f"[archive] {part['file']}: {files} files, {round(size / 1048576)} MB, {parts[-1]['seconds']} s",
                  file=sys.stderr, flush=True)
        print(json.dumps({"parts": parts}))
    elif mode == "extract":
        with zipfile.ZipFile(sys.argv[2]) as z:
            z.extractall(sys.argv[3])
        print(json.dumps({"extracted": sys.argv[3]}))
    else:
        sys.exit(f"unknown mode {mode}")


main()
