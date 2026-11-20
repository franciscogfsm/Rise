/* O produto em 4 planos: screenshots reais da app (web/pitch/media/demo-*.png, tirados a uma análise
   verdadeira de Anonymous961/CandyShare a 20 Nov), animados como um vídeo: zoom lento + legenda. Nada é inventado. */
RISE.slide({
  id: "demo",
  title: "The product",
  time: "2:25 – 3:08",
  notes: `
Corre sozinho (≈ 2,6 s por plano, em loop). São screenshots reais de uma análise verdadeira, tirados hoje.
1. "You paste a repo and say where you want to go."
2. "RISE downloads it into memory and scans it. The AI writes the test plan; RISE validates it."
3. "Every S3 call, with file and line."
4. "The answer: ready to migrate, one change, proven on both clouds. A test failed first, RISE changed one setting, and retested: 2 of 2 pass."
Se perguntarem: Garage é um provider local simulado, a AWS Stockholm é real.`,

  SHOTS: [
    ["media/demo-1.png", "50% 30%", 1, "Paste a repo. Say where you want to go."],
    ["media/demo-2.png", "48% 14%", 1, "RISE reads the code. The AI writes the test plan."],
    ["media/demo-3.png", "47.5% 46%", 1, "Every S3 call, with file:line", 1.9],  // push in on "Found in your code"
    ["media/demo-4.png", "50% 30%", 1, "Ready to migrate. One fix, proven on both clouds."],
  ],
  DUR: 2600,

  html: `
    <h2 class="headline rv">From repo to proof.</h2>
    <div class="film glass rv scale" style="--i:1">
      <div class="shots"></div>
      <p class="cap"><b></b><span></span></p>
      <div class="prog"></div>
    </div>`,

  css: `
    display: flex; flex-direction: column; gap: 30px; padding-top: 120px; padding-bottom: 90px;
    .headline { font-size: var(--t4); font-weight: 600; letter-spacing: -.03em; line-height: 1.1; }
    .film { --radius: 30px; position: relative; flex: 1; min-height: 0; overflow: hidden; }
    .film > .shots { position: absolute; inset: 0; z-index: 0; }  /* .glass > * would make it relative, 0 px high */
    .film > .cap, .film > .prog { position: absolute; }
    .shot { position: absolute; inset: 0; opacity: 0; transition: opacity .7s cubic-bezier(.4,0,.2,1); }
    .shot.vis { opacity: 1; z-index: 1; }
    .shot img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; object-position: center; background: var(--bg);
      transform-origin: var(--o); transform: scale(var(--z)); will-change: transform; }
    .shot.on img { animation: demo-drift var(--d) cubic-bezier(.33,0,.67,1) both; }
    .cap { position: absolute; left: 34px; bottom: 40px; z-index: 3; display: flex; align-items: center; gap: 18px; padding: 18px 28px;
      border-radius: 20px; background: rgba(255,255,255,.9); backdrop-filter: blur(14px); font-size: 34px; font-weight: 650; letter-spacing: -.02em;
      box-shadow: 0 0 0 1px var(--line), 0 24px 48px -18px rgba(18,31,53,.5); opacity: 0; transform: translateY(18px);
      transition: opacity .3s var(--e-out), transform .45s var(--e-spring); }
    .cap.on { opacity: 1; transform: none; }
    .cap b { font: 600 22px/1 var(--f-mono); color: var(--accent); }
    .prog { position: absolute; left: 34px; right: 34px; bottom: 16px; z-index: 3; display: flex; gap: 10px; }
    .prog i { flex: 1; height: 5px; border-radius: 5px; background: rgba(18,31,53,.15); overflow: hidden; }
    .prog i::after { content: ""; display: block; height: 100%; width: 0; background: var(--accent); }
    .prog i.done::after { width: 100%; }
    .prog i.run::after { width: 100%; transition: width var(--d) linear; }`,

  globalCss: `
    @keyframes demo-drift { from { transform: scale(var(--z)); } to { transform: scale(var(--z1)); } }`,

  init(el) {
    el.querySelector(".shots").innerHTML = this.SHOTS.map(([src, o, z, , z1]) =>
      `<div class="shot" style="--o:${o};--z:${z};--z1:${z1 || z * 1.035};--d:${this.DUR + 900}ms"><img src="${src}" alt="RISE app screenshot"></div>`).join("");
    el.querySelector(".prog").innerHTML = this.SHOTS.map(() => `<i style="--d:${this.DUR}ms"></i>`).join("");
    FX.prep(el);
  },

  enter(el, api) {
    FX.act("solution");
    this._i = -1;
    if (api.still) return this._show(el, this.SHOTS.length - 2);
    this._show(el, 0);
    this._timer = setInterval(() => this._show(el, (this._i + 1) % this.SHOTS.length), this.DUR);
  },

  leave(el) {
    clearInterval(this._timer);
    el.querySelectorAll(".shot, .cap").forEach(n => n.classList.remove("on", "vis"));
  },

  _show(el, i) {
    this._i = i;
    const shots = el.querySelectorAll(".shot"), bars = el.querySelectorAll(".prog i"), cap = el.querySelector(".cap");
    shots.forEach((s, k) => {
      if (k === i) { s.classList.remove("on"); void s.offsetWidth; s.classList.add("on", "vis"); }  // restart its drift
      else if (s.classList.contains("vis")) { s.classList.remove("vis"); setTimeout(() => !s.classList.contains("vis") && s.classList.remove("on"), 800); }
    });
    bars.forEach((b, k) => { b.classList.remove("run"); b.classList.toggle("done", k < i); });
    void el.offsetWidth;
    bars[i].classList.add("run");
    cap.classList.remove("on");
    setTimeout(() => {
      cap.querySelector("b").textContent = String(i + 1).padStart(2, "0");
      cap.querySelector("span").textContent = this.SHOTS[i][3];
      cap.classList.add("on");
    }, 180);
  },
});
