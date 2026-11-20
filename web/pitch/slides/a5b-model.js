/* RISE Fast · o modelo local, explicado como um gráfico.
   Todos os números são reais (benchmark/s3-model-weights.json, 1292 bytes; benchmark/s3-model-experiment.json):
   - pesos por sinal medidos ao pontuar as duas linhas num ficheiro com um cliente boto3 S3 (linhas separadas);
     soma 6.23 → 99.8 %, soma −3.27 → 3.7 %. "Shared" = bias + Python + SDK no ficheiro + nome get_object.
   - 5 repos anotados à mão (22 chamadas S3): scanner 14, scanner + modelo 19. Com evidência no mesmo ficheiro,
     os alertas fora da referência ficam em 9, como o scanner (essa regra foi afinada nestes 5 repos).
   - 26 repos novos: o modelo manteve a cobertura (41/42), não a subiu. */
RISE.slide({
  id: "model",
  title: "Our local model",
  time: "2:05 – 2:25",
  steps: 2,
  auto: 4200,
  notes: `
"Some calls are ambiguous. get_object can be S3, or your own database. So we trained a tiny model, 1.3 kilobytes."
"It reads signals on the line. Receiver named s3: plus 5. A Bucket argument: plus 2. A Key: plus 2. Add them up, and the curve turns it into a score: 99.8 percent S3."
(passo 1) "Same method name, but on your Users table. The S3 signals are gone. 3.7 percent. Not S3."
(passo 2) "We trained it on 106 calls we labelled by hand. On five labelled repos it took us from 14 to 19 of 22 S3 calls. And every call you confirm or reject updates the weights."
If asked: logistic regression, runs on the CPU, no tokens, offline. The weights shown are the real ones. Same-file evidence keeps extra alerts at 9; that rule was tuned on those 5 repos. On 26 fresh repos the model kept coverage (41/42), it did not raise it.`,

  // [label, weight, present on the Users line too]
  SIG: [
    ["Same on both lines: SDK, get_object", -3.272, true],
    ["Receiver is an S3 client", 5.290, false],
    ["Bucket= argument", 2.223, false],
    ["Key= argument", 2.011, false],
    ["Storage words nearby", -0.019, false],
  ],

  html: `
    <div class="ml">
      <header>
        <h2 class="title split">We trained a <span class="accent">1.3 KB</span> model.</h2>
        <p class="lede rv" style="--i:2">It tells an S3 call from a look-alike. Locally, with 0 tokens.</p>
      </header>

      <div class="main">
        <section class="card sig glass rv left" style="--i:3">
          <p class="lab">1 · Read the signals on the line</p>
          <div class="code">
            <code class="c-a">s3.<b>get_object</b>(Bucket=b, Key=k)</code>
            <code class="c-b">Users.<b>get_object</b>(pk=user_id)</code>
          </div>
          <div class="bars"></div>
          <div class="sum"><span>Evidence, added up</span><b class="total">0.00</b></div>
        </section>

        <section class="card curve glass rv right" style="--i:5">
          <p class="lab">2 · The curve turns evidence into a score</p>
          <div class="plot">
            <svg viewBox="0 0 700 270" width="700" height="270" aria-hidden="true">
              <line class="axis" x1="44" y1="240" x2="690" y2="240"/>
              <line class="axis" x1="44" y1="10" x2="44" y2="240"/>
              <line class="thr" x1="44" x2="690"/>
              <text class="t thr-t" x="684" text-anchor="end">flagged as S3 above 80%</text>
              <text class="t" x="30" y="244" text-anchor="end">0%</text>
              <text class="t" x="36" y="20" text-anchor="end">100%</text>
              <text class="t" x="367" y="266" text-anchor="middle">evidence →</text>
              <path class="base"/>
              <path class="lit" pathLength="100"/>
            </svg>
            <i class="ball"></i>
            <div class="score"><b class="pct">50.0%</b><span class="verdict"></span></div>
          </div>
        </section>
      </div>

      <section class="learn glass rv" style="--i:8">
        <div class="loop">
          <p class="lab">3 · It learns</p>
          <p class="how"><b>106 calls</b> labelled by hand, 6 repos. Fit in <b>3 ms</b>.<br>
            Every call you confirm or reject updates the weights.</p>
        </div>
        <div class="gain">
          <p class="lab">S3 calls found · 5 hand-labelled repos</p>
          <div class="row r1"><span>Scanner</span><div class="track"><i style="--v:14"></i></div><b>14<small>/22</small></b></div>
          <div class="row r2"><span>+ model</span><div class="track"><i style="--v:19"></i></div><b>19<small>/22</small></b><em>+5</em></div>
        </div>
      </section>
    </div>`,

  css: `
    .ml { height: 100%; display: grid; grid-template-rows: auto 1fr auto; gap: 30px; }
    .title { max-width: none; }
    .accent { color: var(--accent); }
    .lede { margin-top: 10px; font-size: 32px; color: var(--muted); }
    .lab { font: 600 21px/1.2 var(--f-mono); color: var(--muted); }
    .main { display: grid; grid-template-columns: 1fr 770px; gap: 30px; min-height: 0; }
    .card { --radius: 30px; padding: 26px 34px; display: grid; align-content: start; gap: 18px; }

    /* 1 · signals: a diverging bar chart around zero */
    .code { display: grid; }
    .code code { grid-area: 1 / 1; font: 500 32px/1.2 var(--f-mono); transition: opacity .5s var(--e-out), transform .6s var(--e-out); }
    .code code b { color: var(--accent); }
    .c-b { opacity: 0; transform: translateY(14px); }
    &.s1 .c-a { opacity: 0; transform: translateY(-14px); }
    &.s1 .c-b { opacity: 1; transform: none; }
    .bars { display: grid; gap: 10px; }
    .bar { display: grid; grid-template-columns: 330px 1fr 86px; align-items: center; gap: 16px; font-size: 22px;
      transition: opacity .5s var(--e-out); }
    .bar span { color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar .tr { position: relative; height: 26px; }
    .bar .tr::before { content: ""; position: absolute; left: 50%; top: -6px; bottom: -6px; width: 2px; background: var(--line); }
    .bar .tr i { position: absolute; top: 0; height: 100%; border-radius: 7px; width: calc(var(--w) * 50%);
      transform: scaleX(0); transition: transform .7s var(--e-out) calc(.8s + var(--k) * 160ms); }
    .bar.pos .tr i { left: 50%; transform-origin: left; background: var(--ok); }
    .bar.neg .tr i { right: 50%; transform-origin: right; background: var(--bad); }
    .bar b { text-align: right; font: 600 23px/1 var(--f-mono); font-variant-numeric: tabular-nums; }
    .bar.pos b { color: var(--ok); } .bar.neg b { color: var(--bad); }
    &.cur .bar .tr i { transform: none; }
    &.s1 .bar.gone .tr i { transform: scaleX(0); transition-delay: calc(var(--k) * 90ms); }
    &.s1 .bar.gone { opacity: .35; }
    &.s1 .bar.gone span { text-decoration: line-through; }
    .sum { display: flex; justify-content: space-between; align-items: baseline; padding-top: 16px; border-top: 2px solid var(--line); font-size: 24px; font-weight: 600; }
    .sum b { font: 700 40px/1 var(--f-mono); font-variant-numeric: tabular-nums; letter-spacing: -.03em; }

    /* 2 · the sigmoid; the ball rides the real curve */
    .plot { position: relative; width: 700px; height: 270px; justify-self: center; margin-top: 8px; }
    .plot svg { display: block; overflow: visible; }
    .axis { stroke: var(--line); stroke-width: 2; }
    .thr { stroke: var(--muted); stroke-width: 2; stroke-dasharray: 6 8; opacity: .6; }
    .t { font: 500 17px var(--f-mono); fill: var(--muted); }
    .base { fill: none; stroke: color-mix(in srgb, var(--accent) 22%, transparent); stroke-width: 6; stroke-linecap: round; }
    .lit { fill: none; stroke: var(--accent); stroke-width: 6; stroke-linecap: round; stroke-dasharray: var(--d) 100; }
    .ball { position: absolute; left: 0; top: 0; width: 34px; height: 34px; border-radius: 50%;
      offset-distance: calc(var(--d) * 1%); offset-rotate: 0deg; offset-anchor: center;
      background: radial-gradient(circle at 35% 30%, #fff, var(--accent) 60%);
      box-shadow: 0 0 0 8px color-mix(in srgb, var(--accent) 18%, transparent), 0 10px 24px -8px var(--accent); }
    .plot { --d: 0; transition: --d 1.8s cubic-bezier(.45,.05,.2,1); }
    .score { position: absolute; left: 70px; top: 0; display: grid; gap: 6px; }
    .pct { font-size: 80px; line-height: .9; font-weight: 700; letter-spacing: -.06em; font-variant-numeric: tabular-nums; color: var(--ok); transition: color .6s; }
    .verdict { font-size: 28px; font-weight: 650; color: var(--ok); transition: color .6s; }
    &.s1 .pct, &.s1 .verdict { color: var(--muted); }

    /* 3 · it learns */
    .learn { --radius: 30px; padding: 26px 38px; display: grid; grid-template-columns: 1fr 1.25fr; gap: 50px; align-items: center;
      opacity: 0; transform: translateY(24px); transition: opacity .6s var(--e-out), transform .8s var(--e-out); }
    &.s2 .learn { opacity: 1; transform: none; }
    .loop { display: grid; gap: 10px; }
    .how { font-size: 26px; line-height: 1.35; color: var(--muted); }
    .how b { color: var(--ink); }
    .gain { display: grid; gap: 12px; }
    .row { display: grid; grid-template-columns: 130px 1fr 110px 60px; gap: 16px; align-items: center; font-size: 24px; font-weight: 600; }
    .track { height: 30px; border-radius: 9px; background: color-mix(in srgb, var(--line) 70%, transparent); overflow: hidden; }
    .track i { display: block; height: 100%; width: calc(var(--v) / 22 * 100%); border-radius: inherit; transform: scaleX(0); transform-origin: left;
      transition: transform 1s var(--e-out); }
    .r1 .track i { background: #8b93a6; }
    .r2 .track i { background: var(--ok); }
    &.s2 .r1 .track i { transform: none; transition-delay: .4s; }
    &.s2 .r2 .track i { transform: none; transition-delay: 1.1s; }
    .row b { font: 700 34px/1 var(--f-mono); letter-spacing: -.03em; }
    .row b small { font-size: 20px; color: var(--muted); }
    .row em { font-style: normal; font: 700 24px/1 var(--f-mono); color: var(--ok); opacity: 0; transition: opacity .5s 2s; }
    &.s2 .row em { opacity: 1; }`,

  globalCss: `
    @property --d { syntax: "<number>"; inherits: true; initial-value: 0; }`,

  // logit → point on the plot (x: −8..8, y: 0..1)
  _pt(l) { return [44 + (l + 8) / 16 * 646, 240 - 228 / (1 + Math.exp(-l))]; },

  init(el) {
    const max = 5.29;
    el.querySelector(".bars").innerHTML = this.SIG.map(([n, w, both], k) =>
      `<div class="bar ${w >= 0 ? "pos" : "neg"} ${both ? "" : "gone"}" style="--k:${k};--w:${Math.abs(w) / max}">
        <span>${n}</span><div class="tr"><i></i></div><b>${w >= 0 ? "+" : "−"}${Math.abs(w).toFixed(2)}</b></div>`).join("");
    // sample the curve, keep the arc length so the ball and the lit stroke stop at the exact score
    const pts = [], len = [0];
    for (let k = 0; k <= 160; k++) pts.push(this._pt(-8 + k / 10));
    for (let k = 1; k < pts.length; k++) len.push(len[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    this._at = l => 100 * len[Math.round((l + 8) * 10)] / len.at(-1);
    const d = "M" + pts.map(p => p.map(v => v.toFixed(1)).join(" ")).join(" L");
    el.querySelectorAll(".base, .lit").forEach(p => p.setAttribute("d", d));
    el.querySelector(".ball").style.offsetPath = `path("${d}")`;
    const ty = this._pt(Math.log(4))[1];  // score 80%
    el.querySelectorAll(".thr").forEach(n => n.setAttribute("y1", ty) || n.setAttribute("y2", ty));
    el.querySelector(".thr-t").setAttribute("y", ty - 10);
    FX.prep(el);
  },

  _go(el, l, delay) {
    const plot = el.querySelector(".plot"), pct = el.querySelector(".pct"), tot = el.querySelector(".total");
    clearTimeout(this._t); cancelAnimationFrame(this._raf);
    this._t = setTimeout(() => {
      plot.style.setProperty("--d", this._at(l));
      const from = this._l ?? 0, t0 = performance.now(), D = delay ? 1800 : 0;
      const tick = now => {
        const k = D ? Math.min(1, (now - t0) / D) : 1, e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2, v = from + (l - from) * e;
        tot.textContent = (v < 0 ? "−" : "+") + Math.abs(v).toFixed(2);
        pct.textContent = (100 / (1 + Math.exp(-v))).toFixed(1) + "%";
        if (k < 1) this._raf = requestAnimationFrame(tick); else this._l = l;
      };
      if (D) this._raf = requestAnimationFrame(tick); else tick(t0);
      el.querySelector(".verdict").textContent = l > 0 ? "S3 call" : "not S3";
    }, delay);
  },

  enter(el, api) {
    FX.act("solution");
    this._l = 0;
    this._go(el, api.still ? -3.272 : 6.232, api.still ? 0 : 1500);
  },
  step(el, s) { this._go(el, s ? -3.272 : 6.232, 300); },
  leave(el) { clearTimeout(this._t); cancelAnimationFrame(this._raf); el.querySelector(".plot").style.setProperty("--d", 0); this._l = 0; },
});
