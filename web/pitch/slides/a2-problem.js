/* Parte A · slide 2 · O problema: o inquérito da Leaseweb, servido pelo próprio RISE */
RISE.slide({
  id: "problem",
  title: "Problem",
  time: "0:15 – 0:50",
  steps: 1,
  notes: `
"Leaseweb asked 800 senior leaders this month."
"89% said they could not move their critical workloads away from their largest provider within three weeks. 79% expect AI to make that dependence worse. And 73% would pay at least 11% more to be more independent."
(dizer que são respostas a um inquérito, não migrações medidas)
(→) "They want to leave. What stops them isn't copying data. It's that nobody can prove the application will still work on the other side."
Não comentar as etiquetas por baixo dos cartões: são pedidos reais ao routing do RISE e vão importar no fim.`,

  html: `
    <h2 class="title">Most companies want out. Almost none can prove they could leave.</h2>
    <div class="stats"></div>
    <div class="foot">
      <p class="src mono">Leaseweb Digital Independence Survey 2026. 800 senior leaders in the UK, US, Germany and the Netherlands. Survey responses, not measured migrations.</p>
      <p class="turn">Copying the data is easy. Proving the app still works is not.</p>
    </div>`,

  css: `
    display: flex; flex-direction: column; justify-content: space-between; gap: 40px;
    .title { max-width: 26ch; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
    .stat { display: grid; gap: 16px; }
    .card { aspect-ratio: 16 / 9; overflow: hidden; }
    .card:has(img) { border-radius: 36px; box-shadow: var(--shadow); }
    .card img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .card .fallback { height: 100%; padding: 44px 36px 32px; display: flex; flex-direction: column; justify-content: flex-start; gap: 10px; }
    .card .fallback b { font-size: 112px; line-height: .95; }
    .card .fallback span { font-size: var(--t1); line-height: 1.35; color: var(--muted); max-width: 26ch; }
    .foot { position: relative; min-height: 90px; }
    .src { font-size: 20px; line-height: 1.5; color: var(--muted); max-width: 80ch; transition: opacity .4s var(--ease); }
    .turn { position: absolute; left: 0; top: 0; font-size: var(--t4); font-weight: 600; letter-spacing: -.025em; opacity: 0; transition: opacity .5s var(--ease); }
    &.s1 .src { opacity: 0; }
    &.s1 .turn { opacity: 1; }`,

  /* Só para a pré-visualização local, com a etiqueta "Local preview". Ao vivo vêm do RISE. */
  local: [
    ["89%", "could not move critical workloads away from their largest provider within 3 weeks"],
    ["79%", "expect AI to increase dependence on a few technology providers"],
    ["73%", "would pay at least 11% more for greater digital independence"],
  ],

  init(el, api) {
    el.querySelector(".stats").innerHTML = api.config.stats.map((key, k) => `
      <figure class="stat">
        <div class="card glass" data-key="${api.esc(key)}">
          <div class="fallback"><b class="num">${this.local[k][0]}</b><span>${this.local[k][1]}</span></div>
        </div>
        <figcaption class="served"></figcaption>
      </figure>`).join("");
  },

  /* Cada vez que o slide aparece: pedidos novos, sem cache. */
  async enter(el, api) {
    const providers = await api.live.providers();
    el.querySelectorAll(".card").forEach(async card => {
      const res = await api.live.asset(card.dataset.key);
      card.parentElement.querySelector(".served").innerHTML = api.served(res, providers);
      if (res.ok) {
        const old = card.querySelector("img");
        card.innerHTML = `<img alt="" src="${res.url}">`;
        card.classList.remove("glass"); // o cartão servido já traz o seu próprio vidro
        if (old) URL.revokeObjectURL(old.src);
      }
    });
  },
});
