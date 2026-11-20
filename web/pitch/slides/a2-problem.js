/* Parte A · 2 · O problema: os 3 números do inquérito lado a lado, servidos pelo RISE. */
RISE.slide({
  id: "problem",
  title: "Problem",
  time: "0:15 – 0:40",
  notes: `
"Leaseweb asked 800 senior leaders this month."
"89% could not move their critical workloads off their largest provider within three weeks. 79% expect AI to make that dependence worse. And 73% would pay more to be independent."
(são respostas a um inquérito, não migrações medidas)
"And 'S3-compatible' doesn't mean identical: regions, signing and features differ between providers."
"So teams decide migrations on assumptions. RISE replaces them with evidence."
Não comentar as etiquetas por baixo das imagens: são pedidos reais ao RISE e vão importar no fim.`,

  /* Só para a pré-visualização local (etiqueta "Local preview"). Ao vivo, as imagens vêm do RISE. */
  local: [
    ["89%", "can't move critical workloads off their main provider in 3 weeks"],
    ["79%", "expect AI to deepen that dependence"],
    ["73%", "would pay 11% more to be independent"],
  ],

  html: `
    <div class="prob">
      <h2 class="title split">Companies want to leave their cloud. They decide on assumptions.</h2>
      <div class="cards"></div>
      <p class="src rv" style="--i:6">Leaseweb Digital Independence Survey 2026, 800 senior leaders. Survey responses.</p>
    </div>`,

  css: `
    .prob { height: 100%; display: grid; grid-template-rows: auto 1fr auto; gap: 40px; }
    .title { max-width: 22ch; }
    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; align-items: center; }
    .stat { display: grid; gap: 14px; }
    .frame { aspect-ratio: 16 / 9; overflow: hidden; }
    .frame img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .frame:has(img) { border-radius: 16px; box-shadow: var(--shadow); }
    .fallback { height: 100%; padding: 32px 36px; display: grid; align-content: center; gap: 10px; }
    .fallback b { font-size: 120px; line-height: .9; font-weight: 700; letter-spacing: -.05em; }
    .fallback span { font-size: var(--t1); line-height: 1.35; color: var(--muted); max-width: 24ch; }
    .served { font-size: 18px; gap: 6px 10px; }
    .served .pill { font-size: 17px; padding: 6px 12px; }
    .src { font: 400 19px/1.4 var(--f-mono); color: var(--muted); }`,

  init(el, api) {
    el.querySelector(".cards").innerHTML = api.config.stats.map((key, k) => `
      <figure class="stat rv" style="--i:${2 + k}">
        <div class="frame glass" data-key="${api.esc(key)}">
          <div class="fallback"><b class="num">${this.local[k][0]}</b><span>${this.local[k][1]}</span></div>
        </div>
        <figcaption class="served"></figcaption>
      </figure>`).join("");
    FX.prep(el);
  },

  /* Pedidos novos, sem cache, sempre que o slide aparece. */
  async enter(el, api) {
    FX.act("problem");
    const providers = await api.live.providers();
    el.querySelectorAll(".frame").forEach(async f => {
      const r = await api.live.asset(f.dataset.key);
      f.parentElement.querySelector(".served").innerHTML = api.served(r, providers);
      if (!r.ok) return;
      const old = f.querySelector("img");
      f.innerHTML = `<img alt="" src="${r.url}">`;
      f.classList.remove("glass"); // o cartão servido já traz o seu próprio vidro
      if (old) URL.revokeObjectURL(old.src);
    });
  },
});
