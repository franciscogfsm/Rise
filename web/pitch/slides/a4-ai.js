/* Parte A · slide 4 · O que a IA faz e o que nunca faz. Mostra o plano real quando existe. */
RISE.slide({
  id: "ai",
  title: "AI",
  time: "1:30 – 2:00",
  notes: `
"The AI does real work here, and only the work it's good at."
(esquerda) "These are the storage calls RISE observed from the app. Real traffic, not a questionnaire."
(meio) "The AI turns them into a structured test plan. We validate it before anything runs."
(direita) "And here is what it never does. It doesn't run commands, it never sees a secret, and it never decides that a test passed. Deterministic code does that."
Se o plano vier da cache, a etiqueta diz "cached": dizê-lo. Se não houver run, aparece "Example": dizê-lo também.`,

  html: `
    <h2 class="title">The AI writes the tests. Deterministic code runs them.</h2>
    <div class="flow">
      <section class="calls">
        <h3>Calls observed in the app</h3>
        <ul class="ops"></ul>
      </section>
      <svg class="arrow" viewBox="0 0 80 24" aria-hidden="true"><path d="M2 12h70m-10-9 10 9-10 9"/></svg>
      <section class="plan glass">
        <header><h3>Test plan from the AI</h3><span class="origin pill idle">Example</span></header>
        <ol class="tests"></ol>
      </section>
      <svg class="arrow" viewBox="0 0 80 24" aria-hidden="true"><path d="M2 12h70m-10-9 10 9-10 9"/></svg>
      <section class="never">
        <h3>What the AI never does</h3>
        <ul>
          <li>Run shell commands</li>
          <li>See credentials</li>
          <li>Decide that a test passed</li>
          <li>Switch your traffic</li>
        </ul>
      </section>
    </div>`,

  css: `
    display: flex; flex-direction: column;
    .title { max-width: 24ch; }
    .flow { display: grid; grid-template-columns: 360px 64px 1fr 64px 360px; gap: 28px; align-items: center; margin-block: auto; }
    h3 { font-size: var(--t2); font-weight: 600; letter-spacing: -.01em; }
    .calls h3, .never h3 { margin-bottom: 26px; }
    .arrow { width: 64px; fill: none; stroke: rgba(18,31,53,.35); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .ops { list-style: none; display: grid; gap: 14px; }
    .ops li { display: flex; justify-content: space-between; gap: 16px; padding-left: 18px; border-left: 2px solid var(--line); font: 500 24px/1.25 var(--f-mono); }
    .ops small { font-size: 20px; color: var(--muted); }
    .plan { padding: 36px 40px 28px; }
    .plan header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 14px; }
    .tests { list-style: none; }
    .tests li { display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; padding: 14px 0; border-top: 1px solid var(--line); }
    .tests b { font-size: 26px; font-weight: 500; line-height: 1.3; }
    .tests code { grid-column: 1; font: 400 19px/1.3 var(--f-mono); color: var(--accent); }
    .never ul { list-style: none; display: grid; gap: 16px; }
    .never li { position: relative; padding-left: 40px; font-size: var(--t2); color: var(--ink); }
    .never li::before { content: ""; position: absolute; left: 0; top: .68em; width: 22px; height: 3px; border-radius: 2px; background: rgba(18,31,53,.4); }`,

  /* Exemplo para quando ainda não houve um run. Fica marcado como "Example". */
  example: {
    ops: { PutObject: 0, GetObject: 0, HeadObject: 0, ListObjectsV2: 0, GeneratePresignedUrl: 0, DeleteObject: 0 },
    tests: [
      ["Upload and download keep bytes and type", "put_get_roundtrip"],
      ["Custom metadata survives the trip", "head_metadata"],
      ["Listing by prefix returns the same keys", "list_prefix"],
      ["Presigned links work on the destination", "presigned_get"],
      ["Keys with accents still resolve", "unicode_key"],
    ],
  },

  init(el, api) { this._render(el, api, null); },

  async enter(el, api) {
    const refresh = async () => {
      try { this._render(el, api, await api.live.state()); } catch { /* offline: fica o exemplo */ }
    };
    await refresh();
    this._stop = api.live.onChange(refresh);
  },
  leave() { this._stop?.(); },

  _render(el, api, s) {
    const ops = s?.profile?.observed_calls ? s.profile.operations : null;
    const tests = s?.plan?.tests?.length ? s.plan.tests.map(t => [t.title, t.kind]) : null;
    const opsList = Object.entries(ops || this.example.ops).slice(0, 7);
    el.querySelector(".ops").innerHTML = opsList.map(([op, n]) =>
      `<li><span>${api.esc(op)}</span>${ops ? `<small>×${n}</small>` : ""}</li>`).join("");
    el.querySelector(".tests").innerHTML = (tests || this.example.tests).slice(0, 5).map(([title, kind]) =>
      `<li><b>${api.esc(title)}</b><code>${api.esc(kind)}</code></li>`).join("");
    const origin = el.querySelector(".origin");
    const mode = s?.plan?.source?.mode; // live | cached | rules (rise/ai.py)
    const label = !tests ? ["idle", "Example"] : mode === "live" ? ["ok", "Live AI"]
      : mode === "cached" ? ["warn", "Cached AI"] : ["warn", "Rules fallback"];
    origin.className = "origin pill " + label[0];
    origin.textContent = label[1];
  },
});
