/* Parte B · 7 · Challenge → Adapt: o que falhou, a correção proposta e o reteste. Só dados do run. */
RISE.slide({
  id: "adapt",
  title: "Challenge to Adapt",
  time: "3:00 – 3:20",
  steps: 2,
  notes: `
Tudo aqui vem do run que acabou de acontecer.
(esquerda) "This is what failed on the destination, and the exact error it returned."
(→ meio) "The AI diagnosed it and proposed a change from a short allowed list, nothing else. We applied it."
(→ direita) "Then the whole plan ran again on the destination."
Se a origem do diagnóstico for "Rules fallback" ou "Cached AI", dizê-lo. Se o slide disser que não havia nada para adaptar, é verdade: avançar.
Nunca dizer que a incompatibilidade é da Leaseweb: foi preparada de propósito no ambiente simulado.`,

  html: `
    <div class="ad">
      <h2 class="title split">What broke, <span class="soft">and how it was fixed.</span></h2>
      <div class="cols"></div>
    </div>`,

  css: `
    .ad { height: 100%; display: grid; grid-template-rows: auto 1fr; gap: 56px; }
    .title { max-width: 20ch; }
    .cols { display: grid; grid-template-columns: 1fr 64px 1.25fr 64px 0.8fr; align-items: start; align-self: center; }
    .col { padding: 36px 40px; display: grid; gap: 18px; align-content: start; }
    .col h3 { font-size: var(--t2); font-weight: 600; letter-spacing: -.015em; }
    .col .kind { font: 500 26px/1.3 var(--f-mono); }
    .col .err { font: 400 20px/1.4 var(--f-mono); color: var(--muted); word-break: break-word; }
    .col .diag { font-size: var(--t1); line-height: 1.45; color: var(--ink); display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
    .col .change { font: 500 24px/1.4 var(--f-mono); padding: 14px 18px; border-radius: 14px; background: var(--faint); }
    .col .change b { color: var(--accent); font-weight: 500; }
    .col .pills { display: flex; flex-wrap: wrap; gap: 10px; }
    .fail { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--bad) 55%, transparent), var(--shadow); }
    .pass { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ok) 55%, transparent), var(--shadow); }
    .score { font-size: 120px; line-height: .9; font-weight: 700; letter-spacing: -.05em; font-variant-numeric: tabular-nums; }
    .arrow { align-self: center; justify-self: center; width: 48px; fill: none; stroke: rgba(18,31,53,.35); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .one { grid-column: 1 / -1; }
    .cols > .empty { grid-column: 1 / -1; }`,

  init(el) { FX.prep(el); },

  async enter(el, api) {
    FX.act("proof");
    await this._render(el, api);
    this._off = api.live.onChange(() => this._render(el, api));
  },
  leave() { this._off?.(); },

  async _render(el, api) {
    const esc = api.esc, box = el.querySelector(".cols");
    let s = null; try { s = await api.live.state(); } catch { /* offline */ }
    const arrow = s => `<svg class="arrow rv fade" data-s="${s}" viewBox="0 0 48 24" aria-hidden="true"><path d="M2 12h42m-9-9 9 9-9 9"/></svg>`;
    const modeLabel = m => m === "live" ? ["ok", "Live AI"] : m === "cached" ? ["warn", "Cached AI"] : ["warn", "Rules fallback"];

    if (!s?.results) {
      box.innerHTML = `<div class="empty"><div><strong>No tests have run yet</strong>${api.live.online ? "Run Challenge in the dashboard and come back to this slide." : "Open the pitch through RISE to show the real results."}</div></div>`;
      return;
    }
    const before = s.results_before || s.results.destination;
    const failed = before.filter(r => r.status !== "pass");
    const after = s.results.destination;
    const passed = after.filter(r => r.status === "pass").length;

    if (!failed.length) {
      box.innerHTML = `<section class="col glass pass one rv"><h3>The destination passed every test. Nothing to adapt.</h3>
        <div class="pills"><span class="pill ok">${passed} / ${after.length} passed</span></div></section>`;
      FX.index(box);
      return;
    }
    const f = failed[0], err = f.error || {};
    const a = s.adaptation, p = a?.proposal;
    const [mcls, mtxt] = modeLabel(p?.source?.mode);
    const allPass = passed === after.length;
    box.innerHTML = `
      <section class="col glass fail rv">
        <h3>Failed on the destination</h3>
        <span class="kind">${esc(f.kind)}</span>
        <div class="pills"><span class="pill ${f.status === "unsupported" ? "warn" : "bad"}">${esc(f.status)}</span>${failed.length > 1 ? `<span class="pill idle">+${failed.length - 1} more</span>` : ""}</div>
        <span class="err">${esc(err.code ? `${err.code}${err.status ? ` (HTTP ${err.status})` : ""}` : "No error code returned")}</span>
      </section>
      ${arrow(1)}
      <section class="col glass rv" data-s="1">
        <h3>Change proposed</h3>
        ${p ? `<p class="diag">${esc(p.diagnosis || "")}</p>
          ${a.applied ? `<span class="change">${esc(p.key)}: ${esc(a.before?.[p.key] ?? "")} → <b>${esc(p.value)}</b></span>` : ""}
          <div class="pills"><span class="pill ${mcls}">${mtxt}</span><span class="pill ${a.applied ? "ok" : "warn"}">${a.applied ? "Applied" : "No allowed change found"}</span></div>`
        : `<div class="empty"><div><strong>Not adapted yet</strong>Run Adapt in the dashboard.</div></div>`}
      </section>
      ${arrow(2)}
      <section class="col glass ${a?.retest && allPass ? "pass" : ""} rv" data-s="2">
        <h3>Retest on the destination</h3>
        ${a?.retest ? `<span class="score ${allPass ? "ok-c" : "bad-c"}">${passed}/${after.length}</span>
          <span class="pill ${allPass ? "ok" : "bad"}">${allPass ? "All tests pass" : "Still failing"}</span>`
        : `<div class="empty"><div><strong>No retest yet</strong></div></div>`}
      </section>`;
    FX.index(box);
  },
});
