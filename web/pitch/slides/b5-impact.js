/* Aplicabilidade: onboarding, instalação e âmbito dos testes. */
RISE.slide({
  id: "impact",
  title: "Impact",
  time: "3:08 – 3:30",
  notes: `
"A Leaseweb team could use RISE to check a customer's S3 compatibility before scheduling the migration. Teams can run it themselves with Docker. Today the tests cover object storage. The project is open source."
(aos 3:30, avançar para o vídeo)`,

  PROVIDERS: ["AWS S3", "Leaseweb", "Backblaze B2", "Wasabi", "Scaleway", "Hetzner", "Cloudflare R2"],

  html: `
    <div class="im">
      <h2 class="title split">Any repo. Any S3 cloud. One command.</h2>
      <div class="cols">
        <div class="left">
          <div class="cmd glass rv" style="--i:3">
            <span class="tbar" aria-hidden="true"><i></i><i></i><i></i><em>terminal</em></span>
            <code><span class="ps">$ </span>docker compose up</code>
            <span class="out">RISE on http://localhost:8080</span>
          </div>
          <ul class="pts">
            <li class="rv" style="--i:4">No cloud account. No AI key.</li>
            <li class="rv" style="--i:5">Python, JavaScript, Go, Java, PHP.</li>
            <li class="rv" style="--i:6">Fits Leaseweb onboarding: customers arrive with proof.</li>
          </ul>
        </div>
        <div class="right">
          <p class="lbl rv" style="--i:4">Provider presets</p>
          <div class="chips"></div>
          <p class="foot rv" style="--i:9">AWS tested live today.</p>
        </div>
      </div>
      <div class="scope rv" style="--i:10">
        <span class="pill ok">Proven today</span><span>S3 object storage</span>
        <span class="pill warn">Flagged, not tested</span><span>queues, databases, functions</span>
        <span class="lic">Apache 2.0</span>
      </div>
    </div>`,

  css: `
    .im { height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
    .title { max-width: 20ch; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 120px; align-items: start; }
    /* o comando numa janela de terminal clara, com o resultado */
    .cmd { display: grid; gap: 14px; width: 640px; max-width: 100%; padding: 0 0 26px; --radius: 22px; overflow: hidden; }
    .tbar { display: flex; align-items: center; gap: 9px; padding: 14px 18px; border-bottom: 1px solid var(--line); background: rgba(255,255,255,.55); }
    .tbar i { width: 13px; height: 13px; border-radius: 50%; background: rgba(18,31,53,.16); }
    .tbar em { margin-left: 10px; font: 500 18px/1 var(--f-mono); font-style: normal; color: var(--muted); }
    .cmd code { padding: 10px 30px 0; font: 500 34px var(--f-mono); color: var(--ink); }
    .cmd .ps { color: var(--muted); }
    .cmd .out { padding: 0 30px; font: 500 24px/1.3 var(--f-mono); color: var(--ok); }
    .pts { list-style: none; display: grid; gap: 18px; margin-top: 36px; }
    .pts li { position: relative; padding-left: 50px; font-size: var(--t2); line-height: 1.35; }
    .pts li::before { content: "✓"; position: absolute; left: 0; top: .05em; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font: 700 18px/1 var(--f-ui); color: var(--ok); background: var(--ok-bg); }
    .lbl { font-size: var(--t1); font-weight: 600; color: var(--muted); margin-bottom: 18px; }
    .chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .chips span { display: grid; place-items: center; min-height: 84px; padding: 10px; border-radius: 20px; text-align: center; font-size: 24px; font-weight: 500; background: rgba(255,255,255,.78); box-shadow: inset 0 0 0 1px var(--line); }
    .chips span.live { box-shadow: inset 0 0 0 2px var(--ok); color: var(--ok); }
    .foot { margin-top: 18px; font-size: var(--t1); color: var(--muted); }
    /* o âmbito numa barra de vidro */
    .scope { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; font-size: var(--t1); color: var(--muted);
      padding: 22px 30px; border-radius: 24px; background: var(--glass);
      -webkit-backdrop-filter: blur(var(--blur)) saturate(var(--sat)); backdrop-filter: blur(var(--blur)) saturate(var(--sat));
      box-shadow: inset 0 1px 0 #fff, inset 0 0 0 1px rgba(255,255,255,.5), var(--shadow); }
    .scope span:nth-child(2) { margin-right: 20px; color: var(--ink); }
    .scope .lic { margin-left: auto; font-weight: 600; color: var(--ink); }`,

  init(el) {
    el.querySelector(".chips").innerHTML = this.PROVIDERS.map((p, i) =>
      `<span class="rv${p === "AWS S3" ? " live" : ""}" style="--i:${5 + i * .5}">${p}</span>`).join("");
    FX.prep(el);
  },
  enter() { FX.act("solution"); },
});
