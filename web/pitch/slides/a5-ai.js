/* Parte A · 5 · Challenge: a IA escreve os testes, código determinístico corre-os. Plano real quando existe. */
RISE.slide({
  id: "ai",
  title: "AI test plan",
  time: "1:35 – 2:00",
  notes: `
"Then the AI does the part it's good at. It reads that traffic and writes a structured test plan for this specific app. We validate the plan before anything runs."
(lista) "These are the tests it wrote for this run."
(em baixo) "And this is what it never does. It never runs commands, never sees a credential, never decides that a test passed, and never moves your traffic. Deterministic code does all of that."
A etiqueta diz de onde veio o plano: Live AI, Cached AI ou Rules fallback. Se for cache, dizê-lo. Se aparecer "Example", não houve run: dizê-lo também.`,

  /* Exemplo para quando ainda não houve run. Fica marcado como "Example". */
  example: [
    ["Upload and download keep bytes and type", "put_get_roundtrip"],
    ["Custom metadata survives the trip", "head_metadata"],
    ["Listing by prefix returns the same keys", "list_prefix"],
    ["Presigned links work on the destination", "presigned_get"],
    ["Keys with accents still resolve", "unicode_key"],
  ],

  html: `
    <div class="plan">
      <div class="left">
        <p class="kicker rv">Challenge</p>
        <h2 class="title split">The AI writes the tests. Deterministic code runs them.</h2>
        <div class="count rv" style="--i:4"><b class="big-num act-c">–</b><span class="unit">tests in the plan</span></div>
        <span class="origin pill idle rv" style="--i:5">Example</span>
      </div>
      <ol class="list glass rv scale" style="--i:2"></ol>
      <div class="never rv" style="--i:7">
        <span class="lbl">The AI never</span>
        <ul><li>runs commands</li><li>sees credentials</li><li>decides that a test passed</li><li>switches your traffic</li></ul>
      </div>
    </div>`,

  css: `
    .plan { height: 100%; display: grid; grid-template-columns: 1fr 940px; grid-template-rows: 1fr auto; column-gap: 80px; row-gap: 36px; align-items: center; }
    .left { display: grid; gap: 30px; justify-items: start; }
    .title { max-width: 14ch; }
    .count { display: grid; gap: 10px; }
    .count .big-num { font-size: 160px; }
    .list { list-style: none; padding: 20px 0; min-height: 420px; display: grid; align-content: center; }
    .list li { display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 24px; padding: 24px 44px;
      opacity: 0; transform: translateX(-24px); transition: opacity .6s var(--e-out), transform .9s var(--e-out); }
    .list li + li { border-top: 1px solid var(--line); }
    .ix { font: 500 20px/1 var(--f-mono); color: var(--accent); }
    .t { font-size: var(--t2); font-weight: 500; letter-spacing: -.015em; }
    .k { font: 500 18px/1 var(--f-mono); color: var(--faint-ink); padding: 8px 12px; border-radius: 8px; background: var(--faint); }
    &.cur .list.go li { opacity: 1; transform: none; transition-delay: calc(450ms + var(--i) * 140ms); }
    .never { grid-column: 1 / -1; display: flex; align-items: baseline; gap: 28px; padding-top: 24px; border-top: 1px solid var(--line); }
    .never .lbl { font-size: var(--t2); font-weight: 600; white-space: nowrap; }
    .never ul { list-style: none; display: flex; flex-wrap: wrap; gap: 10px 36px; }
    .never li { position: relative; padding-left: 30px; font-size: var(--t2); color: var(--muted); }
    .never li::before { content: ""; position: absolute; left: 0; top: .68em; width: 18px; height: 3px; border-radius: 2px; background: rgba(18,31,53,.4); }`,

  init(el) { FX.prep(el); },

  async enter(el, api) {
    FX.act("solution");
    el.querySelector(".list").classList.remove("go");
    await this._render(el, api);
    this._off = api.live.onChange(() => this._render(el, api));
  },
  leave() { this._off?.(); },

  async _render(el, api) {
    let s = null; try { s = await api.live.state(); } catch { /* offline: fica o exemplo */ }
    const real = s?.plan?.tests?.length ? s.plan.tests.map(t => [t.title, t.kind]) : null;
    const tests = (real || this.example).slice(0, 6);
    const list = el.querySelector(".list");
    list.innerHTML = tests.map(([title, kind], i) => `
      <li style="--i:${i}"><span class="ix">${String(i + 1).padStart(2, "0")}</span>
        <span class="t">${api.esc(title)}</span><span class="k">${api.esc(kind)}</span></li>`).join("");
    el.querySelector(".count b").textContent = real ? real.length : "–";
    const mode = s?.plan?.source?.mode; // live | cached | rules (rise/ai.py)
    const [cls, txt] = !real ? ["idle", "Example"] : mode === "live" ? ["ok", "Live AI"]
      : mode === "cached" ? ["warn", "Cached AI"] : ["warn", "Rules fallback"];
    const origin = el.querySelector(".origin");
    origin.className = `origin pill ${cls} rv`;
    origin.textContent = txt;
    requestAnimationFrame(() => list.classList.add("go"));
  },
});
