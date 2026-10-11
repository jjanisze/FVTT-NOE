"""Download verified Freesound CC0 originals/previews and convert declared clips to OGG."""
from __future__ import annotations

import argparse
import array
import hashlib
import json
import math
import subprocess
import urllib.request
from urllib.parse import urlparse
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def command(*args: str, binary: bool = False):
    process = subprocess.run(args, capture_output=True, text=not binary)
    if process.returncode:
        error = process.stderr.decode("utf-8", errors="replace") if binary else process.stderr
        raise SystemExit(error.strip())
    return process.stdout


def read_samples(path: Path, rate: int = 44100, filters: str | None = None) -> array.array:
    args = ["ffmpeg", "-v", "error", "-i", str(path)]
    if filters:
        args.extend(["-af", filters])
    data = command(*args, "-ac", "1", "-ar", str(rate), "-f", "f32le", "pipe:1", binary=True)
    result = array.array("f")
    result.frombytes(data)
    return result


def inspect(path: Path) -> dict:
    samples = read_samples(path, 8000)
    bins = []
    for start in range(0, len(samples), 2000):
        window = samples[start:start + 2000]
        rms = math.sqrt(sum(sample * sample for sample in window) / len(window))
        bins.append(round(20 * math.log10(max(rms, 1e-10)), 1))
    return {"duration": round(len(samples) / 8000, 3), "quarterSecondRmsDb": bins}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--fetch-original", action="append", nargs=2, metavar=("KEY", "SIGNED_URL"),
                        help="Download a browser-authenticated original; never persist its signed query")
    parser.add_argument("--inspect", action="store_true", help="Print source energy to choose real events")
    args = parser.parse_args()
    sources = json.loads((HERE / "audio-sources.json").read_text(encoding="utf-8"))["sources"]
    by_key = {source["key"]: source for source in sources}
    incoming = HERE / "audio" / "in"
    incoming.mkdir(parents=True, exist_ok=True)
    originals = {}
    for key, url in args.fetch_original or []:
        if key not in by_key or urlparse(url).hostname != "cdn.freesound.org":
            parser.error("Original must match a verified key and Freesound's CDN")
        extension = Path(urlparse(url).path).suffix.lower()
        if extension not in (".wav", ".flac", ".ogg", ".mp3"):
            parser.error(f"Unsupported original format: {key}")
        destination = incoming / f"{key}.original{extension}"
        request = urllib.request.Request(url, headers={"User-Agent": "AssetImport/1.0"})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                destination.write_bytes(response.read())
        except Exception:
            raise SystemExit(f"Original download failed for {key}; obtain a fresh signed link") from None
        originals[key] = {"file": destination.name, "url": url.split("?", 1)[0],
                          "sha256": hashlib.sha256(destination.read_bytes()).hexdigest()}
    if originals:
        (HERE / "audio-originals.json").write_text(
            json.dumps({"checked": "2026-10-11", "originals": originals}, indent=2) + "\n",
            encoding="utf-8")
        print(f"Downloaded {len(originals)} authenticated originals; signed URLs were not saved")
    selected = {}
    for source in sources:
        if source["status"] != 200 or not any(license["text"] == "Creative Commons 0"
                                             for license in source["license"]):
            raise ValueError(f"CC0 verification missing: {source['key']}")
        preview = incoming / f"{source['key']}.mp3"
        original = next(incoming.glob(f"{source['key']}.original.*"), None)
        if original:
            selected[source["key"]] = original
            continue
        if args.download and not preview.exists():
            request = urllib.request.Request(source["preview"], headers={"User-Agent": "AssetImport/1.0"})
            with urllib.request.urlopen(request, timeout=30) as response:
                preview.write_bytes(response.read())
        if not preview.exists():
            raise FileNotFoundError(f"Run --download or supply verified preview: {source['key']}")
        selected[source["key"]] = preview
    if args.inspect:
        print(json.dumps({key: inspect(selected[key]) for key in by_key}, indent=2))
        return
    clips = json.loads((HERE / "audio-clips.json").read_text(encoding="utf-8"))["clips"]
    report = []
    for clip in clips:
        source = selected[clip["source"]]
        destination = ROOT / clip["output"]
        destination.parent.mkdir(parents=True, exist_ok=True)
        duration = clip["duration"]
        tempo = clip.get("tempo", 1)
        tempo_filters = ""
        remaining = tempo
        while remaining > 2:
            tempo_filters += "atempo=2,"
            remaining /= 2
        if remaining != 1:
            tempo_filters += f"atempo={remaining},"
        fade_out = max(0, duration / tempo - .03)
        framing = (f"atrim=start={clip['start']}:duration={duration},asetpts=PTS-STARTPTS,"
                   "aformat=channel_layouts=mono," + tempo_filters)
        framed = read_samples(source, filters=framing.rstrip(","))
        peak = max(abs(sample) for sample in framed)
        rms = math.sqrt(sum(sample * sample for sample in framed) / len(framed))
        # Short/transient clips cannot be normalized reliably by integrated-LUFS gating.
        # Keep their dynamics and raise audible events without exceeding the peak ceiling.
        gain_db = min(-3 - 20 * math.log10(peak), -23 - 20 * math.log10(rms))
        filters = (framing + f"volume={gain_db}dB,"
                   f"afade=t=in:d=0.005,afade=t=out:st={fade_out}:d=0.03")
        command("ffmpeg", "-y", "-v", "error", "-i", str(source), "-af", filters,
                "-ac", "1", "-ar", "44100", "-c:a", "libvorbis", "-q:a", "4", str(destination))
        info = json.loads(command("ffprobe", "-v", "error", "-show_entries",
                                  "stream=codec_name,channels,sample_rate:format=duration,size",
                                  "-of", "json", str(destination)))
        samples = read_samples(destination)
        peak = max(abs(sample) for sample in samples)
        rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples))
        if info["streams"][0]["codec_name"] != "vorbis" or not peak or rms < .0001:
            raise ValueError(f"Invalid or silent output: {clip['output']}")
        if peak >= 1:
            raise ValueError(f"Clipped audio: {clip['output']}")
        expected_duration = duration / tempo
        if abs(float(info["format"]["duration"]) - expected_duration) > .05:
            raise ValueError(f"Unexpected duration: {clip['output']}")
        report.append({"file": clip["output"], "source": by_key[clip["source"]]["page"],
                       "sourceKind": "authenticated original" if ".original." in source.name else "HQ preview",
                       "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                       "outputSha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
                       "duration": float(info["format"]["duration"]),
                       "bytes": destination.stat().st_size, "peakDb": round(20 * math.log10(peak), 1),
                       "rmsDb": round(20 * math.log10(rms), 1), "codec": info["streams"][0]})
    (HERE / "audio-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
