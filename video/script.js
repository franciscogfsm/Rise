/*
  RISE film · THE SCRIPT. Edit this file to change what is said and heard.
  Visuals for each scene live in scenes.js under the same id.
  Format: strict JSON after "window.SCRIPT =" (audio.py reads it too: no comments inside the braces).

  scenes[]: id, act (background mood, same as the pitch: problem | solution | proof), vo (what the voice says; "" = silent),
            min (shortest scene length, s), voAt (when the voice starts inside the scene, s),
            sfx [{ t: seconds into the scene (negative = from the end), s: sound name, v: volume 0-1 }]
  sfx{}:    sound name -> ElevenLabs sound-effect prompt + length
  music:    one prompt per act; the act lengths follow the scenes automatically
  Rule: every number on screen comes from benchmark/STATS.md, WHAT_RISE_DOES.md or a real RISE screen in shots/.
*/
window.SCRIPT = {
  "voice": { "id": "pFZP5JQG7iQjIQuC4Bku", "name": "Lily", "model": "eleven_v4",
             "settings": { "stability": 0.5, "similarity_boost": 0.8, "style": 0.45, "use_speaker_boost": true, "speed": 1.15 } },
  "fps": 30,
  "scenes": [
    { "id": "paul",    "act": "problem",  "min": 2.8, "voAt": 0.8, "vo": "Meet Paul.",
      "sfx": [{ "t": 0.0, "s": "drone", "v": 0.5 }, { "t": 0.75, "s": "boom", "v": 0.8 }] },
    { "id": "want",    "act": "problem",  "min": 3.2, "voAt": 0.2, "vo": "He wants to move his app to a new cloud.",
      "sfx": [{ "t": 0.1, "s": "whoosh", "v": 0.6 }, { "t": 1.4, "s": "data", "v": 0.35 }] },
    { "id": "fear",    "act": "problem",  "min": 5.2, "voAt": 0.2, "vo": "But his code calls storage everywhere. Miss one call, and production breaks.",
      "sfx": [{ "t": 0.0, "s": "type", "v": 0.4 }, { "t": 0.4, "s": "riser", "v": 0.6 }, { "t": -1.25, "s": "slam", "v": 0.95 }, { "t": -1.2, "s": "error", "v": 0.8 }] },
    { "id": "stuck",   "act": "problem",  "min": 3.0, "voAt": 0.15, "vo": "So the migration waits.",
      "sfx": [{ "t": 0.0, "s": "tick", "v": 0.7 }, { "t": -0.9, "s": "suck", "v": 0.9 }] },
    { "id": "rise",    "act": "solution", "min": 2.6, "voAt": 0.35, "vo": "Until RISE.",
      "sfx": [{ "t": 0.0, "s": "hit", "v": 1.0 }, { "t": 0.0, "s": "boom", "v": 0.8 }] },
    { "id": "box",     "act": "solution", "min": 4.0, "voAt": 0.2, "vo": "Paste a repo. Say where you want to go.",
      "sfx": [{ "t": 0.3, "s": "type", "v": 0.55 }, { "t": -0.7, "s": "click", "v": 0.9 }, { "t": -0.55, "s": "whoosh", "v": 0.6 }] },
    { "id": "scan",    "act": "solution", "min": 4.8, "voAt": 0.1, "vo": "RISE finds every storage call, and proves each one with a real test.",
      "sfx": [{ "t": 0.0, "s": "data", "v": 0.5 }, { "t": 1.6, "s": "pop", "v": 0.6 }, { "t": 2.6, "s": "pop", "v": 0.6 }, { "t": 3.6, "s": "success", "v": 0.7 }] },
    { "id": "fast",    "act": "solution", "min": 5.6, "voAt": 0.15, "vo": "Its engine reads code hundreds of times faster than Claude. With zero AI tokens.",
      "sfx": [{ "t": 0.0, "s": "whoosh", "v": 0.6 }, { "t": 1.0, "s": "slam", "v": 1.0 }, { "t": 1.25, "s": "success", "v": 0.6 }, { "t": 0.2, "s": "data", "v": 0.35 }] },
    { "id": "mcp",     "act": "solution", "min": 5.4, "voAt": 0.15, "vo": "So Claude doesn't have to read your whole repo. It just asks RISE.",
      "sfx": [{ "t": 0.3, "s": "type", "v": 0.55 }, { "t": 1.9, "s": "pop", "v": 0.6 }, { "t": 2.7, "s": "success", "v": 0.75 }] },
    { "id": "replay",  "act": "proof",    "min": 6.2, "voAt": 0.15, "vo": "Replay runs your app's real calls on the new cloud. Call seven breaks. RISE shows why.",
      "sfx": [{ "t": 0.0, "s": "whoosh", "v": 0.6 }, { "t": 0.5, "s": "data", "v": 0.5 }, { "t": 2.95, "s": "error", "v": 0.9 }, { "t": 2.95, "s": "boom", "v": 0.6 }] },
    { "id": "fix",     "act": "proof",    "min": 5.0, "voAt": 0.1, "vo": "It fixes the region, checks every byte, and switches live traffic.",
      "sfx": [{ "t": 0.3, "s": "pop", "v": 0.6 }, { "t": 1.4, "s": "type", "v": 0.4 }, { "t": 2.4, "s": "success", "v": 0.7 }, { "t": 3.4, "s": "whoosh", "v": 0.7 }] },
    { "id": "cut",     "act": "proof",    "min": 4.0, "voAt": 0.15, "vo": "Then it cuts the old cloud. Zero failed requests.",
      "sfx": [{ "t": 0.5, "s": "cut", "v": 1.0 }, { "t": 2.0, "s": "slam", "v": 0.9 }] },
    { "id": "hope",    "act": "solution", "min": 2.8, "voAt": 0.3, "vo": "Paul didn't hope his migration would work.",
      "sfx": [{ "t": 0.0, "s": "suck", "v": 0.7 }] },
    { "id": "proved",  "act": "proof",    "min": 2.4, "voAt": 0.1, "vo": "He proved it.",
      "sfx": [{ "t": 0.0, "s": "hit", "v": 1.0 }] },
    { "id": "end",     "act": "solution", "min": 4.6, "voAt": 0.6, "vo": "RISE. The proof of cloud freedom.",
      "sfx": [{ "t": 0.0, "s": "whoosh", "v": 0.5 }, { "t": 0.55, "s": "boom", "v": 0.9 }, { "t": 2.6, "s": "shimmer", "v": 0.6 }] }
  ],
  "sfx": {
    "drone":   { "dur": 3.0, "prompt": "dark low cinematic drone swelling, ominous sub bass, trailer opening" },
    "boom":    { "dur": 2.0, "prompt": "deep cinematic sub boom impact, huge low end, short reverb tail" },
    "hit":     { "dur": 3.0, "prompt": "massive epic trailer hit, orchestral and synth impact with long reverb tail, brutal and bright" },
    "slam":    { "dur": 1.2, "prompt": "punchy modern cinematic text slam impact, tight metallic hit with sub thump" },
    "whoosh":  { "dur": 0.9, "prompt": "fast clean airy whoosh transition, modern motion graphics swoosh" },
    "suck":    { "dur": 1.2, "prompt": "reverse cymbal suck-back swell rising into silence, tension" },
    "riser":   { "dur": 4.0, "prompt": "tense cinematic riser building anxiety, pitch rising digital noise" },
    "error":   { "dur": 0.8, "prompt": "short dissonant digital alert buzz, system failure alarm, modern UI" },
    "tick":    { "dur": 3.6, "prompt": "loud clock ticking, slow and tense, slightly reverberant" },
    "type":    { "dur": 2.0, "prompt": "fast clean mechanical keyboard typing, crisp" },
    "click":   { "dur": 0.5, "prompt": "satisfying soft UI button click, modern app" },
    "pop":     { "dur": 0.5, "prompt": "bright soft UI pop, bubbly interface element appearing" },
    "data":    { "dur": 2.5, "prompt": "futuristic digital data processing bleeps and chirps, fast scanning computer sounds, subtle" },
    "success": { "dur": 1.2, "prompt": "bright clean digital success chime, uplifting modern UI confirmation" },
    "cut":     { "dur": 1.5, "prompt": "heavy electrical power cut, big switch slam, power down whine" },
    "shimmer": { "dur": 2.5, "prompt": "magical bright shimmer sparkle tail, airy and uplifting, cinematic logo reveal" }
  },
  "music": {
    "global": ["modern cinematic tech trailer", "hybrid orchestral and synth", "punchy drums", "instrumental", "no vocals"],
    "acts": [
      { "until": "rise",   "styles": ["dark tense pulsing synth", "ticking", "anxious", "minimal", "building suspense"] },
      { "until": "replay", "styles": ["huge drop", "driving synth bass", "energetic hybrid percussion", "confident", "fast"] },
      { "until": "hope",   "styles": ["intense", "triumphant build", "epic drums", "rising strings"] },
      { "until": "proved", "styles": ["sudden near silence", "single soft piano note", "breath before the drop"] },
      { "until": "",       "styles": ["massive triumphant climax", "wide epic synths", "final big hit then reverb tail"] }
    ]
  }
};
