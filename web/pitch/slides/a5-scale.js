/* Parte A · 6 · Benchmark do scanner: 185 repositórios reais. Números medidos pela equipa (benchmark no repo).
   Substitui o slide "Measured on Apache Airflow" (o Airflow está entre os 185). Custo e tokens ficam na tabela
   do slide "AI reads evidence"; o 7,000× fica nas notas. */
RISE.slide({
  id: "benchmark",
  title: "Benchmark",
  time: "1:45 – 2:00",
  notes: `
"Don't trust our words. Trust our results."
"We pointed the RISE scanner at 185 real repositories, including Sentry, Airflow and the aws-cli: 35 million lines in 40 seconds."
"Then we checked every call against the official AWS S3 API: zero real calls failed."
"And it's all in the repo: anyone can run the benchmark."
Se perguntarem pelo custo: cerca de 3,700 tokens por análise, menos de 0,0003 $; mandar o Airflow inteiro a uma IA seriam cerca de 25 milhões de tokens (estimativa), cerca de 7,000× mais.
Confirmar antes do pitch que o benchmark já está no repositório público.`,

  REPOS: ["Sentry", "Airflow", "aws-cli", "Discourse", "Superset", "Ray", "Nextcloud", "rclone"],

  html: `
    <div class="bm">
      <h2 class="title split"><span class="soft">Don't trust our words.</span> Trust our results.</h2>
      <div class="grid">
        <div class="st glass rv" style="--i:3"><b>185</b><span>real repositories</span></div>
        <div class="st glass rv" style="--i:4"><b>35,252,281</b><span>lines of code</span></div>
        <div class="st glass rv" style="--i:5"><b>40 s</b><span>to scan them all</span></div>
        <div class="st glass ok rv" style="--i:6"><b>0</b><span>real S3 calls failed against the official AWS API</span></div>
      </div>
      <p class="repos rv" style="--i:7"></p>
      <div class="sup">
        <p class="rv" style="--i:8"><b>870,000</b> lines per second</p>
        <p class="rv" style="--i:9"><b>Sentry:</b> 3.7M lines in 1.3 s</p>
        <p class="rv" style="--i:10"><b>10,444</b> S3 calls found, each with file:line</p>
        <p class="run rv" style="--i:11">The benchmark is in the repo. Run it yourself.</p>
      </div>
    </div>`,

  css: `
    .bm { height: 100%; display: grid; grid-template-rows: auto 1fr auto auto; gap: 26px; }
    .grid { display: grid; grid-template-columns: 1fr 1.5fr 1fr 1.2fr; gap: 24px; align-self: center; }
    /* cada número num mosaico de vidro; o 0 em destaque mint (nenhuma chamada falhada) */
    .st { --radius: 32px; padding: 40px 36px 44px; display: grid; gap: 14px; align-content: start; }
    .st b { font-size: 84px; line-height: .9; font-weight: 700; letter-spacing: -.055em; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .st span { font-size: var(--t2); line-height: 1.3; color: var(--muted); max-width: 18ch; }
    .st.ok { background: color-mix(in srgb, var(--ok) 9%, #fff); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ok) 35%, transparent), var(--shadow); }
    .st.ok b { color: var(--ok); }
    .repos { display: flex; flex-wrap: wrap; gap: 10px; }
    .repos span { font: 500 22px var(--f-mono); padding: 8px 16px; border-radius: 999px; background: rgba(255,255,255,.8); box-shadow: inset 0 0 0 1px var(--line); }
    .repos span.more { color: var(--muted); box-shadow: none; background: transparent; }
    .sup { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px 44px; padding-top: 22px; border-top: 1px solid var(--line); font-size: var(--t1); color: var(--muted); }
    .sup b { color: var(--ink); font-weight: 650; }
    .sup .run { margin-left: auto; color: var(--ink); font-weight: 600; }`,

  init(el) {
    el.querySelector(".repos").innerHTML = this.REPOS.map(r => `<span>${r}</span>`).join("") + `<span class="more">+177 more</span>`;
    FX.prep(el);
  },
  enter() { FX.act("proof"); },
});
