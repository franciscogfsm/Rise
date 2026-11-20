/* Parte A · 4 · Discover: o perfil de tráfego real da app, em barras. */
RISE.slide({
  id: "discover",
  title: "Discover",
  time: "1:20 – 1:35",
  notes: `
"First, RISE watches the app. These are the real S3 calls it made on its original provider."
"We don't guess which parts of the storage API matter to you. We measure them."
Se aparecer vazio: o Discover ainda não correu no dashboard. Não improvisar números.`,

  html: `
    <div class="obs">
      <div class="left">
        <p class="kicker rv">Discover</p>
        <h2 class="title split">We watch what your app actually calls.</h2>
        <div class="total rv" style="--i:5"><b class="big-num act-c">–</b><span class="unit">S3 calls observed</span></div>
      </div>
      <div class="chart glass rv scale" style="--i:3"></div>
    </div>`,

  css: `
    .obs { height: 100%; display: grid; grid-template-columns: 1fr 900px; gap: 80px; align-items: center; }
    .left { display: grid; gap: 40px; align-content: center; }
    .title { max-width: 13ch; }
    .total { display: grid; gap: 10px; }
    .chart { padding: 52px 56px; display: grid; gap: 30px; align-content: center; min-height: 520px; }
    .row { display: grid; grid-template-columns: 320px 1fr 64px; align-items: center; gap: 24px; }
    .op { font: 500 24px/1 var(--f-mono); color: var(--ink); }
    .bar { height: 18px; border-radius: 9px; background: var(--faint); overflow: hidden; }
    .bar i { display: block; height: 100%; border-radius: inherit; width: calc(var(--w) * 100%); transform: scaleX(0); transform-origin: left;
      background: var(--accent); transition: transform 1.1s var(--e-out); }
    .row:not(:first-child) .bar i { background: var(--accent-soft); }
    &.cur .chart.go .bar i { transform: scaleX(1); transition-delay: calc(500ms + var(--i) * 90ms); }
    .n { font: 600 28px/1 var(--f-ui); text-align: right; font-variant-numeric: tabular-nums; }`,

  init(el) { FX.prep(el); },

  async enter(el, api) {
    FX.act("solution");
    el.querySelector(".chart").classList.remove("go");
    await this._render(el, api);
    this._off = api.live.onChange(() => this._render(el, api));
  },
  leave() { this._off?.(); },

  async _render(el, api) {
    const box = el.querySelector(".chart"), total = el.querySelector(".total b");
    let s = null; try { s = await api.live.state(); } catch { /* offline */ }
    const ops = Object.entries(s?.profile?.operations || {}).sort((a, b) => b[1] - a[1]);
    if (!ops.length) {
      box.innerHTML = `<div class="empty"><div><strong>No traffic observed yet</strong>${api.live.online ? "Run Discover in the dashboard and the profile fills in." : "Open the pitch through RISE to show the real profile."}</div></div>`;
      total.textContent = "–";
      return;
    }
    const max = ops[0][1];
    box.innerHTML = ops.slice(0, 7).map(([op, n], i) => `
      <div class="row" style="--i:${i}">
        <span class="op">${api.esc(op)}</span>
        <span class="bar"><i style="--w:${(n / max).toFixed(3)}"></i></span>
        <span class="n">${n}</span>
      </div>`).join("");
    total.textContent = s.profile.observed_calls ?? ops.reduce((a, [, n]) => a + n, 0);
    requestAnimationFrame(() => box.classList.add("go"));
  },
});
