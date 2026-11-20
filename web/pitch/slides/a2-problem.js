/* Parte A · 2 · Problema e mercado: a dor (3 números do inquérito, servidos pelo RISE) e depois
   o mapa do mercado: todas as ferramentas movem bytes, nenhuma verifica o código antes. */
RISE.slide({
  id: "problem",
  title: "Problem",
  time: "0:15 – 0:45",
  steps: 1,
  notes: `
"Leaseweb asked 800 senior leaders this year."
"89% could not move their critical workloads off their main provider within three weeks. 79% expect AI to make it worse. And 73% would pay more to be independent."
(são respostas a um inquérito, não migrações medidas)
(→ passo 1: o mercado)
"So why don't they leave? Look at the tools."
"Moving the bytes is solved: DataSync, Storage Transfer, Storage Mover, rclone. Checking they arrived is solved too."
"But the first question, will my code still work on the new cloud, has no tool. It's spreadsheets, guesswork and weeks. And you find out in production."
"That gap, before the migration, is where RISE lives."
Não comentar as etiquetas por baixo das imagens: são pedidos reais ao RISE e vão importar no fim.`,

  /* Só para a pré-visualização local (etiqueta "Local preview"). Ao vivo, as imagens vêm do RISE. */
  local: [
    ["89%", "can't move critical workloads off their main provider in 3 weeks"],
    ["79%", "expect AI to deepen that dependence"],
    ["73%", "would pay 11% more to be independent"],
  ],

  html: `
    <div class="prob">
      <div class="heads">
        <h2 class="title t-a split">Leaving your cloud is a <span class="soft">leap of faith.</span></h2>
        <h2 class="title t-b split" data-s="1">Every tool moves your data. <span class="soft">None checks your code first.</span></h2>
      </div>
      <div class="body-area">
        <div class="pain">
          <div class="cards"></div>
          <p class="src rv" style="--i:6">Leaseweb Digital Independence Survey 2026, 800 senior leaders. Survey responses.</p>
        </div>
        <div class="market">
          <div class="phases">
            <article class="phase gap rv" data-s="1" style="--i:1">
              <span class="step">1 · Before</span>
              <h3>Will my code still work there?</h3>
              <p class="nobody">No tool.</p>
              <p class="how">Spreadsheets, guesswork, weeks.<br>You find out in production.</p>
            </article>
            <article class="phase glass rv" data-s="1" style="--i:2">
              <span class="step">2 · Move</span>
              <h3>Copy the bytes</h3>
              <div class="tools"><span class="tag">AWS DataSync</span><span class="tag">Google Storage Transfer</span><span class="tag">Azure Storage Mover</span><span class="tag">rclone</span></div>
              <p class="solved"><span class="dot"></span>Solved</p>
            </article>
            <article class="phase glass rv" data-s="1" style="--i:3">
              <span class="step">3 · After</span>
              <h3>Did it all arrive?</h3>
              <div class="tools"><span class="tag">rclone check</span><span class="tag">checksums</span><span class="tag">cutover runbooks</span></div>
              <p class="solved"><span class="dot"></span>Solved</p>
            </article>
          </div>
          <p class="punch rv" data-s="1" style="--i:5">The gap is <b>before</b> the migration. That's where RISE lives.</p>
        </div>
      </div>
    </div>`,

  css: `
    .prob { height: 100%; display: grid; grid-template-rows: auto 1fr; gap: 48px; }
    .heads { display: grid; }
    .heads > .title { grid-area: 1 / 1; max-width: 26ch; transition: opacity var(--d-2) var(--e-out), filter var(--d-2) var(--e-out); }
    &.s1 .t-a { opacity: 0; filter: blur(6px); }

    .body-area { display: grid; min-height: 0; }
    .pain, .market { grid-area: 1 / 1; min-height: 0; }
    .pain { display: grid; grid-template-rows: 1fr auto; gap: 28px; transition: opacity var(--d-2) var(--e-out), transform var(--d-2) var(--e-out), filter var(--d-2) var(--e-out); }
    &.s1 .pain { opacity: 0; transform: scale(.94); filter: blur(8px); pointer-events: none; }
    .market { display: grid; grid-template-rows: 1fr auto; gap: 36px; pointer-events: none; }
    &.s1 .market { pointer-events: auto; }

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
    .src { font: 400 19px/1.4 var(--f-mono); color: var(--muted); }

    .phases { display: grid; grid-template-columns: 1.15fr 1fr 1fr; gap: 28px; }
    .phase { padding: 40px 40px 36px; display: grid; grid-template-rows: auto auto 1fr auto; gap: 18px; align-content: start; }
    .phase .step { font: 500 22px/1 var(--f-mono); color: var(--muted); }
    .phase h3 { font-size: 40px; line-height: 1.1; font-weight: 600; letter-spacing: -.025em; }
    .tools { display: flex; flex-wrap: wrap; gap: 10px; align-content: start; }
    .solved { display: flex; align-items: center; gap: 10px; font-size: var(--t1); font-weight: 500; color: var(--ok); }

    .gap { border-radius: 32px; border: 3px dashed color-mix(in srgb, var(--bad) 55%, transparent); background: color-mix(in srgb, var(--bad-bg) 55%, transparent); }
    .gap .step { color: var(--bad); }
    .nobody { font-size: 96px; line-height: .95; font-weight: 700; letter-spacing: -.045em; color: var(--bad); }
    .how { font-size: var(--t1); line-height: 1.4; color: var(--muted); }

    .punch { font-size: 44px; line-height: 1.15; font-weight: 600; letter-spacing: -.025em; color: var(--ink); }
    .punch b { font-weight: 700; color: var(--act); }`,

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
