/* Como funciona: do repositório ao veredicto. Cada passo diz quem o faz (código ou IA),
   porque a mensagem é essa: a IA sugere, o código decide. */
RISE.slide({
  id: "how",
  title: "How it works",
  time: "1:00 – 1:30",
  notes: `
"RISE answers one question first: can this codebase move? Before anyone migrates anything, before a provider like Leaseweb spends weeks on a client."
"Paste the repo, pick the target. RISE reads every dependency, tests the calls that matter, and says: ready, ready with one change, or not ready."
"The client knows in seconds if its stack can move. The provider doesn't lose weeks on one that can't."

"Give RISE a repo and a target cloud. The local scanner finds S3 calls and points to the file and line. The AI builds a test plan from that evidence. RISE validates the plan and runs it against both clouds. If a test fails, RISE can try one allowed change and run it again. The test results decide the verdict."
(apontar para a frase de baixo) "AI suggests. Code decides."`,

  STEPS: [
    ["Fetch", "in memory", "code",
      `<path d="M24 8v22m-9-9 9 9 9-9"/><path d="M9 34v6h30v-6"/>`],
    ["Scan", "file:line", "code",
      `<circle cx="21" cy="21" r="12"/><path d="M30 30l10 10"/>`],
    ["Plan", "JSON schema", "ai",
      `<path d="M18 13h20M18 24h20M18 35h14"/><path d="M8 12l2.5 2.5L15 10M8 23l2.5 2.5L15 21M8 34l2.5 2.5L15 32"/>`],
    ["Test", "SHA-256", "code",
      `<path d="M24 5l16 6v11c0 10-7 18-16 21C15 40 8 32 8 22V11z"/><path d="M17 24l5 5 9-10"/>`],
    ["Adapt", "allow-list", "ai",
      `<path d="M29 9a10 10 0 0 0-9.5 13.2L8 33.7 14.3 40l11.5-11.5A10 10 0 0 0 39 19l-6 6-6-1-1-6z"/>`],
  ],

  html: `
    <div class="how">
      <h2 class="title split">Can this codebase move? <span class="soft">Know before anyone starts.</span></h2>
      <div class="input glass rv" style="--i:2">
        <span class="field"><span class="lbl">repo</span><span class="val mono type">github.com/acme/shop</span></span>
        <span class="sep"></span>
        <span class="field"><span class="lbl">to</span><span class="val">Leaseweb</span></span>
        <span class="go">Run</span>
      </div>
      <div class="track">
        <div class="line"><div class="rail" aria-hidden="true"><i class="packet"></i></div><ol class="steps"></ol></div>
        <div class="verdict">
          <div class="outs">
            <span class="out ok"><span class="dot"></span>Ready</span>
            <span class="out warn"><span class="dot"></span>Ready with 1 change</span>
            <span class="out bad"><span class="dot"></span>Not ready</span>
          </div>
        </div>
      </div>
      <div class="value rv" style="--i:12">
        <div><span class="k">The client</span><b>Knows in seconds if its stack can move.</b></div>
        <div><span class="k">The provider</span><b>No weeks lost on a stack that can't.</b></div>
      </div>
    </div>`,

  css: `
    .how { height: 100%; display: grid; grid-template-rows: auto auto 1fr auto; gap: 56px; }
    .title { max-width: none; white-space: nowrap; }

    /* barra de entrada: as três perguntas como um formulário */
    .input { --radius: 999px; display: flex; align-items: center; gap: 24px; padding: 14px 14px 14px 36px; width: fit-content; }
    .field { display: flex; align-items: baseline; gap: 14px; }
    .lbl { font: 500 20px/1 var(--f-mono); color: var(--faint-ink); }
    .val { font-size: 28px; font-weight: 500; color: var(--ink); }
    .val.mono { font: 500 26px/1 var(--f-mono); }
    .sep { width: 1px; height: 34px; background: var(--line); }
    .go { margin-left: 12px; font-size: 26px; font-weight: 600; color: #fff; padding: 16px 34px; border-radius: 999px;
      background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 86%, #fff), var(--accent));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 10px 24px -10px color-mix(in srgb, var(--accent) 80%, transparent); }

    /* pipeline: 5 passos + veredicto mais largo */
    .track { position: relative; display: grid; grid-template-columns: 5fr 1.6fr; gap: 40px; align-items: center; }
    .steps { list-style: none; display: grid; grid-template-columns: repeat(5, 1fr); gap: 22px; }
    .line { position: relative; }
    .rail { position: absolute; left: 10%; right: -40px; top: 50px; height: 4px; border-radius: 4px; z-index: -1;
      background: linear-gradient(90deg, rgba(18,31,53,.16), color-mix(in srgb, var(--ok) 60%, transparent)); }
    .packet { position: absolute; top: 50%; left: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; opacity: 0;
      background: var(--accent); box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 22%, transparent), 0 0 30px 6px color-mix(in srgb, var(--accent) 55%, transparent); }

    .step { display: grid; justify-items: center; align-content: start; gap: 26px; text-align: center; }
    .ico { width: 104px; height: 104px; display: grid; place-items: center; border-radius: 28px; color: var(--accent);
      background: #fff; box-shadow: inset 0 0 0 1px var(--line), 0 10px 26px -14px rgba(26,41,63,.35); }
    .ico svg { width: 48px; height: 48px; stroke: currentColor; }
    .step.ai .ico { color: #fff; background: linear-gradient(140deg, color-mix(in srgb, var(--accent) 70%, #fff), var(--accent)); box-shadow: 0 14px 30px -12px color-mix(in srgb, var(--accent) 75%, transparent); }
    .step h3 { font-size: 40px; line-height: 1; font-weight: 600; letter-spacing: -.03em; }

    .verdict { display: grid; }
    .outs { display: grid; gap: 12px; align-content: center; }
    .out { display: flex; align-items: center; gap: 12px; white-space: nowrap; font-size: 28px; font-weight: 600; letter-spacing: -.01em; padding: 16px 20px; border-radius: 18px; }
    .out .dot { width: 14px; height: 14px; }
    .out.ok { color: var(--ok); background: var(--ok-bg); }
    .out.warn { color: var(--warn); background: var(--warn-bg); }
    .out.bad { color: var(--bad); background: var(--bad-bg); }

    .value { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
    .value > div { display: grid; gap: 10px; padding: 26px 32px; border-radius: 26px; background: rgba(255,255,255,.7); box-shadow: inset 0 0 0 1px var(--line); }
    .value .k { font: 600 21px/1 var(--f-mono); color: var(--accent); }
    .value b { font-size: 40px; line-height: 1.12; font-weight: 650; letter-spacing: -.03em; }

    /* ── Motion: uma sequência. O ponto percorre a linha e cada passo acende quando ele lhe chega. ── */
    --t0: 1700ms; --dt: 260ms;
    .type { display: inline-block; overflow: hidden; white-space: nowrap; width: 0; border-right: 3px solid var(--accent); padding-right: 2px; }
    &.cur .type { animation: how-type .9s steps(20) .35s both, how-caret .5s step-end 1.25s 2 both; }
    &.cur .go { animation: how-press .45s var(--e-out) 1.35s both; }
    .step, .verdict { opacity: 0; transform: translate3d(0, 34px, 0) scale(.96); filter: blur(6px);
      transition: opacity .6s var(--e-out), transform .9s var(--e-out), filter .6s var(--e-out); }
    &.cur .step, &.cur .verdict { opacity: 1; transform: none; filter: none; transition-delay: calc(var(--t0) + var(--k) * var(--dt)); }
    .verdict { --k: 5; }
    .ico { transform: scale(.5) rotate(-8deg); transition: transform .9s var(--e-spring); }
    &.cur .ico { transform: none; transition-delay: calc(var(--t0) + 120ms + var(--k) * var(--dt)); }
    &.cur .ico .draw { transition-duration: .8s; transition-delay: calc(var(--t0) + 220ms + var(--k) * var(--dt)); }
    .out { opacity: 0; transform: translate3d(-18px, 0, 0); transition: opacity .5s var(--e-out), transform .7s var(--e-out); }
    &.cur .out { opacity: 1; transform: none; }
    &.cur .out:nth-child(1) { transition-delay: calc(var(--t0) + 6 * var(--dt) + 80ms); }
    &.cur .out:nth-child(2) { transition-delay: calc(var(--t0) + 6 * var(--dt) + 200ms); }
    &.cur .out:nth-child(3) { transition-delay: calc(var(--t0) + 6 * var(--dt) + 320ms); }
    &.cur .packet { animation: how-packet calc(var(--dt) * 6) cubic-bezier(.45, 0, .25, 1) var(--t0) 1 both; }
    &.cur .verdict { animation: how-glow 1.4s var(--e-out) calc(var(--t0) + 6 * var(--dt)) 1 both; }`,

  globalCss: `
    @keyframes how-packet { 0% { left: 0; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
    @keyframes how-type { from { width: 0; } to { width: 20.4ch; } }
    @keyframes how-caret { 50% { border-color: transparent; } 100% { border-color: transparent; } }
    @keyframes how-press { 0% { transform: none; } 40% { transform: scale(.9); filter: brightness(1.15); } 100% { transform: none; } }
    html.still .slide[data-slide="how"] .type { width: 20.4ch; animation: none !important; border-color: transparent; }
    @keyframes how-glow { 0% { scale: 1; } 30% { scale: 1.035; } 100% { scale: 1; } }
    html.still .slide[data-slide="how"] .packet, html.still .slide[data-slide="how"] .verdict { animation: none !important; }`,

  init(el) {
    el.querySelector(".steps").innerHTML = this.STEPS.map(([verb, line, who, icon], i) => `
      <li class="step ${who}" style="--k:${i}">
        <div class="ico"><svg viewBox="0 0 48 48" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div>
        <h3>${verb}</h3>
      </li>`).join("");
    el.querySelectorAll(".ico svg > *").forEach(p => p.classList.add("draw"));
    FX.prep(el);
  },
  enter() { FX.act("solution"); },
});
