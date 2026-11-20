/* Parte A · 2 · O problema: um número de cada vez (3 passos), servidos pelo RISE, e a viragem. */
RISE.slide({
  id: "problem",
  title: "Problem",
  time: "0:15 – 0:55",
  steps: 3,
  notes: `
"Leaseweb asked 800 senior leaders this month."
(89%) "89% said they could not move their critical workloads away from their largest provider within three weeks."
(→ 79%) "79% expect AI to make that dependence worse."
(→ 73%) "And 73% would pay at least 11% more to be more independent."
(dizer: são respostas a um inquérito, não migrações medidas)
(→ a viragem) "They want to leave. What stops them isn't copying data. It's that nobody can prove the application will still work on the other side."
Não comentar a etiqueta por baixo da imagem: é um pedido real ao RISE e vai importar no fim.`,

  /* Só para a pré-visualização local (etiqueta "Local preview"). Ao vivo, as imagens vêm do RISE. */
  local: [
    ["89%", "could not move critical workloads away from their largest provider within 3 weeks"],
    ["79%", "expect AI to increase dependence on a few technology providers"],
    ["73%", "would pay at least 11% more for greater digital independence"],
  ],

  html: `
    <div class="prob">
      <div class="stage">
        <div class="frames"></div>
        <p class="turn statement"><span class="soft">Copying the data is easy.</span> Proving the app still works is not.</p>
      </div>
      <div class="meta">
        <div class="served"></div>
        <p class="src">Leaseweb Digital Independence Survey 2026. 800 senior leaders in the UK, US, Germany and the Netherlands. Survey responses, not measured migrations.</p>
      </div>
    </div>`,

  css: `
    .prob { height: 100%; display: grid; grid-template-rows: 1fr auto; gap: 28px; }
    .stage { position: relative; display: grid; place-items: center; }
    .frames { position: relative; width: 1120px; aspect-ratio: 16 / 9; }
    .frame { position: absolute; inset: 0; overflow: hidden; opacity: 0; transform: scale(1.04); transition: opacity var(--d-2) var(--e-out), transform 1.6s var(--e-out); }
    .frame img { display: block; width: 100%; height: 100%; object-fit: contain; }
    .frame:has(img) { border-radius: 36px; box-shadow: var(--shadow); }
    .fallback { height: 100%; padding: 64px 72px; display: grid; align-content: center; gap: 18px; }
    .fallback b { font-size: 220px; line-height: .86; font-weight: 700; letter-spacing: -.06em; }
    .fallback span { font-size: var(--t3); line-height: 1.35; color: var(--muted); max-width: 28ch; }
    &.cur .frame[data-k="0"], &.s1 .frame[data-k="1"], &.s2 .frame[data-k="2"] { opacity: 1; transform: none; }
    &.s1 .frame[data-k="0"], &.s2 .frame[data-k="1"], &.s3 .frame[data-k="2"] { opacity: 0; transform: scale(.98); }
    .turn { position: absolute; max-width: 18ch; text-align: center; opacity: 0; transform: translateY(24px); transition: opacity var(--d-2) var(--e-out) .15s, transform var(--d-3) var(--e-out) .15s; }
    &.s3 .turn { opacity: 1; transform: none; }
    .meta { display: grid; justify-items: center; gap: 12px; min-height: 96px; transition: opacity var(--d-2) var(--e-out); }
    &.s3 .meta { opacity: 0; }
    .src { font: 400 19px/1.45 var(--f-mono); color: var(--muted); text-align: center; max-width: 92ch; }`,

  init(el, api) {
    el.querySelector(".frames").innerHTML = api.config.stats.map((key, k) => `
      <figure class="frame glass" data-k="${k}" data-key="${api.esc(key)}">
        <div class="fallback"><b class="num">${this.local[k][0]}</b><span>${this.local[k][1]}</span></div>
      </figure>`).join("");
    this._res = [];
  },

  /* Pedidos novos, sem cache, sempre que o slide aparece. */
  async enter(el, api) {
    FX.act("problem");
    const frames = [...el.querySelectorAll(".frame")];
    const [providers, ...res] = await Promise.all([api.live.providers(), ...frames.map(f => api.live.asset(f.dataset.key))]);
    this._providers = providers;
    this._res = res;
    res.forEach((r, k) => {
      if (!r.ok) return;
      const f = frames[k], old = f.querySelector("img");
      f.innerHTML = `<img alt="" src="${r.url}">`;
      f.classList.remove("glass"); // o cartão servido já traz o seu próprio vidro
      if (old) URL.revokeObjectURL(old.src);
    });
    this._label(el, api);
  },

  step(el, n, api) { this._label(el, api, n); },

  _label(el, api, n) {
    const k = Math.min(n ?? (el.classList.contains("s2") ? 2 : el.classList.contains("s1") ? 1 : 0), 2);
    el.querySelector(".served").innerHTML = api.served(this._res[k], this._providers || {});
  },
});
