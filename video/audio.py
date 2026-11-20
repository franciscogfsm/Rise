"""RISE film · sound. Reads script.js, makes voice / sound effects / music with ElevenLabs, times the scenes to the
voice and mixes everything into build/mix.wav. Everything is cached by content: edit one line, only that line is redone.

    python video/audio.py            (needs ELEVENLABS_API_KEY in .env or the environment; ffmpeg on PATH)

Outputs build/timing.js (scene start/length, read by film.html) and build/mix.wav.
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

V = Path(__file__).resolve().parent
B = V / "build"
API = "https://api.elevenlabs.io/v1"


def key() -> str:
    k = os.environ.get("ELEVENLABS_API_KEY")
    env = V.parent / ".env"
    if not k and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("ELEVENLABS_API_KEY="):
                k = line.split("=", 1)[1].strip().strip('"')
    if not k:
        sys.exit("ELEVENLABS_API_KEY missing")
    return k


def script() -> dict:
    t = (V / "script.js").read_text(encoding="utf-8")
    body = t.split("\nwindow.SCRIPT =", 1)[1].strip().rstrip(";")
    return json.loads(body)


def h(*parts) -> str:
    return hashlib.sha256(json.dumps(parts, sort_keys=True).encode()).hexdigest()[:12]


def post(path: str, body: dict, out: Path) -> Path:
    if out.exists() and out.stat().st_size > 0:
        return out
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{path}: {e.code} {e.read()[:300]!r}") from None
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    return out


def dur(p: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def voice(s: dict, sc: dict):
    if not sc["vo"]:
        return None
    v = s["voice"]
    body = {"text": sc["vo"], "model_id": v["model"], "voice_settings": v["settings"]}
    return post(f"/text-to-speech/{v['id']}?output_format=mp3_44100_192", body, B / "vo" / f"{sc['id']}-{h(body, v['id'])}.mp3")


def sfx(name: str, d: dict) -> Path:
    body = {"text": d["prompt"], "duration_seconds": d["dur"], "prompt_influence": 0.6}
    return post("/sound-generation", body, B / "sfx" / f"{name}-{h(body)}.mp3")


def music(s: dict, timing: dict, total: float) -> Path | None:
    starts = {k: v["start"] for k, v in timing.items()}
    secs, t0 = [], 0.0
    for a in s["music"]["acts"]:
        end = starts.get(a["until"], total) if a["until"] else total
        secs.append({"section_name": a["until"] or "finale", "positive_local_styles": a["styles"], "negative_local_styles": ["vocals"],
                     "duration_ms": int(round((end - t0) * 1000)), "lines": []})
        t0 = end
    for i in range(len(secs) - 1, 0, -1):  # the API wants sections of at least 3 s: fold short ones into the previous
        if secs[i]["duration_ms"] < 3000:
            secs[i - 1]["duration_ms"] += secs.pop(i)["duration_ms"]
    plan = {"positive_global_styles": s["music"]["global"], "negative_global_styles": ["vocals", "lo-fi"], "sections": secs}
    try:
        return post("/music?output_format=mp3_44100_192", {"composition_plan": plan, "model_id": "music_v1"}, B / f"music-{h(plan)}.mp3")
    except RuntimeError as e:
        print("music plan refused, trying a single prompt:", e)
        prompt = ", ".join(s["music"]["global"]) + f". {int(total)} seconds. Starts dark and tense, huge drop at "\
                 f"{starts['rise']:.0f}s, triumphant climax, final hit at {starts['proved']:.0f}s then reverb tail."
        try:
            return post("/music?output_format=mp3_44100_192", {"prompt": prompt, "music_length_ms": int(total * 1000)}, B / f"music-{h(prompt)}.mp3")
        except RuntimeError as e2:
            print("NO MUSIC (mixing without it):", e2)
            return None


def main():
    s = script()
    with ThreadPoolExecutor(8) as pool:
        vo = list(pool.map(lambda sc: voice(s, sc), s["scenes"]))
        fx_jobs = {n: pool.submit(sfx, n, d) for n, d in s["sfx"].items()}
        timing, t = {}, 0.0
        for sc, p in zip(s["scenes"], vo):
            vd = dur(p) if p else 0.0
            d = max(sc["min"], sc["voAt"] + vd + 0.25)
            timing[sc["id"]] = {"start": round(t, 3), "dur": round(d, 3), "voAt": sc["voAt"], "voDur": round(vd, 3)}
            t += d
        total = round(t + 0.6, 3)
        (B / "timing.js").write_text("window.TIMING = " + json.dumps({"total": total, "scenes": timing}, indent=1) + ";\n", encoding="utf-8")
        print(f"timing: {total:.1f}s total", {k: v["dur"] for k, v in timing.items()})
        mus = music(s, timing, total)
        fx = {n: j.result() for n, j in fx_jobs.items()}

    # mix: voice on top, sound effects, music ducked under the voice
    ins, vo_f, fx_f = [], [], []
    for sc, p in zip(s["scenes"], vo):
        if p:
            ms = int((timing[sc["id"]]["start"] + sc["voAt"]) * 1000)
            vo_f.append(f"[{len(ins)}:a]aresample=48000,adelay={ms}|{ms},volume=1.6[v{len(vo_f)}]")
            ins.append(p)
        for e in sc.get("sfx", []):
            tm = timing[sc["id"]]
            at = tm["start"] + (e["t"] if e["t"] >= 0 else tm["dur"] + e["t"])
            ms = max(0, int(at * 1000))
            fx_f.append(f"[{len(ins)}:a]aresample=48000,adelay={ms}|{ms},volume={e.get('v', 0.7) * 0.8}[f{len(fx_f)}]")
            ins.append(fx[e["s"]])
    f = vo_f + fx_f
    f.append("".join(f"[v{i}]" for i in range(len(vo_f))) + f"amix=inputs={len(vo_f)}:normalize=0,asplit=2[vo][key]")
    f.append("".join(f"[f{i}]" for i in range(len(fx_f))) + f"amix=inputs={len(fx_f)}:normalize=0[fx]")
    outs = "[vo][fx]"
    if mus:
        f.append(f"[{len(ins)}:a]aresample=48000,volume=0.7,afade=t=out:st={total - 1.2}:d=1.2[m0]")
        f.append("[m0][key]sidechaincompress=threshold=0.04:ratio=6:attack=15:release=350[mus]")
        ins.append(mus)
        outs += "[mus]"
    else:
        f.append("[key]anullsink")
    f.append(f"{outs}amix=inputs={3 if mus else 2}:normalize=0,alimiter=limit=0.95,loudnorm=I=-14:TP=-1.2:LRA=11,"
             f"atrim=0:{total},apad=whole_dur={total}[out]")
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for p in ins:
        cmd += ["-i", str(p)]
    cmd += ["-filter_complex", ";".join(f), "-map", "[out]", "-ar", "48000", str(B / "mix.wav")]
    subprocess.run(cmd, check=True)
    print("mix:", B / "mix.wav", "music" if mus else "NO MUSIC")


KEY = key()
if __name__ == "__main__":
    main()
