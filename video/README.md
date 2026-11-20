# RISE film (1 min motion piece for the pitch)

| File | What you edit there |
|---|---|
| `script.js` | What the voice says, scene lengths, sound effects, music styles (JSON) |
| `scenes.js` | What each scene shows and how it moves (one `SCENE` per id) |
| `film.html` | Engine + motion library (rarely) |
| `shots/` | Real RISE screenshots (`capture.mjs` retakes them from a running RISE) |

Rule: every number and screen is real (benchmark/STATS.md, shots/). Paul is fictional and the film says so.

```bash
python video/audio.py                                        # voice + SFX + music (ElevenLabs, cached) -> build/mix.wav, build/timing.js
start video/film.html                                        # preview with sound: space, arrows, click the bar, ?t=30
node --experimental-websocket video/render.mjs 480           # fast draft  -> build/rise-film-480p.mp4
node --experimental-websocket video/render.mjs 1080          # final       -> build/rise-film-1080p.mp4
node --experimental-websocket video/stills.mjs 12 30.5       # single frames to check
```
Needs `ELEVENLABS_API_KEY` in `.env`, ffmpeg, Node 20, Chrome. Editing one voice line only regenerates that line (and the music if timings move).
