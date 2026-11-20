/* Parte B · 9 · Prove: a origem foi cortada e uma operação nova funciona no destino.
   O cabo só "parte" se o corte aconteceu mesmo (classe .has-cut), e o destino só acende se houver operação nova (.has-op). */
RISE.slide({
  id: "cut",
  title: "Source cut",
  time: "3:40 – 3:55",
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
      <div class="tree rv fade" style="--i:3">
        <svg class="cables" viewBox="0 0 1680 560" aria-hidden="true">
          <path class="draw cable left a" style="--i:4" d="M840 100 C840 150 735 175 630 200"/>
          <path class="draw cable left b" style="--i:5" d="M630 200 C525 225 420 250 420 300"/>
          <path class="draw cable right" style="--i:4" d="M840 100 C840 200 1260 200 1260 300"/>
        </svg>
        <span class="x" aria-hidden="true">✕</span>
        <div class="node glass app">Your app</div>
        <div class="col src"><div class="node glass"><span class="name">source</span><span class="sim" hidden>simulated</span></div><div class="detail" data-s="1"></div></div>
        <div class="col dst"><div class="node glass"><span class="name">destination</span><span class="sim" hidden>simulated</span></div><div class="detail" data-s="2"></div></div>
      </div>
    </div>`,

  css: `
    .dc { height: 100%; display: grid; grid-template-rows: auto 1fr; gap: 40px; }
    .head { display: grid; gap: 24px; }
    .title { max-width: none; }
    /* Árvore: a app em cima, dois cabos curvos até à origem (esquerda) e ao destino (direita).
       Coordenadas em px do palco: a caixa tem 1680×560, o SVG usa o mesmo sistema. */
    .tree { position: relative; width: 1680px; height: 560px; align-self: center; }
    .cables { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    .cable { fill: none; stroke: rgba(18,31,53,.22); stroke-width: 5; stroke-linecap: round;
      transition: stroke-dashoffset 1.1s var(--e-inout), transform .7s var(--e-out), stroke .5s var(--e-inout), opacity .5s; }
    .node { display: flex; align-items: center; gap: 12px; height: 100px; padding: 0 36px; font-size: var(--t3); font-weight: 600; letter-spacing: -.02em; white-space: nowrap; transition: opacity .6s var(--e-inout), filter .6s var(--e-inout), box-shadow .6s var(--e-inout); }
    .node.app { position: absolute; left: 50%; top: 0; translate: -50% 0; box-shadow: inset 0 0 0 3px var(--accent), var(--shadow); }
    .col { position: absolute; top: 300px; width: 600px; display: grid; justify-items: center; gap: 26px; text-align: center; }
    .src { left: 120px; } .dst { right: 120px; }
    .sim { font: 500 16px/1 var(--f-mono); color: var(--faint-ink); padding: 6px 10px; border-radius: 8px; background: var(--faint); }
    /* o ✕ fica no meio do cabo da origem, onde ele parte */
    .x { position: absolute; left: 630px; top: 200px; translate: -50% -50%; width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center;
      background: var(--bad-bg); color: var(--bad); font-weight: 700; font-size: 28px; box-shadow: 0 0 0 8px color-mix(in srgb, var(--bad-bg) 55%, transparent);
      transform: scale(0); transition: transform .5s var(--e-spring); }
    /* o corte: o cabo da origem parte-se ao meio e as duas pontas afastam-se (só se o corte aconteceu) */
    &.s1.has-cut .cable.left { stroke: var(--bad); opacity: .85; }
    &.s1.has-cut .cable.left.a { transform: translate(14px, -12px); }
    &.s1.has-cut .cable.left.b { transform: translate(-14px, 12px); }
    &.s1.has-cut .x { transform: scale(1); transition-delay: .25s; }
    &.s1.has-cut .src .node { opacity: .45; filter: grayscale(1); }
    /* a escrita nova no destino: o cabo acende a mint (só se foi verificada) */
    &.s2.has-op .cable.right { stroke: var(--ok); stroke-width: 6; filter: drop-shadow(0 0 10px color-mix(in srgb, var(--ok) 45%, transparent)); }
    &.s2.has-op .dst .node { box-shadow: inset 0 0 0 3px var(--ok), var(--shadow); }
    .detail { display: grid; justify-items: center; gap: 12px; font: 500 20px/1.3 var(--f-mono); color: var(--muted); max-width: 560px;
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
      <code>${esc(String(d.app_probe?.result || "").split(":")[0])}</code>`
      : `<span class="none">${d ? "The source still answers." : "The source has not been cut yet."}</span>`;
    el.querySelector(".dst .detail").innerHTML = op ? `
      <b class="${live ? "ok-c" : "bad-c"}">${live ? "New write works" : "New write did not verify"}</b>
      <code>${esc(op.key)}</code>
      <code>served by ${esc(op.provider)}</code>`
      : `<span class="none">No new operation yet.</span>`;
  },
});
