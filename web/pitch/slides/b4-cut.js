/* Parte B · 9 · Prove: a origem foi cortada e uma operação nova funciona no destino.
   O cabo só "parte" se o corte aconteceu mesmo (classe .has-cut), e o destino só acende se houver operação nova (.has-op). */
RISE.slide({
  id: "cut",
  title: "Source cut",
  time: "3:40 – 4:00",
  steps: 2,
  notes: `
(→) "We cut the app's link to the source. RISE checked it: the source no longer answers."
(→) "Then the app wrote a brand new object, never cached, and read it back. Served by the destination, same SHA-256."
Se o cabo não partir no ecrã, o Cut não correu no dashboard: não fingir. Dizer "we'll cut it now" e voltar à demo, ou avançar.`,

  html: `
    <div class="dc">
      <div class="head">
        <p class="kicker rv">Prove</p>
        <h2 class="title split">Then we unplug the old cloud.</h2>
      </div>
      <div class="row rv fade" style="--i:3">
        <div class="col src"><div class="node glass"><span class="name">source</span><span class="sim" hidden>simulated</span></div><div class="detail" data-s="1"></div></div>
        <div class="link left"><i class="a"></i><i class="b"></i><span class="x" aria-hidden="true">✕</span></div>
        <div class="col"><div class="node glass app">Your app</div></div>
        <div class="link right"><i class="a"></i><i class="b"></i></div>
        <div class="col dst"><div class="node glass"><span class="name">destination</span><span class="sim" hidden>simulated</span></div><div class="detail" data-s="2"></div></div>
      </div>
    </div>`,

  css: `
    .dc { height: 100%; display: grid; grid-template-rows: auto 1fr; gap: 40px; }
    .head { display: grid; gap: 24px; }
    .title { max-width: 18ch; }
    .row { display: grid; grid-template-columns: 1fr 220px auto 220px 1fr; align-items: start; padding-top: 30px; }
    .col { display: grid; justify-items: center; gap: 28px; }
    .src { justify-items: end; } .src .detail { justify-items: end; text-align: right; }
    .dst { justify-items: start; } .dst .detail { justify-items: start; text-align: left; }
    .node { display: flex; align-items: center; gap: 12px; padding: 30px 36px; font-size: var(--t3); font-weight: 600; letter-spacing: -.02em; white-space: nowrap; transition: opacity .6s var(--e-inout), filter .6s var(--e-inout), box-shadow .6s var(--e-inout); }
    .node.app { box-shadow: inset 0 0 0 3px var(--accent), var(--shadow); }
    .sim { font: 500 16px/1 var(--f-mono); color: var(--faint-ink); padding: 6px 10px; border-radius: 8px; background: var(--faint); }
    .link { position: relative; height: 4px; margin-top: 54px; }
    .link i { position: absolute; top: 0; height: 4px; width: 50%; background: var(--ink); opacity: .25; border-radius: 2px; transition: transform .7s var(--e-out), opacity .5s, background .5s; }
    .link .a { left: 0; } .link .b { right: 0; }
    .link .x { position: absolute; left: 50%; top: 50%; translate: -50% -50%; width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; background: var(--bad-bg); color: var(--bad); font-weight: 700; font-size: 24px; transform: scale(0); transition: transform .5s var(--e-spring); }
    &.s1.has-cut .link.left .a { transform: translateX(-30px) rotate(-8deg); background: var(--bad); opacity: .7; }
    &.s1.has-cut .link.left .b { transform: translateX(30px) rotate(8deg); background: var(--bad); opacity: .7; }
    &.s1.has-cut .link.left .x { transform: scale(1); transition-delay: .25s; }
    &.s1.has-cut .src .node { opacity: .45; filter: grayscale(1); }
    &.s2.has-op .link.right i { background: var(--ok); opacity: 1; }
    &.s2.has-op .dst .node { box-shadow: inset 0 0 0 3px var(--ok), var(--shadow); }
    .detail { display: grid; gap: 12px; font: 500 20px/1.3 var(--f-mono); color: var(--muted); max-width: 520px;
      opacity: 0; transform: translateY(16px); transition: opacity .6s var(--e-out), transform .8s var(--e-out); }
    .detail b { font: 600 var(--t3)/1.1 var(--f-ui); letter-spacing: -.02em; }
    .detail .none { font: 500 var(--t1)/1.3 var(--f-ui); }
    .detail code { font: inherit; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    &.s1 .detail[data-s="1"], &.s2 .detail[data-s="2"] { opacity: 1; transform: none; transition-delay: .35s; }`,

  init(el) { FX.prep(el); },

  async enter(el, api) {
    FX.act("proof");
    await this._render(el, api);
    this._off = api.live.onChange(() => this._render(el, api));
  },
  leave() { this._off?.(); },

  async _render(el, api) {
    const esc = api.esc, time = ts => String(ts || "").slice(11, 19);
    let pr = null, p = {};
    try { [pr, p] = await Promise.all([api.live.proof(), api.live.providers()]); } catch { /* offline */ }
    for (const [cls, id] of [["src", "source"], ["dst", "destination"]]) {
      el.querySelector(`.${cls} .name`).textContent = p?.[id]?.name || id;
      el.querySelector(`.${cls} .sim`).hidden = !p?.[id]?.simulated;
    }
    const d = pr?.source_disconnection, op = pr?.new_operation_after_switch;
    const cut = d && d.app_probe?.ok === false && !d.restored_at;
    const live = op && op.match && op.provider === "destination";
    el.classList.toggle("has-cut", !!cut);
    el.classList.toggle("has-op", !!live);
    el.querySelector(".src .detail").innerHTML = cut ? `
      <b class="bad-c">Source unreachable</b>
      <span>cut at ${esc(time(d.at))}</span>
      <code>app: ${esc(String(d.app_probe?.result || "").split(":")[0])}</code>
      <code>network: ${esc(d.tcp_probe?.result || "")}</code>`
      : `<span class="none">${d ? "The source still answers." : "The source has not been cut yet."}</span>`;
    el.querySelector(".dst .detail").innerHTML = op ? `
      <b class="${live ? "ok-c" : "bad-c"}">${live ? "New write after the cut" : "New write did not verify"}</b>
      <code>${esc(op.key)}</code>
      <code>served by ${esc(op.provider)}</code>
      <code>sha256 ${esc(String(op.sha256_read || "").slice(0, 16))}…</code>
      <code>req ${esc(String(op.get_request_id || "").slice(0, 16))}</code>`
      : `<span class="none">No new operation yet.</span>`;
  },
});
