/* Parte B · slide 8 · Revelação (só se for verdade) + fecho */
RISE.slide({
  id: "reveal",
  title: "Reveal",
  time: "4:20 – 5:00",
  steps: 2,
  notes: `
O slide decide sozinho: a revelação só aparece se o Freedom Proof mostrar pedidos deste pitch servidos pelo destino. Senão, mostra só o fecho.
(revelação) "You didn't just watch RISE." (pausa, →) "RISE powered what you just watched."
"The charts on our problem slide were stored on the source. After the switch, every slide image came from the destination. These are the real requests, with their IDs."
(→) "Don't hope your migration works. Prove it. RISE. Built to rise when clouds fall."
(fecho sem revelação) "Don't hope your migration works. Prove it." e depois a marca.`,

  html: `
    <div class="claim">
      <p class="l1 display"></p>
      <p class="l2 display"></p>
    </div>
    <aside class="glass trace" aria-label="Requests made by this pitch">
      <figure class="card"></figure>
      <figcaption class="served"></figcaption>
      <ol></ol>
    </aside>
    <footer class="sign">
      <span class="mark" aria-hidden="true"></span><b>RISE</b><span>Built to rise when clouds fall.</span>
    </footer>`,

  css: `
    display: grid; grid-template-columns: 1fr 560px; grid-template-rows: 1fr auto; column-gap: 100px; row-gap: 40px;
    .claim { align-self: center; display: grid; gap: 28px; }
    .display { font-size: 88px; max-width: 14ch; }
    .l2 { opacity: 0; transition: opacity .7s var(--ease); }
    &.s1 .l2 { opacity: 1; }
    &.plain .l2 { display: none; }
    .trace { align-self: center; padding: 28px; display: grid; gap: 16px; opacity: 0; transform: translateY(16px); transition: opacity .7s var(--ease) .2s, transform .9s var(--ease-out) .2s; }
    &.s1 .trace { opacity: 1; transform: none; }
    &.plain .trace { display: none; }
    .card { aspect-ratio: 16 / 9; border-radius: 18px; overflow: hidden; background: var(--faint); }
    .card img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .trace ol { list-style: none; }
    .trace li { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; padding: 10px 0; border-top: 1px solid var(--line); font: 400 18px/1.3 var(--f-mono); }
    .trace li .pill { font-size: 16px; padding: 5px 10px; }
    .trace li code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .trace li small { color: var(--muted); font-size: 16px; }
    .sign { grid-column: 1 / -1; display: flex; align-items: center; gap: 18px; font-size: var(--t3); color: var(--muted); opacity: 0; transition: opacity .7s var(--ease); }
    &.s2 .sign, &.plain .sign { opacity: 1; }
    .sign .mark { width: 52px; height: 52px; color: var(--ink); }
    .sign .mark svg { width: 100%; height: 100%; }
    .sign b { color: var(--ink); font-weight: 700; letter-spacing: .14em; margin-right: 10px; }`,

  init(el, api) {
    el.querySelector(".mark").innerHTML = api.MARK;
    this._mode(el, false);
  },

  _mode(el, reveal) {
    el.classList.toggle("plain", !reveal);
    el.querySelector(".l1").textContent = reveal ? "You didn't just watch RISE." : "Don't hope your migration works. Prove it.";
    el.querySelector(".l2").textContent = reveal ? "RISE powered what you just watched." : "";
  },

  async enter(el, api) {
    let doc = null;
    try { doc = await api.live.proof(); } catch { /* offline */ }
    const reqs = (doc?.pitch_requests || []).filter(r => r.ok);
    const fromDest = reqs.filter(r => r.provider === "destination");
    const reveal = fromDest.length > 0 && doc?.switch; // só se for literalmente verdade
    this._mode(el, reveal);
    if (!reveal) return;

    // Um pedido novo, agora, para a imagem final
    const [res, providers] = await Promise.all([api.live.asset(api.config.revealAsset), api.live.providers()]);
    el.querySelector(".served").innerHTML = api.served(res, providers);
    if (res.ok) el.querySelector(".card").innerHTML = `<img alt="" src="${res.url}">`;

    const rows = [...reqs.filter(r => r.provider === "source").slice(-2), ...fromDest.slice(-4)];
    el.querySelector(".trace ol").innerHTML = rows.map(r => `
      <li><span class="pill ${r.provider === "destination" ? "live" : "idle"}">${api.esc(r.provider)}</span>
        <code>${api.esc(r.key)}</code><small>${api.esc(String(r.request_id || "").slice(0, 10))}</small></li>`).join("");
  },
});
