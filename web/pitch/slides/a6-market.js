/* Parte A · 7 · O que já existe, como mapa 2×2.
   X = quanto lê do teu código. Y = quanto prova que a mudança funciona no destino.
   Posições são um juízo qualitativo e defensável (ver notas), não uma medição. */
RISE.slide({
  id: "market",
  title: "What exists",
  time: "2:00 – 2:15",
  notes: `
"What exists today? Two questions: does the tool read your code? And does it prove the move works?"
"Bottom right: code analyzers and AI assistants read your code, but they prove nothing."
"Top left: rclone, s3-tests and the hyperscalers' migration tools move or test the cloud, but never look at your app."
"Top right: empty. That is the gap. No tool reads your code and proves the move."
"Until now: RISE. It reads every call, and proves each one on the target."
If asked: AWS Migration Hub / Azure Migrate / Google Migration Center move you INTO their own cloud. rclone copies and can verify hashes. Ceph s3-tests test a provider, not your app. CAST Highlight / Konveyor (Red Hat MTA) flag cloud blockers with rules, no tests. AI assistants read code, cost tokens, no proof. Positions are our judgement, not a measurement.`,

  // [name, sub, x 0-100 (reads your code), y 0-100 (proves it works)]
  DOTS: [
    ["Ceph s3-tests", "provider test suite", 12, 72],
    ["Hyperscaler tools", "AWS · Azure · Google", 26, 56],
    ["rclone · MinIO mc", "copy the data", 9, 40],
    ["CAST · Konveyor", "code analyzers", 62, 26],
    ["AI assistants", "Claude · Codex", 78, 13],
  ],

  html: `
    <div class="mp">
      <div class="side">
        <h2 class="title split">Every tool does one piece.</h2>
        <p class="soft big rv" style="--i:2">Nobody reads your code <em>and</em> proves the move.</p>
        <div class="legend rv" style="--i:4"><span><i class="me"></i>RISE</span><span><i></i>What exists</span></div>
      </div>
      <div class="chart">
        <div class="grid">
          <div class="q tl"><span>Tests the cloud,<br>not your app</span></div>
          <div class="q tr"><span>Proven migration</span><b class="gap">The gap<small>no tool here before</small></b></div>
          <div class="q bl"><span>Moves blind</span></div>
          <div class="q br"><span>Reads code,<br>proves nothing</span></div>
          <div class="pts"></div>
        </div>
        <div class="ax y"><b>Proves it works on the target</b></div>
        <div class="ax x"><b>Reads your code</b></div>
      </div>
    </div>`,

  css: `
    .mp { height: 100%; display: grid; grid-template-columns: 640px 1fr; gap: 60px; align-items: center; }
    .side { display: grid; gap: 26px; align-content: center; }
    .big { font-size: 44px; line-height: 1.12; font-weight: 600; letter-spacing: -.03em; }
    .big em { font-style: normal; color: var(--accent); }
    .legend { display: flex; gap: 28px; margin-top: 10px; font-size: 24px; font-weight: 600; color: var(--muted); }
    .legend span { display: flex; align-items: center; gap: 12px; }
    .legend i { width: 22px; height: 22px; border-radius: 50%; background: #8b93a6; }
    .legend i.me { background: var(--accent); }

    .chart { position: relative; height: 840px; padding: 0 0 70px 70px; }
    .grid { position: relative; height: 100%; display: grid; grid-template: 1fr 1fr / 1fr 1fr; gap: 14px; }
    .q { position: relative; border-radius: 26px; background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px var(--line);
      background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px);
      background-size: 25% 25%; opacity: 0; transform: scale(.97); transition: opacity .6s var(--e-out), transform .8s var(--e-out); }
    .q.tr { background-color: color-mix(in srgb, var(--accent) 10%, white); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent); }
    &.cur .q { opacity: 1; transform: none; transition-delay: .3s; }
    .q span { position: absolute; font: 600 22px/1.2 var(--f-mono); color: var(--faint-ink); }
    .tl span, .tr span, .br span { top: 22px; } .bl span { bottom: 22px; }
    .tl span, .bl span { left: 24px; } .tr span, .br span { right: 24px; text-align: right; }
    .q.tr span { color: var(--accent); }
    /* the empty quadrant reads as a gap first; RISE lands in it last */
    .q.tr::after { content: ""; position: absolute; inset: 10px; border-radius: 20px; border: 3px dashed color-mix(in srgb, var(--accent) 55%, transparent); }
    .gap { position: absolute; left: 32px; bottom: 30px; display: grid; gap: 6px; font-size: 40px; font-weight: 700; letter-spacing: -.02em; color: var(--accent);
      opacity: 0; transform: translateY(10px); transition: opacity .5s var(--e-out), transform .6s var(--e-out); }
    .gap small { font: 500 20px/1.2 var(--f-mono); color: var(--faint-ink); letter-spacing: 0; }
    &.cur .gap { opacity: 1; transform: none; transition-delay: 1.9s; }

    .ax { position: absolute; display: flex; align-items: center; gap: 14px; font-size: 24px; color: var(--ink); }
    .ax b { font-weight: 650; white-space: nowrap; }
    .ax.x { left: 70px; right: 0; bottom: 0; height: 50px; justify-content: center; }
    .ax.y { top: 0; bottom: 70px; left: 0; width: 50px; justify-content: center; }
    .ax.y b { transform: rotate(-90deg); }
    .ax::before { content: ""; position: absolute; background: var(--ink); opacity: .55; }
    .ax.x::before { left: 0; right: 10px; top: 0; height: 3px; }
    .ax.y::before { top: 10px; bottom: 0; right: 10px; width: 3px; }
    .ax::after { content: ""; position: absolute; border: solid var(--ink); border-width: 3px 3px 0 0; width: 16px; height: 16px; opacity: .55; }
    .ax.x::after { right: 10px; top: -8px; transform: rotate(45deg); }
    .ax.y::after { top: 10px; right: 2px; transform: rotate(-45deg); }

    .pts { position: absolute; inset: 0; pointer-events: none; }
    .pt { position: absolute; left: var(--x); bottom: var(--y); transform: translate(-50%, 50%); display: grid; justify-items: center; gap: 8px; text-align: center; }
    .pt i { width: 46px; height: 46px; border-radius: 50%; background: #8b93a6; box-shadow: 0 10px 22px -10px rgba(18,31,53,.5);
      transform: scale(0); transition: transform .55s var(--e-spring); }
    .pt b { font-size: 22px; font-weight: 650; white-space: nowrap; }
    .pt small { font: 500 16px/1 var(--f-mono); color: var(--faint-ink); white-space: nowrap; }
    .pt b, .pt small { opacity: 0; transition: opacity .4s var(--e-out); }
    &.cur .pt i { transform: none; transition-delay: calc(.9s + var(--k) * 220ms); }
    &.cur .pt b, &.cur .pt small { opacity: 1; transition-delay: calc(1.05s + var(--k) * 220ms); }

    .pt.me i { width: 64px; height: 64px; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 55%, #fff), var(--accent));
      box-shadow: 0 0 0 8px color-mix(in srgb, var(--accent) 14%, transparent), 0 14px 30px -12px color-mix(in srgb, var(--accent) 60%, transparent); }
    .pt.me b { font-size: 26px; letter-spacing: .06em; color: var(--accent); }
    &.cur .pt.me i { transition-delay: 3.2s; animation: mp-pulse 2.4s ease-out 3.8s infinite; }
    &.cur .pt.me b, &.cur .pt.me small { transition-delay: 3.4s; }`,

  globalCss: `
    @keyframes mp-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 35%, transparent), 0 24px 50px -14px color-mix(in srgb, var(--accent) 80%, transparent); }
      70% { box-shadow: 0 0 0 18px transparent, 0 24px 50px -14px color-mix(in srgb, var(--accent) 80%, transparent); }
      100% { box-shadow: 0 0 0 0 transparent, 0 24px 50px -14px color-mix(in srgb, var(--accent) 80%, transparent); } }
    html.still .slide[data-slide="market"] .pt.me i { animation: none !important; }`,

  init(el) {
    el.querySelector(".pts").innerHTML = this.DOTS.map(([n, sub, x, y], k) =>
      `<div class="pt" style="--x:${x}%;--y:${y}%;--k:${k}"><i></i><b>${n}</b><small>${sub}</small></div>`).join("") +
      `<div class="pt me" style="--x:76%;--y:80%"><i></i><b>RISE</b><small>reads every call · proves each one</small></div>`;
    FX.prep(el);
  },
  enter() { FX.act("solution"); },
});
