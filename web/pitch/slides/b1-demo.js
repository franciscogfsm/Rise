/* Parte B · 6 · O produto em 5 planos: screenshots reais da app (web/pitch/media/demo-*.png, tirados a uma análise
   verdadeira de Anonymous961/CandyShare a 20 Nov), animados como um vídeo: zoom lento + legenda. Nada é inventado. */
RISE.slide({
  id: "demo",
  title: "The product",
  time: "2:00 – 3:00",
  notes: `
Corre sozinho (≈ 4 s por plano, em loop). São screenshots reais de uma análise verdadeira, tirados hoje.
1. "You paste a repo and say where you want to go."
2. "RISE downloads it into memory and scans it. The AI writes the test plan; RISE validates it."
3. "Every S3 call, with file and line."
4. "The answer: ready to migrate, one change, proven on both clouds."
5. "A test failed first, RISE changed one setting, and retested: 2 of 2 pass."
Se perguntarem: Garage é um provider local simulado, a AWS Stockholm é real.`,

  SHOTS: [
    ["media/demo-1.png", "50% 30%", 1.55, "Paste a repo. Say where you want to go."],
    ["media/demo-2.png", "48% 14%", 1.45, "RISE reads the code. The AI writes the test plan."],
    ["media/demo-3.png", "46% 48%", 1.7, "Every S3 call, with file:line"],
    ["media/demo-4.png", "50% 18%", 1.5, "Ready to migrate · proven on both clouds"],
    ["media/demo-4.png", "67% 40%", 1.75, "Failed first. One fix. Retested: 2/2 pass."],
  ],
  DUR: 4200,

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
    .shot { position: absolute; inset: 0; opacity: 0; transition: opacity .9s var(--e-out); }
    .shot.on { opacity: 1; }
    .shot img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center;
      transform-origin: var(--o); transform: scale(1); transition: transform 0s; }
    .shot.on img { transform: scale(var(--z)); transition: transform var(--d) cubic-bezier(.3,.1,.3,1); }
    .cap { position: absolute; left: 34px; bottom: 40px; z-index: 3; display: flex; align-items: center; gap: 18px; padding: 18px 28px;
      border-radius: 20px; background: rgba(255,255,255,.9); backdrop-filter: blur(14px); font-size: 34px; font-weight: 650; letter-spacing: -.02em;
      box-shadow: 0 0 0 1px var(--line), 0 24px 48px -18px rgba(18,31,53,.5); opacity: 0; transform: translateY(18px);
      transition: opacity .45s var(--e-out), transform .65s var(--e-out); }
    .cap.on { opacity: 1; transform: none; }
    .cap b { font: 600 22px/1 var(--f-mono); color: var(--accent); }
    .prog { position: absolute; left: 34px; right: 34px; bottom: 16px; z-index: 3; display: flex; gap: 10px; }
    .prog i { flex: 1; height: 5px; border-radius: 5px; background: rgba(18,31,53,.15); overflow: hidden; }
    .prog i::after { content: ""; display: block; height: 100%; width: 0; background: var(--accent); }
    .prog i.done::after { width: 100%; }
    .prog i.run::after { width: 100%; transition: width var(--d) linear; }`,

  init(el) {
    el.querySelector(".shots").innerHTML = this.SHOTS.map(([src, o, z]) =>
      `<div class="shot" style="--o:${o};--z:${z};--d:${this.DUR + 900}ms"><img src="${src}" alt="RISE app screenshot"></div>`).join("");
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
    el.querySelectorAll(".shot, .cap").forEach(n => n.classList.remove("on"));
  },

  _show(el, i) {
    this._i = i;
    const shots = el.querySelectorAll(".shot"), bars = el.querySelectorAll(".prog i"), cap = el.querySelector(".cap");
    shots.forEach((s, k) => s.classList.toggle("on", k === i));
    bars.forEach((b, k) => { b.classList.remove("run"); b.classList.toggle("done", k < i); });
    void el.offsetWidth;
    bars[i].classList.add("run");
    cap.classList.remove("on");
    setTimeout(() => {
      cap.querySelector("b").textContent = String(i + 1).padStart(2, "0");
      cap.querySelector("span").textContent = this.SHOTS[i][3];
      cap.classList.add("on");
    }, 350);
  },
});
