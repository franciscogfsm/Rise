/* Parte B · 8 · Verify: SHA-256 de cada objeto nos dois lados, do Freedom Proof real. */
RISE.slide({
  id: "integrity",
  title: "Integrity",
  time: "3:20 – 3:40",
  notes: `
"We don't ask you to trust us. For every object, RISE computed the SHA-256 of the actual bytes on the source and on the destination. Not ETags: the bytes."
"Every pair matches."  (só se o número em baixo for igual ao total)
Mostramos os primeiros 16 caracteres de cada hash; os completos estão no Freedom Proof.`,

  MAX: 8,

  html: `
    <div class="int">
      <div class="left">
        <p class="kicker rv">Verify</p>
        <h2 class="title split">Every byte, checked.</h2>
        <div class="score rv" style="--i:4"><div><b class="n big-num act-c">–</b><b class="of"></b></div><span class="unit">objects with the same SHA-256 on both sides</span></div>
      </div>
      <div class="grid"></div>
    </div>`,

  css: `
    .int { height: 100%; display: grid; grid-template-columns: 560px 1fr; gap: 72px; align-items: center; }
    .left { display: grid; gap: 40px; }
    .title { max-width: 9ch; }
    .score > div { display: flex; align-items: baseline; gap: 14px; }
    .score .of { font-size: 72px; font-weight: 600; letter-spacing: -.04em; color: var(--faint-ink); }
    .score .unit { display: block; margin-top: 12px; max-width: 22ch; }
    .score.bad .n { color: var(--bad); }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; align-content: center; }
    .obj { --radius: 22px; padding: 22px 26px; display: grid; gap: 10px; opacity: 0; transform: translateY(18px) scale(.97); transition: opacity .5s var(--e-out), transform .8s var(--e-out); }
    &.cur .grid.go .obj { opacity: 1; transform: none; transition-delay: calc(450ms + var(--i) * 90ms); }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .f { font: 600 22px/1.2 var(--f-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chk { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--ok-bg); color: var(--ok); font-weight: 700; transform: scale(0); transition: transform .5s var(--e-spring); }
    .chk svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    &.cur .grid.go .chk { transform: none; transition-delay: calc(1300ms + var(--i) * 110ms); }
    .miss .chk { background: var(--bad-bg); color: var(--bad); }
    .h { display: grid; grid-template-columns: 140px 1fr; gap: 12px; font: 500 19px/1.2 var(--f-mono); }
    .h span { color: var(--faint-ink); }
    .h code { font: inherit; color: var(--muted); min-height: 1.2em; }
    .more { grid-column: 1 / -1; font: 500 20px/1 var(--f-mono); color: var(--muted); padding: 8px 6px; }
    .grid > .empty { grid-column: 1 / -1; }`,

  init(el) { FX.prep(el); },

  async enter(el, api) {
    FX.act("proof");
    el.querySelector(".grid").classList.remove("go");
    await this._render(el, api, true);
    this._off = api.live.onChange(() => this._render(el, api, false));
  },
  leave() { this._off?.(); },

  async _render(el, api, animate) {
    const grid = el.querySelector(".grid"), n = el.querySelector(".score .n"), of = el.querySelector(".score .of");
    let pr = null; try { pr = await api.live.proof(); } catch { /* offline */ }
    const objs = pr?.integrity?.objects || [];
    if (!objs.length) {
      grid.innerHTML = `<div class="empty"><div><strong>No verified objects yet</strong>${api.live.online ? "Run Verify in the dashboard and come back to this slide." : "Open the pitch through RISE to show the real proof."}</div></div>`;
      n.textContent = "–"; of.textContent = "";
      return;
    }
    const ok = objs.filter(o => o.match).length, file = k => String(k || "").split("/").pop();
    el.querySelector(".score").classList.toggle("bad", ok !== objs.length);
    grid.innerHTML = objs.slice(0, this.MAX).map((o, i) => `
      <div class="obj glass ${o.match ? "" : "miss"}" style="--i:${i}">
        <div class="top"><span class="f" title="${api.esc(o.key)}">${api.esc(file(o.key))}</span>
          <span class="chk">${o.match ? `<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>` : "≠"}</span></div>
        <div class="h"><span>source</span><code data-h="${api.esc(String(o.sha256_source).slice(0, 16))}…"></code></div>
        <div class="h"><span>destination</span><code data-h="${api.esc(String(o.sha256_destination).slice(0, 16))}…"></code></div>
      </div>`).join("") + (objs.length > this.MAX ? `<div class="more">${objs.length - this.MAX} more objects in the Freedom Proof</div>` : "");
    n.textContent = ok;
    of.textContent = `/ ${objs.length}`;
    grid.querySelectorAll("code").forEach((c, i) => animate ? FX.type(c, c.dataset.h, { delay: 600 + (i >> 1) * 110, dur: 500 }) : (c.textContent = c.dataset.h));
    requestAnimationFrame(() => grid.classList.add("go"));
  },
});
