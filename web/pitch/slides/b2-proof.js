/* Parte B · slide 6 · A prova: hashes reais, a operação nova no destino e a origem cortada */
RISE.slide({
  id: "proof",
  title: "Proof",
  time: "3:00 – 3:40",
  notes: `
Tudo neste slide vem do Freedom Proof do run que acabou de acontecer (/api/proof).
"This is the evidence. For every object, the SHA-256 of the bytes on the source and on the destination. Not ETags: the bytes."
(em baixo, à esquerda) "Then a brand new object, written after the switch, never cached, read back from the destination. Same hash."
(em baixo, à direita) "And the source? The app's own client can no longer reach it."
"And the report also lists what we did not test. It never claims more than it proved."
Se o slide estiver vazio, o run não chegou ao Verify: não improvisar números.`,

  html: `
    <h2 class="title">Same bytes. Source unplugged.</h2>
    <div class="glass ledger" role="table" aria-label="SHA-256 of each object on source and destination"></div>
    <div class="facts">
      <section class="glass fact live-op"></section>
      <section class="glass fact cut"></section>
    </div>`,

  css: `
    display: flex; flex-direction: column; gap: 32px; padding-top: 140px;
    .title { font-size: var(--t5); max-width: none; }
    .ledger { padding: 10px 40px; }
    .row { display: grid; grid-template-columns: 300px 150px 1fr auto; column-gap: 24px; row-gap: 2px; align-items: baseline; padding: 16px 0; border-top: 1px solid var(--line); }
    .row:first-child { border-top: 0; }
    .key { grid-row: span 2; align-self: center; font: 500 22px/1.3 var(--f-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .where { font-size: 20px; color: var(--muted); }
    .hash { font: 400 21px/1.35 var(--f-mono); white-space: nowrap; overflow: hidden; }
    .hash.dst { min-height: 1.35em; }
    .verdict { grid-row: span 2; align-self: center; justify-self: end; opacity: 0; transition: opacity .35s var(--ease); }
    .row.done .verdict { opacity: 1; }
    .more { padding: 14px 0 6px; font-size: 20px; color: var(--muted); border-top: 1px solid var(--line); }
    .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .fact { padding: 28px 34px; display: grid; gap: 12px; align-content: start; }
    .fact h3 { display: flex; justify-content: space-between; align-items: center; gap: 16px; font-size: var(--t2); font-weight: 600; }
    .fact dl { display: grid; grid-template-columns: 170px 1fr; gap: 6px 18px; font-size: 20px; }
    .fact dt { color: var(--muted); }
    .fact dd { font-family: var(--f-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ledger .empty, .fact .empty { min-height: 120px; }`,

  init(el, api) { this._render(el, api, null); },

  async enter(el, api) {
    let doc = null;
    try { doc = await api.live.proof(); } catch { /* offline */ }
    this._render(el, api, doc);
    this._type(el, api);
  },
  leave() { cancelAnimationFrame(this._raf); },

  _render(el, api, d) {
    const esc = api.esc;
    const objs = d?.integrity?.objects || [];
    const ledger = el.querySelector(".ledger");
    ledger.innerHTML = objs.length ? objs.slice(0, 4).map(o => `
      <div class="row" role="row">
        <span class="key" role="cell">${esc(o.key)}</span>
        <span class="where" role="cell">Source</span><span class="hash" role="cell">${esc(o.sha256_source)}</span>
        <span class="verdict pill ${o.match ? "ok" : "bad"}" role="cell">${o.match ? "Match" : "Mismatch"}</span>
        <span class="where" role="cell">Destination</span><span class="hash dst" role="cell" data-v="${esc(o.sha256_destination)}"></span>
      </div>`).join("") + (objs.length > 4 ? `<p class="more">${objs.length - 4} more objects verified the same way. All listed in the Freedom Proof.</p>` : "")
      : `<div class="empty"><div><strong>No verified objects yet</strong>${api.live.online ? "Run Verify in the dashboard and come back to this slide." : "Open the pitch through RISE to show the real proof."}</div></div>`;

    const op = d?.new_operation_after_switch;
    el.querySelector(".live-op").innerHTML = op ? `
      <h3>New operation after the switch <span class="pill ${op.match && op.provider === "destination" ? "ok" : "bad"}">${op.match ? "SHA-256 match" : "Mismatch"}</span></h3>
      <dl><dt>Object</dt><dd>${esc(op.key)}</dd><dt>Served by</dt><dd>${esc(op.provider)}</dd>
      <dt>SHA-256</dt><dd>${esc(op.sha256_read)}</dd><dt>Request</dt><dd>${esc(op.get_request_id || "–")}</dd></dl>`
      : `<div class="empty"><div><strong>No new operation yet</strong>Run Prove after the switch.</div></div>`;

    const cut = d?.source_disconnection;
    el.querySelector(".cut").innerHTML = cut ? `
      <h3>Source <span class="pill ${cut.app_probe?.ok === false ? "bad" : "warn"}">${cut.app_probe?.ok === false ? "Unreachable" : "Still reachable"}</span></h3>
      <dl><dt>Cut at</dt><dd>${esc(String(cut.at || "").slice(11, 19))}</dd><dt>App probe</dt><dd>${esc(cut.app_probe?.result || "–")}</dd>
      <dt>Network probe</dt><dd>${esc(cut.tcp_probe?.result || "–")}</dd></dl>`
      : `<div class="empty"><div><strong>Source not cut yet</strong>Run Cut in the dashboard.</div></div>`;
  },

  /* Escreve os hashes reais do destino da esquerda para a direita. Nada de ruído inventado. */
  _type(el, api) {
    const rows = [...el.querySelectorAll(".row")];
    const fill = (r, n) => { const h = r.querySelector(".dst"); h.textContent = h.dataset.v.slice(0, n); if (n >= h.dataset.v.length) r.classList.add("done"); };
    if (api.still) return rows.forEach(r => fill(r, 99));
    rows.forEach(r => { r.classList.remove("done"); fill(r, 0); });
    const t0 = performance.now() + 400, dur = 900, gap = 300;
    const tick = now => {
      let busy = false;
      rows.forEach((r, k) => {
        const p = Math.min(1, Math.max(0, (now - t0 - k * gap) / dur));
        fill(r, Math.round(64 * p));
        if (p < 1) busy = true;
      });
      if (busy) this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  },
});
