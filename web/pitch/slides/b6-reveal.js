/* Parte B · 11 · Revelação: cada imagem do deck passou pelo RISE. A frase muda conforme o que é verdade. */
RISE.slide({
  id: "reveal",
  title: "Reveal",
  time: "4:25 – 4:45",
  steps: 1,
  notes: `
(passo 0: a imagem, pedida agora mesmo; a etiqueta diz quem a serviu)
(→) A frase escolhe-se sozinha a partir do Freedom Proof:
 · se houve pedidos do pitch servidos pelo destino depois do switch: "You didn't just watch RISE. RISE powered what you just watched."
   "The charts on our problem slide were stored on the source. After the switch, every slide image came from the destination. Each square is a real request: grey from the source, blue from the destination."
 · se não: "Every image in this deck came through RISE." Dizer só isso.`,

  html: `
    <div class="rev">
      <div class="left">
        <figure class="frame glass rv mask"><div class="empty"><div><strong>Final image</strong>Served through RISE when the pitch runs live.</div></div></figure>
        <div class="served rv" style="--i:3"></div>
      </div>
      <div class="right">
        <h2 class="statement split" data-s="1"></h2>
        <div class="timeline rv" data-s="1" style="--i:3"></div>
        <div class="legend rv" data-s="1" style="--i:5"></div>
      </div>
    </div>`,

  css: `
    .rev { height: 100%; display: grid; grid-template-columns: 860px 1fr; gap: 80px; align-items: center; }
    .left { display: grid; gap: 24px; }
    .frame { aspect-ratio: 16 / 9; overflow: hidden; }
    .frame:has(img) { border-radius: 36px; box-shadow: var(--shadow); }
    .frame img { display: block; width: 100%; height: 100%; object-fit: contain; }
    .right { display: grid; gap: 40px; align-content: center; }
    .statement { font-size: var(--t5); max-width: 15ch; }
    .timeline { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .timeline .d { width: 28px; height: 28px; border-radius: 8px; background: rgba(18,31,53,.22); transform: scale(0); transition: transform .45s var(--e-spring); }
    .timeline .d.dst { background: var(--accent); }
    .timeline .d.fail { background: var(--bad); }
    .timeline .sw { width: 3px; height: 50px; border-radius: 2px; background: var(--ink); margin: 0 8px; transform: scaleY(0); transition: transform .5s var(--e-out); }
    &.s1 .timeline .d, &.s1 .timeline .sw { transform: none; transition-delay: calc(400ms + var(--i) * 40ms); }
    .legend { display: flex; flex-wrap: wrap; gap: 14px; }
    .legend .dot { color: rgba(18,31,53,.3); }
    .legend .dot.dst { color: var(--accent); }`,

  init(el) { FX.prep(el); },

  async enter(el, api) {
    FX.act("finale");
    await Promise.all([this._asset(el, api), this._render(el, api)]);
  },

  async _asset(el, api) {
    const [r, p] = await Promise.all([api.live.asset(api.config.revealAsset), api.live.providers()]);
    el.querySelector(".served").innerHTML = api.served(r, p);
    if (r.ok) {
      const f = el.querySelector(".frame");
      f.innerHTML = `<img alt="" src="${r.url}">`;
      f.classList.remove("glass"); // a imagem servida já traz o seu próprio vidro
    }
  },

  async _render(el, api) {
    let pr = null, p = {};
    try { [pr, p] = await Promise.all([api.live.proof(), api.live.providers()]); } catch { /* offline */ }
    const reqs = (pr?.pitch_requests || []).slice(-40);
    const ok = reqs.filter(r => r.ok);
    const fromDest = ok.filter(r => r.provider === "destination");
    const st = el.querySelector(".statement");
    // duas vozes, como na capa: a primeira metade mais leve, a segunda em tinta
    const [soft, strong] = fromDest.length && pr?.switch ? ["You didn't just watch RISE.", "RISE powered what you just watched."]
      : ok.length ? ["Every image in this deck", "came through RISE."]
      : ["Open the pitch through RISE", "to see where each image came from."];
    st.innerHTML = `<span class="soft">${soft}</span> ${strong}`;
    delete st.dataset.splitDone;
    FX.split(el);

    const sw = reqs.findIndex((r, i) => i > 0 && r.provider !== reqs[i - 1].provider);
    el.querySelector(".timeline").innerHTML = reqs.map((r, i) =>
      `${i === sw ? `<span class="sw" style="--i:${i}"></span>` : ""}<span class="d ${!r.ok ? "fail" : r.provider === "destination" ? "dst" : ""}" style="--i:${i}" title="${api.esc(r.key)}"></span>`).join("");
    const by = id => ok.filter(r => r.provider === id).length;
    el.querySelector(".legend").innerHTML = ["source", "destination"].filter(by).map(id =>
      `<span class="tag"><span class="dot ${id === "destination" ? "dst" : ""}"></span><b>${api.esc(p?.[id]?.name || id)}</b> ${by(id)} requests</span>`).join("");
  },
});
