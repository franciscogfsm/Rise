/* Parte A · 3 · Como funciona: a pipeline do RISE, do repositório à resposta (sequência real, daí os números). */
RISE.slide({
  id: "how",
  title: "How it works",
  time: "0:40 – 1:15",
  notes: `
"You give RISE three things: a repository, your goal, and the clouds: where you are and where you want to go. Up to four targets to compare."
(acompanhar a linha)
"It downloads the repo into memory. The code is never executed."
"A deterministic scan finds every S3 call, with file and line. No AI there."
"The AI reads only that evidence and writes a test plan, in a strict JSON schema that we validate."
"Thirteen kinds of real tests run on both clouds at the same time. A test passes only if the SHA-256 of the real bytes matches."
"If something fails, the AI may propose one change, from an allow-list. We apply it and retest everything."
"And the answer is decided by code, never by the AI. Ready, ready with one change, or not ready. With a downloadable proof."`,

  STEPS: [
    ["Fetch", "Repo in memory. Its code never runs.",
      `<path d="M24 8v22m-9-9 9 9 9-9"/><path d="M9 34v6h30v-6"/>`],
    ["Scan", "Every S3 call, with file:line. No AI.",
      `<circle cx="21" cy="21" r="12"/><path d="M30 30l10 10"/>`],
    ["AI plan", "Evidence in. Validated test plan out.",
      `<path d="M18 13h20M18 24h20M18 35h14"/><path d="M8 12l2.5 2.5L15 10M8 23l2.5 2.5L15 21M8 34l2.5 2.5L15 32"/>`],
    ["Test", "13 real tests, both clouds, SHA-256.",
      `<path d="M24 5l16 6v11c0 10-7 18-16 21C15 40 8 32 8 22V11z"/><path d="M17 24l5 5 9-10"/>`],
    ["Adapt", "One allow-listed fix. Retest all.",
      `<path d="M29 9a10 10 0 0 0-9.5 13.2L8 33.7 14.3 40l11.5-11.5A10 10 0 0 0 39 19l-6 6-6-1-1-6z"/>`],
    ["Answer", "Decided by code. Proof attached.",
      `<circle cx="24" cy="24" r="17"/><path d="M16 24.5l5.5 5.5L32 19"/>`],
  ],

  html: `
    <div class="how">
      <div class="head">
        <h2 class="title split"><span class="soft">Three questions in.</span> One answer out.</h2>
        <p class="ask rv" style="--i:2"><span>Which repo?</span><span>What's the goal?</span><span>From which cloud to which?</span></p>
      </div>
      <div class="track">
        <svg class="rail" viewBox="0 0 1680 20" preserveAspectRatio="none" aria-hidden="true">
          <path class="draw" style="--i:2" d="M60 10H1530" stroke-width="3"/>
        </svg>
        <ol class="steps"></ol>
      </div>
    </div>`,

  css: `
    .how { height: 100%; display: grid; grid-template-rows: auto 1fr; }
    .head { display: grid; gap: 28px; }
    .title { max-width: 20ch; }
    .ask { display: flex; flex-wrap: wrap; gap: 12px; }
    .ask span { font-size: var(--t1); font-weight: 500; padding: 10px 18px; border-radius: 999px; background: rgba(255,255,255,.75); box-shadow: inset 0 0 0 1px var(--line); }
    .track { position: relative; margin-top: 80px; }
    .rail { position: absolute; left: 0; right: 0; top: 50px; width: 100%; height: 20px; overflow: visible; }
    .rail path { stroke: rgba(18,31,53,.18); fill: none; }
    .steps { list-style: none; display: grid; grid-template-columns: repeat(6, 1fr); gap: 28px; }
    .step { display: grid; gap: 12px; justify-items: start; align-content: start; }
    .ico { width: 120px; height: 120px; display: grid; place-items: center; --radius: 32px; color: var(--accent); }
    .ico svg { width: 54px; height: 54px; stroke: currentColor; }
    .step:last-child .ico { color: var(--ok); }
    .n { margin-top: 14px; font: 500 20px/1 var(--f-mono); color: var(--faint-ink); }
    .step h3 { font-size: 40px; font-weight: 600; letter-spacing: -.03em; }
    .step p { font-size: var(--t1); line-height: 1.35; color: var(--muted); max-width: 13ch; }

    /* ── Motion: uma só sequência. A linha desenha-se e cada passo acende quando ela lhe chega. ──
       --k é a posição do passo (0–5); --t0 é quando a linha começa; --dt o tempo entre passos. */
    --t0: 500ms; --dt: 300ms;
    .ask span { display: inline-block; opacity: 0; translate: 0 12px; transition: opacity .5s var(--e-out), translate .7s var(--e-out); }
    &.cur .ask span { opacity: 1; translate: 0 0; }
    &.cur .ask span:nth-child(1) { transition-delay: 260ms; }
    &.cur .ask span:nth-child(2) { transition-delay: 380ms; }
    &.cur .ask span:nth-child(3) { transition-delay: 500ms; }
    &.cur .rail path { transition-duration: calc(var(--dt) * 5 + 300ms); transition-timing-function: cubic-bezier(.45, 0, .25, 1); transition-delay: var(--t0); }
    &.cur .step.rv { transition-delay: calc(var(--t0) + var(--k) * var(--dt)); }
    .ico { transform: scale(.6); transition: transform .8s var(--e-spring), box-shadow .6s var(--e-out); }
    &.cur .ico { transform: none; transition-delay: calc(var(--t0) + 120ms + var(--k) * var(--dt)); }
    &.cur .ico .draw { transition-duration: .8s; transition-delay: calc(var(--t0) + 220ms + var(--k) * var(--dt)); }
    /* a resposta acende a mint no fim, com um único pulso */
    &.cur .step:last-child .ico { box-shadow: inset 0 1px 0 #fff, inset 0 0 0 3px var(--ok), var(--shadow); transition-delay: calc(var(--t0) + 6 * var(--dt) + 300ms); }
    .pulse { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; }
    &.cur .step:last-child .pulse { animation: how-pulse 1.1s var(--e-out) calc(var(--t0) + 6 * var(--dt) + 300ms) 1 both; }`,

  globalCss: `
    @keyframes how-pulse { 0% { opacity: .9; box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 55%, transparent); } 100% { opacity: 0; box-shadow: 0 0 0 26px color-mix(in srgb, var(--ok) 0%, transparent); } }
    html.still .slide[data-slide="how"] .pulse { animation: none !important; }`,

  init(el) {
    el.querySelector(".steps").innerHTML = this.STEPS.map(([verb, line, icon], i) => `
      <li class="step rv" style="--k:${i}">
        <div class="ico glass"><svg viewBox="0 0 48 48" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${icon}</svg><span class="pulse" aria-hidden="true"></span></div>
        <span class="n">0${i + 1}</span>
        <h3>${verb}</h3>
        <p>${line}</p>
      </li>`).join("");
    // os traços dos ícones desenham-se (FX.draw mede o comprimento)
    el.querySelectorAll(".ico svg > *").forEach(p => p.classList.add("draw"));
    FX.prep(el);
  },
  enter() { FX.act("solution"); },
});
